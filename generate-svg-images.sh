#!/bin/bash

# Generate Image Files for XaraStore
# This script creates SVG files that you can convert to PNG

echo "🎨 Generating SVG files for XaraStore..."
echo ""

# Create directories
mkdir -p public/icons
mkdir -p public

# Generate Apple Touch Icon SVG
cat > public/icons/apple-touch-icon.svg << 'EOF'
<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
    </defs>
    <rect width="180" height="180" rx="40" fill="url(#bgGradient)"/>
    <g transform="translate(45, 45)">
        <path d="M 15 30 L 10 90 L 80 90 L 75 30 Z" fill="white" opacity="0.95"/>
        <path d="M 25 30 Q 25 15 45 15 Q 65 15 65 30" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.95"/>
        <line x1="15" y1="30" x2="75" y2="30" stroke="white" stroke-width="3" opacity="0.8"/>
        <text x="45" y="70" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="#667eea" text-anchor="middle">X</text>
    </g>
</svg>
EOF

echo "✅ Created: public/icons/apple-touch-icon.svg"

# Generate OG Image SVG
cat > public/og-image.svg << 'EOF'
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="ogGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" />
        </linearGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1" fill="white" opacity="0.1"/>
        </pattern>
    </defs>
    
    <rect width="1200" height="630" fill="url(#ogGradient)"/>
    <rect width="1200" height="630" fill="url(#grid)"/>
    
    <circle cx="100" cy="100" r="80" fill="white" opacity="0.1"/>
    <circle cx="1100" cy="530" r="100" fill="white" opacity="0.1"/>
    
    <g transform="translate(100, 180)">
        <path d="M 30 60 L 20 180 L 160 180 L 150 60 Z" fill="white" opacity="0.2" stroke="white" stroke-width="3"/>
        <path d="M 50 60 Q 50 30 90 30 Q 130 30 130 60" stroke="white" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.3"/>
    </g>
    
    <text x="350" y="280" font-family="system-ui, -apple-system, sans-serif" font-size="120" font-weight="bold" fill="white" letter-spacing="-2">XaraStore</text>
    <text x="350" y="360" font-family="system-ui, -apple-system, sans-serif" font-size="36" fill="white" opacity="0.95">Your Online Shopping Destination</text>
    
    <g transform="translate(350, 450)">
        <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="white" opacity="0.9">✓ Premium Products</text>
        <text x="0" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="white" opacity="0.9">✓ Fast Shipping</text>
        <text x="380" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="white" opacity="0.9">✓ Secure Checkout</text>
        <text x="380" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="white" opacity="0.9">✓ 24/7 Support</text>
    </g>
    
    <rect x="0" y="600" width="1200" height="30" fill="white" opacity="0.1"/>
</svg>
EOF

echo "✅ Created: public/og-image.svg"

# Copy for twitter
cp public/og-image.svg public/twitter-image.svg
echo "✅ Created: public/twitter-image.svg"

echo ""
echo "📋 Next Steps:"
echo ""
echo "Option 1 - Convert SVG to PNG using ImageMagick:"
echo "  sudo apt-get install imagemagick  # If not installed"
echo "  convert -background none -size 180x180 public/icons/apple-touch-icon.svg public/icons/apple-touch-icon.png"
echo "  convert -background none -size 1200x630 public/og-image.svg public/og-image.png"
echo "  convert -background none -size 1200x630 public/twitter-image.svg public/twitter-image.png"
echo ""
echo "Option 2 - Use online converter:"
echo "  1. Upload SVG files to https://svgtopng.com"
echo "  2. Set correct dimensions (180x180 for icon, 1200x630 for OG images)"
echo "  3. Download and replace the SVG files"
echo ""
echo "Option 3 - Open SVG in browser and screenshot:"
echo "  1. Open the SVG files in your browser"
echo "  2. Take screenshots at the correct dimensions"
echo "  3. Save as PNG files"
echo ""
echo "✅ SVG files created successfully!"
