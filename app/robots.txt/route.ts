export async function GET() {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://xarastore.com';

  const robotsTxt = `# Xarastore Robots.txt
# Generated: ${new Date().toISOString()}
# Environment: ${process.env.NODE_ENV}

User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /account/
Disallow: /checkout/
Disallow: /cart/
Disallow: /private/
Disallow: /*/private/
Disallow: /*?*view=admin
Disallow: /*?*sort=admin
Disallow: /*?*filter=admin

# Crawl delay for search engines
Crawl-delay: 1

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-products.xml
Sitemap: ${baseUrl}/sitemap-categories.xml
Sitemap: ${baseUrl}/sitemap-brands.xml

# Allow specific bots with special rules
User-agent: Googlebot
Allow: /
Crawl-delay: 0.5
Disallow: /api/
Disallow: /admin/

User-agent: Googlebot-Image
Allow: /public/
Allow: /_next/static/
Disallow: /api/
Allow: /*.jpg$
Allow: /*.png$
Allow: /*.gif$
Allow: /*.webp$
Allow: /*.avif$

User-agent: Bingbot
Allow: /
Crawl-delay: 1
Disallow: /api/
Disallow: /admin/

User-agent: Applebot
Allow: /
Crawl-delay: 1

User-agent: DuckDuckBot
Allow: /
Crawl-delay: 2

User-agent: Baiduspider
Allow: /
Crawl-delay: 5

User-agent: YandexBot
Allow: /
Crawl-delay: 3

# Block malicious bots
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: MauiBot
Disallow: /

User-agent: BLEXBot
Disallow: /

# Development environment restrictions
${!isProduction ? `
# Development environment - block all crawlers
User-agent: *
Disallow: /
` : ''}

# Dynamic content patterns to allow
Allow: /product/*/
Allow: /category/*/
Allow: /brands/*/
Allow: /collections/*/
Allow: /deals/
Allow: /shop/

# Query parameters to ignore for SEO
Disallow: /*?*utm_
Disallow: /*?*ref=
Disallow: /*?*source=
Disallow: /*?*campaign=

# Allow view-as-guest parameters
Allow: /*?*view=guest

# Allow sorting and filtering parameters
Allow: /*?*sort=
Allow: /*?*filter=
Allow: /*?*page=

# Block infinite scroll pages beyond reasonable limits
Disallow: /*?*page=100
Disallow: /*?*page=101
Disallow: /*?*page=102
Disallow: /*?*page=103
Disallow: /*?*page=104

# Allow AJAX crawling for Google
${isProduction ? `
# Google AJAX crawling scheme
Allow: /*?_escaped_fragment_
` : ''}

# Host directive
Host: ${baseUrl.replace('https://', '').replace('http://', '')}

# Allow specific file types
Allow: /*.css$
Allow: /*.js$
Allow: /*.json$
Allow: /*.xml$

# Clean URL patterns
Allow: /[a-z0-9-]+/
Allow: /[a-z0-9-]+/[a-z0-9-]+/

# Block problematic patterns
Disallow: /*/feed/
Disallow: /*/feed/rss/
Disallow: /*/print/
Disallow: /*/printpreview/
Disallow: /*/ajax/
Disallow: /*/modal/

# Allow AMP pages if they exist
Allow: /amp/
Allow: /*/amp/

# Allow WebApp manifest and service worker
Allow: /manifest.json
Allow: /service-worker.js
Allow: /sw.js

# Block tracking parameters
Disallow: /*?*gclid=
Disallow: /*?*fbclid=
Disallow: /*?*msclkid=

# Allow reasonable pagination
Allow: /*?page=1
Allow: /*?page=2
Allow: /*?page=3
Allow: /*?page=4
Allow: /*?page=5

# Block deep pagination
Disallow: /*?page=50
Disallow: /*?page=51
Disallow: /*?page=52

# Rate limiting for aggressive crawlers
${isProduction ? `
# Aggressive bot rate limiting
User-agent: *
Request-rate: 10/1m
` : ''}

# Special rules for shopping bots
User-agent: FacebookExternalHit
Allow: /
Crawl-delay: 2

User-agent: Twitterbot
Allow: /
Crawl-delay: 2

User-agent: LinkedInBot
Allow: /
Crawl-delay: 2

User-agent: Pinterest
Allow: /
Crawl-delay: 2

# Product schema.org accessibility
Allow: /*?*schema=product
Allow: /*?*ld+json

# Block export functions
Disallow: /*?*export=
Disallow: /*?*download=
Disallow: /*?*csv=
Disallow: /*?*pdf=

# Allow search
Allow: /search
Allow: /search?q=*

# Block empty search
Disallow: /search?q=
Disallow: /search?q=*

# Security: block access to sensitive patterns
Disallow: /*.env
Disallow: /*.git
Disallow: /*.svn
Disallow: /*.htaccess
Disallow: /*.htpasswd
Disallow: /*/phpmyadmin/
Disallow: /*/adminer/
Disallow: /*/wp-admin/
Disallow: /*/wp-login/
Disallow: /*/backup/
Disallow: /*/sql/
Disallow: /*/database/

# Development and staging environments
${baseUrl.includes('staging') || baseUrl.includes('dev') ? `
# Staging/Dev environment - no indexing
User-agent: *
Disallow: /
` : ''}

# Mobile app deep linking
Allow: /app/
Allow: /deep-link/

# PWA and offline support
Allow: /offline
Allow: /_next/static/chunks/pages/_offline.js

# Final rule - clean up any trailing parameters
Allow: /*?$
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Robots-Tag': 'all',
    },
  });
}
