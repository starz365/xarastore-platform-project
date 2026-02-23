#!/usr/bin/env node

/**
 * Generate Missing Images for XaraStore
 * 
 * This script generates the required PNG images:
 * - apple-touch-icon.png (180x180)
 * - og-image.png (1200x630)
 * - twitter-image.png (1200x630)
 * 
 * Installation:
 *   npm install canvas
 * 
 * Usage:
 *   node generate-images.js
 */

const fs = require('fs');
const path = require('path');

// Check if canvas is installed
let Canvas;
try {
    Canvas = require('canvas');
} catch (error) {
    console.log('❌ Canvas module not found!');
    console.log('\n📦 Installing canvas...');
    console.log('Run: npm install canvas\n');
    console.log('After installation, run this script again.\n');
    process.exit(1);
}

const { createCanvas } = Canvas;

// Create directories if they don't exist
const publicDir = path.join(process.cwd(), 'public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
    console.log('✅ Created public/icons directory');
}

// Generate Apple Touch Icon (180x180)
function generateAppleTouchIcon() {
    const canvas = createCanvas(180, 180);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 180, 180);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    // Rounded rectangle background
    ctx.fillStyle = gradient;
    roundRect(ctx, 0, 0, 180, 180, 40);
    ctx.fill();

    // Shopping bag
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(60, 75);
    ctx.lineTo(55, 135);
    ctx.lineTo(125, 135);
    ctx.lineTo(120, 75);
    ctx.closePath();
    ctx.fill();

    // Bag handle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(90, 75, 15, Math.PI, 0, false);
    ctx.stroke();

    // Top line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(60, 75);
    ctx.lineTo(120, 75);
    ctx.stroke();

    // Letter 'X'
    ctx.fillStyle = '#667eea';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('X', 90, 110);

    // Save
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(iconsDir, 'apple-touch-icon.png');
    fs.writeFileSync(outputPath, buffer);
    console.log('✅ Generated: public/icons/apple-touch-icon.png');
}

// Generate OG Image (1200x630)
function generateOGImage(filename) {
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(0.5, '#764ba2');
    gradient.addColorStop(1, '#f093fb');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);

    // Decorative circles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(100, 100, 80, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(1100, 530, 100, 0, Math.PI * 2);
    ctx.fill();

    // Shopping bag icon (decorative)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(130, 240);
    ctx.lineTo(120, 360);
    ctx.lineTo(260, 360);
    ctx.lineTo(250, 240);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Brand name
    ctx.fillStyle = 'white';
    ctx.font = 'bold 120px system-ui, -apple-system, sans-serif';
    ctx.fillText('XaraStore', 350, 280);

    // Tagline
    ctx.font = '36px system-ui, -apple-system, sans-serif';
    ctx.globalAlpha = 0.95;
    ctx.fillText('Your Online Shopping Destination', 350, 360);

    // Features
    ctx.font = '24px system-ui, -apple-system, sans-serif';
    ctx.globalAlpha = 0.9;
    
    const features = [
        { x: 350, y: 450, text: '✓ Premium Products' },
        { x: 350, y: 495, text: '✓ Fast Shipping' },
        { x: 730, y: 450, text: '✓ Secure Checkout' },
        { x: 730, y: 495, text: '✓ 24/7 Support' }
    ];

    features.forEach(feature => {
        ctx.fillText(feature.text, feature.x, feature.y);
    });

    // Bottom accent
    ctx.globalAlpha = 0.1;
    ctx.fillRect(0, 600, 1200, 30);

    // Save
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(publicDir, filename);
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ Generated: public/${filename}`);
}

// Helper function for rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Main execution
console.log('🎨 Generating images for XaraStore...\n');

try {
    generateAppleTouchIcon();
    generateOGImage('og-image.png');
    generateOGImage('twitter-image.png');
    
    console.log('\n✅ All images generated successfully!');
    console.log('\n📁 Generated files:');
    console.log('   - public/icons/apple-touch-icon.png (180x180)');
    console.log('   - public/og-image.png (1200x630)');
    console.log('   - public/twitter-image.png (1200x630)');
    console.log('\n🚀 Run your verification script again to confirm!');
} catch (error) {
    console.error('❌ Error generating images:', error.message);
    process.exit(1);
}
