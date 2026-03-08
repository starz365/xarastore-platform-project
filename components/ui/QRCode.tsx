'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from './Button';
import { useToast } from './Toast';

interface QRCodeProps {
  value: string;
  size?: number;
  includeMargin?: boolean;
  level?: 'L' | 'M' | 'Q' | 'H';
  bgColor?: string;
  fgColor?: string;
  className?: string;
  showDownload?: boolean;
  showCopy?: boolean;
  downloadFilename?: string;
}

export function QRCode({
  value,
  size = 200,
  includeMargin = true,
  level = 'M',
  bgColor = '#ffffff',
  fgColor = '#000000',
  className,
  showDownload = true,
  showCopy = true,
  downloadFilename = 'qrcode.png',
}: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    generateQRCode();
  }, [value, size, includeMargin, level, bgColor, fgColor]);

  const generateQRCode = async () => {
    try {
      // Dynamically import QRCode library to reduce bundle size
      const QRCode = (await import('qrcode')).default;

      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: includeMargin ? 4 : 0,
          errorCorrectionLevel: level,
          color: {
            dark: fgColor,
            light: bgColor,
          },
        });
        setError(null);
      }
    } catch (err) {
      console.error('QR Code generation error:', err);
      setError('Failed to generate QR code');
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;

    const link = document.createElement('a');
    link.download = downloadFilename;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();

    toast({
      title: 'QR Code Downloaded',
      description: 'Your QR code has been saved to your device.',
      variant: 'success',
    });
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((blob) => resolve(blob!), 'image/png');
      });

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      toast({
        title: 'QR Code Copied',
        description: 'QR code image has been copied to clipboard.',
        variant: 'success',
      });
    } catch (err) {
      console.error('Copy failed:', err);
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy QR code to clipboard.',
        variant: 'error',
      });
    }
  };

  if (error) {
    return (
      <div className={cn('flex items-center justify-center bg-red-50 rounded-lg', className)} style={{ width: size, height: size }}>
        <p className="text-red-600 text-sm text-center px-4">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center space-y-3', className)}>
      <div
        className="relative group"
        style={{ width: size, height: size }}
      >
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-lg shadow-md"
        />
        
        {(showDownload || showCopy) && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
            {showCopy && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="w-10 h-10 p-0"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            )}
            {showDownload && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                className="w-10 h-10 p-0"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {showCopy && copied && (
        <p className="text-sm text-green-600">Copied to clipboard!</p>
      )}

      {/* Hidden canvas for SVG fallback */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export function QRCodeSkeleton({ size = 200, className }: { size?: number; className?: string }) {
  return (
    <div
      className={cn('bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse', className)}
      style={{ width: size, height: size }}
    />
  );
}

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  className?: string;
  width?: number;
  height?: number;
  fps?: number;
  qrbox?: number;
}

export function QRCodeScanner({
  onScan,
  onError,
  className,
  width = 400,
  height = 300,
  fps = 10,
  qrbox = 250,
}: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    checkCameraAvailability();

    return () => {
      stopScanning();
    };
  }, []);

  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = devices.some(device => device.kind === 'videoinput');
      setHasCamera(hasVideoInput);
    } catch (err) {
      setHasCamera(false);
    }
  };

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
        startScanLoop();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setHasCamera(false);
      onError?.('Failed to access camera');
    }
  };

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsScanning(false);
  };

  const startScanLoop = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    scanIntervalRef.current = setInterval(async () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = await decodeQRCode(imageData);
          if (code) {
            onScan(code);
            stopScanning();
          }
        } catch (err) {
          // No QR code found in this frame
        }
      }
    }, 1000 / fps);
  };

  const decodeQRCode = async (imageData: ImageData): Promise<string | null> => {
    // Dynamically import jsQR for QR decoding
    const jsQR = (await import('jsqr')).default;
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    return code?.data || null;
  };

  if (!hasCamera) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg', className)}>
        <p className="text-gray-600 dark:text-gray-400">No camera available</p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {!isScanning ? (
        <Button
          variant="primary"
          onClick={startScanning}
          className="w-full"
        >
          Start QR Scanner
        </Button>
      ) : (
        <div className="relative">
          <video
            ref={videoRef}
            className="rounded-lg"
            style={{ width, height }}
            playsInline
          />
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
          <div className="absolute inset-0 border-2 border-red-600 rounded-lg pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-red-600 rounded-lg" />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={stopScanning}
            className="absolute top-2 right-2"
          >
            Stop
          </Button>
        </div>
      )}
    </div>
  );
}
