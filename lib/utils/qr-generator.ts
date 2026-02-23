export interface QRCodeOptions {
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  logo?: {
    src: string;
    size?: number;
    margin?: number;
  };
}

export class QRCodeGenerator {
  private static instance: QRCodeGenerator;

  private constructor() {}

  static getInstance(): QRCodeGenerator {
    if (!QRCodeGenerator.instance) {
      QRCodeGenerator.instance = new QRCodeGenerator();
    }
    return QRCodeGenerator.instance;
  }

  async generate(
    text: string,
    options: QRCodeOptions = {}
  ): Promise<Blob> {
    const defaultOptions: Required<QRCodeOptions> = {
      size: 300,
      margin: 10,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrection: 'M',
      logo: {
        src: '',
        size: 50,
        margin: 5,
      },
    };

    const opts = { ...defaultOptions, ...options };
    
    try {
      // Generate QR code matrix
      const matrix = this.generateMatrix(text, opts.errorCorrection);
      
      // Create canvas and draw QR code
      const canvas = document.createElement('canvas');
      const size = opts.size + (opts.margin * 2);
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Draw background
      ctx.fillStyle = opts.color.light;
      ctx.fillRect(0, 0, size, size);

      // Calculate module size
      const matrixSize = matrix.length;
      const moduleSize = opts.size / matrixSize;

      // Draw QR code modules
      ctx.fillStyle = opts.color.dark;
      
      for (let y = 0; y < matrixSize; y++) {
        for (let x = 0; x < matrixSize; x++) {
          if (matrix[y][x]) {
            const px = opts.margin + (x * moduleSize);
            const py = opts.margin + (y * moduleSize);
            ctx.fillRect(px, py, moduleSize, moduleSize);
          }
        }
      }

      // Add logo if provided
      if (opts.logo.src) {
        await this.addLogo(ctx, canvas, opts);
      }

      // Convert to blob
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create QR code'));
            }
          },
          'image/png',
          1.0
        );
      });
    } catch (error) {
      console.error('QR code generation error:', error);
      throw error;
    }
  }

  async generateForOrder(
    orderId: string,
    url?: string,
    options: QRCodeOptions = {}
  ): Promise<Blob> {
    const qrText = url || `${window.location.origin}/orders/${orderId}`;
    return this.generate(qrText, options);
  }

  async generateForProduct(
    productId: string,
    url?: string,
    options: QRCodeOptions = {}
  ): Promise<Blob> {
    const qrText = url || `${window.location.origin}/products/${productId}`;
    return this.generate(qrText, options);
  }

  async generateForPayment(
    paymentData: {
      amount: number;
      account: string;
      reference: string;
    },
    options: QRCodeOptions = {}
  ): Promise<Blob> {
    const qrText = `MPESA:${paymentData.amount}:${paymentData.account}:${paymentData.reference}`;
    return this.generate(qrText, options);
  }

  async generateForContact(
    contact: {
      name: string;
      phone: string;
      email?: string;
      website?: string;
    },
    options: QRCodeOptions = {}
  ): Promise<Blob> {
    const qrText = `MECARD:N:${contact.name};TEL:${contact.phone};EMAIL:${contact.email || ''};URL:${contact.website || ''};;`;
    return this.generate(qrText, options);
  }

  async generateForWifi(
    wifi: {
      ssid: string;
      password: string;
      encryption: 'WPA' | 'WEP' | 'nopass';
      hidden?: boolean;
    },
    options: QRCodeOptions = {}
  ): Promise<Blob> {
    const hidden = wifi.hidden ? 'H:true' : 'H:false';
    const qrText = `WIFI:S:${wifi.ssid};T:${wifi.encryption};P:${wifi.password};${hidden};;`;
    return this.generate(qrText, options);
  }

  async generateForLocation(
    location: {
      latitude: number;
      longitude: number;
      name?: string;
    },
    options: QRCodeOptions = {}
  ): Promise<Blob> {
    const qrText = `geo:${location.latitude},${location.longitude}${location.name ? `?q=${encodeURIComponent(location.name)}` : ''}`;
    return this.generate(qrText, options);
  }

  async scanFromImage(image: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(image);

      img.onload = () => {
        URL.revokeObjectURL(url);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Simple QR code decoding (in production, use a proper library like jsQR)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = this.decodeQRSimple(imageData);
        
        if (result) {
          resolve(result);
        } else {
          reject(new Error('No QR code found in image'));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  private generateMatrix(text: string, errorCorrection: 'L' | 'M' | 'Q' | 'H'): boolean[][] {
    // Simplified QR code matrix generation
    // In production, use a proper QR code library like qrcode-generator
    
    const size = 21; // Version 1 QR code
    const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
    
    // Add finder patterns
    this.addFinderPattern(matrix, 0, 0);
    this.addFinderPattern(matrix, size - 7, 0);
    this.addFinderPattern(matrix, 0, size - 7);
    
    // Add timing patterns
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = (i % 2) === 0;
      matrix[i][6] = (i % 2) === 0;
    }
    
    // Add alignment pattern (simple version)
    matrix[size - 9][size - 9] = true;
    
    // Add data (simplified - just encode text as binary pattern)
    const binaryText = this.textToBinary(text);
    let x = size - 2;
    let y = size - 2;
    let direction = -1; // Up
    
    for (let i = 0; i < binaryText.length; i++) {
      matrix[y][x] = binaryText[i] === '1';
      
      // Move to next position (simple zigzag pattern)
      x += direction;
      if (x < 0 || x >= size) {
        x -= direction;
        y--;
        direction = -direction;
      }
    }
    
    return matrix;
  }

  private addFinderPattern(matrix: boolean[][], x: number, y: number): void {
    const pattern = [
      [true, true, true, true, true, true, true],
      [true, false, false, false, false, false, true],
      [true, false, true, true, true, false, true],
      [true, false, true, true, true, false, true],
      [true, false, true, true, true, false, true],
      [true, false, false, false, false, false, true],
      [true, true, true, true, true, true, true],
    ];
    
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        matrix[y + i][x + j] = pattern[i][j];
      }
    }
  }

  private textToBinary(text: string): string {
    return text.split('').map(char => {
      return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('');
  }

  private async addLogo(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    options: Required<QRCodeOptions>
  ): Promise<void> {
    const logoSize = options.logo.size;
    const margin = options.logo.margin;
    const center = canvas.width / 2;
    const logoX = center - (logoSize / 2);
    const logoY = center - (logoSize / 2);
    
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = options.logo.src;
      });
      
      // Draw white background for logo
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(logoX - margin, logoY - margin, logoSize + (margin * 2), logoSize + (margin * 2));
      
      // Draw logo
      ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
    } catch (error) {
      console.warn('Failed to add logo to QR code:', error);
    }
  }

  private decodeQRSimple(imageData: ImageData): string | null {
    // Simplified QR code decoding
    // In production, use a proper library like jsQR
    
    const { data, width, height } = imageData;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    // Look for finder patterns
    const patterns = this.findFinderPatterns(data, width, height);
    if (patterns.length < 3) {
      return null;
    }
    
    // Try to extract binary data from center region
    const binaryData: string[] = [];
    const step = Math.floor(width / 20);
    
    for (let y = step; y < height - step; y += step) {
      for (let x = step; x < width - step; x += step) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        
        // Simple black/white detection
        const isBlack = (r + g + b) < 384;
        binaryData.push(isBlack ? '1' : '0');
      }
    }
    
    // Convert binary to text (simplified)
    const binaryString = binaryData.join('');
    const bytes: number[] = [];
    
    for (let i = 0; i < binaryString.length; i += 8) {
      const byte = binaryString.substr(i, 8);
      bytes.push(parseInt(byte, 2));
    }
    
    // Try to decode as UTF-8
    const text = new TextDecoder().decode(new Uint8Array(bytes));
    
    // Validate that we got something readable
    if (text && text.length > 0 && /^[\x20-\x7E]+$/.test(text)) {
      return text;
    }
    
    return null;
  }

  private findFinderPatterns(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): Array<{ x: number; y: number }> {
    const patterns: Array<{ x: number; y: number }> = [];
    const threshold = 128;
    
    // Scan for potential finder patterns (black squares with white borders)
    for (let y = 0; y < height - 7; y++) {
      for (let x = 0; x < width - 7; x++) {
        let blackCount = 0;
        let whiteBorder = true;
        
        // Check 7x7 area
        for (let i = 0; i < 7; i++) {
          for (let j = 0; j < 7; j++) {
            const index = ((y + i) * width + (x + j)) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const brightness = (r + g + b) / 3;
            
            if (i === 0 || i === 6 || j === 0 || j === 6) {
              // Should be black border
              if (brightness > threshold) {
                whiteBorder = false;
                break;
              }
            } else {
              // Should be white inside
              if (brightness < threshold) {
                blackCount++;
              }
            }
          }
          if (!whiteBorder) break;
        }
        
        // Check if this looks like a finder pattern
        if (whiteBorder && blackCount > 20) {
          patterns.push({ x, y });
        }
      }
    }
    
    return patterns;
  }

  async generateSVG(
    text: string,
    options: QRCodeOptions = {}
  ): Promise<string> {
    const blob = await this.generate(text, options);
    const url = URL.createObjectURL(blob);
    
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      
      return `<svg width="${options.size || 300}" height="${options.size || 300}" xmlns="http://www.w3.org/2000/svg">
        <image href="data:image/png;base64,${base64}" width="100%" height="100%" />
      </svg>`;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  validateQRCodeSize(size: number): boolean {
    const minSize = 50;
    const maxSize = 2000;
    return size >= minSize && size <= maxSize;
  }

  getRecommendedSize(textLength: number, errorCorrection: 'L' | 'M' | 'Q' | 'H' = 'M'): number {
    const baseSize = 300;
    const lengthFactor = Math.ceil(textLength / 100);
    const ecFactor = { L: 1, M: 1.2, Q: 1.4, H: 1.6 }[errorCorrection];
    
    return Math.min(1000, Math.max(150, baseSize * lengthFactor * ecFactor));
  }
}

export const qrGenerator = QRCodeGenerator.getInstance();
