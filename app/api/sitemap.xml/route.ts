import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xarastore.com';

export async function GET(request: NextRequest) {
  try {
    // Fetch dynamic content for sitemap
    const [
      { data: products },
      { data: categories },
      { data: brands },
      { data: collections },
    ] = await Promise.all([
      supabase
        .from('products')
        .select('slug, updated_at')
        .eq('status', 'active')
        .gt('stock', 0),
      supabase
        .from('categories')
        .select('slug, updated_at')
        .eq('is_active', true),
      supabase
        .from('brands')
        .select('slug, updated_at')
        .eq('is_active', true),
      supabase
        .from('collections')
        .select('slug, updated_at')
        .eq('is_active', true),
    ]);

    // Static pages with their priority and change frequency
    const staticPages = [
      { path: '', priority: '1.0', changefreq: 'daily' },
      { path: '/shop', priority: '0.9', changefreq: 'daily' },
      { path: '/deals', priority: '0.9', changefreq: 'daily' },
      { path: '/cart', priority: '0.8', changefreq: 'weekly' },
      { path: '/account', priority: '0.7', changefreq: 'weekly' },
      { path: '/account/orders', priority: '0.7', changefreq: 'weekly' },
      { path: '/account/wishlist', priority: '0.7', changefreq: 'weekly' },
      { path: '/help', priority: '0.6', changefreq: 'monthly' },
      { path: '/legal', priority: '0.5', changefreq: 'monthly' },
      { path: '/legal/terms', priority: '0.5', changefreq: 'monthly' },
      { path: '/legal/privacy', priority: '0.5', changefreq: 'monthly' },
      { path: '/legal/shipping', priority: '0.5', changefreq: 'monthly' },
    ];

    // Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    // Add static pages
    staticPages.forEach(({ path, priority, changefreq }) => {
      xml += `
  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    });

    // Add product pages
    products?.forEach((product) => {
      const lastmod = product.updated_at 
        ? new Date(product.updated_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      xml += `
  <url>
    <loc>${BASE_URL}/product/${product.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    // Add category pages
    categories?.forEach((category) => {
      const lastmod = category.updated_at 
        ? new Date(category.updated_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      xml += `
  <url>
    <loc>${BASE_URL}/category/${category.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    // Add brand pages
    brands?.forEach((brand) => {
      const lastmod = brand.updated_at 
        ? new Date(brand.updated_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      xml += `
  <url>
    <loc>${BASE_URL}/brands/${brand.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    // Add collection pages
    collections?.forEach((collection) => {
      const lastmod = collection.updated_at 
        ? new Date(collection.updated_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      xml += `
  <url>
    <loc>${BASE_URL}/collections/${collection.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    });

    xml += '\n</urlset>';

    // Set headers for XML response
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        'X-Robots-Tag': 'index, follow',
      },
    });
  } catch (error: any) {
    console.error('Sitemap generation error:', error);
    
    // Return a minimal sitemap in case of error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300',
      },
      status: 200,
    });
  }
}

// Generate robots.txt
export async function POST(request: NextRequest) {
  try {
    const robotsTxt = `# Xarastore Robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /account/
Disallow: /checkout/
Disallow: /api/
Disallow: /_next/
Disallow: /*.json$
Disallow: /*?*q=*

# Sitemaps
Sitemap: ${BASE_URL}/api/sitemap.xml
Sitemap: ${BASE_URL}/sitemap-index.xml

# Crawl delay (be respectful)
Crawl-delay: 1

# Allow Google AdsBot
User-agent: AdsBot-Google
Allow: /

# Allow Googlebot-Image
User-agent: Googlebot-Image
Allow: /

# Disallow certain bots
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: MJ12bot
Crawl-delay: 10

User-agent: DotBot
Crawl-delay: 10

# Host
Host: ${BASE_URL}

# Allow mobile crawlers
User-agent: *
Allow: /mobile/

# Additional directives for search engines
User-agent: Bingbot
Crawl-delay: 2
Allow: /

User-agent: YandexBot
Crawl-delay: 3
Allow: /

User-agent: Applebot
Allow: /
Crawl-delay: 1

# Development/staging environment blocking
${process.env.NODE_ENV === 'production' ? '' : 'Disallow: /'}`;

    return new Response(robotsTxt, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Robots.txt generation error:', error);
    
    return new Response(`User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/api/sitemap.xml`, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400',
      },
      status: 200,
    });
  }
}
