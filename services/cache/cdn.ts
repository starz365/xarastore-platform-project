import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export interface CDNConfig {
  provider: 'supabase' | 'cloudflare' | 'aws' | 'custom';
  bucket: string;
  baseUrl: string;
  accessKey?: string;
  secretKey?: string;
  region?: string;
  cacheControl?: string;
}

export interface UploadOptions {
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
  public?: boolean;
  upsert?: boolean;
}

export interface CDNFile {
  key: string;
  url: string;
  size: number;
  contentType: string;
  etag: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

export class CDNService {
  private config: CDNConfig;
  private supabaseClient: any;
  private isInitialized = false;

  constructor(config: Partial<CDNConfig> = {}) {
    this.config = {
      provider: 'supabase',
      bucket: process.env.SUPABASE_STORAGE_BUCKET || 'products',
      baseUrl: process.env.CDN_BASE_URL || '',
      cacheControl: 'public, max-age=31536000, immutable',
      ...config,
    };

    if (this.config.provider === 'supabase') {
      this.supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.config.provider === 'supabase') {
        // Test Supabase connection
        const { data, error } = await this.supabaseClient
          .storage
          .from(this.config.bucket)
          .list();

        if (error) {
          throw new Error(`Supabase storage error: ${error.message}`);
        }

        console.log('CDN connected to Supabase storage');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('CDN initialization failed:', error);
      throw error;
    }
  }

  async uploadFile(
    file: Buffer | File | string,
    key: string,
    options: UploadOptions = {}
  ): Promise<CDNFile> {
    await this.ensureInitialized();

    try {
      let buffer: Buffer;
      let contentType = options.contentType || 'application/octet-stream';

      if (typeof file === 'string') {
        // File path
        buffer = await fs.readFile(file);
        contentType = this.getContentTypeFromPath(file) || contentType;
      } else if (file instanceof File) {
        // Web File object
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        contentType = file.type || contentType;
      } else {
        // Buffer
        buffer = file;
      }

      const fileHash = crypto.createHash('md5').update(buffer).digest('hex');
      const finalKey = this.normalizeKey(key);

      switch (this.config.provider) {
        case 'supabase':
          return await this.uploadToSupabase(buffer, finalKey, contentType, options);
        
        case 'cloudflare':
          return await this.uploadToCloudflare(buffer, finalKey, contentType, options);
        
        case 'aws':
          return await this.uploadToAWS(buffer, finalKey, contentType, options);
        
        default:
          throw new Error(`Unsupported CDN provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('CDN upload failed:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadImage(
    image: Buffer,
    key: string,
    options: UploadOptions & {
      resize?: { width?: number; height?: number; fit?: 'cover' | 'contain' | 'fill' };
      format?: 'webp' | 'jpeg' | 'png' | 'avif';
      quality?: number;
    } = {}
  ): Promise<CDNFile[]> {
    await this.ensureInitialized();

    try {
      const sharp = require('sharp');
      const results: CDNFile[] = [];
      const baseKey = this.normalizeKey(key);
      
      // Process original image
      let imageProcessor = sharp(image);
      
      // Apply resize if specified
      if (options.resize) {
        imageProcessor = imageProcessor.resize(
          options.resize.width,
          options.resize.height,
          {
            fit: options.resize.fit || 'cover',
            withoutEnlargement: true,
          }
        );
      }
      
      // Convert to format
      const format = options.format || 'webp';
      imageProcessor = imageProcessor.toFormat(format, {
        quality: options.quality || 80,
      });
      
      const processedBuffer = await imageProcessor.toBuffer();
      const contentType = `image/${format}`;
      
      // Upload processed image
      const processedFile = await this.uploadFile(
        processedBuffer,
        `${baseKey}.${format}`,
        {
          ...options,
          contentType,
        }
      );
      
      results.push(processedFile);
      
      // Generate responsive sizes if requested
      if (options.resize?.width) {
        const sizes = [320, 640, 768, 1024, 1280, 1536];
        
        for (const size of sizes) {
          if (size >= (options.resize.width || 0)) continue;
          
          const resizedBuffer = await sharp(processedBuffer)
            .resize(size, null, { withoutEnlargement: true })
            .toFormat(format, { quality: options.quality || 80 })
            .toBuffer();
          
          const resizedFile = await this.uploadFile(
            resizedBuffer,
            `${baseKey}-${size}w.${format}`,
            {
              ...options,
              contentType,
            }
          );
          
          results.push(resizedFile);
        }
      }
      
      return results;
    } catch (error) {
      console.error('CDN image upload failed:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFile(key: string): Promise<CDNFile | null> {
    await this.ensureInitialized();

    try {
      const normalizedKey = this.normalizeKey(key);

      switch (this.config.provider) {
        case 'supabase':
          return await this.getFromSupabase(normalizedKey);
        
        case 'cloudflare':
          return await this.getFromCloudflare(normalizedKey);
        
        case 'aws':
          return await this.getFromAWS(normalizedKey);
        
        default:
          throw new Error(`Unsupported CDN provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error(`CDN get file failed for key ${key}:`, error);
      return null;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const normalizedKey = this.normalizeKey(key);

      switch (this.config.provider) {
        case 'supabase':
          return await this.deleteFromSupabase(normalizedKey);
        
        case 'cloudflare':
          return await this.deleteFromCloudflare(normalizedKey);
        
        case 'aws':
          return await this.deleteFromAWS(normalizedKey);
        
        default:
          throw new Error(`Unsupported CDN provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error(`CDN delete file failed for key ${key}:`, error);
      return false;
    }
  }

  async listFiles(prefix?: string, limit: number = 100): Promise<CDNFile[]> {
    await this.ensureInitialized();

    try {
      switch (this.config.provider) {
        case 'supabase':
          return await this.listFromSupabase(prefix, limit);
        
        case 'cloudflare':
          return await this.listFromCloudflare(prefix, limit);
        
        case 'aws':
          return await this.listFromAWS(prefix, limit);
        
        default:
          throw new Error(`Unsupported CDN provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('CDN list files failed:', error);
      return [];
    }
  }

  async getSignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    await this.ensureInitialized();

    try {
      const normalizedKey = this.normalizeKey(key);

      switch (this.config.provider) {
        case 'supabase':
          return await this.getSignedUrlFromSupabase(normalizedKey, expiresIn);
        
        case 'cloudflare':
          return await this.getSignedUrlFromCloudflare(normalizedKey, expiresIn);
        
        case 'aws':
          return await this.getSignedUrlFromAWS(normalizedKey, expiresIn);
        
        default:
          throw new Error(`Unsupported CDN provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error(`CDN signed URL failed for key ${key}:`, error);
      throw error;
    }
  }

  async purgeCache(urls: string[]): Promise<boolean> {
    await this.ensureInitialized();

    try {
      switch (this.config.provider) {
        case 'cloudflare':
          return await this.purgeCloudflareCache(urls);
        
        case 'aws':
          return await this.purgeAWSCache(urls);
        
        default:
          console.warn(`Cache purge not supported for provider: ${this.config.provider}`);
          return false;
      }
    } catch (error) {
      console.error('CDN cache purge failed:', error);
      return false;
    }
  }

  getPublicUrl(key: string): string {
    const normalizedKey = this.normalizeKey(key);
    
    if (this.config.baseUrl) {
      return `${this.config.baseUrl}/${normalizedKey}`;
    }
    
    switch (this.config.provider) {
      case 'supabase':
        return this.getSupabasePublicUrl(normalizedKey);
      
      default:
        throw new Error(`Public URL not configured for provider: ${this.config.provider}`);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private normalizeKey(key: string): string {
    // Remove leading slash
    let normalized = key.startsWith('/') ? key.slice(1) : key;
    
    // Normalize path separators
    normalized = normalized.replace(/\\/g, '/');
    
    // Remove double slashes
    normalized = normalized.replace(/\/\//g, '/');
    
    // Add timestamp for cache busting if no query string
    if (!normalized.includes('?')) {
      const ext = path.extname(normalized);
      const base = normalized.slice(0, -ext.length);
      const timestamp = Date.now();
      normalized = `${base}-${timestamp}${ext}`;
    }
    
    return normalized;
  }

  private getContentTypeFromPath(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.json': 'application/json',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Supabase implementations
  private async uploadToSupabase(
    buffer: Buffer,
    key: string,
    contentType: string,
    options: UploadOptions
  ): Promise<CDNFile> {
    const { data, error } = await this.supabaseClient
      .storage
      .from(this.config.bucket)
      .upload(key, buffer, {
        contentType,
        cacheControl: options.cacheControl || this.config.cacheControl,
        upsert: options.upsert || false,
      });

    if (error) throw error;

    const fileUrl = this.getSupabasePublicUrl(key);
    const fileInfo = await this.getFromSupabase(key);

    if (!fileInfo) {
      throw new Error('Failed to retrieve uploaded file info');
    }

    return fileInfo;
  }

  private async getFromSupabase(key: string): Promise<CDNFile | null> {
    const { data, error } = await this.supabaseClient
      .storage
      .from(this.config.bucket)
      .list('', {
        limit: 1,
        offset: 0,
        search: key,
      });

    if (error || !data || data.length === 0) {
      return null;
    }

    const file = data[0];
    const url = this.getSupabasePublicUrl(key);

    return {
      key: file.name,
      url,
      size: file.metadata?.size || 0,
      contentType: file.metadata?.mimetype || 'application/octet-stream',
      etag: file.id,
      lastModified: new Date(file.updated_at),
      metadata: file.metadata,
    };
  }

  private async deleteFromSupabase(key: string): Promise<boolean> {
    const { error } = await this.supabaseClient
      .storage
      .from(this.config.bucket)
      .remove([key]);

    return !error;
  }

  private async listFromSupabase(prefix?: string, limit: number = 100): Promise<CDNFile[]> {
    const { data, error } = await this.supabaseClient
      .storage
      .from(this.config.bucket)
      .list(prefix, {
        limit,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) return [];

    return data.map((file: any) => ({
      key: file.name,
      url: this.getSupabasePublicUrl(file.name),
      size: file.metadata?.size || 0,
      contentType: file.metadata?.mimetype || 'application/octet-stream',
      etag: file.id,
      lastModified: new Date(file.updated_at),
      metadata: file.metadata,
    }));
  }

  private async getSignedUrlFromSupabase(key: string, expiresIn: number): Promise<string> {
    const { data, error } = await this.supabaseClient
      .storage
      .from(this.config.bucket)
      .createSignedUrl(key, expiresIn);

    if (error) throw error;

    return data.signedUrl;
  }

  private getSupabasePublicUrl(key: string): string {
    const { data } = this.supabaseClient
      .storage
      .from(this.config.bucket)
      .getPublicUrl(key);

    return data.publicUrl;
  }

  // Cloudflare implementations (simplified)
  private async uploadToCloudflare(
    buffer: Buffer,
    key: string,
    contentType: string,
    options: UploadOptions
  ): Promise<CDNFile> {
    throw new Error('Cloudflare implementation not complete');
  }

  private async getFromCloudflare(key: string): Promise<CDNFile | null> {
    throw new Error('Cloudflare implementation not complete');
  }

  private async deleteFromCloudflare(key: string): Promise<boolean> {
    throw new Error('Cloudflare implementation not complete');
  }

  private async listFromCloudflare(prefix?: string, limit: number = 100): Promise<CDNFile[]> {
    throw new Error('Cloudflare implementation not complete');
  }

  private async getSignedUrlFromCloudflare(key: string, expiresIn: number): Promise<string> {
    throw new Error('Cloudflare implementation not complete');
  }

  private async purgeCloudflareCache(urls: string[]): Promise<boolean> {
    throw new Error('Cloudflare implementation not complete');
  }

  // AWS S3 implementations (simplified)
  private async uploadToAWS(
    buffer: Buffer,
    key: string,
    contentType: string,
    options: UploadOptions
  ): Promise<CDNFile> {
    throw new Error('AWS S3 implementation not complete');
  }

  private async getFromAWS(key: string): Promise<CDNFile | null> {
    throw new Error('AWS S3 implementation not complete');
  }

  private async deleteFromAWS(key: string): Promise<boolean> {
    throw new Error('AWS S3 implementation not complete');
  }

  private async listFromAWS(prefix?: string, limit: number = 100): Promise<CDNFile[]> {
    throw new Error('AWS S3 implementation not complete');
  }

  private async getSignedUrlFromAWS(key: string, expiresIn: number): Promise<string> {
    throw new Error('AWS S3 implementation not complete');
  }

  private async purgeAWSCache(urls: string[]): Promise<boolean> {
    throw new Error('AWS S3 implementation not complete');
  }

  // Utility methods
  async optimizeImage(
    image: Buffer,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
    } = {}
  ): Promise<Buffer> {
    try {
      const sharp = require('sharp');
      
      let processor = sharp(image);
      
      // Get image metadata
      const metadata = await processor.metadata();
      
      // Calculate resize dimensions
      let width = metadata.width;
      let height = metadata.height;
      
      if (options.maxWidth && width && width > options.maxWidth) {
        height = Math.round((height! * options.maxWidth) / width);
        width = options.maxWidth;
      }
      
      if (options.maxHeight && height && height > options.maxHeight) {
        width = Math.round((width! * options.maxHeight) / height);
        height = options.maxHeight;
      }
      
      // Resize if needed
      if (width !== metadata.width || height !== metadata.height) {
        processor = processor.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
      
      // Convert format
      const format = options.format || 'webp';
      processor = processor.toFormat(format, {
        quality: options.quality || 80,
      });
      
      return await processor.toBuffer();
    } catch (error) {
      console.error('Image optimization failed:', error);
      throw error;
    }
  }

  generateImageVariants(
    baseKey: string,
    sizes: number[] = [320, 640, 768, 1024, 1280, 1536]
  ): string[] {
    const ext = path.extname(baseKey);
    const base = baseKey.slice(0, -ext.length);
    
    return sizes.map(size => `${base}-${size}w${ext}`);
  }

  async validateImage(buffer: Buffer): Promise<{
    isValid: boolean;
    width?: number;
    height?: number;
    format?: string;
    size: number;
  }> {
    try {
      const sharp = require('sharp');
      const metadata = await sharp(buffer).metadata();
      
      return {
        isValid: true,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: buffer.length,
      };
    } catch (error) {
      return {
        isValid: false,
        size: buffer.length,
      };
    }
  }

  async calculateFileHash(buffer: Buffer, algorithm: string = 'md5'): Promise<string> {
    return crypto.createHash(algorithm).update(buffer).digest('hex');
  }

  getFileExtension(contentType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'application/pdf': '.pdf',
      'application/json': '.json',
      'text/plain': '.txt',
      'text/html': '.html',
      'text/css': '.css',
      'application/javascript': '.js',
    };
    
    return extensions[contentType] || '.bin';
  }
}

// Singleton instance
let cdnServiceInstance: CDNService | null = null;

export function getCDNService(): CDNService {
  if (!cdnServiceInstance) {
    cdnServiceInstance = new CDNService();
  }
  return cdnServiceInstance;
}
