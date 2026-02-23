import { promises as fs } from 'fs';
import path from 'path';
import { createGzip, createBrotliCompress, createDeflate, gunzip, brotliDecompress, inflate } from 'zlib';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase/client';
import tar from 'tar';
import archiver from 'archiver';
import extract from 'extract-zip';
import { Readable } from 'stream';

export interface CompressionOptions {
  level?: number;
  memLevel?: number;
  windowBits?: number;
  dictionary?: Buffer;
  chunkSize?: number;
}

export interface CompressionResult {
  id: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  hash: string;
  compressedPath: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface ArchiveOptions {
  format?: 'zip' | 'tar' | 'gztar' | 'bztar' | 'xztar';
  compressionLevel?: number;
  includeBaseDir?: boolean;
  filter?: (path: string) => boolean;
}

export class CompressionService {
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly SUPPORTED_ALGORITHMS = ['gzip', 'brotli', 'deflate'] as const;

  async compressFile(
    inputPath: string,
    algorithm: 'gzip' | 'brotli' | 'deflate' = 'gzip',
    options: CompressionOptions = {},
    bucket: string = 'compressed-files'
  ): Promise<CompressionResult> {
    try {
      // Validate input file
      const stats = await fs.stat(inputPath);
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      // Validate algorithm
      if (!this.SUPPORTED_ALGORITHMS.includes(algorithm)) {
        throw new Error(`Unsupported compression algorithm: ${algorithm}`);
      }

      // Read original file
      const originalBuffer = await fs.readFile(inputPath);
      const originalHash = createHash('sha256').update(originalBuffer).digest('hex');

      // Check if already compressed
      const existingCompression = await this.checkExistingCompression(originalHash, algorithm, bucket);
      if (existingCompression) {
        return existingCompression;
      }

      // Compress file
      const compressedBuffer = await this.compressBuffer(originalBuffer, algorithm, options);

      // Generate hash for compressed file
      const compressedHash = createHash('sha256').update(compressedBuffer).digest('hex');

      // Upload to Supabase Storage
      const fileName = `${uuidv4()}.${this.getFileExtension(algorithm)}`;
      const filePath = `compressed/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, compressedBuffer, {
          contentType: this.getMimeType(algorithm),
          upsert: false,
          cacheControl: 'public, max-age=31536000',
        });

      if (uploadError) {
        throw new Error(`Failed to upload compressed file: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Calculate compression ratio
      const compressionRatio = (1 - (compressedBuffer.length / originalBuffer.length)) * 100;

      // Create compression result
      const result: CompressionResult = {
        id: uuidv4(),
        originalSize: originalBuffer.length,
        compressedSize: compressedBuffer.length,
        compressionRatio: parseFloat(compressionRatio.toFixed(2)),
        algorithm,
        hash: compressedHash,
        compressedPath: publicUrl,
        metadata: {
          originalPath: inputPath,
          originalHash,
          options,
          compressionTime: new Date().toISOString(),
          fileStats: {
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            mode: stats.mode,
            mtime: stats.mtime.toISOString(),
            ctime: stats.ctime.toISOString(),
          },
        },
        createdAt: new Date().toISOString(),
      };

      // Store metadata in database
      await this.storeCompressionMetadata(result, bucket);

      return result;
    } catch (error) {
      console.error('Compression error:', error);
      throw error;
    }
  }

  async decompressFile(
    inputPath: string,
    outputPath: string,
    algorithm: 'gzip' | 'brotli' | 'deflate' = 'gzip'
  ): Promise<Buffer> {
    try {
      // Read compressed file
      const compressedBuffer = typeof inputPath === 'string'
        ? await fs.readFile(inputPath)
        : inputPath;

      // Decompress based on algorithm
      const decompressedBuffer = await this.decompressBuffer(compressedBuffer, algorithm);

      // Write to output path if provided
      if (outputPath) {
        await fs.writeFile(outputPath, decompressedBuffer);
      }

      return decompressedBuffer;
    } catch (error) {
      console.error('Decompression error:', error);
      throw error;
    }
  }

  async createArchive(
    sourcePaths: string[],
    outputPath: string,
    options: ArchiveOptions = {}
  ): Promise<string> {
    try {
      const archiveOptions: Required<ArchiveOptions> = {
        format: options.format || 'zip',
        compressionLevel: options.compressionLevel || 9,
        includeBaseDir: options.includeBaseDir !== false,
        filter: options.filter || (() => true),
      };

      // Create output directory if it doesn't exist
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Create archive based on format
      switch (archiveOptions.format) {
        case 'zip':
          await this.createZipArchive(sourcePaths, outputPath, archiveOptions);
          break;
        case 'tar':
          await this.createTarArchive(sourcePaths, outputPath, archiveOptions);
          break;
        case 'gztar':
          await this.createGzipTarArchive(sourcePaths, outputPath, archiveOptions);
          break;
        default:
          throw new Error(`Unsupported archive format: ${archiveOptions.format}`);
      }

      return outputPath;
    } catch (error) {
      console.error('Archive creation error:', error);
      throw error;
    }
  }

  async extractArchive(
    archivePath: string,
    outputDir: string,
    options: {
      strip?: number;
      filter?: (path: string) => boolean;
    } = {}
  ): Promise<string[]> {
    try {
      // Create output directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true });

      const extractedFiles: string[] = [];

      // Determine archive type and extract
      const ext = path.extname(archivePath).toLowerCase();
      
      switch (ext) {
        case '.zip':
          await extract(archivePath, {
            dir: outputDir,
            onEntry: (entry) => {
              extractedFiles.push(entry.fileName);
            },
          });
          break;
        case '.tar':
        case '.gz':
        case '.tgz':
          await tar.extract({
            file: archivePath,
            cwd: outputDir,
            strip: options.strip || 0,
            filter: options.filter,
            onentry: (entry) => {
              extractedFiles.push(entry.path);
            },
          });
          break;
        default:
          throw new Error(`Unsupported archive format: ${ext}`);
      }

      return extractedFiles;
    } catch (error) {
      console.error('Archive extraction error:', error);
      throw error;
    }
  }

  async optimizeImagesInDirectory(
    directoryPath: string,
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      format?: 'webp' | 'avif' | 'jpeg';
      recursive?: boolean;
    } = {}
  ): Promise<Array<{ file: string; originalSize: number; optimizedSize: number; saved: number }>> {
    const results = [];
    const { getImageProcessor } = await import('./image-processor');
    const imageProcessor = getImageProcessor();

    const processDirectory = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && options.recursive) {
          await processDirectory(fullPath);
          continue;
        }

        if (entry.isFile() && this.isImageFile(entry.name)) {
          try {
            const originalStats = await fs.stat(fullPath);
            
            // Optimize image
            const optimizedBuffer = await imageProcessor.optimizeForWeb(
              await fs.readFile(fullPath)
            );

            // Calculate savings
            const saved = originalStats.size - optimizedBuffer.length;
            
            // Only replace if we actually saved space
            if (saved > 0) {
              await fs.writeFile(fullPath, optimizedBuffer);
              
              results.push({
                file: fullPath,
                originalSize: originalStats.size,
                optimizedSize: optimizedBuffer.length,
                saved,
                savingsPercentage: (saved / originalStats.size) * 100,
              });
            }
          } catch (error) {
            console.error(`Failed to optimize ${fullPath}:`, error);
          }
        }
      }
    };

    await processDirectory(directoryPath);
    return results;
  }

  async compressDirectory(
    directoryPath: string,
    outputPath: string,
    options: ArchiveOptions & {
      excludePatterns?: string[];
      maxFileSize?: number;
    } = {}
  ): Promise<{
    archivePath: string;
    originalSize: number;
    compressedSize: number;
    fileCount: number;
    excludedCount: number;
  }> {
    try {
      // Get directory stats
      const { totalSize, fileCount } = await this.getDirectoryStats(directoryPath, options.excludePatterns);

      // Create archive
      const archivePath = await this.createArchive([directoryPath], outputPath, options);

      // Get compressed size
      const stats = await fs.stat(archivePath);

      return {
        archivePath,
        originalSize: totalSize,
        compressedSize: stats.size,
        fileCount,
        excludedCount: 0, // Would need to track during directory walk
      };
    } catch (error) {
      console.error('Directory compression error:', error);
      throw error;
    }
  }

  async batchCompress(
    files: Array<{ path: string; algorithm?: 'gzip' | 'brotli' | 'deflate' }>,
    bucket: string = 'compressed-files'
  ): Promise<Array<{ path: string; result: CompressionResult | null; error?: string }>> {
    const results = [];

    // Process in batches to avoid memory issues
    const batchSize = 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.compressFile(
            file.path,
            file.algorithm || 'gzip',
            {},
            bucket
          );
          return { path: file.path, result, error: undefined };
        } catch (error: any) {
          return { path: file.path, result: null, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  async getCompressionStats(
    algorithm?: string,
    bucket: string = 'compressed-files'
  ): Promise<{
    totalCompressions: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    averageRatio: number;
    algorithmStats: Record<string, {
      count: number;
      avgRatio: number;
      totalSavings: number;
    }>;
    lastCompressed: string | null;
  }> {
    try {
      let query = supabase
        .from('compressions')
        .select('algorithm, original_size, compressed_size, compression_ratio, created_at');

      if (algorithm) {
        query = query.eq('algorithm', algorithm);
      }

      if (bucket) {
        query = query.eq('bucket', bucket);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch compression stats: ${error.message}`);
      }

      const totalCompressions = data.length;
      const totalOriginalSize = data.reduce((sum, comp) => sum + (comp.original_size || 0), 0);
      const totalCompressedSize = data.reduce((sum, comp) => sum + (comp.compressed_size || 0), 0);
      const totalRatio = data.reduce((sum, comp) => sum + (comp.compression_ratio || 0), 0);

      const algorithmStats = data.reduce((acc, comp) => {
        if (!acc[comp.algorithm]) {
          acc[comp.algorithm] = {
            count: 0,
            totalRatio: 0,
            totalSavings: 0,
          };
        }

        acc[comp.algorithm].count++;
        acc[comp.algorithm].totalRatio += comp.compression_ratio || 0;
        acc[comp.algorithm].totalSavings += (comp.original_size || 0) - (comp.compressed_size || 0);

        return acc;
      }, {} as Record<string, { count: number; totalRatio: number; totalSavings: number }>);

      // Calculate averages
      Object.keys(algorithmStats).forEach(algo => {
        algorithmStats[algo].avgRatio = algorithmStats[algo].totalRatio / algorithmStats[algo].count;
      });

      const lastCompressed = data.length > 0
        ? new Date(Math.max(...data.map(comp => new Date(comp.created_at).getTime()))).toISOString()
        : null;

      return {
        totalCompressions,
        totalOriginalSize,
        totalCompressedSize,
        averageRatio: totalCompressions > 0 ? totalRatio / totalCompressions : 0,
        algorithmStats: Object.fromEntries(
          Object.entries(algorithmStats).map(([algo, stats]) => [
            algo,
            {
              count: stats.count,
              avgRatio: parseFloat(stats.avgRatio.toFixed(2)),
              totalSavings: stats.totalSavings,
            }
          ])
        ),
        lastCompressed,
      };
    } catch (error) {
      console.error('Compression stats error:', error);
      return {
        totalCompressions: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        averageRatio: 0,
        algorithmStats: {},
        lastCompressed: null,
      };
    }
  }

  async cleanupOldCompressions(bucket: string, daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data: oldCompressions, error: fetchError } = await supabase
        .from('compressions')
        .select('id, compressed_path')
        .lt('created_at', cutoffDate.toISOString())
        .eq('bucket', bucket);

      if (fetchError) {
        throw new Error(`Failed to fetch old compressions: ${fetchError.message}`);
      }

      let deletedCount = 0;

      for (const compression of oldCompressions) {
        try {
          // Extract file path from URL
          const filePath = compression.compressed_path.split('/').pop();
          if (filePath) {
            // Delete from storage
            const { error: deleteError } = await supabase.storage
              .from(bucket)
              .remove([`compressed/${filePath}`]);

            if (deleteError) {
              console.error(`Failed to delete storage file for compression ${compression.id}:`, deleteError);
              continue;
            }
          }

          // Delete database record
          const { error: dbError } = await supabase
            .from('compressions')
            .delete()
            .eq('id', compression.id);

          if (dbError) {
            console.error(`Failed to delete database record for compression ${compression.id}:`, dbError);
            continue;
          }

          deletedCount++;
        } catch (error) {
          console.error(`Error cleaning up compression ${compression.id}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }

  private async compressBuffer(
    buffer: Buffer,
    algorithm: 'gzip' | 'brotli' | 'deflate',
    options: CompressionOptions = {}
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const compressors = {
        gzip: createGzip({
          level: options.level || 6,
          memLevel: options.memLevel || 8,
          windowBits: options.windowBits || 15,
        }),
        brotli: createBrotliCompress({
          params: {
            [BrotliEncoderParameter.BROTLI_PARAM_QUALITY]: options.level || 4,
            [BrotliEncoderParameter.BROTLI_PARAM_MODE]: BrotliEncoderMode.BROTLI_MODE_TEXT,
            [BrotliEncoderParameter.BROTLI_PARAM_SIZE_HINT]: buffer.length,
          },
        }),
        deflate: createDeflate({
          level: options.level || 6,
          memLevel: options.memLevel || 8,
          windowBits: options.windowBits || 15,
        }),
      };

      const chunks: Buffer[] = [];
      const compressor = compressors[algorithm];

      compressor.on('data', (chunk) => chunks.push(chunk));
      compressor.on('end', () => resolve(Buffer.concat(chunks)));
      compressor.on('error', reject);

      compressor.write(buffer);
      compressor.end();
    });
  }

  private async decompressBuffer(
    buffer: Buffer,
    algorithm: 'gzip' | 'brotli' | 'deflate'
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const decompressors = {
        gzip: gunzip,
        brotli: brotliDecompress,
        deflate: inflate,
      };

      decompressors[algorithm](buffer, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  private async createZipArchive(
    sourcePaths: string[],
    outputPath: string,
    options: Required<ArchiveOptions>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: options.compressionLevel },
      });

      output.on('close', () => resolve());
      archive.on('error', reject);

      archive.pipe(output);

      // Add files to archive
      sourcePaths.forEach(sourcePath => {
        const name = path.basename(sourcePath);
        if (options.includeBaseDir) {
          archive.directory(sourcePath, name);
        } else {
          archive.directory(sourcePath, false);
        }
      });

      archive.finalize();
    });
  }

  private async createTarArchive(
    sourcePaths: string[],
    outputPath: string,
    options: Required<ArchiveOptions>
  ): Promise<void> {
    const files: string[] = [];

    // Collect all files from source paths
    for (const sourcePath of sourcePaths) {
      const stats = await fs.stat(sourcePath);
      if (stats.isFile()) {
        files.push(sourcePath);
      } else if (stats.isDirectory()) {
        const dirFiles = await this.getAllFiles(sourcePath);
        files.push(...dirFiles);
      }
    }

    // Filter files if filter function provided
    const filteredFiles = options.filter ? files.filter(options.filter) : files;

    await tar.c(
      {
        gzip: false,
        file: outputPath,
        cwd: options.includeBaseDir ? path.dirname(sourcePaths[0]) : '/',
      },
      filteredFiles
    );
  }

  private async createGzipTarArchive(
    sourcePaths: string[],
    outputPath: string,
    options: Required<ArchiveOptions>
  ): Promise<void> {
    await tar.c(
      {
        gzip: true,
        file: outputPath,
        cwd: options.includeBaseDir ? path.dirname(sourcePaths[0]) : '/',
      },
      sourcePaths
    );
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async getDirectoryStats(
    dir: string,
    excludePatterns: string[] = []
  ): Promise<{ totalSize: number; fileCount: number }> {
    let totalSize = 0;
    let fileCount = 0;

    const processDirectory = async (currentDir: string) => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Check if path should be excluded
        if (this.shouldExclude(fullPath, excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          await processDirectory(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
          fileCount++;
        }
      }
    };

    await processDirectory(dir);
    return { totalSize, fileCount };
  }

  private shouldExclude(path: string, patterns: string[]): boolean {
    if (!patterns.length) return false;

    return patterns.some(pattern => {
      if (pattern.startsWith('*')) {
        const ext = pattern.slice(1);
        return path.endsWith(ext);
      }
      return path.includes(pattern);
    });
  }

  private isImageFile(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];
    const ext = path.extname(filename).toLowerCase();
    return imageExtensions.includes(ext);
  }

  private getFileExtension(algorithm: string): string {
    const extensions: Record<string, string> = {
      gzip: 'gz',
      brotli: 'br',
      deflate: 'deflate',
    };
    return extensions[algorithm] || 'bin';
  }

  private getMimeType(algorithm: string): string {
    const mimeTypes: Record<string, string> = {
      gzip: 'application/gzip',
      brotli: 'application/x-brotli',
      deflate: 'application/deflate',
    };
    return mimeTypes[algorithm] || 'application/octet-stream';
  }

  private async checkExistingCompression(
    originalHash: string,
    algorithm: string,
    bucket: string
  ): Promise<CompressionResult | null> {
    try {
      const { data, error } = await supabase
        .from('compressions')
        .select('*')
        .eq('metadata->originalHash', originalHash)
        .eq('algorithm', algorithm)
        .eq('bucket', bucket)
        .single();

      if (error || !data) {
        return null;
      }

      return data as CompressionResult;
    } catch (error) {
      return null;
    }
  }

  private async storeCompressionMetadata(
    result: CompressionResult,
    bucket: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('compressions')
        .insert({
          id: result.id,
          original_size: result.originalSize,
          compressed_size: result.compressedSize,
          compression_ratio: result.compressionRatio,
          algorithm: result.algorithm,
          hash: result.hash,
          compressed_path: result.compressedPath,
          metadata: result.metadata,
          bucket,
          created_at: result.createdAt,
        });

      if (error) {
        throw new Error(`Failed to store compression metadata: ${error.message}`);
      }
    } catch (error) {
      console.error('Compression metadata storage error:', error);
      throw error;
    }
  }
}

// Brotli constants (Node.js doesn't export these by default)
enum BrotliEncoderParameter {
  BROTLI_PARAM_QUALITY = 0,
  BROTLI_PARAM_MODE = 1,
  BROTLI_PARAM_SIZE_HINT = 2,
}

enum BrotliEncoderMode {
  BROTLI_MODE_GENERIC = 0,
  BROTLI_MODE_TEXT = 1,
  BROTLI_MODE_FONT = 2,
}

// Singleton instance
let compressionServiceInstance: CompressionService | null = null;

export function getCompressionService(): CompressionService {
  if (!compressionServiceInstance) {
    compressionServiceInstance = new CompressionService();
  }
  return compressionServiceInstance;
}
