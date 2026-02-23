import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase/client';
import Handlebars from 'handlebars';
import QRCode from 'qrcode';

export interface PDFOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  header?: {
    content: string;
    height?: string;
  };
  footer?: {
    content: string;
    height?: string;
  };
  scale?: number;
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  timeout?: number;
}

export interface GeneratedPDF {
  id: string;
  template: string;
  data: Record<string, any>;
  pdfPath: string;
  size: number;
  hash: string;
  metadata: Record<string, any>;
  createdAt: string;
  expiresAt?: string;
}

export interface PDFTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  defaultOptions: PDFOptions;
  createdAt: string;
  updatedAt: string;
}

export class PDFGenerator {
  private readonly MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private browser: puppeteer.Browser | null = null;

  async generateFromHTML(
    html: string,
    options: PDFOptions = {},
    bucket: string = 'generated-pdfs'
  ): Promise<GeneratedPDF> {
    let browser: puppeteer.Browser | null = null;
    let tempFilePath: string | null = null;

    try {
      // Initialize browser if not already done
      if (!this.browser) {
        this.browser = await this.initBrowser();
      }
      browser = this.browser;

      // Set default options
      const pdfOptions: Required<PDFOptions> = {
        format: options.format || 'A4',
        orientation: options.orientation || 'portrait',
        margin: {
          top: options.margin?.top || '20mm',
          right: options.margin?.right || '20mm',
          bottom: options.margin?.bottom || '20mm',
          left: options.margin?.left || '20mm',
        },
        header: options.header || null,
        footer: options.footer || null,
        scale: options.scale || 1,
        printBackground: options.printBackground !== false,
        displayHeaderFooter: !!options.header || !!options.footer,
        timeout: options.timeout || this.DEFAULT_TIMEOUT,
      };

      // Create a page
      const page = await browser.newPage();

      // Set page content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: pdfOptions.timeout,
      });

      // Generate temporary file path
      tempFilePath = path.join('/tmp', `${uuidv4()}.pdf`);

      // Generate PDF
      await page.pdf({
        path: tempFilePath,
        format: pdfOptions.format as puppeteer.PaperFormat,
        landscape: pdfOptions.orientation === 'landscape',
        printBackground: pdfOptions.printBackground,
        displayHeaderFooter: pdfOptions.displayHeaderFooter,
        headerTemplate: pdfOptions.header?.content || '',
        footerTemplate: pdfOptions.footer?.content || '',
        margin: pdfOptions.margin,
        scale: pdfOptions.scale,
        timeout: pdfOptions.timeout,
      });

      // Read generated PDF
      const pdfBuffer = await fs.readFile(tempFilePath);
      const hash = createHash('sha256').update(pdfBuffer).digest('hex');

      // Check if PDF already exists
      const existingPDF = await this.checkExistingPDF(hash, bucket);
      if (existingPDF) {
        await fs.unlink(tempFilePath).catch(() => {});
        return existingPDF;
      }

      // Validate PDF size
      if (pdfBuffer.length > this.MAX_PDF_SIZE) {
        throw new Error(`PDF size exceeds maximum limit of ${this.MAX_PDF_SIZE / 1024 / 1024}MB`);
      }

      // Upload to Supabase Storage
      const fileName = `${uuidv4()}.pdf`;
      const filePath = `generated/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false,
          cacheControl: 'public, max-age=86400',
        });

      if (uploadError) {
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Create generated PDF record
      const generatedPDF: GeneratedPDF = {
        id: uuidv4(),
        template: 'custom-html',
        data: { htmlLength: html.length },
        pdfPath: publicUrl,
        size: pdfBuffer.length,
        hash,
        metadata: {
          options: pdfOptions,
          generatedAt: new Date().toISOString(),
          userAgent: await browser.userAgent(),
        },
        createdAt: new Date().toISOString(),
      };

      // Store metadata in database
      await this.storePDFMetadata(generatedPDF, bucket);

      // Cleanup
      await page.close();
      await fs.unlink(tempFilePath).catch(() => {});

      return generatedPDF;
    } catch (error) {
      // Cleanup on error
      if (tempFilePath) {
        await fs.unlink(tempFilePath).catch(() => {});
      }
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  async generateFromTemplate(
    templateId: string,
    data: Record<string, any>,
    options: PDFOptions = {},
    bucket: string = 'generated-pdfs'
  ): Promise<GeneratedPDF> {
    try {
      // Load template from database
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Compile template
      const compiledTemplate = Handlebars.compile(template.content);
      
      // Prepare data with common variables
      const templateData = {
        ...data,
        _meta: {
          generatedAt: new Date().toISOString(),
          templateName: template.name,
          templateVersion: template.updatedAt,
        },
      };

      // Generate HTML from template
      const html = compiledTemplate(templateData);

      // Merge template defaults with provided options
      const mergedOptions = {
        ...template.defaultOptions,
        ...options,
        margin: {
          ...template.defaultOptions.margin,
          ...options.margin,
        },
      };

      // Generate PDF
      return await this.generateFromHTML(html, mergedOptions, bucket);
    } catch (error) {
      console.error('Template PDF generation error:', error);
      throw error;
    }
  }

  async generateInvoice(
    orderData: any,
    companyData: any,
    options: PDFOptions = {},
    bucket: string = 'invoices'
  ): Promise<GeneratedPDF> {
    try {
      // Load invoice template
      const template = await this.getTemplate('invoice');
      if (!template) {
        // Create default invoice template if not exists
        await this.createDefaultInvoiceTemplate();
        return await this.generateInvoice(orderData, companyData, options, bucket);
      }

      // Prepare invoice data
      const invoiceData = {
        invoice: {
          number: `INV-${orderData.id.slice(0, 8).toUpperCase()}`,
          date: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        company: {
          name: companyData.name || 'Xarastore',
          address: companyData.address || 'Nairobi, Kenya',
          phone: companyData.phone || '+254 700 000 000',
          email: companyData.email || 'billing@xarastore.com',
          logo: companyData.logo || 'https://xarastore.com/logo.png',
        },
        customer: {
          name: orderData.customerName,
          email: orderData.customerEmail,
          phone: orderData.customerPhone,
          address: orderData.shippingAddress,
        },
        order: {
          id: orderData.id,
          date: new Date(orderData.createdAt).toISOString().split('T')[0],
          items: orderData.items.map((item: any, index: number) => ({
            no: index + 1,
            description: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.quantity * item.price,
          })),
          subtotal: orderData.subtotal,
          shipping: orderData.shipping,
          tax: orderData.tax,
          total: orderData.total,
        },
        payment: {
          method: orderData.paymentMethod,
          status: orderData.paymentStatus,
          transactionId: orderData.transactionId,
        },
        qrCode: await this.generateQRCode(
          `https://xarastore.com/invoice/${orderData.id}`
        ),
      };

      // Generate PDF
      return await this.generateFromTemplate('invoice', invoiceData, options, bucket);
    } catch (error) {
      console.error('Invoice generation error:', error);
      throw error;
    }
  }

  async generateReceipt(
    paymentData: any,
    options: PDFOptions = {},
    bucket: string = 'receipts'
  ): Promise<GeneratedPDF> {
    try {
      const template = await this.getTemplate('receipt');
      if (!template) {
        await this.createDefaultReceiptTemplate();
        return await this.generateReceipt(paymentData, options, bucket);
      }

      const receiptData = {
        receipt: {
          number: `RCP-${paymentData.id.slice(0, 8).toUpperCase()}`,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toISOString().split('T')[1].slice(0, 8),
        },
        payment: {
          amount: paymentData.amount,
          method: paymentData.method,
          transactionId: paymentData.transactionId,
          status: paymentData.status,
        },
        customer: {
          name: paymentData.customerName,
          email: paymentData.customerEmail,
          phone: paymentData.customerPhone,
        },
        items: paymentData.items || [],
        qrCode: await this.generateQRCode(
          `https://xarastore.com/receipt/${paymentData.id}`
        ),
      };

      return await this.generateFromTemplate('receipt', receiptData, options, bucket);
    } catch (error) {
      console.error('Receipt generation error:', error);
      throw error;
    }
  }

  async generateShippingLabel(
    shippingData: any,
    options: PDFOptions = {},
    bucket: string = 'shipping-labels'
  ): Promise<GeneratedPDF> {
    try {
      const template = await this.getTemplate('shipping-label');
      if (!template) {
        await this.createDefaultShippingLabelTemplate();
        return await this.generateShippingLabel(shippingData, options, bucket);
      }

      const labelData = {
        tracking: {
          number: shippingData.trackingNumber,
          carrier: shippingData.carrier,
          service: shippingData.service,
        },
        from: {
          name: shippingData.fromName,
          address: shippingData.fromAddress,
          phone: shippingData.fromPhone,
        },
        to: {
          name: shippingData.toName,
          address: shippingData.toAddress,
          phone: shippingData.toPhone,
          email: shippingData.toEmail,
        },
        package: {
          weight: shippingData.weight,
          dimensions: shippingData.dimensions,
          contents: shippingData.contents,
        },
        instructions: shippingData.instructions || '',
        barcode: await this.generateBarcode(shippingData.trackingNumber),
        qrCode: await this.generateQRCode(
          `https://xarastore.com/track/${shippingData.trackingNumber}`
        ),
      };

      return await this.generateFromTemplate('shipping-label', labelData, options, bucket);
    } catch (error) {
      console.error('Shipping label generation error:', error);
      throw error;
    }
  }

  async mergePDFs(
    pdfPaths: string[],
    options: PDFOptions = {},
    bucket: string = 'merged-pdfs'
  ): Promise<GeneratedPDF> {
    try {
      // This would require a PDF merging library like pdf-lib
      // For now, we'll create a simple implementation
      
      // Download all PDFs
      const pdfBuffers = await Promise.all(
        pdfPaths.map(async (pdfPath) => {
          if (pdfPath.startsWith('http')) {
            const response = await fetch(pdfPath);
            if (!response.ok) {
              throw new Error(`Failed to download PDF: ${pdfPath}`);
            }
            return await response.arrayBuffer();
          } else {
            return await fs.readFile(pdfPath);
          }
        })
      );

      // In production, use pdf-lib to merge PDFs
      // const mergedPdf = await PDFDocument.create();
      // for (const pdfBytes of pdfBuffers) {
      //   const pdf = await PDFDocument.load(pdfBytes);
      //   const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      //   copiedPages.forEach((page) => mergedPdf.addPage(page));
      // }
      // const mergedPdfBytes = await mergedPdf.save();

      // For now, just use the first PDF
      const mergedPdfBytes = pdfBuffers[0];

      // Generate hash
      const hash = createHash('sha256').update(Buffer.from(mergedPdfBytes)).digest('hex');

      // Check if merged PDF already exists
      const existingPDF = await this.checkExistingPDF(hash, bucket);
      if (existingPDF) {
        return existingPDF;
      }

      // Upload to storage
      const fileName = `${uuidv4()}.pdf`;
      const filePath = `merged/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, Buffer.from(mergedPdfBytes), {
          contentType: 'application/pdf',
          upsert: false,
          cacheControl: 'public, max-age=86400',
        });

      if (uploadError) {
        throw new Error(`Failed to upload merged PDF: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Create record
      const generatedPDF: GeneratedPDF = {
        id: uuidv4(),
        template: 'merged',
        data: { sourceCount: pdfPaths.length, sourcePaths: pdfPaths },
        pdfPath: publicUrl,
        size: mergedPdfBytes.byteLength,
        hash,
        metadata: {
          options,
          sourceCount: pdfPaths.length,
          generatedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
      };

      // Store metadata
      await this.storePDFMetadata(generatedPDF, bucket);

      return generatedPDF;
    } catch (error) {
      console.error('PDF merge error:', error);
      throw error;
    }
  }

  async addWatermark(
    pdfPath: string,
    watermarkText: string,
    options: {
      opacity?: number;
      fontSize?: number;
      color?: string;
      rotation?: number;
    } = {},
    bucket: string = 'watermarked-pdfs'
  ): Promise<GeneratedPDF> {
    try {
      // Download PDF
      let pdfBuffer: Buffer;
      if (pdfPath.startsWith('http')) {
        const response = await fetch(pdfPath);
        if (!response.ok) {
          throw new Error(`Failed to download PDF: ${pdfPath}`);
        }
        pdfBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        pdfBuffer = await fs.readFile(pdfPath);
      }

      // In production, use pdf-lib to add watermark
      // const pdfDoc = await PDFDocument.load(pdfBuffer);
      // const pages = pdfDoc.getPages();
      
      // for (const page of pages) {
      //   page.drawText(watermarkText, {
      //     x: page.getWidth() / 2,
      //     y: page.getHeight() / 2,
      //     size: options.fontSize || 48,
      //     color: rgb(0.5, 0.5, 0.5),
      //     opacity: options.opacity || 0.3,
      //     rotate: degrees(options.rotation || -45),
      //   });
      // }
      
      // const watermarkedPdfBytes = await pdfDoc.save();

      // For now, return original PDF
      const watermarkedPdfBytes = pdfBuffer;

      // Generate hash
      const hash = createHash('sha256').update(watermarkedPdfBytes).digest('hex');

      // Check if already exists
      const existingPDF = await this.checkExistingPDF(hash, bucket);
      if (existingPDF) {
        return existingPDF;
      }

      // Upload to storage
      const fileName = `${uuidv4()}.pdf`;
      const filePath = `watermarked/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, watermarkedPdfBytes, {
          contentType: 'application/pdf',
          upsert: false,
          cacheControl: 'public, max-age=86400',
        });

      if (uploadError) {
        throw new Error(`Failed to upload watermarked PDF: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Create record
      const generatedPDF: GeneratedPDF = {
        id: uuidv4(),
        template: 'watermarked',
        data: { originalPath: pdfPath, watermarkText },
        pdfPath: publicUrl,
        size: watermarkedPdfBytes.length,
        hash,
        metadata: {
          watermarkOptions: options,
          generatedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
      };

      // Store metadata
      await this.storePDFMetadata(generatedPDF, bucket);

      return generatedPDF;
    } catch (error) {
      console.error('Watermark error:', error);
      throw error;
    }
  }

  async generateQRCode(data: string): Promise<string> {
    try {
      return await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        margin: 1,
        scale: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (error) {
      console.error('QR code generation error:', error);
      return '';
    }
  }

  async generateBarcode(data: string): Promise<string> {
    try {
      // Using QR code as barcode for simplicity
      // In production, use a proper barcode library like bwip-js
      return await this.generateQRCode(data);
    } catch (error) {
      console.error('Barcode generation error:', error);
      return '';
    }
  }

  async validatePDF(buffer: Buffer): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check file size
    if (buffer.length > this.MAX_PDF_SIZE) {
      errors.push(`PDF size exceeds ${this.MAX_PDF_SIZE / 1024 / 1024}MB limit`);
    }

    // Check if it's a valid PDF (simple header check)
    const header = buffer.slice(0, 5).toString();
    if (!header.startsWith('%PDF-')) {
      errors.push('Invalid PDF file format');
    }

    // Check for malicious content (simple check)
    const content = buffer.toString('utf8', 0, 1000);
    if (content.includes('/JavaScript') || content.includes('/JS')) {
      errors.push('PDF contains JavaScript which is not allowed');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async cleanupExpiredPDFs(bucket: string): Promise<number> {
    try {
      const { data: expiredPDFs, error: fetchError } = await supabase
        .from('generated_pdfs')
        .select('id, pdf_path, expires_at')
        .not('expires_at', 'is', null)
        .lt('expires_at', new Date().toISOString());

      if (fetchError) {
        throw new Error(`Failed to fetch expired PDFs: ${fetchError.message}`);
      }

      let deletedCount = 0;

      for (const pdf of expiredPDFs) {
        try {
          // Extract file path from URL
          const filePath = pdf.pdf_path.split('/').pop();
          if (filePath) {
            // Delete from storage
            const { error: deleteError } = await supabase.storage
              .from(bucket)
              .remove([`generated/${filePath}`]);

            if (deleteError) {
              console.error(`Failed to delete storage file for PDF ${pdf.id}:`, deleteError);
              continue;
            }
          }

          // Delete database record
          const { error: dbError } = await supabase
            .from('generated_pdfs')
            .delete()
            .eq('id', pdf.id);

          if (dbError) {
            console.error(`Failed to delete database record for PDF ${pdf.id}:`, dbError);
            continue;
          }

          deletedCount++;
        } catch (error) {
          console.error(`Error cleaning up PDF ${pdf.id}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }

  async getTemplate(templateId: string): Promise<PDFTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        return null;
      }

      return data as PDFTemplate;
    } catch (error) {
      return null;
    }
  }

  async saveTemplate(template: Omit<PDFTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<PDFTemplate> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('pdf_templates')
        .insert({
          id,
          ...template,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save template: ${error.message}`);
      }

      return data as PDFTemplate;
    } catch (error) {
      console.error('Template save error:', error);
      throw error;
    }
  }

  async getPDFStats(bucket: string = 'generated-pdfs'): Promise<{
    totalPDFs: number;
    totalSize: number;
    averageSize: number;
    templates: Record<string, number>;
    lastGenerated: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('generated_pdfs')
        .select('size, template, created_at')
        .eq('bucket', bucket);

      if (error) {
        throw new Error(`Failed to fetch PDF stats: ${error.message}`);
      }

      const totalPDFs = data.length;
      const totalSize = data.reduce((sum, pdf) => sum + (pdf.size || 0), 0);
      const templates = data.reduce((acc, pdf) => {
        acc[pdf.template] = (acc[pdf.template] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const lastGenerated = data.length > 0
        ? new Date(Math.max(...data.map(pdf => new Date(pdf.created_at).getTime()))).toISOString()
        : null;

      return {
        totalPDFs,
        totalSize,
        averageSize: totalPDFs > 0 ? Math.round(totalSize / totalPDFs) : 0,
        templates,
        lastGenerated,
      };
    } catch (error) {
      console.error('PDF stats error:', error);
      return {
        totalPDFs: 0,
        totalSize: 0,
        averageSize: 0,
        templates: {},
        lastGenerated: null,
      };
    }
  }

  private async initBrowser(): Promise<puppeteer.Browser> {
    const launchOptions: puppeteer.LaunchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    };

    if (process.env.NODE_ENV === 'production') {
      launchOptions.executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';
    }

    return await puppeteer.launch(launchOptions);
  }

  private async checkExistingPDF(hash: string, bucket: string): Promise<GeneratedPDF | null> {
    try {
      const { data, error } = await supabase
        .from('generated_pdfs')
        .select('*')
        .eq('hash', hash)
        .eq('bucket', bucket)
        .single();

      if (error || !data) {
        return null;
      }

      return data as GeneratedPDF;
    } catch (error) {
      return null;
    }
  }

  private async storePDFMetadata(pdf: GeneratedPDF, bucket: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('generated_pdfs')
        .insert({
          id: pdf.id,
          template: pdf.template,
          data: pdf.data,
          pdf_path: pdf.pdfPath,
          size: pdf.size,
          hash: pdf.hash,
          metadata: pdf.metadata,
          bucket,
          created_at: pdf.createdAt,
          expires_at: pdf.expiresAt,
        });

      if (error) {
        throw new Error(`Failed to store PDF metadata: ${error.message}`);
      }
    } catch (error) {
      console.error('PDF metadata storage error:', error);
      throw error;
    }
  }

  private async createDefaultInvoiceTemplate(): Promise<void> {
    const invoiceTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice {{invoice.number}}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border: 1px solid #e0e0e0;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 2px solid #dc2626;
            padding-bottom: 20px;
        }
        .company-info {
            flex: 1;
        }
        .company-logo {
            max-width: 150px;
            height: auto;
        }
        .invoice-info {
            text-align: right;
        }
        .invoice-title {
            font-size: 32px;
            font-weight: bold;
            color: #dc2626;
            margin: 0;
        }
        .invoice-number {
            font-size: 18px;
            color: #666;
            margin-top: 5px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e0e0e0;
        }
        .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
        }
        .info-group {
            margin-bottom: 15px;
        }
        .info-label {
            font-weight: bold;
            color: #666;
            margin-bottom: 5px;
        }
        .info-value {
            font-size: 16px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background-color: #f8f9fa;
            padding: 12px 15px;
            text-align: left;
            font-weight: bold;
            color: #333;
            border-bottom: 2px solid #e0e0e0;
        }
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #e0e0e0;
        }
        tr:last-child td {
            border-bottom: none;
        }
        .text-right {
            text-align: right;
        }
        .text-bold {
            font-weight: bold;
        }
        .total-row {
            background-color: #f8f9fa;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .qr-code {
            text-align: center;
            margin-top: 30px;
        }
        .qr-code img {
            max-width: 150px;
            height: auto;
        }
        .status {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
        }
        .status-paid {
            background-color: #d1fae5;
            color: #065f46;
        }
        .status-pending {
            background-color: #fef3c7;
            color: #92400e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-info">
                {{#if company.logo}}
                <img src="{{company.logo}}" alt="{{company.name}}" class="company-logo">
                {{/if}}
                <h2>{{company.name}}</h2>
                <p>{{company.address}}</p>
                <p>Phone: {{company.phone}}</p>
                <p>Email: {{company.email}}</p>
            </div>
            <div class="invoice-info">
                <h1 class="invoice-title">INVOICE</h1>
                <p class="invoice-number">#{{invoice.number}}</p>
                <p><strong>Date:</strong> {{invoice.date}}</p>
                <p><strong>Due Date:</strong> {{invoice.dueDate}}</p>
            </div>
        </div>

        <div class="section">
            <div class="two-column">
                <div>
                    <h3 class="section-title">Bill To</h3>
                    <div class="info-group">
                        <div class="info-label">Customer Name</div>
                        <div class="info-value">{{customer.name}}</div>
                    </div>
                    <div class="info-group">
                        <div class="info-label">Email</div>
                        <div class="info-value">{{customer.email}}</div>
                    </div>
                    <div class="info-group">
                        <div class="info-label">Phone</div>
                        <div class="info-value">{{customer.phone}}</div>
                    </div>
                    <div class="info-group">
                        <div class="info-label">Address</div>
                        <div class="info-value">{{customer.address}}</div>
                    </div>
                </div>
                <div>
                    <h3 class="section-title">Order Details</h3>
                    <div class="info-group">
                        <div class="info-label">Order ID</div>
                        <div class="info-value">{{order.id}}</div>
                    </div>
                    <div class="info-group">
                        <div class="info-label">Order Date</div>
                        <div class="info-value">{{order.date}}</div>
                    </div>
                    <div class="info-group">
                        <div class="info-label">Payment Method</div>
                        <div class="info-value">{{payment.method}}</div>
                    </div>
                    <div class="info-group">
                        <div class="info-label">Payment Status</div>
                        <div class="info-value">
                            <span class="status status-{{payment.status}}">{{payment.status}}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <h3 class="section-title">Order Items</h3>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Description</th>
                        <th class="text-right">Quantity</th>
                        <th class="text-right">Unit Price</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each order.items}}
                    <tr>
                        <td>{{this.no}}</td>
                        <td>{{this.description}}</td>
                        <td class="text-right">{{this.quantity}}</td>
                        <td class="text-right">KES {{this.unitPrice}}</td>
                        <td class="text-right">KES {{this.total}}</td>
                    </tr>
                    {{/each}}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" class="text-right text-bold">Subtotal</td>
                        <td class="text-right text-bold">KES {{order.subtotal}}</td>
                    </tr>
                    <tr>
                        <td colspan="4" class="text-right">Shipping</td>
                        <td class="text-right">KES {{order.shipping}}</td>
                    </tr>
                    <tr>
                        <td colspan="4" class="text-right">Tax</td>
                        <td class="text-right">KES {{order.tax}}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="4" class="text-right text-bold">Total Amount</td>
                        <td class="text-right text-bold">KES {{order.total}}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {{#if qrCode}}
        <div class="qr-code">
            <img src="{{qrCode}}" alt="Invoice QR Code">
            <p>Scan to view online invoice</p>
        </div>
        {{/if}}

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>If you have any questions about this invoice, please contact {{company.email}}</p>
            <p>Generated on {{_meta.generatedAt}} | Template: {{_meta.templateName}}</p>
        </div>
    </div>
</body>
</html>
    `;

    await this.saveTemplate({
      name: 'Invoice Template',
      content: invoiceTemplate,
      variables: ['invoice', 'company', 'customer', 'order', 'payment', 'qrCode'],
      defaultOptions: {
        format: 'A4',
        orientation: 'portrait',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        printBackground: true,
      },
    });
  }

  private async createDefaultReceiptTemplate(): Promise<void> {
    const receiptTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt {{receipt.number}}</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 10px;
        }
        .container {
            max-width: 400px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
        }
        .store-name {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            color: #dc2626;
        }
        .receipt-title {
            font-size: 18px;
            margin: 10px 0;
            text-transform: uppercase;
        }
        .receipt-info {
            text-align: center;
            margin-bottom: 20px;
        }
        .info-line {
            margin: 5px 0;
        }
        .items-table {
            width: 100%;
            margin: 20px 0;
        }
        .items-table td {
            padding: 5px 0;
            border-bottom: 1px dashed #ccc;
        }
        .total-section {
            margin-top: 20px;
            border-top: 2px solid #000;
            padding-top: 10px;
        }
        .total-line {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
        }
        .grand-total {
            font-weight: bold;
            font-size: 18px;
            border-top: 1px solid #000;
            padding-top: 10px;
            margin-top: 10px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
        }
        .qr-code {
            text-align: center;
            margin: 20px 0;
        }
        .qr-code img {
            width: 100px;
            height: 100px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="store-name">XARASTORE</h1>
            <h2 class="receipt-title">RECEIPT</h2>
        </div>

        <div class="receipt-info">
            <div class="info-line">Receipt #: {{receipt.number}}</div>
            <div class="info-line">Date: {{receipt.date}}</div>
            <div class="info-line">Time: {{receipt.time}}</div>
        </div>

        <div class="customer-info">
            <div class="info-line">Customer: {{customer.name}}</div>
            <div class="info-line">Email: {{customer.email}}</div>
            <div class="info-line">Phone: {{customer.phone}}</div>
        </div>

        <table class="items-table">
            <tbody>
                {{#each items}}
                <tr>
                    <td>{{this.name}} x{{this.quantity}}</td>
                    <td style="text-align: right;">KES {{this.total}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>

        <div class="total-section">
            <div class="total-line">
                <span>Subtotal:</span>
                <span>KES {{payment.amount}}</span>
            </div>
            <div class="total-line">
                <span>Payment Method:</span>
                <span>{{payment.method}}</span>
            </div>
            <div class="total-line">
                <span>Transaction ID:</span>
                <span>{{payment.transactionId}}</span>
            </div>
            <div class="total-line grand-total">
                <span>TOTAL PAID:</span>
                <span>KES {{payment.amount}}</span>
            </div>
        </div>

        {{#if qrCode}}
        <div class="qr-code">
            <img src="{{qrCode}}" alt="Receipt QR Code">
            <div>Scan for digital receipt</div>
        </div>
        {{/if}}

        <div class="footer">
            <div>Thank you for shopping with us!</div>
            <div>For returns or exchanges, bring this receipt</div>
            <div>within 30 days of purchase</div>
            <div>Customer Service: support@xarastore.com</div>
            <div>Generated: {{receipt.date}} {{receipt.time}}</div>
        </div>
    </div>
</body>
</html>
    `;

    await this.saveTemplate({
      name: 'Receipt Template',
      content: receiptTemplate,
      variables: ['receipt', 'customer', 'payment', 'items', 'qrCode'],
      defaultOptions: {
        format: 'A4',
        orientation: 'portrait',
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
        printBackground: true,
      },
    });
  }

  private async createDefaultShippingLabelTemplate(): Promise<void> {
    const shippingLabelTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Shipping Label {{tracking.number}}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
        }
        .label {
            width: 4in;
            height: 6in;
            padding: 0.1in;
            box-sizing: border-box;
            border: 1px solid #000;
            position: relative;
        }
        .label-header {
            text-align: center;
            border-bottom: 2px solid #dc2626;
            padding-bottom: 0.1in;
            margin-bottom: 0.1in;
        }
        .tracking-number {
            font-size: 14px;
            font-weight: bold;
            margin: 0.05in 0;
        }
        .carrier-info {
            font-size: 12px;
            color: #666;
        }
        .section {
            margin: 0.1in 0;
        }
        .section-title {
            font-size: 10px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 0.05in;
            text-transform: uppercase;
        }
        .address-block {
            font-size: 11px;
            line-height: 1.3;
        }
        .barcode {
            text-align: center;
            margin: 0.1in 0;
        }
        .barcode img {
            max-width: 100%;
            height: auto;
        }
        .qr-code {
            text-align: center;
            margin: 0.1in 0;
        }
        .qr-code img {
            width: 0.8in;
            height: 0.8in;
        }
        .package-info {
            font-size: 10px;
            border-top: 1px dashed #ccc;
            padding-top: 0.1in;
            margin-top: 0.1in;
        }
        .instructions {
            font-size: 9px;
            color: #666;
            font-style: italic;
            margin-top: 0.1in;
        }
        .from-to {
            display: flex;
            justify-content: space-between;
            margin: 0.1in 0;
        }
        .from, .to {
            width: 48%;
        }
    </style>
</head>
<body>
    <div class="label">
        <div class="label-header">
            <div class="tracking-number">{{tracking.number}}</div>
            <div class="carrier-info">{{tracking.carrier}} - {{tracking.service}}</div>
        </div>

        <div class="from-to">
            <div class="from">
                <div class="section-title">FROM</div>
                <div class="address-block">
                    <div>{{from.name}}</div>
                    <div>{{from.address}}</div>
                    <div>{{from.phone}}</div>
                </div>
            </div>
            <div class="to">
                <div class="section-title">TO</div>
                <div class="address-block">
                    <div>{{to.name}}</div>
                    <div>{{to.address}}</div>
                    <div>{{to.phone}}</div>
                    {{#if to.email}}
                    <div>{{to.email}}</div>
                    {{/if}}
                </div>
            </div>
        </div>

        {{#if barcode}}
        <div class="barcode">
            <img src="{{barcode}}" alt="Tracking Barcode">
        </div>
        {{/if}}

        {{#if qrCode}}
        <div class="qr-code">
            <img src="{{qrCode}}" alt="Tracking QR Code">
            <div style="font-size: 8px;">Scan to track</div>
        </div>
        {{/if}}

        <div class="package-info">
            <div class="section-title">Package Details</div>
            <div>Weight: {{package.weight}} kg</div>
            {{#if package.dimensions}}
            <div>Dimensions: {{package.dimensions}}</div>
            {{/if}}
            {{#if package.contents}}
            <div>Contents: {{package.contents}}</div>
            {{/if}}
        </div>

        {{#if instructions}}
        <div class="instructions">
            <div class="section-title">Special Instructions</div>
            <div>{{instructions}}</div>
        </div>
        {{/if}}
    </div>
</body>
</html>
    `;

    await this.saveTemplate({
      name: 'Shipping Label Template',
      content: shippingLabelTemplate,
      variables: ['tracking', 'from', 'to', 'package', 'instructions', 'barcode', 'qrCode'],
      defaultOptions: {
        format: 'A4',
        orientation: 'portrait',
        margin: {
          top: '0.1in',
          right: '0.1in',
          bottom: '0.1in',
          left: '0.1in',
        },
        printBackground: true,
      },
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance
let pdfGeneratorInstance: PDFGenerator | null = null;

export function getPDFGenerator(): PDFGenerator {
  if (!pdfGeneratorInstance) {
    pdfGeneratorInstance = new PDFGenerator();
  }
  return pdfGeneratorInstance;
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  if (pdfGeneratorInstance) {
    await pdfGeneratorInstance.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  if (pdfGeneratorInstance) {
    await pdfGeneratorInstance.close();
  }
  process.exit(0);
});
