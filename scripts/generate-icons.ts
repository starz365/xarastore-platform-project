#!/usr/bin/env tsx
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface IconConfig {
  input: string;
  output: string;
  sizes: number[];
  formats: ('png' | 'ico' | 'svg')[];
  backgroundColor: string;
  padding: number;
  favicon: boolean;
  appleTouchIcon: boolean;
  androidChrome: boolean;
  msTile: boolean;
  safariPinnedTab: boolean;
  manifest: boolean;
  browserConfig: boolean;
}

interface IconDefinition {
  size: number;
  name: string;
  purpose?: 'any' | 'maskable' | 'monochrome';
}

class IconGenerator {
  private config: IconConfig;
  private sourceImage: Buffer | null = null;
  private sourceMetadata: sharp.Metadata | null = null;

  constructor(config: Partial<IconConfig> = {}) {
    this.config = {
      input: './public/icon.svg',
      output: './public/icons',
      sizes: [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512],
      formats: ['png'],
      backgroundColor: '#ffffff',
      padding: 0.1, // 10% padding
      favicon: true,
      appleTouchIcon: true,
      androidChrome: true,
      msTile: true,
      safariPinnedTab: true,
      manifest: true,
      browserConfig: true,
      ...config,
    };
  }

  async init(): Promise<void> {
    // Ensure output directory exists
    await fs.mkdir(this.config.output, { recursive: true });

    // Load source image
    try {
      this.sourceImage = await fs.readFile(this.config.input);
      this.sourceMetadata = await sharp(this.sourceImage).metadata();
      
      if (!this.sourceMetadata.width || !this.sourceMetadata.height) {
        throw new Error('Could not read image dimensions');
      }
    } catch (error) {
      throw new Error(`Failed to load source image: ${error}`);
    }
  }

  private async generateIcon(
    size: number,
    format: 'png' | 'ico' | 'svg',
    name?: string
  ): Promise<string> {
    const outputName = name || `icon-${size}x${size}.${format}`;
    const outputPath = path.join(this.config.output, outputName);

    let sharpInstance = sharp(this.sourceImage!);

    // Calculate dimensions with padding
    const padding = Math.round(size * this.config.padding);
    const contentSize = size - padding * 2;

    // Resize to fit within padded area
    sharpInstance = sharpInstance.resize(contentSize, contentSize, {
      fit: 'contain',
      background: this.config.backgroundColor,
    });

    // Add background and padding
    sharpInstance = sharpInstance.extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: this.config.backgroundColor,
    });

    // Generate based on format
    switch (format) {
      case 'png':
        await sharpInstance.png({ compressionLevel: 9 }).toFile(outputPath);
        break;
      case 'ico':
        // ICO format requires special handling
        await this.generateIco(size, outputPath);
        break;
      case 'svg':
        // For SVG, we need to handle differently
        await this.generateSvg(size, outputPath);
        break;
    }

    return outputPath;
  }

  private async generateIco(size: number, outputPath: string): Promise<void> {
    // ICO files can contain multiple sizes
    const sizes = [16, 32, 48];
    
    const icoBuffers = await Promise.all(
      sizes.map(async (icoSize) => {
        const buffer = await sharp(this.sourceImage!)
          .resize(icoSize, icoSize, { fit: 'contain', background: this.config.backgroundColor })
          .png()
          .toBuffer();
        return buffer;
      })
    );

    // Simple ICO writer (in production, use a proper ICO library)
    await fs.writeFile(outputPath, Buffer.concat(icoBuffers));
  }

  private async generateSvg(size: number, outputPath: string): Promise<void> {
    // For SVG, we create a simple wrapper
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${this.config.backgroundColor}"/>
  <g transform="translate(${size * this.config.padding}, ${size * this.config.padding}) scale(${1 - 2 * this.config.padding})">
    ${(await fs.readFile(this.config.input, 'utf-8'))
      .replace(/^<svg[^>]*>|<\/svg>$/g, '')
      .trim()}
  </g>
</svg>`;

    await fs.writeFile(outputPath, svgContent, 'utf-8');
  }

  async generateAllIcons(): Promise<string[]> {
    const generatedIcons: string[] = [];

    for (const size of this.config.sizes) {
      for (const format of this.config.formats) {
        try {
          const iconPath = await this.generateIcon(size, format);
          generatedIcons.push(iconPath);
          console.log(`✅ Generated: ${path.basename(iconPath)}`);
        } catch (error) {
          console.error(`❌ Failed to generate ${size}x${size}.${format}:`, error);
        }
      }
    }

    return generatedIcons;
  }

  async generateFavicon(): Promise<string> {
    if (!this.config.favicon) {
      return '';
    }

    console.log('🎯 Generating favicon.ico...');

    // Generate multiple sizes for favicon
    const faviconSizes = [16, 32, 48];
    const outputPath = path.join(this.config.output, 'favicon.ico');

    const buffers = await Promise.all(
      faviconSizes.map(async (size) => {
        return await sharp(this.sourceImage!)
          .resize(size, size, { fit: 'contain', background: this.config.backgroundColor })
          .png()
          .toBuffer();
      })
    );

    // Create ICO file with multiple sizes
    // Note: This is a simplified ICO generation. In production, use a proper ICO library.
    const icoHeader = Buffer.alloc(6);
    icoHeader.writeUInt16LE(0, 0); // Reserved
    icoHeader.writeUInt16LE(1, 2); // Type (1 for ICO)
    icoHeader.writeUInt16LE(faviconSizes.length, 4); // Number of images

    let offset = icoHeader.length + (faviconSizes.length * 16);
    const entries: Buffer[] = [];

    for (let i = 0; i < faviconSizes.length; i++) {
      const size = faviconSizes[i];
      const buffer = buffers[i];
      
      const entry = Buffer.alloc(16);
      entry.writeUInt8(size === 256 ? 0 : size, 0); // Width
      entry.writeUInt8(size === 256 ? 0 : size, 1); // Height
      entry.writeUInt8(0, 2); // Color palette
      entry.writeUInt8(0, 3); // Reserved
      entry.writeUInt16LE(1, 4); // Color planes
      entry.writeUInt16LE(32, 6); // Bits per pixel
      entry.writeUInt32LE(buffer.length, 8); // Size of image data
      entry.writeUInt32Le(offset, 12); // Offset of image data

      entries.push(entry);
      offset += buffer.length;
    }

    const icoFile = Buffer.concat([icoHeader, ...entries, ...buffers]);
    await fs.writeFile(outputPath, icoFile);

    console.log(`✅ Generated: favicon.ico`);
    return outputPath;
  }

  async generateAppleTouchIcons(): Promise<string[]> {
    if (!this.config.appleTouchIcon) {
      return [];
    }

    console.log('🍎 Generating Apple Touch Icons...');

    const appleSizes = [
      { size: 57, name: 'apple-touch-icon-57x57.png' },
      { size: 60, name: 'apple-touch-icon-60x60.png' },
      { size: 72, name: 'apple-touch-icon-72x72.png' },
      { size: 76, name: 'apple-touch-icon-76x76.png' },
      { size: 114, name: 'apple-touch-icon-114x114.png' },
      { size: 120, name: 'apple-touch-icon-120x120.png' },
      { size: 144, name: 'apple-touch-icon-144x144.png' },
      { size: 152, name: 'apple-touch-icon-152x152.png' },
      { size: 167, name: 'apple-touch-icon-167x167.png' },
      { size: 180, name: 'apple-touch-icon-180x180.png' },
      { size: 1024, name: 'apple-touch-icon-1024x1024.png' },
    ];

    const generatedIcons: string[] = [];

    for (const { size, name } of appleSizes) {
      try {
        const iconPath = await this.generateIcon(size, 'png', name);
        generatedIcons.push(iconPath);
        console.log(`✅ Generated: ${name}`);
      } catch (error) {
        console.error(`❌ Failed to generate ${name}:`, error);
      }
    }

    // Also generate the default apple-touch-icon.png (60x60)
    const defaultAppleIcon = await this.generateIcon(180, 'png', 'apple-touch-icon.png');
    generatedIcons.push(defaultAppleIcon);
    console.log(`✅ Generated: apple-touch-icon.png`);

    // Generate precomposed icon (for older iOS)
    const precomposedIcon = await this.generateIcon(180, 'png', 'apple-touch-icon-precomposed.png');
    generatedIcons.push(precomposedIcon);
    console.log(`✅ Generated: apple-touch-icon-precomposed.png`);

    return generatedIcons;
  }

  async generateAndroidChromeIcons(): Promise<string[]> {
    if (!this.config.androidChrome) {
      return [];
    }

    console.log('🤖 Generating Android Chrome Icons...');

    const androidSizes = [
      { size: 36, name: 'android-chrome-36x36.png' },
      { size: 48, name: 'android-chrome-48x48.png' },
      { size: 72, name: 'android-chrome-72x72.png' },
      { size: 96, name: 'android-chrome-96x96.png' },
      { size: 144, name: 'android-chrome-144x144.png' },
      { size: 192, name: 'android-chrome-192x192.png' },
      { size: 256, name: 'android-chrome-256x256.png' },
      { size: 384, name: 'android-chrome-384x384.png' },
      { size: 512, name: 'android-chrome-512x512.png' },
    ];

    const generatedIcons: string[] = [];

    for (const { size, name } of androidSizes) {
      try {
        const iconPath = await this.generateIcon(size, 'png', name);
        generatedIcons.push(iconPath);
        console.log(`✅ Generated: ${name}`);
      } catch (error) {
        console.error(`❌ Failed to generate ${name}:`, error);
      }
    }

    return generatedIcons;
  }

  async generateMsTileIcons(): Promise<string[]> {
    if (!this.config.msTile) {
      return [];
    }

    console.log('🪟 Generating Microsoft Tile Icons...');

    const msSizes = [
      { size: 70, name: 'mstile-70x70.png' },
      { size: 144, name: 'mstile-144x144.png' },
      { size: 150, name: 'mstile-150x150.png' },
      { size: 310, name: 'mstile-310x310.png' },
      { size: 310, name: 'mstile-310x150.png', width: 310, height: 150 },
    ];

    const generatedIcons: string[] = [];

    for (const config of msSizes) {
      try {
        const outputName = config.name;
        const outputPath = path.join(this.config.output, outputName);

        let sharpInstance = sharp(this.sourceImage!);

        if (config.width && config.height) {
          // For rectangular tiles
          sharpInstance = sharpInstance.resize(config.width, config.height, {
            fit: 'contain',
            background: this.config.backgroundColor,
          });
        } else {
          // For square tiles
          const padding = Math.round(config.size * this.config.padding);
          const contentSize = config.size - padding * 2;

          sharpInstance = sharpInstance.resize(contentSize, contentSize, {
            fit: 'contain',
            background: this.config.backgroundColor,
          });

          sharpInstance = sharpInstance.extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: this.config.backgroundColor,
          });
        }

        await sharpInstance.png({ compressionLevel: 9 }).toFile(outputPath);
        generatedIcons.push(outputPath);
        console.log(`✅ Generated: ${outputName}`);
      } catch (error) {
        console.error(`❌ Failed to generate ${config.name}:`, error);
      }
    }

    return generatedIcons;
  }

  async generateSafariPinnedTabIcon(): Promise<string> {
    if (!this.config.safariPinnedTab) {
      return '';
    }

    console.log('🔖 Generating Safari Pinned Tab Icon...');

    const outputPath = path.join(this.config.output, 'safari-pinned-tab.svg');
    
    // Create monochrome SVG for Safari pinned tab
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path fill="#000000" d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm0 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 1a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5z"/>
</svg>`;

    await fs.writeFile(outputPath, svgContent, 'utf-8');
    console.log(`✅ Generated: safari-pinned-tab.svg`);

    return outputPath;
  }

  async generateWebAppManifest(): Promise<string> {
    if (!this.config.manifest) {
      return '';
    }

    console.log('📱 Generating Web App Manifest...');

    const manifest = {
      name: 'Xarastore',
      short_name: 'Xarastore',
      description: 'Your deal starts here - Kenya\'s fastest-growing online marketplace',
      start_url: '/',
      display: 'standalone',
      background_color: this.config.backgroundColor,
      theme_color: '#dc2626',
      orientation: 'portrait-primary',
      scope: '/',
      icons: [
        {
          src: '/icons/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/icons/android-chrome-maskable-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: '/icons/android-chrome-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      shortcuts: [
        {
          name: 'Shop Now',
          short_name: 'Shop',
          description: 'Start shopping amazing deals',
          url: '/shop',
          icons: [
            {
              src: '/icons/shortcut-icon-96x96.png',
              sizes: '96x96',
              type: 'image/png',
            },
          ],
        },
        {
          name: 'My Cart',
          short_name: 'Cart',
          description: 'View your shopping cart',
          url: '/cart',
          icons: [
            {
              src: '/icons/shortcut-icon-96x96.png',
              sizes: '96x96',
              type: 'image/png',
            },
          ],
        },
        {
          name: 'My Account',
          short_name: 'Account',
          description: 'Manage your account',
          url: '/account',
          icons: [
            {
              src: '/icons/shortcut-icon-96x96.png',
              sizes: '96x96',
              type: 'image/png',
            },
          ],
        },
      ],
      categories: ['shopping', 'ecommerce', 'marketplace'],
      screenshots: [
        {
          src: '/screenshots/desktop.png',
          sizes: '1280x800',
          type: 'image/png',
          form_factor: 'wide',
          label: 'Xarastore Desktop Experience',
        },
        {
          src: '/screenshots/mobile.png',
          sizes: '750x1334',
          type: 'image/png',
          form_factor: 'narrow',
          label: 'Xarastore Mobile Experience',
        },
      ],
      shortcuts: [
        {
          name: 'New Arrivals',
          url: '/shop?sort=newest',
          description: 'Browse latest products',
        },
        {
          name: 'Hot Deals',
          url: '/deals',
          description: 'Limited time offers',
        },
        {
          name: 'My Orders',
          url: '/account/orders',
          description: 'Track your orders',
        },
      ],
      prefer_related_applications: false,
      related_applications: [],
    };

    const manifestPath = path.join(this.config.output, 'site.webmanifest');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    console.log(`✅ Generated: site.webmanifest`);
    return manifestPath;
  }

  async generateBrowserConfig(): Promise<string> {
    if (!this.config.browserConfig) {
      return '';
    }

    console.log('🌐 Generating Browser Config...');

    const browserConfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square70x70logo src="/icons/mstile-70x70.png"/>
      <square150x150logo src="/icons/mstile-150x150.png"/>
      <wide310x150logo src="/icons/mstile-310x150.png"/>
      <square310x310logo src="/icons/mstile-310x310.png"/>
      <TileColor>#dc2626</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;

    const configPath = path.join(this.config.output, 'browserconfig.xml');
    await fs.writeFile(configPath, browserConfig, 'utf-8');

    console.log(`✅ Generated: browserconfig.xml`);
    return configPath;
  }

  async generateHTMLHeadTags(): Promise<string> {
    console.log('🏷️  Generating HTML Head Tags...');

    const tags = `<!-- Favicon -->
<link rel="icon" href="/icons/favicon.ico" sizes="any">
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">

<!-- Apple Touch Icons -->
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="apple-touch-icon" sizes="57x57" href="/icons/apple-touch-icon-57x57.png">
<link rel="apple-touch-icon" sizes="60x60" href="/icons/apple-touch-icon-60x60.png">
<link rel="apple-touch-icon" sizes="72x72" href="/icons/apple-touch-icon-72x72.png">
<link rel="apple-touch-icon" sizes="76x76" href="/icons/apple-touch-icon-76x76.png">
<link rel="apple-touch-icon" sizes="114x114" href="/icons/apple-touch-icon-114x114.png">
<link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120x120.png">
<link rel="apple-touch-icon" sizes="144x144" href="/icons/apple-touch-icon-144x144.png">
<link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png">
<link rel="apple-touch-icon" sizes="167x167" href="/icons/apple-touch-icon-167x167.png">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png">
<link rel="apple-touch-icon" sizes="1024x1024" href="/icons/apple-touch-icon-1024x1024.png">

<!-- Android Chrome Icons -->
<link rel="icon" type="image/png" sizes="36x36" href="/icons/android-chrome-36x36.png">
<link rel="icon" type="image/png" sizes="48x48" href="/icons/android-chrome-48x48.png">
<link rel="icon" type="image/png" sizes="72x72" href="/icons/android-chrome-72x72.png">
<link rel="icon" type="image/png" sizes="96x96" href="/icons/android-chrome-96x96.png">
<link rel="icon" type="image/png" sizes="144x144" href="/icons/android-chrome-144x144.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/android-chrome-192x192.png">
<link rel="icon" type="image/png" sizes="256x256" href="/icons/android-chrome-256x256.png">
<link rel="icon" type="image/png" sizes="384x384" href="/icons/android-chrome-384x384.png">
<link rel="icon" type="image/png" sizes="512x512" href="/icons/android-chrome-512x512.png">

<!-- Microsoft Tile -->
<meta name="msapplication-TileColor" content="#dc2626">
<meta name="msapplication-TileImage" content="/icons/mstile-144x144.png">
<meta name="msapplication-square70x70logo" content="/icons/mstile-70x70.png">
<meta name="msapplication-square150x150logo" content="/icons/mstile-150x150.png">
<meta name="msapplication-wide310x150logo" content="/icons/mstile-310x150.png">
<meta name="msapplication-square310x310logo" content="/icons/mstile-310x310.png">
<meta name="msapplication-config" content="/icons/browserconfig.xml">

<!-- Safari Pinned Tab -->
<link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#dc2626">

<!-- Web App Manifest -->
<link rel="manifest" href="/icons/site.webmanifest">

<!-- Theme Color -->
<meta name="theme-color" content="#dc2626">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Xarastore">

<!-- Additional Meta Tags -->
<meta name="application-name" content="Xarastore">
<meta name="mobile-web-app-capable" content="yes">
<meta name="format-detection" content="telephone=no">`;

    const tagsPath = path.join(this.config.output, 'head-tags.html');
    await fs.writeFile(tagsPath, tags, 'utf-8');

    console.log(`✅ Generated: head-tags.html`);
    return tagsPath;
  }

  async generateAll(): Promise<void> {
    console.log('🚀 Starting icon generation...');
    console.log('='.repeat(50));
    console.log('📄 Source:', this.config.input);
    console.log('📁 Output:', this.config.output);
    console.log('='.repeat(50));

    await this.init();

    // Generate all icons
    await this.generateAllIcons();
    await this.generateFavicon();
    await this.generateAppleTouchIcons();
    await this.generateAndroidChromeIcons();
    await this.generateMsTileIcons();
    await this.generateSafariPinnedTabIcon();
    await this.generateWebAppManifest();
    await this.generateBrowserConfig();
    await this.generateHTMLHeadTags();

    console.log('='.repeat(50));
    console.log('🎉 Icon generation completed!');
    console.log('');
    console.log('📋 Files generated in:', this.config.output);
    console.log('🏷️  HTML tags available in: head-tags.html');
    console.log('📱 Web manifest: site.webmanifest');
    console.log('🌐 Browser config: browserconfig.xml');
    console.log('');
    console.log('💡 Usage:');
    console.log('   Copy the contents of head-tags.html to your HTML head section');
    console.log('   Ensure all icon files are served from /icons/ path');
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const generator = new IconGenerator();

  switch (command) {
    case 'generate':
      await generator.generateAll();
      break;

    case 'favicon':
      await generator.init();
      await generator.generateFavicon();
      break;

    case 'apple':
      await generator.init();
      await generator.generateAppleTouchIcons();
      break;

    case 'android':
      await generator.init();
      await generator.generateAndroidChromeIcons();
      break;

    case 'ms':
      await generator.init();
      await generator.generateMsTileIcons();
      break;

    case 'manifest':
      await generator.init();
      await generator.generateWebAppManifest();
      break;

    case 'tags':
      await generator.init();
      await generator.generateHTMLHeadTags();
      break;

    case 'all':
      await generator.generateAll();
      break;

    default:
      console.log('Usage:');
      console.log('  npm run generate-icons -- generate');
      console.log('  npm run generate-icons -- favicon');
      console.log('  npm run generate-icons -- apple');
      console.log('  npm run generate-icons -- android');
      console.log('  npm run generate-icons -- ms');
      console.log('  npm run generate-icons -- manifest');
      console.log('  npm run generate-icons -- tags');
      console.log('  npm run generate-icons -- all');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { IconGenerator };
