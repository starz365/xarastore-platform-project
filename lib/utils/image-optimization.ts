export interface ImageOptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill';
  background?: string;
}

export class ImageOptimizer {
  private static instance: ImageOptimizer;

  private constructor() {}

  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer();
    }
    return ImageOptimizer.instance;
  }

  async optimize(
    image: File | Blob | ArrayBuffer | string,
    options: ImageOptimizationOptions = {}
  ): Promise<Blob> {
    const defaultOptions: Required<ImageOptimizationOptions> = {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      format: 'webp',
      fit: 'cover',
      background: '#FFFFFF',
    };

    const opts = { ...defaultOptions, ...options };

    try {
      let imageBlob: Blob;
      
      if (typeof image === 'string') {
        // Base64 or URL
        if (image.startsWith('data:')) {
          const response = await fetch(image);
          imageBlob = await response.blob();
        } else {
          const response = await fetch(image);
          imageBlob = await response.blob();
        }
      } else if (image instanceof ArrayBuffer) {
        imageBlob = new Blob([image]);
      } else {
        imageBlob = image;
      }

      return await this.processImage(imageBlob, opts);
    } catch (error) {
      console.error('Image optimization failed:', error);
      throw error;
    }
  }

  private async processImage(
    imageBlob: Blob,
    options: Required<ImageOptimizationOptions>
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageBlob);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Calculate new dimensions
        const { width: originalWidth, height: originalHeight } = img;
        let { width: targetWidth, height: targetHeight } = this.calculateDimensions(
          originalWidth,
          originalHeight,
          options.maxWidth,
          options.maxHeight,
          options.fit
        );

        // Set canvas dimensions
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Fill background if specified
        if (options.background) {
          ctx.fillStyle = options.background;
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        // Draw image based on fit mode
        switch (options.fit) {
          case 'cover':
            this.drawImageCover(ctx, img, targetWidth, targetHeight);
            break;
          case 'contain':
            this.drawImageContain(ctx, img, targetWidth, targetHeight, options.background);
            break;
          case 'fill':
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            break;
        }

        // Convert to desired format
        const mimeType = this.getMimeType(options.format);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create optimized image'));
            }
          },
          mimeType,
          options.quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    fit: 'cover' | 'contain' | 'fill'
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // Calculate aspect ratios
    const originalAspect = originalWidth / originalHeight;
    const maxAspect = maxWidth / maxHeight;

    switch (fit) {
      case 'cover':
        if (originalAspect > maxAspect) {
          width = maxWidth;
          height = maxWidth / originalAspect;
        } else {
          height = maxHeight;
          width = maxHeight * originalAspect;
        }
        break;

      case 'contain':
        if (originalWidth > maxWidth || originalHeight > maxHeight) {
          const widthRatio = maxWidth / originalWidth;
          const heightRatio = maxHeight / originalHeight;
          const ratio = Math.min(widthRatio, heightRatio);
          
          width = originalWidth * ratio;
          height = originalHeight * ratio;
        }
        break;

      case 'fill':
        width = maxWidth;
        height = maxHeight;
        break;
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  private drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    width: number,
    height: number
  ): void {
    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgAspect > canvasAspect) {
      // Image is wider than canvas
      drawHeight = height;
      drawWidth = height * imgAspect;
      offsetX = (width - drawWidth) / 2;
      offsetY = 0;
    } else {
      // Image is taller than canvas
      drawWidth = width;
      drawHeight = width / imgAspect;
      offsetX = 0;
      offsetY = (height - drawHeight) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }

  private drawImageContain(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    width: number,
    height: number,
    background?: string
  ): void {
    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgAspect > canvasAspect) {
      // Image is wider relative to canvas
      drawWidth = width;
      drawHeight = width / imgAspect;
      offsetX = 0;
      offsetY = (height - drawHeight) / 2;
    } else {
      // Image is taller relative to canvas
      drawHeight = height;
      drawWidth = height * imgAspect;
      offsetX = (width - drawWidth) / 2;
      offsetY = 0;
    }

    // Fill background if specified
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }

  private getMimeType(format: string): string {
    switch (format) {
      case 'webp':
        return 'image/webp';
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'image/webp';
    }
  }

  async generateThumbnail(
    image: File | Blob | string,
    size: number = 150
  ): Promise<Blob> {
    return this.optimize(image, {
      maxWidth: size,
      maxHeight: size,
      fit: 'cover',
      format: 'webp',
      quality: 0.7,
    });
  }

  async generateResponsiveImages(
    image: File | Blob | string,
    sizes: number[] = [640, 750, 828, 1080, 1200, 1920]
  ): Promise<Array<{ width: number; blob: Blob }>> {
    const results: Array<{ width: number; blob: Blob }> = [];

    for (const width of sizes) {
      const blob = await this.optimize(image, {
        maxWidth: width,
        format: 'webp',
        quality: 0.8,
        fit: 'contain',
      });
      
      results.push({ width, blob });
    }

    return results;
  }

  async getImageMetadata(image: File | Blob | string): Promise<{
    width: number;
    height: number;
    size: number;
    type: string;
    aspectRatio: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const metadata = {
          width: img.width,
          height: img.height,
          size: image instanceof Blob ? image.size : 0,
          type: image instanceof Blob ? image.type : 'unknown',
          aspectRatio: img.width / img.height,
        };
        resolve(metadata);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for metadata'));
      };

      if (typeof image === 'string') {
        img.src = image;
      } else {
        const url = URL.createObjectURL(image);
        img.src = url;
        img.onload = () => URL.revokeObjectURL(url);
      }
    });
  }

  async compressForUpload(
    image: File,
    maxSize: number = 2 * 1024 * 1024 // 2MB
  ): Promise<File> {
    if (image.size <= maxSize) {
      return image;
    }

    // Get current size ratio
    const targetRatio = maxSize / image.size;
    
    // Calculate quality based on size ratio (cubic for better results)
    const quality = Math.pow(targetRatio, 1/3);
    
    const optimized = await this.optimize(image, {
      quality: Math.max(0.1, Math.min(1, quality)),
      maxWidth: 1920,
      maxHeight: 1080,
      format: 'webp',
    });

    return new File([optimized], image.name, {
      type: optimized.type,
      lastModified: Date.now(),
    });
  }

  async lazyLoadImage(
    element: HTMLImageElement,
    placeholder?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!element.dataset.src) {
        reject(new Error('No data-src attribute found'));
        return;
      }

      // Set placeholder if provided
      if (placeholder && !element.src) {
        element.src = placeholder;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src!;
            
            // Create new image to check if it loads
            const tempImg = new Image();
            
            tempImg.onload = () => {
              img.src = src;
              img.classList.add('loaded');
              observer.unobserve(img);
              resolve();
            };
            
            tempImg.onerror = () => {
              observer.unobserve(img);
              reject(new Error('Failed to load image'));
            };
            
            tempImg.src = src;
          }
        });
      });

      observer.observe(element);
    });
  }

  async generateColorPalette(image: File | Blob | string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Sample colors from image
        const colors = new Map<string, number>();
        const sampleStep = Math.floor((canvas.width * canvas.height) / 1000);

        for (let i = 0; i < data.length; i += 4 * sampleStep) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Skip transparent pixels
          if (data[i + 3] < 128) continue;
          
          const hex = this.rgbToHex(r, g, b);
          colors.set(hex, (colors.get(hex) || 0) + 1);
        }

        // Get top 5 most common colors
        const sortedColors = Array.from(colors.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([color]) => color);

        resolve(sortedColors);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for color palette'));
      };

      if (typeof image === 'string') {
        img.src = image;
      } else {
        const url = URL.createObjectURL(image);
        img.src = url;
        img.onload = () => URL.revokeObjectURL(url);
      }
    });
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
}

export const imageOptimizer = ImageOptimizer.getInstance();
