'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Play, 
  Pause, 
  Maximize, 
  Minimize,
  Move,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface Product360ViewerProps {
  images: string[]; // Array of 360-degree frames
  frameCount?: number;
  fps?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  showControls?: boolean;
  className?: string;
  width?: number | string;
  height?: number | string;
}

export function Product360Viewer({
  images,
  frameCount = 36, // Default 36 frames for 10-degree increments
  fps = 30,
  autoRotate = true,
  autoRotateSpeed = 1,
  showControls = true,
  className,
  width = '100%',
  height = '500px',
}: Product360ViewerProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(autoRotate);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotationDirection, setRotationDirection] = useState<'clockwise' | 'counterclockwise'>('clockwise');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const animationRef = useRef<number>(0);
  const startXRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);

  const totalFrames = Math.min(images.length, frameCount);
  const frameAngle = 360 / totalFrames;

  // Preload images
  useEffect(() => {
    setLoading(true);
    
    const preloadImages = async () => {
      const promises = images.slice(0, totalFrames).map(src => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = src;
          img.onload = resolve;
          img.onerror = reject;
        });
      });

      try {
        await Promise.all(promises);
        setLoading(false);
      } catch (error) {
        console.error('Error preloading 360 images:', error);
        setLoading(false);
      }
    };

    preloadImages();
  }, [images, totalFrames]);

  // Auto rotation animation
  useEffect(() => {
    if (!isAutoRotating || loading) return;

    const animate = (timestamp: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      
      const delta = timestamp - lastFrameRef.current;
      const frameIncrement = (delta / (1000 / fps)) * autoRotateSpeed;
      
      if (frameIncrement >= 1) {
        setCurrentFrame(prev => {
          const direction = rotationDirection === 'clockwise' ? 1 : -1;
          let next = prev + direction;
          if (next >= totalFrames) next = 0;
          if (next < 0) next = totalFrames - 1;
          return next;
        });
        lastFrameRef.current = timestamp;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isAutoRotating, fps, autoRotateSpeed, rotationDirection, totalFrames, loading]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const deltaX = e.clientX - startXRef.current;
    const containerWidth = containerRef.current.clientWidth;
    const frameChange = Math.round((deltaX / containerWidth) * totalFrames * 0.5);

    if (frameChange !== 0) {
      setCurrentFrame(prev => {
        let next = prev + frameChange;
        if (next >= totalFrames) next = next % totalFrames;
        if (next < 0) next = totalFrames + (next % totalFrames);
        return next;
      });
      startXRef.current = e.clientX;
    }
  }, [isDragging, totalFrames]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    e.preventDefault();
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const deltaX = e.touches[0].clientX - startXRef.current;
    const containerWidth = containerRef.current.clientWidth;
    const frameChange = Math.round((deltaX / containerWidth) * totalFrames * 0.5);

    if (frameChange !== 0) {
      setCurrentFrame(prev => {
        let next = prev + frameChange;
        if (next >= totalFrames) next = next % totalFrames;
        if (next < 0) next = totalFrames + (next % totalFrames);
        return next;
      });
      startXRef.current = e.touches[0].clientX;
    }
  }, [isDragging, totalFrames]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const toggleAutoRotate = () => {
    setIsAutoRotating(!isAutoRotating);
  };

  const toggleRotationDirection = () => {
    setRotationDirection(prev => 
      prev === 'clockwise' ? 'counterclockwise' : 'clockwise'
    );
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error('Error entering fullscreen:', err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(err => console.error('Error exiting fullscreen:', err));
    }
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const resetView = () => {
    setZoomLevel(1);
    setCurrentFrame(0);
  };

  const goToFrame = (frameIndex: number) => {
    setCurrentFrame(frameIndex);
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!containerRef.current?.contains(e.target as Node)) return;

    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    setCurrentFrame(prev => {
      let next = prev + delta;
      if (next >= totalFrames) next = 0;
      if (next < 0) next = totalFrames - 1;
      return next;
    });
  }, [totalFrames]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove as EventListener);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove as EventListener);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(animationRef.current);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd, handleWheel]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const currentImage = images[currentFrame] || images[0];
  const currentAngle = currentFrame * frameAngle;
  const progress = (currentFrame / (totalFrames - 1)) * 100;

  if (loading) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-100 rounded-lg',
          className
        )}
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading 360° view...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-100 rounded-lg',
          className
        )}
        style={{ width, height }}
      >
        <div className="text-center">
          <RotateCw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">360° view not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div
        ref={containerRef}
        className={cn(
          'relative bg-black rounded-lg overflow-hidden',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
        style={{ width, height }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="text-white text-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading 360° view...</p>
            </div>
          </div>
        )}

        {/* Main Image */}
        <img
          ref={imageRef}
          src={currentImage}
          alt={`360 view - frame ${currentFrame + 1}`}
          className="w-full h-full object-contain select-none"
          style={{
            transform: `scale(${zoomLevel})`,
            transition: isDragging ? 'none' : 'transform 0.2s ease',
          }}
          draggable={false}
        />

        {/* Controls Overlay */}
        {showControls && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Top Controls */}
            <div className="absolute top-4 left-0 right-0 px-4 flex justify-between pointer-events-auto">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAutoRotate}
                  className="bg-black/50 text-white hover:bg-black/70"
                >
                  {isAutoRotating ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleRotationDirection}
                  className="bg-black/50 text-white hover:bg-black/70"
                  title={`Rotate ${rotationDirection === 'clockwise' ? 'counter-clockwise' : 'clockwise'}`}
                >
                  <RotateCw className={cn(
                    'w-4 h-4',
                    rotationDirection === 'counterclockwise' && 'transform rotate-180'
                  )} />
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="bg-black/50 text-white hover:bg-black/70"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="bg-black/50 text-white hover:bg-black/70"
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Center Drag Indicator */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-white/30 rounded-full flex items-center justify-center pointer-events-none">
                <Move className="w-6 h-6 text-white/50" />
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-4 left-0 right-0 px-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/70 mt-1">
                  <span>{currentFrame + 1} / {totalFrames}</span>
                  <span>{currentAngle.toFixed(0)}°</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between pointer-events-auto">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomOut}
                    disabled={zoomLevel <= 0.5}
                    className="bg-black/50 text-white hover:bg-black/70 disabled:opacity-50"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetView}
                    className="bg-black/50 text-white hover:bg-black/70"
                  >
                    Reset
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomIn}
                    disabled={zoomLevel >= 3}
                    className="bg-black/50 text-white hover:bg-black/70 disabled:opacity-50"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>

                <div className="text-white text-sm">
                  Drag or scroll to rotate • {zoomLevel.toFixed(1)}x
                </div>
              </div>
            </div>

            {/* Frame Thumbnails */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 space-y-2 max-h-64 overflow-y-auto pointer-events-auto">
              {images.slice(0, totalFrames).map((image, index) => (
                <button
                  key={index}
                  onClick={() => goToFrame(index)}
                  className={cn(
                    'w-12 h-12 rounded border-2 overflow-hidden transition-transform',
                    currentFrame === index
                      ? 'border-red-600 scale-110'
                      : 'border-transparent hover:scale-105'
                  )}
                >
                  <img
                    src={image}
                    alt={`Frame ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-12 right-4 bg-gray-900 text-white rounded-lg p-4 w-64 shadow-lg z-10 pointer-events-auto">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Rotation Speed</h4>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={autoRotateSpeed}
                  onChange={(e) => {
                    // Update autoRotateSpeed through parent component
                    console.log('New speed:', e.target.value);
                  }}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600"
                />
                <div className="text-xs text-gray-400 mt-1">
                  {autoRotateSpeed.toFixed(1)}x
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Frame Rate</h4>
                <div className="flex space-x-2">
                  {[24, 30, 60].map(rate => (
                    <button
                      key={rate}
                      onClick={() => console.log('Set FPS to:', rate)}
                      className={cn(
                        'px-3 py-1 rounded text-sm',
                        fps === rate
                          ? 'bg-red-600'
                          : 'bg-gray-700 hover:bg-gray-600'
                      )}
                    >
                      {rate} FPS
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Quality</h4>
                <div className="flex space-x-2">
                  {['Low', 'Medium', 'High'].map(quality => (
                    <button
                      key={quality}
                      onClick={() => console.log('Set quality to:', quality)}
                      className={cn(
                        'px-3 py-1 rounded text-sm',
                        quality === 'Medium'
                          ? 'bg-red-600'
                          : 'bg-gray-700 hover:bg-gray-600'
                      )}
                    >
                      {quality}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-sm text-gray-600">
        <p>• Drag horizontally to rotate 360° • Scroll to rotate frame by frame •</p>
        <p className="mt-1">• Use controls to auto-rotate, zoom, and change settings •</p>
      </div>

      {/* AR Button (for mobile) */}
      {typeof window !== 'undefined' && 'xr' in navigator && (
        <div className="mt-4 text-center">
          <Button variant="primary" size="sm">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            View in AR
          </Button>
        </div>
      )}
    </div>
  );
}

// AR View component placeholder
export function ProductARView({ modelUrl }: { modelUrl: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">AR View Available</h3>
      <p className="text-gray-600 mb-6">View this product in your space using AR</p>
      <Button variant="primary">
        Launch AR Experience
      </Button>
    </div>
  );
}
