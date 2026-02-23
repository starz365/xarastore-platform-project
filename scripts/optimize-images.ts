#!/usr/bin/env tsx
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createReadStream, createWriteStream } from 'fs';

const streamPipeline = promisify(pipeline);

interface ImageOptimizationConfig {
  inputDir: string;
  outputDir: string;
  formats: ('webp' | 'avif' | 'jpg' | 'png')[];
  sizes: number[];
  quality: number;
  webpQuality: number;
  avifQuality: number;
  maxWidth: number;
  maxHeight: number;
  optimizeOriginal: boolean;
  createPlaceholders: boolean;
  placeholderQuality: number;
  cacheFile: string;
}

interface ImageCache {
  [key: string]: {
    hash: string;
    optimized: string[];
    timestamp: number;
  };
}

interface OptimizationResult {
  original: string;
  optimized: string[];
  sizeReduction: number;
  time: number;
}

class ImageOptimizer {
  private config: ImageOptimizationConfig;
  private cache: ImageCache = {};
  private processedCount = 0;
  private totalSizeReduction = 0;
  private startTime = 0;

  constructor(config: Partial<ImageOptimizationConfig> = {}) {
    this.config = {
      inputDir: './public/images',
      outputDir: './public/optimized',
      formats: ['webp', 'avif'],
      sizes: [320, 640, 768, 1024, 1280, 1536, 1920],
      quality: 80,
      webpQuality: 75,
      avifQuality: 60,
      maxWidth: 3840,
      maxHeight: 2160,
      optimizeOriginal: true,
      createPlaceholders: true,
      placeholderQuality: 10,
      cacheFile: './.image-cache.json',
      ...config,
    };
  }

  async init(): Promise<void> {
    await this.ensureDirectories();
    await this.loadCache();
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.config.inputDir,
      this.config.outputDir,
      path.join(this.config.outputDir, 'webp'),
      path.join(this.config.outputDir, 'avif'),
      path.join(this.config.outputDir, 'jpg'),
      path.join(this.config.outputDir, 'png'),
      path.join(this.config.outputDir, 'placeholders'),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async loadCache(): Promise<void> {
    try {
      const cacheData = await fs.readFile(this.config.cacheFile, 'utf-8');
      this.cache = JSON.parse(cacheData);
    } catch {
      this.cache = {};
    }
  }

  private async saveCache(): Promise<void> {
    await fs.writeFile(
      this.config.cacheFile,
      JSON.stringify(this.cache, null, 2),
      'utf-8'
    );
  }

  private async getFileHash(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return createHash('sha256').update(buffer).digest('hex');
  }

  private isImageFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.tiff', '.bmp'].includes(ext);
  }

  private async needsOptimization(filePath: string, hash: string): Promise<boolean> {
    const cached = this.cache[filePath];
    
    if (!cached || cached.hash !== hash) {
      return true;
    }

    // Check if all optimized files exist
    for (const optimizedFile of cached.optimized) {
      try {
        await fs.access(optimizedFile);
      } catch {
        return true;
      }
    }

    return false;
  }

  private async optimizeImage(
    inputPath: string,
    outputPath: string,
    format: string,
    width?: number,
    height?: number,
    quality?: number
  ): Promise<void> {
    let sharpInstance = sharp(inputPath);

    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    switch (format) {
      case 'webp':
        await sharpInstance.webp({ quality: quality || this.config.webpQuality }).toFile(outputPath);
        break;
      case 'avif':
        await sharpInstance.avif({ quality: quality || this.config.avifQuality }).toFile(outputPath);
        break;
      case 'jpg':
        await sharpInstance.jpeg({ quality: quality || this.config.quality, mozjpeg: true }).toFile(outputPath);
        break;
      case 'png':
        await sharpInstance.png({ quality: quality || this.config.quality, compressionLevel: 9 }).toFile(outputPath);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async createPlaceholder(inputPath: string): Promise<string> {
    const placeholderPath = path.join(
      this.config.outputDir,
      'placeholders',
      `${path.basename(inputPath, path.extname(inputPath))}.jpg`
    );

    await sharp(inputPath)
      .resize(20, 20, { fit: 'inside' })
      .blur(0.3)
      .jpeg({ quality: this.config.placeholderQuality })
      .toFile(placeholderPath);

    return placeholderPath;
  }

  private async getImageMetadata(filePath: string): Promise<sharp.Metadata> {
    return await sharp(filePath).metadata();
  }

  private async shouldResize(metadata: sharp.Metadata): Promise<boolean> {
    if (!metadata.width || !metadata.height) return false;
    
    return metadata.width > this.config.maxWidth || metadata.height > this.config.maxHeight;
  }

  async optimizeFile(filePath: string): Promise<OptimizationResult | null> {
    const startTime = Date.now();
    const originalStats = await fs.stat(filePath);
    const hash = await this.getFileHash(filePath);
    
    if (!(await this.needsOptimization(filePath, hash))) {
      console.log(`⏭️  Skipping (cached): ${filePath}`);
      return null;
    }

    console.log(`🔄 Optimizing: ${filePath}`);

    const metadata = await this.getImageMetadata(filePath);
    const optimizedFiles: string[] = [];
    const filename = path.basename(filePath, path.extname(filePath));

    // Optimize original if needed
    if (this.config.optimizeOriginal && await this.shouldResize(metadata)) {
      const optimizedOriginal = path.join(
        this.config.outputDir,
        'original',
        `${filename}${path.extname(filePath)}`
      );

      await this.optimizeImage(
        filePath,
        optimizedOriginal,
        path.extname(filePath).slice(1),
        this.config.maxWidth,
        this.config.maxHeight,
        this.config.quality
      );

      optimizedFiles.push(optimizedOriginal);
    }

    // Create multiple sizes and formats
    for (const size of this.config.sizes) {
      for (const format of this.config.formats) {
        const outputPath = path.join(
          this.config.outputDir,
          format,
          `${filename}-${size}w.${format}`
        );

        await this.optimizeImage(
          filePath,
          outputPath,
          format,
          size,
          undefined,
          format === 'webp' ? this.config.webpQuality : 
          format === 'avif' ? this.config.avifQuality : 
          this.config.quality
        );

        optimizedFiles.push(outputPath);
      }
    }

    // Create placeholder
    if (this.config.createPlaceholders) {
      const placeholderPath = await this.createPlaceholder(filePath);
      optimizedFiles.push(placeholderPath);
    }

    // Update cache
    const optimizedStats = await Promise.all(
      optimizedFiles.map(file => fs.stat(file))
    );

    const totalOptimizedSize = optimizedStats.reduce((sum, stat) => sum + stat.size, 0);
    const sizeReduction = originalStats.size - totalOptimizedSize;

    this.cache[filePath] = {
      hash,
      optimized: optimizedFiles,
      timestamp: Date.now(),
    };

    this.processedCount++;
    this.totalSizeReduction += sizeReduction;

    return {
      original: filePath,
      optimized: optimizedFiles,
      sizeReduction,
      time: Date.now() - startTime,
    };
  }

  async optimizeDirectory(dirPath: string = this.config.inputDir): Promise<void> {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        await this.optimizeDirectory(fullPath);
      } else if (this.isImageFile(file.name)) {
        try {
          await this.optimizeFile(fullPath);
        } catch (error) {
          console.error(`❌ Error optimizing ${fullPath}:`, error);
        }
      }
    }
  }

  async generateImageManifest(): Promise<void> {
    const manifest: any[] = [];

    for (const [original, cache] of Object.entries(this.cache)) {
      const originalStats = await fs.stat(original);
      const optimizedFiles = await Promise.all(
        cache.optimized.map(async (file) => {
          const stats = await fs.stat(file);
          const ext = path.extname(file).slice(1);
          const sizeMatch = file.match(/-(\d+)w\./);
          const size = sizeMatch ? parseInt(sizeMatch[1]) : null;

          return {
            path: file,
            format: ext,
            size: stats.size,
            width: size,
            height: null,
            quality: ext === 'webp' ? this.config.webpQuality : 
                    ext === 'avif' ? this.config.avifQuality : 
                    this.config.quality,
          };
        })
      );

      manifest.push({
        original: {
          path: original,
          size: originalStats.size,
          format: path.extname(original).slice(1),
        },
        optimized: optimizedFiles,
        lastOptimized: cache.timestamp,
      });
    }

    await fs.writeFile(
      path.join(this.config.outputDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
  }

  async generateResponsiveImageTags(): Promise<void> {
    const tags: Record<string, string> = {};

    for (const [original] of Object.entries(this.cache)) {
      const filename = path.basename(original, path.extname(original));
      const cache = this.cache[original];
      
      // Group optimized files by format
      const byFormat: Record<string, string[]> = {};
      
      for (const file of cache.optimized) {
        const ext = path.extname(file).slice(1);
        if (!byFormat[ext]) byFormat[ext] = [];
        byFormat[ext].push(file);
      }

      // Generate picture element
      let pictureHtml = '<picture>\n';
      
      // AVIF sources (if available)
      if (byFormat.avif && byFormat.avif.length > 0) {
        pictureHtml += '  <source\n';
        pictureHtml += `    srcset="${byFormat.avif.map(f => `\${pathToImage('${f}')} ${f.match(/-(\d+)w\./)?.[1] || ''}w`).join(', ')}"\n`;
        pictureHtml += '    type="image/avif"\n';
        pictureHtml += '  >\n';
      }

      // WebP sources (if available)
      if (byFormat.webp && byFormat.webp.length > 0) {
        pictureHtml += '  <source\n';
        pictureHtml += `    srcset="${byFormat.webp.map(f => `\${pathToImage('${f}')} ${f.match(/-(\d+)w\./)?.[1] || ''}w`).join(', ')}"\n`;
        pictureHtml += '    type="image/webp"\n';
        pictureHtml += '  >\n';
      }

      // Fallback image
      const fallback = cache.optimized.find(f => 
        f.includes('original') || f.endsWith('.jpg') || f.endsWith('.png')
      ) || original;

      pictureHtml += `  <img\n`;
      pictureHtml += `    src="\${pathToImage('${fallback}')}"\n`;
      pictureHtml += `    alt=""\n`;
      pictureHtml += `    loading="lazy"\n`;
      pictureHtml += `    decoding="async"\n`;
      
      // Add sizes attribute if we have multiple sizes
      if (cache.optimized.length > 1) {
        pictureHtml += `    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"\n`;
      }
      
      pictureHtml += `  >\n`;
      pictureHtml += `</picture>`;

      tags[filename] = pictureHtml;
    }

    await fs.writeFile(
      path.join(this.config.outputDir, 'responsive-tags.json'),
      JSON.stringify(tags, null, 2),
      'utf-8'
    );
  }

  async cleanupOldFiles(days: number = 30): Promise<void> {
    console.log(`🧹 Cleaning up files older than ${days} days...`);
    
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    let freedSpace = 0;

    for (const [original, cache] of Object.entries(this.cache)) {
      if (cache.timestamp < cutoff) {
        // Delete optimized files
        for (const file of cache.optimized) {
          try {
            const stats = await fs.stat(file);
            await fs.unlink(file);
            freedSpace += stats.size;
            deletedCount++;
          } catch {
            // File might already be deleted
          }
        }

        // Remove from cache
        delete this.cache[original];
      }
    }

    console.log(`✅ Deleted ${deletedCount} old files, freed ${this.formatBytes(freedSpace)}`);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async run(): Promise<void> {
    this.startTime = Date.now();
    
    console.log('🚀 Starting image optimization...');
    console.log('='.repeat(50));
    console.log('📁 Input directory:', this.config.inputDir);
    console.log('📁 Output directory:', this.config.outputDir);
    console.log('🎨 Formats:', this.config.formats.join(', '));
    console.log('📏 Sizes:', this.config.sizes.join(', '));
    console.log('='.repeat(50));

    await this.init();
    await this.optimizeDirectory();
    await this.saveCache();
    await this.generateImageManifest();
    await this.generateResponsiveImageTags();
    await this.cleanupOldFiles();

    const totalTime = (Date.now() - this.startTime) / 1000;

    console.log('='.repeat(50));
    console.log('🎉 Optimization completed!');
    console.log(`⏱️  Total time: ${totalTime.toFixed(2)}s`);
    console.log(`📊 Processed: ${this.processedCount} images`);
    console.log(`💾 Size reduction: ${this.formatBytes(this.totalSizeReduction)}`);
    console.log(`📄 Cache saved to: ${this.config.cacheFile}`);
    console.log(`📋 Manifest: ${path.join(this.config.outputDir, 'manifest.json')}`);
    console.log(`🏷️  Responsive tags: ${path.join(this.config.outputDir, 'responsive-tags.json')}`);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const optimizer = new ImageOptimizer();

  switch (command) {
    case 'optimize':
      await optimizer.run();
      break;

    case 'cleanup':
      const days = parseInt(args[1]) || 30;
      await optimizer.init();
      await optimizer.cleanupOldFiles(days);
      break;

    case 'manifest':
      await optimizer.init();
      await optimizer.generateImageManifest();
      console.log('✅ Manifest generated');
      break;

    case 'tags':
      await optimizer.init();
      await optimizer.generateResponsiveImageTags();
      console.log('✅ Responsive tags generated');
      break;

    case 'stats':
      await optimizer.init();
      console.log('📊 Image Optimization Stats');
      console.log('='.repeat(30));
      console.log(`Cached images: ${Object.keys(optimizer['cache']).length}`);
      
      let totalOriginalSize = 0;
      let totalOptimizedSize = 0;
      
      for (const [original, cache] of Object.entries(optimizer['cache'])) {
        try {
          const originalStats = await fs.stat(original);
          totalOriginalSize += originalStats.size;
          
          for (const file of cache.optimized) {
            const stats = await fs.stat(file);
            totalOptimizedSize += stats.size;
          }
        } catch {
          // Skip if file doesn't exist
        }
      }
      
      console.log(`Total original size: ${optimizer['formatBytes'](totalOriginalSize)}`);
      console.log(`Total optimized size: ${optimizer['formatBytes'](totalOptimizedSize)}`);
      console.log(`Total reduction: ${optimizer['formatBytes'](totalOriginalSize - totalOptimizedSize)}`);
      console.log(`Reduction percentage: ${((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(2)}%`);
      break;

    default:
      console.log('Usage:');
      console.log('  npm run optimize-images -- optimize');
      console.log('  npm run optimize-images -- cleanup [days]');
      console.log('  npm run optimize-images -- manifest');
      console.log('  npm run optimize-images -- tags');
      console.log('  npm run optimize-images -- stats');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ImageOptimizer };
