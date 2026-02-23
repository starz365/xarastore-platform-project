import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase/client';

export interface VideoProcessingOptions {
  width?: number;
  height?: number;
  bitrate?: string;
  fps?: number;
  format?: 'mp4' | 'webm' | 'mov';
  codec?: 'h264' | 'vp9' | 'hevc';
  quality?: number;
  thumbnailTime?: number;
  watermark?: {
    path: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity: number;
  };
}

export interface ProcessedVideo {
  id: string;
  originalPath: string;
  processedPath: string;
  thumbnailPath: string;
  format: string;
  duration: number;
  width: number;
  height: number;
  size: number;
  bitrate: number;
  fps: number;
  codec: string;
  hash: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  fps: number;
  codec: string;
  format: string;
  size: number;
  rotation?: number;
  hasAudio: boolean;
  audioCodec?: string;
  audioBitrate?: number;
  audioChannels?: number;
}

export class VideoProcessor {
  private readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly ALLOWED_FORMATS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'];
  private readonly OUTPUT_FORMATS = ['mp4', 'webm'] as const;
  private readonly SUPPORTED_CODECS = {
    mp4: ['h264', 'hevc'],
    webm: ['vp9', 'vp8'],
    mov: ['h264', 'prores'],
  };

  async processVideo(
    inputPath: string,
    outputPath: string,
    options: VideoProcessingOptions = {},
    bucket: string = 'product-videos'
  ): Promise<ProcessedVideo> {
    try {
      // Validate input file
      await this.validateVideoFile(inputPath);

      // Get video metadata
      const metadata = await this.getVideoMetadata(inputPath);

      // Set default options
      const processingOptions: Required<VideoProcessingOptions> = {
        width: options.width || metadata.width,
        height: options.height || metadata.height,
        bitrate: options.bitrate || this.calculateBitrate(metadata),
        fps: options.fps || metadata.fps,
        format: options.format || 'mp4',
        codec: options.codec || 'h264',
        quality: options.quality || 23,
        thumbnailTime: options.thumbnailTime || 1,
        watermark: options.watermark || null,
      };

      // Validate codec compatibility
      this.validateCodecCompatibility(processingOptions.format, processingOptions.codec);

      // Generate output filename
      const outputFileName = `${uuidv4()}.${processingOptions.format}`;
      const fullOutputPath = path.join(outputPath, outputFileName);

      // Process video
      await this.encodeVideo(inputPath, fullOutputPath, processingOptions);

      // Generate thumbnail
      const thumbnailPath = await this.generateThumbnail(
        inputPath,
        outputPath,
        processingOptions.thumbnailTime
      );

      // Calculate hash
      const videoBuffer = await fs.readFile(fullOutputPath);
      const hash = createHash('sha256').update(videoBuffer).digest('hex');

      // Upload to Supabase Storage
      const videoKey = `videos/${outputFileName}`;
      const thumbnailKey = `thumbnails/${path.basename(thumbnailPath)}`;

      const [videoUpload, thumbnailUpload] = await Promise.all([
        this.uploadToStorage(videoKey, videoBuffer, `video/${processingOptions.format}`, bucket),
        this.uploadToStorage(thumbnailKey, await fs.readFile(thumbnailPath), 'image/jpeg', bucket),
      ]);

      // Get public URLs
      const videoUrl = supabase.storage.from(bucket).getPublicUrl(videoKey).data.publicUrl;
      const thumbnailUrl = supabase.storage.from(bucket).getPublicUrl(thumbnailKey).data.publicUrl;

      // Create processed video record
      const processedVideo: ProcessedVideo = {
        id: uuidv4(),
        originalPath: inputPath,
        processedPath: videoUrl,
        thumbnailPath: thumbnailUrl,
        format: processingOptions.format,
        duration: metadata.duration,
        width: processingOptions.width,
        height: processingOptions.height,
        size: videoBuffer.length,
        bitrate: parseInt(processingOptions.bitrate) || 0,
        fps: processingOptions.fps,
        codec: processingOptions.codec,
        hash,
        metadata: {
          originalMetadata: metadata,
          processingOptions,
          outputPath: fullOutputPath,
        },
        createdAt: new Date().toISOString(),
      };

      // Store metadata in database
      await this.storeVideoMetadata(processedVideo, bucket);

      // Cleanup local files
      await Promise.all([
        fs.unlink(fullOutputPath).catch(() => {}),
        fs.unlink(thumbnailPath).catch(() => {}),
      ]);

      return processedVideo;
    } catch (error) {
      console.error('Video processing error:', error);
      throw error;
    }
  }

  async generateMultipleResolutions(
    inputPath: string,
    outputPath: string,
    resolutions: Array<{ width: number; height: number; bitrate: string }> = [
      { width: 1920, height: 1080, bitrate: '5000k' },
      { width: 1280, height: 720, bitrate: '2500k' },
      { width: 854, height: 480, bitrate: '1000k' },
      { width: 640, height: 360, bitrate: '500k' },
    ],
    bucket: string = 'product-videos'
  ): Promise<ProcessedVideo[]> {
    const processedVideos: ProcessedVideo[] = [];

    for (const resolution of resolutions) {
      try {
        const processedVideo = await this.processVideo(
          inputPath,
          outputPath,
          {
            width: resolution.width,
            height: resolution.height,
            bitrate: resolution.bitrate,
            format: 'mp4',
            codec: 'h264',
          },
          bucket
        );

        processedVideos.push(processedVideo);
      } catch (error) {
        console.error(`Failed to process ${resolution.width}x${resolution.height} video:`, error);
      }
    }

    return processedVideos;
  }

  async extractAudio(
    videoPath: string,
    outputPath: string,
    format: 'mp3' | 'aac' | 'wav' = 'mp3',
    bitrate: string = '192k'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputFile = path.join(outputPath, `${uuidv4()}.${format}`);

      ffmpeg(videoPath)
        .noVideo()
        .audioCodec(format === 'mp3' ? 'libmp3lame' : format === 'aac' ? 'aac' : 'pcm_s16le')
        .audioBitrate(bitrate)
        .output(outputFile)
        .on('end', () => resolve(outputFile))
        .on('error', reject)
        .run();
    });
  }

  async concatenateVideos(
    videoPaths: string[],
    outputPath: string,
    bucket: string = 'product-videos'
  ): Promise<ProcessedVideo> {
    try {
      // Create concat file for ffmpeg
      const concatFile = path.join(outputPath, 'concat.txt');
      const concatContent = videoPaths.map(p => `file '${p}'`).join('\n');
      await fs.writeFile(concatFile, concatContent);

      const outputFile = path.join(outputPath, `${uuidv4()}.mp4`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatFile)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy'])
          .output(outputFile)
          .on('end', () => resolve())
          .on('error', reject)
          .run();
      });

      // Cleanup concat file
      await fs.unlink(concatFile).catch(() => {});

      // Process the concatenated video
      return await this.processVideo(outputFile, outputPath, {}, bucket);
    } catch (error) {
      console.error('Video concatenation error:', error);
      throw error;
    }
  }

  async addWatermark(
    videoPath: string,
    watermarkPath: string,
    outputPath: string,
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' = 'bottom-right',
    opacity: number = 0.7,
    bucket: string = 'product-videos'
  ): Promise<ProcessedVideo> {
    const positionMap = {
      'top-left': '10:10',
      'top-right': 'main_w-overlay_w-10:10',
      'bottom-left': '10:main_h-overlay_h-10',
      'bottom-right': 'main_w-overlay_w-10:main_h-overlay_h-10',
      'center': '(main_w-overlay_w)/2:(main_h-overlay_h)/2',
    };

    const outputFile = path.join(outputPath, `${uuidv4()}.mp4`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .input(watermarkPath)
        .complexFilter([
          `[0:v][1:v]overlay=${positionMap[position]}:format=auto:enable='between(t,0,30)'[v]`,
          `[v]format=yuv420p`
        ])
        .videoCodec('libx264')
        .outputOptions([
          '-preset', 'fast',
          '-crf', '23',
          '-maxrate', '5000k',
          '-bufsize', '10000k',
        ])
        .output(outputFile)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });

    return await this.processVideo(outputFile, outputPath, {}, bucket);
  }

  async generatePreview(
    videoPath: string,
    outputPath: string,
    duration: number = 30,
    bucket: string = 'product-videos'
  ): Promise<ProcessedVideo> {
    const metadata = await this.getVideoMetadata(videoPath);
    const startTime = Math.max(0, (metadata.duration - duration) / 2);

    const outputFile = path.join(outputPath, `${uuidv4()}.mp4`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .videoCodec('libx264')
        .outputOptions([
          '-preset', 'fast',
          '-crf', '23',
          '-maxrate', '3000k',
          '-bufsize', '6000k',
        ])
        .output(outputFile)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });

    return await this.processVideo(outputFile, outputPath, {
      width: 1280,
      height: 720,
      bitrate: '2500k',
    }, bucket);
  }

  async validateVideoFile(filePath: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const stats = await fs.stat(filePath);
      
      // Check file size
      if (stats.size > this.MAX_FILE_SIZE) {
        errors.push(`File size exceeds ${this.MAX_FILE_SIZE / 1024 / 1024}MB limit`);
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase().slice(1);
      if (!this.ALLOWED_FORMATS.includes(ext)) {
        errors.push(`Unsupported video format: ${ext}`);
      }

      // Check if file is readable by ffmpeg
      const metadata = await this.getVideoMetadata(filePath);
      
      if (!metadata.duration || metadata.duration <= 0) {
        errors.push('Invalid video duration');
      }

      if (!metadata.width || !metadata.height) {
        errors.push('Unable to read video dimensions');
      }

      if (metadata.duration > 3600) { // 1 hour max
        errors.push('Video duration exceeds 1 hour limit');
      }

    } catch (error) {
      errors.push('Unable to read video file');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get video metadata: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          bitrate: parseInt(metadata.format.bitrate) || 0,
          fps: eval(videoStream.r_frame_rate || '0'),
          codec: videoStream.codec_name || 'unknown',
          format: metadata.format.format_name?.split(',')[0] || 'unknown',
          size: metadata.format.size || 0,
          rotation: videoStream.rotation || 0,
          hasAudio: !!audioStream,
          audioCodec: audioStream?.codec_name,
          audioBitrate: audioStream?.bit_rate ? parseInt(audioStream.bit_rate) : undefined,
          audioChannels: audioStream?.channels,
        });
      });
    });
  }

  private calculateBitrate(metadata: VideoMetadata): string {
    const resolution = metadata.width * metadata.height;
    
    if (resolution >= 1920 * 1080) return '5000k'; // 1080p
    if (resolution >= 1280 * 720) return '2500k';  // 720p
    if (resolution >= 854 * 480) return '1000k';   // 480p
    return '500k';                                 // 360p and below
  }

  private validateCodecCompatibility(format: string, codec: string): void {
    const supportedCodecs = this.SUPPORTED_CODECS[format as keyof typeof this.SUPPORTED_CODECS];
    
    if (!supportedCodecs) {
      throw new Error(`Unsupported output format: ${format}`);
    }

    if (!supportedCodecs.includes(codec)) {
      throw new Error(`Codec ${codec} is not supported for format ${format}`);
    }
  }

  private async encodeVideo(
    inputPath: string,
    outputPath: string,
    options: Required<VideoProcessingOptions>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .videoCodec(options.codec === 'h264' ? 'libx264' : options.codec === 'vp9' ? 'libvpx-vp9' : 'libx265')
        .size(`${options.width}x${options.height}`)
        .videoBitrate(options.bitrate)
        .fps(options.fps)
        .outputOptions([
          '-preset', 'fast',
          '-crf', options.quality.toString(),
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
        ]);

      // Add watermark if specified
      if (options.watermark) {
        command.input(options.watermark.path);
        const position = this.getWatermarkPosition(options.watermark.position);
        command.complexFilter([
          `[0:v][1:v]overlay=${position}:format=auto:alpha=${options.watermark.opacity}[v]`,
          `[v]format=yuv420p`
        ]);
      }

      command
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .on('progress', (progress) => {
          console.log(`Processing: ${progress.percent?.toFixed(2)}%`);
        })
        .run();
    });
  }

  private async generateThumbnail(
    videoPath: string,
    outputPath: string,
    timeInSeconds: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const thumbnailPath = path.join(outputPath, `${uuidv4()}.jpg`);

      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timeInSeconds],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '640x360',
        })
        .on('end', () => resolve(thumbnailPath))
        .on('error', reject);
    });
  }

  private getWatermarkPosition(position: string): string {
    const positions: Record<string, string> = {
      'top-left': '10:10',
      'top-right': 'main_w-overlay_w-10:10',
      'bottom-left': '10:main_h-overlay_h-10',
      'bottom-right': 'main_w-overlay_w-10:main_h-overlay_h-10',
      'center': '(main_w-overlay_w)/2:(main_h-overlay_h)/2',
    };
    return positions[position] || positions['bottom-right'];
  }

  private async uploadToStorage(
    key: string,
    buffer: Buffer,
    contentType: string,
    bucket: string
  ): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(key, buffer, {
        contentType,
        upsert: true,
        cacheControl: 'public, max-age=31536000',
      });

    if (error) {
      throw new Error(`Failed to upload to storage: ${error.message}`);
    }
  }

  private async storeVideoMetadata(video: ProcessedVideo, bucket: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('processed_videos')
        .insert({
          id: video.id,
          original_path: video.originalPath,
          processed_path: video.processedPath,
          thumbnail_path: video.thumbnailPath,
          format: video.format,
          duration: video.duration,
          width: video.width,
          height: video.height,
          size: video.size,
          bitrate: video.bitrate,
          fps: video.fps,
          codec: video.codec,
          hash: video.hash,
          metadata: video.metadata,
          bucket,
          created_at: video.createdAt,
        });

      if (error) {
        throw new Error(`Failed to store video metadata: ${error.message}`);
      }
    } catch (error) {
      console.error('Video metadata storage error:', error);
      throw error;
    }
  }

  async cleanupOldVideos(bucket: string, daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data: oldVideos, error: fetchError } = await supabase
        .from('processed_videos')
        .select('id, processed_path, thumbnail_path')
        .lt('created_at', cutoffDate.toISOString());

      if (fetchError) {
        throw new Error(`Failed to fetch old videos: ${fetchError.message}`);
      }

      let deletedCount = 0;

      for (const video of oldVideos) {
        try {
          // Extract file paths from URLs
          const videoPath = video.processed_path.split('/').pop();
          const thumbnailPath = video.thumbnail_path.split('/').pop();

          // Delete from storage
          const filesToDelete = [];
          if (videoPath) filesToDelete.push(`videos/${videoPath}`);
          if (thumbnailPath) filesToDelete.push(`thumbnails/${thumbnailPath}`);

          if (filesToDelete.length > 0) {
            const { error: deleteError } = await supabase.storage
              .from(bucket)
              .remove(filesToDelete);

            if (deleteError) {
              console.error(`Failed to delete storage files for video ${video.id}:`, deleteError);
              continue;
            }
          }

          // Delete database record
          const { error: dbError } = await supabase
            .from('processed_videos')
            .delete()
            .eq('id', video.id);

          if (dbError) {
            console.error(`Failed to delete database record for video ${video.id}:`, dbError);
            continue;
          }

          deletedCount++;
        } catch (error) {
          console.error(`Error cleaning up video ${video.id}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Cleanup error:', error);
      return 0;
    }
  }

  async getVideoStats(bucket: string = 'product-videos'): Promise<{
    totalVideos: number;
    totalSize: number;
    averageDuration: number;
    formats: Record<string, number>;
    lastProcessed: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('processed_videos')
        .select('size, format, duration, created_at')
        .eq('bucket', bucket);

      if (error) {
        throw new Error(`Failed to fetch video stats: ${error.message}`);
      }

      const totalVideos = data.length;
      const totalSize = data.reduce((sum, video) => sum + (video.size || 0), 0);
      const totalDuration = data.reduce((sum, video) => sum + (video.duration || 0), 0);
      const formats = data.reduce((acc, video) => {
        acc[video.format] = (acc[video.format] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const lastProcessed = data.length > 0
        ? new Date(Math.max(...data.map(video => new Date(video.created_at).getTime()))).toISOString()
        : null;

      return {
        totalVideos,
        totalSize,
        averageDuration: totalVideos > 0 ? totalDuration / totalVideos : 0,
        formats,
        lastProcessed,
      };
    } catch (error) {
      console.error('Video stats error:', error);
      return {
        totalVideos: 0,
        totalSize: 0,
        averageDuration: 0,
        formats: {},
        lastProcessed: null,
      };
    }
  }
}

// Singleton instance
let videoProcessorInstance: VideoProcessor | null = null;

export function getVideoProcessor(): VideoProcessor {
  if (!videoProcessorInstance) {
    videoProcessorInstance = new VideoProcessor();
  }
  return videoProcessorInstance;
}
