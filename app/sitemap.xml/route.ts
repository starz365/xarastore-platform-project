import { getProducts, getCategories, getBrands, getCollections } from '@/lib/supabase/queries/sitemap';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xarastore.com';

export async function GET() {
  const headers = {
    'Content-Type': 'application/xml',
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  };

  try {
    const [
      products,
      categories,
      brands,
      collections,
    ] = await Promise.all([
      getProducts(),
      getCategories(),
      getBrands(),
      getCollections(),
    ]);

    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily' },
      { url: 'shop', priority: '0.9', changefreq: 'daily' },
      { url: 'deals', priority: '0.9', changefreq: 'hourly' },
      { url: 'cart', priority: '0.8', changefreq: 'always' },
      { url: 'checkout', priority: '0.7', changefreq: 'always' },
      { url: 'account', priority: '0.6', changefreq: 'daily' },
      { url: 'gift-cards', priority: '0.8', changefreq: 'weekly' },
      { url: 'investors', priority: '0.5', changefreq: 'monthly' },
      { url: 'help', priority: '0.6', changefreq: 'weekly' },
      { url: 'legal/terms', priority: '0.3', changefreq: 'monthly' },
      { url: 'legal/privacy', priority: '0.3', changefreq: 'monthly' },
      { url: 'legal/shipping', priority: '0.3', changefreq: 'monthly' },
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${staticPages.map((page) => `
  <url>
    <loc>${BASE_URL}/${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('')}
  
  ${categories.map((category) => `
  <url>
    <loc>${BASE_URL}/category/${category.slug}</loc>
    <lastmod>${new Date(category.updated_at).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    ${category.image ? `<image:image>
      <image:loc>${category.image}</image:loc>
      <image:title>${category.name}</image:title>
    </image:image>` : ''}
  </url>`).join('')}
  
  ${products.map((product) => `
  <url>
    <loc>${BASE_URL}/product/${product.slug}</loc>
    <lastmod>${new Date(product.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    ${product.images && product.images.length > 0 ? product.images.map((image, index) => `
    <image:image>
      <image:loc>${image}</image:loc>
      <image:title>${product.name} ${index > 0 ? `- Image ${index + 1}` : ''}</image:title>
      <image:caption>${product.description.substring(0, 200)}</image:caption>
    </image:image>`).join('') : ''}
  </url>`).join('')}
  
  ${brands.map((brand) => `
  <url>
    <loc>${BASE_URL}/brands/${brand.slug}</loc>
    <lastmod>${new Date(brand.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    ${brand.logo ? `<image:image>
      <image:loc>${brand.logo}</image:loc>
      <image:title>${brand.name}</image:title>
    </image:image>` : ''}
  </url>`).join('')}
  
  ${collections.map((collection) => `
  <url>
    <loc>${BASE_URL}/collections/${collection.slug}</loc>
    <lastmod>${new Date(collection.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    ${collection.image ? `<image:image>
      <image:loc>${collection.image}</image:loc>
      <image:title>${collection.name}</image:title>
    </image:image>` : ''}
  </url>`).join('')}
</urlset>`;

    return new Response(sitemap, { headers });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Fallback sitemap
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackSitemap, { headers });
  }
}
