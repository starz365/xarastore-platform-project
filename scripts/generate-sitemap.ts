import { writeFileSync } from 'fs';
import { supabase } from '@/lib/supabase/client';

const BASE_URL = 'https://xarastore.com';

async function generateSitemap() {
  const pages = [
    '',
    '/shop',
    '/deals',
    '/cart',
    '/checkout',
    '/account',
    '/help',
    '/legal',
    '/legal/terms',
    '/legal/privacy',
    '/legal/shipping',
  ];

  // Fetch dynamic content
  const [
    { data: products },
    { data: categories },
    { data: brands },
    { data: collections },
  ] = await Promise.all([
    supabase.from('products').select('slug, updated_at'),
    supabase.from('categories').select('slug, updated_at'),
    supabase.from('brands').select('slug, updated_at'),
    supabase.from('collections').select('slug, updated_at'),
  ]);

  // Generate XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Static pages
  pages.forEach((page) => {
    xml += `
  <url>
    <loc>${BASE_URL}${page}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>`;
  });

  // Product pages
  products?.forEach((product) => {
    xml += `
  <url>
    <loc>${BASE_URL}/product/${product.slug}</loc>
    <lastmod>${new Date(product.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
  });

  // Category pages
  categories?.forEach((category) => {
    xml += `
  <url>
    <loc>${BASE_URL}/category/${category.slug}</loc>
    <lastmod>${new Date(category.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  // Brand pages
  brands?.forEach((brand) => {
    xml += `
  <url>
    <loc>${BASE_URL}/brands/${brand.slug}</loc>
    <lastmod>${new Date(brand.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  // Collection pages
  collections?.forEach((collection) => {
    xml += `
  <url>
    <loc>${BASE_URL}/collections/${collection.slug}</loc>
    <lastmod>${new Date(collection.updated_at).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  xml += '\n</urlset>';

  // Write to file
  writeFileSync('public/sitemap.xml', xml);
  console.log('Sitemap generated successfully!');
}

generateSitemap().catch(console.error);
