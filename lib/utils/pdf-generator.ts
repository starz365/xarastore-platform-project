import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  notes?: string;
  terms?: string;
}

export interface OrderData {
  orderNumber: string;
  orderDate: Date;
  customer: {
    name: string;
    email: string;
    phone: string;
    shippingAddress: string;
    billingAddress?: string;
  };
  items: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  shippingMethod: string;
  trackingNumber?: string;
}

export class PDFGenerator {
  private static instance: PDFGenerator;

  private constructor() {}

  static getInstance(): PDFGenerator {
    if (!PDFGenerator.instance) {
      PDFGenerator.instance = new PDFGenerator();
    }
    return PDFGenerator.instance;
  }

  async generateInvoice(invoiceData: InvoiceData): Promise<Blob> {
    const doc = new jsPDF();
    
    // Add logo
    await this.addLogo(doc);
    
    // Add header
    this.addInvoiceHeader(doc, invoiceData);
    
    // Add customer info
    this.addCustomerInfo(doc, invoiceData.customer);
    
    // Add invoice items table
    this.addInvoiceItemsTable(doc, invoiceData);
    
    // Add totals
    this.addInvoiceTotals(doc, invoiceData);
    
    // Add notes and terms
    this.addNotesAndTerms(doc, invoiceData);
    
    // Add footer
    this.addFooter(doc);
    
    return doc.output('blob');
  }

  async generateOrderConfirmation(orderData: OrderData): Promise<Blob> {
    const doc = new jsPDF();
    
    // Add logo
    await this.addLogo(doc);
    
    // Add header
    this.addOrderHeader(doc, orderData);
    
    // Add customer info
    this.addOrderCustomerInfo(doc, orderData.customer);
    
    // Add order items table
    this.addOrderItemsTable(doc, orderData);
    
    // Add order summary
    this.addOrderSummary(doc, orderData);
    
    // Add shipping info
    this.addShippingInfo(doc, orderData);
    
    // Add footer
    this.addFooter(doc);
    
    return doc.output('blob');
  }

  async generateReceipt(orderData: OrderData): Promise<Blob> {
    const doc = new jsPDF();
    
    // Add logo
    await this.addLogo(doc);
    
    // Add receipt header
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38); // Brand red
    doc.text('PAYMENT RECEIPT', 105, 20, { align: 'center' });
    
    // Add receipt details
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    doc.text(`Receipt #: ${orderData.orderNumber}`, 20, 40);
    doc.text(`Date: ${this.formatDate(orderData.orderDate)}`, 20, 47);
    doc.text(`Time: ${this.formatTime(orderData.orderDate)}`, 20, 54);
    
    // Add customer info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Information', 20, 70);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${orderData.customer.name}`, 20, 78);
    doc.text(`Email: ${orderData.customer.email}`, 20, 85);
    doc.text(`Phone: ${orderData.customer.phone}`, 20, 92);
    
    // Add items table
    autoTable(doc, {
      startY: 105,
      head: [['Item', 'Qty', 'Unit Price', 'Total']],
      body: orderData.items.map(item => [
        item.name,
        item.quantity.toString(),
        `KES ${item.unitPrice.toLocaleString()}`,
        `KES ${item.total.toLocaleString()}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
    });
    
    // Add totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.text('Subtotal:', 140, finalY);
    doc.text(`KES ${orderData.subtotal.toLocaleString()}`, 180, finalY, { align: 'right' });
    
    doc.text('Shipping:', 140, finalY + 7);
    doc.text(`KES ${orderData.shipping.toLocaleString()}`, 180, finalY + 7, { align: 'right' });
    
    doc.text('Tax:', 140, finalY + 14);
    doc.text(`KES ${orderData.tax.toLocaleString()}`, 180, finalY + 14, { align: 'right' });
    
    if (orderData.discount > 0) {
      doc.text('Discount:', 140, finalY + 21);
      doc.text(`-KES ${orderData.discount.toLocaleString()}`, 180, finalY + 21, { align: 'right' });
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', 140, finalY + 28);
    doc.text(`KES ${orderData.total.toLocaleString()}`, 180, finalY + 28, { align: 'right' });
    
    // Add payment info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Method: ${orderData.paymentMethod}`, 20, finalY + 40);
    doc.text(`Payment Status: PAID`, 20, finalY + 47);
    doc.text(`Transaction ID: ${orderData.orderNumber}-${Date.now()}`, 20, finalY + 54);
    
    // Add footer
    this.addReceiptFooter(doc);
    
    return doc.output('blob');
  }

  async generateShippingLabel(orderData: OrderData): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [100, 150] // Standard shipping label size
    });
    
    // Add logo
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text('XARASTORE', 50, 10, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    
    // Add shipping info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIP TO:', 10, 25);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = this.splitAddress(orderData.customer.shippingAddress);
    lines.forEach((line, index) => {
      doc.text(line, 10, 35 + (index * 5));
    });
    
    doc.text(`Phone: ${orderData.customer.phone}`, 10, 35 + (lines.length * 5));
    
    // Add order info
    doc.setFontSize(8);
    doc.text(`Order #: ${orderData.orderNumber}`, 10, 70);
    doc.text(`Date: ${this.formatDate(orderData.orderDate)}`, 10, 75);
    doc.text(`Items: ${orderData.items.length}`, 10, 80);
    
    // Add tracking barcode placeholder
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TRACKING #', 10, 95);
    doc.text(orderData.trackingNumber || 'PENDING', 10, 102);
    
    // Add delivery instructions
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Handle with care', 10, 120);
    doc.text('Fragile contents', 10, 125);
    doc.text('Store in dry place', 10, 130);
    
    // Add return address
    doc.setFontSize(6);
    doc.text('RETURN ADDRESS:', 60, 120);
    doc.text('Xarastore Ltd.', 60, 125);
    doc.text('Nairobi, Kenya', 60, 130);
    doc.text('support@xarastore.com', 60, 135);
    
    return doc.output('blob');
  }

  private async addLogo(doc: jsPDF): Promise<void> {
    // In production, load logo from URL or base64
    const logoText = 'XARASTORE';
    
    doc.setFontSize(16);
    doc.setTextColor(220, 38, 38); // Brand red
    doc.text(logoText, 20, 20);
    doc.setTextColor(0, 0, 0);
  }

  private addInvoiceHeader(doc: jsPDF, data: InvoiceData): void {
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${data.invoiceNumber}`, 150, 40);
    doc.text(`Date: ${this.formatDate(data.invoiceDate)}`, 150, 47);
    doc.text(`Due Date: ${this.formatDate(data.dueDate)}`, 150, 54);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Xarastore Ltd.', 20, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Nairobi, Kenya', 20, 47);
    doc.text('support@xarastore.com', 20, 54);
    doc.text('+254 700 000 000', 20, 61);
  }

  private addCustomerInfo(doc: jsPDF, customer: InvoiceData['customer']): void {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, 80);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, 20, 88);
    doc.text(customer.email, 20, 95);
    doc.text(customer.phone, 20, 102);
    
    const addressLines = this.splitAddress(customer.address);
    addressLines.forEach((line, index) => {
      doc.text(line, 20, 109 + (index * 7));
    });
  }

  private addInvoiceItemsTable(doc: jsPDF, data: InvoiceData): void {
    autoTable(doc, {
      startY: 140,
      head: [['Description', 'Quantity', 'Unit Price', 'Total']],
      body: data.items.map(item => [
        item.description,
        item.quantity.toString(),
        `KES ${item.unitPrice.toLocaleString()}`,
        `KES ${item.total.toLocaleString()}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
    });
  }

  private addInvoiceTotals(doc: jsPDF, data: InvoiceData): void {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.text('Subtotal:', 140, finalY);
    doc.text(`KES ${data.subtotal.toLocaleString()}`, 180, finalY, { align: 'right' });
    
    if (data.tax > 0) {
      doc.text('Tax:', 140, finalY + 7);
      doc.text(`KES ${data.tax.toLocaleString()}`, 180, finalY + 7, { align: 'right' });
    }
    
    if (data.shipping > 0) {
      doc.text('Shipping:', 140, finalY + 14);
      doc.text(`KES ${data.shipping.toLocaleString()}`, 180, finalY + 14, { align: 'right' });
    }
    
    if (data.discount > 0) {
      doc.text('Discount:', 140, finalY + 21);
      doc.text(`-KES ${data.discount.toLocaleString()}`, 180, finalY + 21, { align: 'right' });
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', 140, finalY + 28);
    doc.text(`KES ${data.total.toLocaleString()}`, 180, finalY + 28, { align: 'right' });
  }

  private addNotesAndTerms(doc: jsPDF, data: InvoiceData): void {
    const finalY = (doc as any).lastAutoTable.finalY + 40;
    
    if (data.notes) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, finalY);
      doc.setFont('helvetica', 'normal');
      const noteLines = this.splitText(data.notes, 80);
      noteLines.forEach((line, index) => {
        doc.text(line, 20, finalY + 7 + (index * 5));
      });
    }
    
    if (data.terms) {
      const notesY = data.notes ? finalY + 7 + (this.splitText(data.notes, 80).length * 5) : finalY;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Terms:', 20, notesY + 10);
      doc.setFont('helvetica', 'normal');
      const termLines = this.splitText(data.terms, 80);
      termLines.forEach((line, index) => {
        doc.text(line, 20, notesY + 17 + (index * 5));
      });
    }
  }

  private addOrderHeader(doc: jsPDF, data: OrderData): void {
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDER CONFIRMATION', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Order #: ${data.orderNumber}`, 150, 40);
    doc.text(`Date: ${this.formatDate(data.orderDate)}`, 150, 47);
    doc.text(`Status: CONFIRMED`, 150, 54);
  }

  private addOrderCustomerInfo(doc: jsPDF, customer: OrderData['customer']): void {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Information', 20, 80);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${customer.name}`, 20, 88);
    doc.text(`Email: ${customer.email}`, 20, 95);
    doc.text(`Phone: ${customer.phone}`, 20, 102);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Shipping Address:', 20, 116);
    doc.setFont('helvetica', 'normal');
    const shippingLines = this.splitAddress(customer.shippingAddress);
    shippingLines.forEach((line, index) => {
      doc.text(line, 20, 124 + (index * 7));
    });
    
    if (customer.billingAddress) {
      doc.setFont('helvetica', 'bold');
      doc.text('Billing Address:', 20, 124 + (shippingLines.length * 7) + 7);
      doc.setFont('helvetica', 'normal');
      const billingLines = this.splitAddress(customer.billingAddress);
      billingLines.forEach((line, index) => {
        doc.text(line, 20, 124 + (shippingLines.length * 7) + 14 + (index * 7));
      });
    }
  }

  private addOrderItemsTable(doc: jsPDF, data: OrderData): void {
    const startY = data.customer.billingAddress 
      ? 124 + (this.splitAddress(data.customer.shippingAddress).length * 7) + 
        (this.splitAddress(data.customer.billingAddress!).length * 7) + 21
      : 124 + (this.splitAddress(data.customer.shippingAddress).length * 7) + 14;
    
    autoTable(doc, {
      startY,
      head: [['Product', 'SKU', 'Qty', 'Price', 'Total']],
      body: data.items.map(item => [
        item.name,
        item.sku,
        item.quantity.toString(),
        `KES ${item.unitPrice.toLocaleString()}`,
        `KES ${item.total.toLocaleString()}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
    });
  }

  private addOrderSummary(doc: jsPDF, data: OrderData): void {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.text('Order Summary', 20, finalY);
    
    doc.text('Subtotal:', 140, finalY);
    doc.text(`KES ${data.subtotal.toLocaleString()}`, 180, finalY, { align: 'right' });
    
    doc.text('Shipping:', 140, finalY + 7);
    doc.text(`KES ${data.shipping.toLocaleString()}`, 180, finalY + 7, { align: 'right' });
    
    doc.text('Tax:', 140, finalY + 14);
    doc.text(`KES ${data.tax.toLocaleString()}`, 180, finalY + 14, { align: 'right' });
    
    if (data.discount > 0) {
      doc.text('Discount:', 140, finalY + 21);
      doc.text(`-KES ${data.discount.toLocaleString()}`, 180, finalY + 21, { align: 'right' });
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', 140, finalY + 28);
    doc.text(`KES ${data.total.toLocaleString()}`, 180, finalY + 28, { align: 'right' });
  }

  private addShippingInfo(doc: jsPDF, data: OrderData): void {
    const finalY = (doc as any).lastAutoTable.finalY + 40;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Shipping Information', 20, finalY);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Method: ${data.shippingMethod}`, 20, finalY + 7);
    doc.text(`Estimated Delivery: 3-5 business days`, 20, finalY + 14);
    
    if (data.trackingNumber) {
      doc.text(`Tracking #: ${data.trackingNumber}`, 20, finalY + 21);
    }
  }

  private addFooter(doc: jsPDF): void {
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', 105, pageHeight - 20, { align: 'center' });
    doc.text('For any questions, contact support@xarastore.com', 105, pageHeight - 15, { align: 'center' });
    doc.text('Xarastore Ltd. • Nairobi, Kenya • +254 700 000 000', 105, pageHeight - 10, { align: 'center' });
  }

  private addReceiptFooter(doc: jsPDF): void {
    const pageHeight = doc.internal.pageSize.height;
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('This is an electronic receipt. No signature required.', 105, pageHeight - 20, { align: 'center' });
    doc.text('Keep this receipt for your records.', 105, pageHeight - 15, { align: 'center' });
    doc.text('Valid for tax and warranty purposes.', 105, pageHeight - 10, { align: 'center' });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-KE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private splitAddress(address: string): string[] {
    const maxLength = 40;
    const words = address.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  private splitText(text: string, maxLength: number): string[] {
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of text.split(' ')) {
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  async generateQRCode(text: string, size: number = 100): Promise<Blob> {
    // In production, use a proper QR code library
    // This is a simplified implementation
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    
    // Simple QR-like pattern (in production, use a proper QR library)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    ctx.fillStyle = '#000000';
    const cellSize = size / 20;
    
    // Create a simple pattern
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        if ((i + j) % 3 === 0 || (i * j) % 5 === 0) {
          ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
        }
      }
    }
    
    // Add text
    ctx.fillStyle = '#000000';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', size / 2, size - 5);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/png');
    });
  }
}

export const pdfGenerator = PDFGenerator.getInstance();
