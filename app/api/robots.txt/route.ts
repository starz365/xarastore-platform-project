import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://xarastore.com';
  const sitemapUrl = `${baseUrl}/api/sitemap.xml`;
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  const robotsTxt = `# Xarastore Robots.txt
# Generated: ${new Date().toISOString()}

User-agent: *
${isProduction ? 'Allow: /' : 'Disallow: /'}

${isProduction ? '' : '# Development/Staging Environment - Crawling Disabled'}
${isProduction ? '' : 'Disallow: /'}

# Sitemaps
Sitemap: ${sitemapUrl}

# Crawl delay (be nice to our servers)
Crawl-delay: 2

# Disallow specific paths
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /account/
Disallow: /checkout/
Disallow: /cart/
Disallow: /auth/

# Allow search engines for public pages
Allow: /shop
Allow: /category/*
Allow: /product/*
Allow: /brands/*
Allow: /collections/*
Allow: /deals
Allow: /help
Allow: /legal/*

# Known AI bots
User-agent: ChatGPT-User
User-agent: Google-Extended
User-agent: anthropic-ai
User-agent: FacebookBot
Disallow: /

# Bad bots
User-agent: MJ12bot
User-agent: AhrefsBot
User-agent: SemrushBot
User-agent: DotBot
User-agent: Barkrowler
Disallow: /

# Good bots (search engines)
User-agent: Googlebot
User-agent: Bingbot
User-agent: Slurp
User-agent: DuckDuckBot
User-agent: Baiduspider
User-agent: YandexBot
Allow: /
Crawl-delay: 1

# Image bots
User-agent: Googlebot-Image
Allow: /public/
Disallow: /api/

# Ads bots
User-agent: AdsBot-Google
Allow: /
Crawl-delay: 3

# Host
Host: ${baseUrl.replace('https://', '')}

# Contact for robots.txt questions
# Contact: support@xarastore.com`;

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
