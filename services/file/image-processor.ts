import sharp from 'sharp';
import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase/client';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  background?: string;
  blur?: number;
  rotate?: number;
  flip?: boolean;
  flop?: boolean;
  gamma?: number;
  tint?: string;
}

export interface ProcessedImage {
  id: string;
  originalUrl: string;
  processedUrl: string;
  format: string;
  width: number;
  height: number;
  size: number;
  hash: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export class ImageProcessor {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
  private readonly OUTPUT_FORMATS = ['jpeg', 'png', 'webp', 'avif'] as const;

  async processImage(
    file: Buffer | string,
    options: ImageProcessingOptions = {},
    bucket: string = 'product-images'
  ): Promise<ProcessedImage> {
    try {
      // Validate input
      let imageBuffer: Buffer;
      if (typeof file === 'string') {
        if (file.startsWith('http')) {
          const response = await fetch(file);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          imageBuffer = Buffer.from(await response.arrayBuffer());
        } else {
          imageBuffer = await fs.readFile(file);
        }
      } else {
        imageBuffer = file;
      }

      // Validate file size
      if (imageBuffer.length > this.MAX_FILE_SIZE) {
        throw new Error(`Image size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      
      // Validate MIME type
      if (!this.ALLOWED_MIME_TYPES.includes(`image/${metadata.format}`)) {
        throw new Error(`Unsupported image format: ${metadata.format}`);
      }

      // Set default options
      const processingOptions: Required<ImageProcessingOptions> = {
        width: options.width || metadata.width || 1200,
        height: options.height || metadata.height || 800,
        quality: options.quality || 80,
        format: options.format || 'webp',
        fit: options.fit || 'inside',
        background: options.background || '#FFFFFF',
        blur: options.blur || 0,
        rotate: options.rotate || 0,
        flip: options.flip || false,
        flop: options.flop || false,
        gamma: options.gamma || 2.2,
        tint: options.tint || '',
      };

      // Validate format
      if (!this.OUTPUT_FORMATS.includes(processingOptions.format)) {
        throw new Error(`Unsupported output format: ${processingOptions.format}`);
      }

      // Create Sharp pipeline
      let pipeline = sharp(imageBuffer);

      // Apply transformations
      if (processingOptions.flip) pipeline = pipeline.flip();
      if (processingOptions.flop) pipeline = pipeline.flop();
      if (processingOptions.rotate) pipeline = pipeline.rotate(processingOptions.rotate);
      if (processingOptions.gamma) pipeline = pipeline.gamma(processingOptions.gamma);
      if (processingOptions.tint) pipeline = pipeline.tint(processingOptions.tint);
      if (processingOptions.blur > 0) pipeline = pipeline.blur(processingOptions.blur);

      // Resize with specified fit
      pipeline = pipeline.resize({
        width: processingOptions.width,
        height: processingOptions.height,
        fit: processingOptions.fit,
        background: processingOptions.background,
        withoutEnlargement: true,
      });

      // Apply format-specific settings
      let processedBuffer: Buffer;
      switch (processingOptions.format) {
        case 'jpeg':
          processedBuffer = await pipeline
            .jpeg({ quality: processingOptions.quality, progressive: true })
            .toBuffer();
          break;
        case 'png':
          processedBuffer = await pipeline
            .png({ quality: processingOptions.quality, progressive: true })
            .toBuffer();
          break;
        case 'webp':
          processedBuffer = await pipeline
            .webp({ quality: processingOptions.quality })
            .toBuffer();
          break;
        case 'avif':
          processedBuffer = await pipeline
            .avif({ quality: processingOptions.quality })
            .toBuffer();
          break;
        default:
          processedBuffer = await pipeline.toBuffer();
      }

      // Generate hash for deduplication
      const hash = createHash('sha256').update(processedBuffer).digest('hex');

      // Check if image already exists
      const existingImage = await this.checkExistingImage(hash, bucket);
      if (existingImage) {
        return existingImage;
      }

      // Upload to Supabase Storage
      const fileName = `${uuidv4()}.${processingOptions.format}`;
      const filePath = `processed/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, processedBuffer, {
          contentType: `image/${processingOptions.format}`,
          upsert: false,
          cacheControl: 'public, max-age=31536000',
        });

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Create processed image record
      const processedImage: ProcessedImage = {
        id: uuidv4(),
        originalUrl: typeof file === 'string' ? file : 'buffer',
        processedUrl: publicUrl,
        format: processingOptions.format,
        width: processingOptions.width,
        height: processingOptions.height,
        size: processedBuffer.length,
        hash,
        metadata: {
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          originalFormat: metadata.format,
          originalSize: imageBuffer.length,
          channels: metadata.channels,
          space: metadata.space,
          density: metadata.density,
          hasAlpha: metadata.hasAlpha,
          hasProfile: metadata.hasProfile,
          isProgressive: metadata.isProgressive,
          processingOptions,
        },
        createdAt: new Date().toISOString(),
      };

      // Store metadata in database
      await this.storeImageMetadata(processedImage, bucket);

      return processedImage;
    } catch (error) {
      console.error('Image processing error:', error);
      throw error;
    }
  }

  async generateResponsiveImages(
    file: Buffer | string,
    sizes: number[] = [320, 640, 768, 1024, 1280, 1536, 1920],
    bucket: string = 'product-images'
  ): Promise<ProcessedImage[]> {
    const processedImages: ProcessedImage[] = [];

    for (const size of sizes) {
      try {
        const processedImage = await this.processImage(file, {
          width: size,
          height: Math.floor(size * 0.75),
          format: 'webp',
          quality: size <= 640 ? 75 : 85,
          fit: 'inside',
        }, bucket);

        processedImages.push(processedImage);
      } catch (error) {
        console.error(`Failed to generate ${size}px image:`, error);
        // Continue with other sizes
      }
    }

    return processedImages;
  }

  async generateBlurHash(file: Buffer | string): Promise<string> {
    try {
      const imageBuffer = typeof file === 'string' 
        ? await fs.readFile(file) 
        : file;

      const { data, info } = await sharp(imageBuffer)
        .resize(32, 32, { fit: 'inside' })
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });

      // This is a simplified blurhash generation
      // In production, use the blurhash library
      const pixels = new Uint8ClampedArray(data);
      let hash = '';
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        // Simple placeholder hash - replace with actual blurhash library
        hash += r.toString(16).padStart(2, '0') +
                g.toString(16).padStart(2, '0') +
                b.toString(16).padStart(2, '0').substring(0, 2);
      }

      return hash.substring(0, 32); // Return fixed length hash
    } catch (error) {
      console.error('Blurhash generation error:', error);
      return '';
    }
  }

  async optimizeForWeb(file: Buffer | string): Promise<Buffer> {
    const imageBuffer = typeof file === 'string' 
      ? await fs.readFile(file) 
      : file;

    return await sharp(imageBuffer)
      .webp({ quality: 75, effort: 6 })
      .toBuffer();
  }

  async extractDominantColor(file: Buffer | string): Promise<string> {
    try {
      const imageBuffer = typeof file === 'string' 
        ? await fs.readFile(file) 
        : file;

      const { dominant } = await sharp(imageBuffer)
        .resize(100, 100, { fit: 'inside' })
        .stats();

      return `rgb(${dominant.r}, ${dominant.g}, ${dominant.b})`;
    } catch (error) {
      console.error('Color extraction error:', error);
      return '#FFFFFF';
    }
  }

  async validateImage(file: Buffer): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check file size
    if (file.length > this.MAX_FILE_SIZE) {
      errors.push(`File size exceeds ${this.MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    try {
      const metadata = await sharp(file).metadata();
      
      // Check format
      if (!metadata.format || !this.ALLOWED_MIME_TYPES.includes(`image/${metadata.format}`)) {
        errors.push(`Unsupported image format: ${metadata.format}`);
      }

      // Check dimensions
      if (!metadata.width || !metadata.height) {
        errors.push('Unable to read image dimensions');
      } else if (metadata.width > 10000 || metadata.height > 10000) {
        errors.push('Image dimensions too large');
      }

      // Check for corruptions
      await sharp(file).metadata(); // This will throw if image is corrupt

    } catch (error) {
      errors.push('Image appears to be corrupted or invalid');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async deleteImage(imageId: string, bucket: string = 'product-images'): Promise<boolean> {
    try {
      // Get image record from database
      const { data: imageRecord, error: fetchError } = await supabase
        .from('processed_images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (fetchError || !imageRecord) {
        throw new Error('Image not found in database');
      }

      // Delete from storage
      const filePath = imageRecord.processed_url.split('/').pop();
      if (filePath) {
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([`processed/${filePath}`]);

        if (deleteError) {
          throw new Error(`Failed to delete from storage: ${deleteError.message}`);
        }
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from('processed_images')
        .delete()
        .eq('id', imageId);

      if (dbError) {
        throw new Error(`Failed to delete database record: ${dbError.message}`);
      }

      return true;
    } catch (error) {
      console.error('Image deletion error:', error);
      return false;
    }
  }

  private async checkExistingImage(hash: string, bucket: string): Promise<ProcessedImage | null> {
    try {
      const { data, error } = await supabase
        .from('processed_images')
        .select('*')
        .eq('hash', hash)
        .eq('bucket', bucket)
        .single();

      if (error || !data) {
        return null;
      }

      return data as ProcessedImage;
    } catch (error) {
      return null;
    }
  }

  private async storeImageMetadata(image: ProcessedImage, bucket: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('processed_images')
        .insert({
          id: image.id,
          original_url: image.originalUrl,
          processed_url: image.processedUrl,
          format: image.format,
          width: image.width,
          height: image.height,
          size: image.size,
          hash: image.hash,
          metadata: image.metadata,
          bucket,
          created_at: image.createdAt,
        });

      if (error) {
        throw new Error(`Failed to store image metadata: ${error.message}`);
      }
    } catch (error) {
      console.error('Metadata storage error:', error);
      throw error;
    }
  }

  async batchProcess(
    files: Array<{ buffer: Buffer; fileName: string }>,
    options: ImageProcessingOptions = {},
    bucket: string = 'product-images'
  ): Promise<Array<{ fileName: string; result: ProcessedImage | null; error?: string }>> {
    const results = [];

    // Process in batches of 5 to avoid memory issues
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.processImage(file.buffer, options, bucket);
          return { fileName: file.fileName, result, error: undefined };
        } catch (error: any) {
          return { fileName: file.fileName, result: null, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  async getImageStats(bucket: string = 'product-images'): Promise<{
    totalImages: number;
    totalSize: number;
    formats: Record<string, number>;
    averageSize: number;
    lastProcessed: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('processed_images')
        .select('size, format, created_at')
        .eq('bucket', bucket);

      if (error) {
        throw new Error(`Failed to fetch image stats: ${error.message}`);
      }

      const totalImages = data.length;
      const totalSize = data.reduce((sum, img) => sum + (img.size || 0), 0);
      const formats = data.reduce((acc, img) => {
        acc[img.format] = (acc[img.format] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const lastProcessed = data.length > 0
        ? new Date(Math.max(...data.map(img => new Date(img.created_at).getTime()))).toISOString()
        : null;

      return {
        totalImages,
        totalSize,
        formats,
        averageSize: totalImages > 0 ? Math.round(totalSize / totalImages) : 0,
        lastProcessed,
      };
    } catch (error) {
      console.error('Image stats error:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        formats: {},
        averageSize: 0,
        lastProcessed: null,
      };
    }
  }
}

// Singleton instance
let imageProcessorInstance: ImageProcessor | null = null;

export function getImageProcessor(): ImageProcessor {
  if (!imageProcessorInstance) {
    imageProcessorInstance = new ImageProcessor();
  }
  return imageProcessorInstance;
}
