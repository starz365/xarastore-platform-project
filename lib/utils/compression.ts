export class CompressionService {
  private static instance: CompressionService;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  private constructor() {}

  static getInstance(): CompressionService {
    if (!CompressionService.instance) {
      CompressionService.instance = new CompressionService();
    }
    return CompressionService.instance;
  }

  async compressText(text: string): Promise<Uint8Array> {
    try {
      const compressedStream = new CompressionStream('gzip');
      const writer = compressedStream.writable.getWriter();
      
      await writer.write(this.encoder.encode(text));
      await writer.close();
      
      const response = new Response(compressedStream.readable);
      const buffer = await response.arrayBuffer();
      
      return new Uint8Array(buffer);
    } catch (error) {
      console.error('Text compression error:', error);
      throw error;
    }
  }

  async decompressText(compressed: Uint8Array): Promise<string> {
    try {
      const decompressedStream = new DecompressionStream('gzip');
      const writer = decompressedStream.writable.getWriter();
      
      await writer.write(compressed);
      await writer.close();
      
      const response = new Response(decompressedStream.readable);
      const buffer = await response.arrayBuffer();
      
      return this.decoder.decode(buffer);
    } catch (error) {
      console.error('Text decompression error:', error);
      throw error;
    }
  }

  async compressJSON(data: any): Promise<Uint8Array> {
    const jsonString = JSON.stringify(data);
    return this.compressText(jsonString);
  }

  async decompressJSON<T = any>(compressed: Uint8Array): Promise<T> {
    const jsonString = await this.decompressText(compressed);
    return JSON.parse(jsonString);
  }

  compressBase64(text: string): string {
    return btoa(text);
  }

  decompressBase64(base64: string): string {
    return atob(base64);
  }

  async compressImage(
    imageData: ArrayBuffer,
    options: {
      format?: 'image/webp' | 'image/jpeg' | 'image/png';
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([imageData]);
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (options.maxWidth && width > options.maxWidth) {
          const ratio = options.maxWidth / width;
          width = options.maxWidth;
          height = height * ratio;
        }
        
        if (options.maxHeight && height > options.maxHeight) {
          const ratio = options.maxHeight / height;
          height = options.maxHeight;
          width = width * ratio;
        }

        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);

        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            blob.arrayBuffer().then(resolve).catch(reject);
          },
          options.format || 'image/webp',
          options.quality || 0.8
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  async compressFile(
    file: File,
    options: {
      maxSize?: number; // in bytes
      imageCompression?: boolean;
    } = {}
  ): Promise<Blob> {
    const { maxSize = 5 * 1024 * 1024, imageCompression = true } = options;

    // If file is already small enough, return as-is
    if (file.size <= maxSize) {
      return file;
    }

    // Handle image compression
    if (imageCompression && file.type.startsWith('image/')) {
      try {
        const buffer = await file.arrayBuffer();
        const compressedBuffer = await this.compressImage(buffer, {
          format: 'image/webp',
          quality: 0.7,
          maxWidth: 1920,
          maxHeight: 1080,
        });

        if (compressedBuffer.byteLength <= maxSize) {
          return new Blob([compressedBuffer], { type: 'image/webp' });
        }
      } catch (error) {
        console.warn('Image compression failed, falling back to original:', error);
      }
    }

    // For non-images or failed compression, return original with warning
    console.warn(`File ${file.name} exceeds maximum size of ${maxSize} bytes`);
    return file;
  }

  async gzipCompress(data: Uint8Array): Promise<Uint8Array> {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(data);
    writer.close();
    
    const response = new Response(cs.readable);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  async gzipDecompress(data: Uint8Array): Promise<Uint8Array> {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(data);
    writer.close();
    
    const response = new Response(ds.readable);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  deflateCompress(data: string): Uint8Array {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);
    
    // Simple deflate-like compression for small strings
    const result = [];
    let count = 1;
    
    for (let i = 1; i <= encoded.length; i++) {
      if (i < encoded.length && encoded[i] === encoded[i - 1]) {
        count++;
      } else {
        if (count > 1) {
          result.push(count, encoded[i - 1]);
        } else {
          result.push(encoded[i - 1]);
        }
        count = 1;
      }
    }
    
    return new Uint8Array(result);
  }

  deflateDecompress(data: Uint8Array): string {
    const decoder = new TextDecoder();
    const result = [];
    
    for (let i = 0; i < data.length; i++) {
      if (data[i] > 127) { // Run-length encoded
        const count = data[i] - 128;
        const char = data[++i];
        for (let j = 0; j < count; j++) {
          result.push(char);
        }
      } else {
        result.push(data[i]);
      }
    }
    
    return decoder.decode(new Uint8Array(result));
  }

  calculateCompressionRatio(original: Uint8Array, compressed: Uint8Array): number {
    if (original.length === 0) return 0;
    return ((original.length - compressed.length) / original.length) * 100;
  }

  async optimizeForNetwork(data: any, threshold: number = 1024): Promise<any> {
    // For small data, return as-is
    const jsonString = JSON.stringify(data);
    const size = new Blob([jsonString]).size;
    
    if (size <= threshold) {
      return data;
    }
    
    // For large data, compress
    const compressed = await this.compressJSON(data);
    return {
      _compressed: true,
      data: Array.from(compressed),
    };
  }

  async decompressNetworkData(data: any): Promise<any> {
    if (data && data._compressed && Array.isArray(data.data)) {
      const compressed = new Uint8Array(data.data);
      return await this.decompressJSON(compressed);
    }
    return data;
  }
}

export const compression = CompressionService.getInstance();
