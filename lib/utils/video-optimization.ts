export interface VideoOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxDuration?: number;
  quality?: number;
  format?: 'mp4' | 'webm';
  frameRate?: number;
  bitrate?: number;
}

export class VideoOptimizer {
  private static instance: VideoOptimizer;

  private constructor() {}

  static getInstance(): VideoOptimizer {
    if (!VideoOptimizer.instance) {
      VideoOptimizer.instance = new VideoOptimizer();
    }
    return VideoOptimizer.instance;
  }

  async optimize(
    video: File | Blob,
    options: VideoOptimizationOptions = {}
  ): Promise<Blob> {
    const defaultOptions: Required<VideoOptimizationOptions> = {
      maxWidth: 1280,
      maxHeight: 720,
      maxDuration: 300, // 5 minutes
      quality: 0.8,
      format: 'mp4',
      frameRate: 30,
      bitrate: 2000000, // 2 Mbps
    };

    const opts = { ...defaultOptions, ...options };

    try {
      // Check if video is too long
      const duration = await this.getVideoDuration(video);
      if (duration > opts.maxDuration) {
        throw new Error(`Video exceeds maximum duration of ${opts.maxDuration} seconds`);
      }

      return await this.processVideo(video, opts);
    } catch (error) {
      console.error('Video optimization failed:', error);
      throw error;
    }
  }

  private async processVideo(
    videoBlob: Blob,
    options: Required<VideoOptimizationOptions>
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(videoBlob);

      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Calculate new dimensions
        const { videoWidth: originalWidth, videoHeight: originalHeight } = video;
        const { width: targetWidth, height: targetHeight } = this.calculateDimensions(
          originalWidth,
          originalHeight,
          options.maxWidth,
          options.maxHeight
        );

        // Set canvas dimensions
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Create media recorder
        const stream = canvas.captureStream(options.frameRate);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: options.format === 'webm' 
            ? 'video/webm;codecs=vp9'
            : 'video/mp4;codecs=h264',
          videoBitsPerSecond: options.bitrate,
        });

        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const optimizedBlob = new Blob(chunks, {
            type: mediaRecorder.mimeType,
          });
          resolve(optimizedBlob);
        };

        mediaRecorder.onerror = (event) => {
          reject(new Error(`MediaRecorder error: ${event}`));
        };

        // Start recording
        mediaRecorder.start();

        // Draw video frames
        let startTime: number | null = null;
        
        const drawFrame = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          
          const elapsed = timestamp - startTime;
          const progress = elapsed / (video.duration * 1000);
          
          if (progress >= 1) {
            mediaRecorder.stop();
            return;
          }

          video.currentTime = video.duration * progress;
          
          video.onseeked = () => {
            // Clear and draw
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Continue drawing
            requestAnimationFrame(drawFrame);
          };
        };

        // Start animation
        requestAnimationFrame(drawFrame);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };

      video.src = url;
    });
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // Maintain aspect ratio while respecting max dimensions
    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      const widthRatio = maxWidth / originalWidth;
      const heightRatio = maxHeight / originalHeight;
      const ratio = Math.min(widthRatio, heightRatio);
      
      width = Math.floor(originalWidth * ratio);
      height = Math.floor(originalHeight * ratio);
    }

    // Ensure even dimensions (some codecs require this)
    if (width % 2 !== 0) width--;
    if (height % 2 !== 0) height--;

    return { width, height };
  }

  async getVideoDuration(video: File | Blob): Promise<number> {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      const url = URL.createObjectURL(video);

      videoElement.preload = 'metadata';
      
      videoElement.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(videoElement.duration);
      };

      videoElement.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video metadata'));
      };

      videoElement.src = url;
    });
  }

  async getVideoMetadata(video: File | Blob): Promise<{
    duration: number;
    width: number;
    height: number;
    size: number;
    type: string;
    aspectRatio: number;
    bitrate?: number;
  }> {
    const duration = await this.getVideoDuration(video);
    
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      const url = URL.createObjectURL(video);

      videoElement.preload = 'metadata';
      
      videoElement.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        
        const metadata = {
          duration,
          width: videoElement.videoWidth,
          height: videoElement.videoHeight,
          size: video.size,
          type: video.type,
          aspectRatio: videoElement.videoWidth / videoElement.videoHeight,
          bitrate: video.size > 0 ? (video.size * 8) / duration : undefined,
        };
        
        resolve(metadata);
      };

      videoElement.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video metadata'));
      };

      videoElement.src = url;
    });
  }

  async generateThumbnail(
    video: File | Blob,
    time: number = 0,
    options: {
      width?: number;
      height?: number;
      format?: 'image/webp' | 'image/jpeg' | 'image/png';
      quality?: number;
    } = {}
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      const url = URL.createObjectURL(video);

      videoElement.preload = 'metadata';
      
      videoElement.onloadedmetadata = () => {
        // Seek to specified time
        videoElement.currentTime = Math.min(time, videoElement.duration);
        
        videoElement.onseeked = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error('Canvas context not available'));
            return;
          }

          // Calculate thumbnail dimensions
          const targetWidth = options.width || 320;
          const targetHeight = options.height || 180;
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Draw video frame
          ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create thumbnail'));
              }
            },
            options.format || 'image/webp',
            options.quality || 0.8
          );
        };
      };

      videoElement.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };

      videoElement.src = url;
    });
  }

  async generateMultipleThumbnails(
    video: File | Blob,
    count: number = 4,
    options: {
      width?: number;
      height?: number;
      format?: 'image/webp' | 'image/jpeg' | 'image/png';
      quality?: number;
    } = {}
  ): Promise<Blob[]> {
    const duration = await this.getVideoDuration(video);
    const thumbnails: Blob[] = [];
    
    // Generate thumbnails at evenly spaced intervals
    for (let i = 0; i < count; i++) {
      const time = (duration / (count + 1)) * (i + 1);
      const thumbnail = await this.generateThumbnail(video, time, options);
      thumbnails.push(thumbnail);
    }
    
    return thumbnails;
  }

  async compressForUpload(
    video: File,
    maxSize: number = 50 * 1024 * 1024, // 50MB
    targetBitrate?: number
  ): Promise<File> {
    if (video.size <= maxSize) {
      return video;
    }

    const metadata = await this.getVideoMetadata(video);
    
    // Calculate target bitrate based on max size and duration
    const calculatedBitrate = (maxSize * 8) / metadata.duration;
    const finalBitrate = Math.min(
      calculatedBitrate,
      targetBitrate || 5000000 // 5 Mbps max
    );

    const optimized = await this.optimize(video, {
      maxWidth: metadata.width,
      maxHeight: metadata.height,
      bitrate: finalBitrate,
      quality: 0.8,
    });

    return new File([optimized], video.name, {
      type: optimized.type,
      lastModified: Date.now(),
    });
  }

  async validateVideo(video: File): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Check file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(video.type)) {
      errors.push(`Invalid video format: ${video.type}. Supported formats: MP4, WebM, OGG, MOV`);
    }

    // Check file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (video.size > maxSize) {
      errors.push(`Video size (${(video.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum (500MB)`);
    }

    try {
      // Check video duration
      const duration = await this.getVideoDuration(video);
      const maxDuration = 300; // 5 minutes
      if (duration > maxDuration) {
        errors.push(`Video duration (${Math.ceil(duration)}s) exceeds maximum (${maxDuration}s)`);
      }
    } catch (error) {
      errors.push('Failed to read video metadata');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async extractAudio(
    video: File | Blob,
    format: 'mp3' | 'wav' | 'ogg' = 'mp3'
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      const audioContext = new AudioContext();
      const url = URL.createObjectURL(video);

      videoElement.preload = 'metadata';
      
      videoElement.onloadedmetadata = () => {
        const source = audioContext.createMediaElementSource(videoElement);
        const destination = audioContext.createMediaStreamDestination();
        
        source.connect(destination);
        
        const mediaRecorder = new MediaRecorder(destination.stream, {
          mimeType: format === 'mp3' 
            ? 'audio/mpeg'
            : format === 'wav'
            ? 'audio/wav'
            : 'audio/ogg',
        });

        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          URL.revokeObjectURL(url);
          audioContext.close();
          
          const audioBlob = new Blob(chunks, {
            type: mediaRecorder.mimeType,
          });
          resolve(audioBlob);
        };

        mediaRecorder.onerror = (event) => {
          URL.revokeObjectURL(url);
          audioContext.close();
          reject(new Error(`Audio extraction error: ${event}`));
        };

        // Start recording
        mediaRecorder.start();
        videoElement.play();

        // Stop when video ends
        videoElement.onended = () => {
          mediaRecorder.stop();
        };
      };

      videoElement.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video for audio extraction'));
      };

      videoElement.src = url;
    });
  }

  async trimVideo(
    video: File | Blob,
    startTime: number,
    endTime: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      const url = URL.createObjectURL(video);

      videoElement.preload = 'metadata';
      
      videoElement.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas context not available'));
          return;
        }

        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
        });

        const chunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          URL.revokeObjectURL(url);
          const trimmedBlob = new Blob(chunks, { type: 'video/webm' });
          resolve(trimmedBlob);
        };

        // Start recording
        mediaRecorder.start();

        let currentTime = startTime;
        const drawFrame = () => {
          if (currentTime >= endTime) {
            mediaRecorder.stop();
            return;
          }

          videoElement.currentTime = currentTime;
          
          videoElement.onseeked = () => {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            currentTime += 1/30; // 30 FPS
            
            if (currentTime < endTime) {
              requestAnimationFrame(drawFrame);
            } else {
              mediaRecorder.stop();
            }
          };
        };

        drawFrame();
      };

      videoElement.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };

      videoElement.src = url;
    });
  }
}

export const videoOptimizer = VideoOptimizer.getInstance();
