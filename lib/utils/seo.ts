import { Metadata } from 'next';

interface SeoOptions {
  title: string;
  description: string;
  keywords?: string;
  siteName?: string;
  siteUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  twitterHandle?: string;
  noIndex?: boolean;
  canonical?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  type?: 'website' | 'article' | 'product';
}

export function generateSeoMetadata({
  title,
  description,
  keywords,
  siteName = 'Xarastore',
  siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://xarastore.com',
  imageUrl = '/og-image.png',
  imageAlt,
  twitterHandle = '@xarastore',
  noIndex = false,
  canonical,
  publishedTime,
  modifiedTime,
  author,
  type = 'website',
}: SeoOptions): Metadata {
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const imageAltText = imageAlt || title;
  const canonicalUrl = canonical || `${siteUrl}${canonical || ''}`;

  return {
    title: fullTitle,
    description,
    keywords,
    
    metadataBase: new URL(siteUrl),
    
    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      type,
      title: fullTitle,
      description,
      siteName,
      url: canonicalUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAltText,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(author && { authors: [author] }),
    },

    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
      creator: twitterHandle,
    },

    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    },

    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: siteName,
    },

    formatDetection: {
      telephone: false,
    },

    manifest: '/manifest.json',
  };
}

export function generateBreadcrumbStructuredData(items: Array<{ name: string; item: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}

export function generateProductStructuredData(product: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images?.[0] || '/product-placeholder.jpg',
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand?.name,
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'KES',
      availability: product.stock > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      url: `${process.env.NEXT_PUBLIC_APP_URL}/products/${product.slug}`,
    },
    ...(product.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 0,
      },
    }),
  };
}

export function generateCollectionStructuredData(collection: any, products: any[] = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.name,
    description: collection.description,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/collections/${collection.slug}`,
    image: collection.image,
    ...(products.length > 0 && {
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: products.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/products/${product.slug}`,
        })),
      },
    }),
  };
}

export function generateWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Xarastore',
    url: process.env.NEXT_PUBLIC_APP_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Xarastore',
    url: process.env.NEXT_PUBLIC_APP_URL,
    logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
    sameAs: [
      'https://facebook.com/xarastore',
      'https://twitter.com/xarastore',
      'https://instagram.com/xarastore',
      'https://tiktok.com/@xarastore',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+254-XXX-XXXXXX',
        contactType: 'customer service',
        areaServed: 'KE',
        availableLanguage: ['English', 'Swahili'],
      },
    ],
  };
}
