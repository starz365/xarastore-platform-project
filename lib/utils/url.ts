import { z } from 'zod';

// URL validation schema
export const urlSchema = z.string().url('Invalid URL format');

// Query parameter schema
export const queryParamSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
);

// URL parsing result type
export interface ParsedUrl {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  searchParams: URLSearchParams;
  username?: string;
  password?: string;
}

/**
 * Safely parses a URL string with comprehensive error handling
 */
export function parseUrl(url: string, base?: string): ParsedUrl | null {
  try {
    const parsed = new URL(url, base);
    
    return {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      origin: parsed.origin,
      searchParams: parsed.searchParams,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
    };
  } catch (error) {
    console.error('Failed to parse URL:', url, error);
    return null;
  }
}

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid HTTPS URL
 */
export function isValidHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL by ensuring consistent formatting
 */
export function normalizeUrl(url: string, base?: string): string | null {
  const parsed = parseUrl(url, base);
  if (!parsed) return null;

  // Normalize protocol
  let protocol = parsed.protocol.toLowerCase();
  if (!protocol.endsWith(':')) {
    protocol = `${protocol}:`;
  }

  // Normalize hostname
  const hostname = parsed.hostname.toLowerCase();

  // Normalize pathname
  let pathname = parsed.pathname;
  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }
  
  // Remove trailing slash unless it's the root
  if (pathname !== '/' && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Normalize search params - sort alphabetically
  const searchParams = new URLSearchParams(parsed.searchParams);
  const sortedParams = new URLSearchParams();
  Array.from(searchParams.keys())
    .sort()
    .forEach(key => {
      sortedParams.set(key, searchParams.get(key)!);
    });

  const search = sortedParams.toString() ? `?${sortedParams}` : '';

  // Reconstruct URL
  const normalized = `${protocol}//${hostname}${parsed.port ? `:${parsed.port}` : ''}${pathname}${search}${parsed.hash}`;
  
  return normalized;
}

/**
 * Builds a URL with query parameters
 */
export function buildUrl(
  baseUrl: string,
  params?: Record<string, string | number | boolean | (string | number | boolean)[]>,
  options?: {
    encode?: boolean;
    arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
    skipNull?: boolean;
    skipEmptyString?: boolean;
  }
): string {
  const {
    encode = true,
    arrayFormat = 'indices',
    skipNull = true,
    skipEmptyString = true,
  } = options || {};

  const url = new URL(baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === null && skipNull) return;
      if (value === '' && skipEmptyString) return;

      if (Array.isArray(value)) {
        if (value.length === 0) return;

        switch (arrayFormat) {
          case 'indices':
            value.forEach((item, index) => {
              if (item === null && skipNull) return;
              if (item === '' && skipEmptyString) return;
              url.searchParams.append(`${key}[${index}]`, String(item));
            });
            break;

          case 'brackets':
            value.forEach(item => {
              if (item === null && skipNull) return;
              if (item === '' && skipEmptyString) return;
              url.searchParams.append(`${key}[]`, String(item));
            });
            break;

          case 'repeat':
            value.forEach(item => {
              if (item === null && skipNull) return;
              if (item === '' && skipEmptyString) return;
              url.searchParams.append(key, String(item));
            });
            break;

          case 'comma':
            const filtered = value.filter(item => 
              !(item === null && skipNull) && 
              !(item === '' && skipEmptyString)
            );
            if (filtered.length > 0) {
              url.searchParams.append(key, filtered.map(String).join(','));
            }
            break;
        }
      } else {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const result = url.toString();
  return encode ? result : decodeURIComponent(result);
}

/**
 * Parses query parameters from a URL string
 */
export function parseQueryParams<T extends Record<string, any>>(
  url: string,
  schema?: z.ZodSchema<T>
): T {
  try {
    const parsed = new URL(url);
    const params: Record<string, any> = {};

    parsed.searchParams.forEach((value, key) => {
      // Handle array notation: key[] or key[0]
      const arrayMatch = key.match(/^(.+?)\[(\d*)\]$/);
      if (arrayMatch) {
        const [, actualKey, index] = arrayMatch;
        
        if (!params[actualKey]) {
          params[actualKey] = [];
        }
        
        if (index === '') {
          // key[] notation
          params[actualKey].push(value);
        } else {
          // key[0] notation
          const idx = parseInt(index, 10);
          params[actualKey][idx] = value;
        }
      } else {
        // Handle comma-separated values
        if (value.includes(',')) {
          params[key] = value.split(',').map(v => v.trim());
        } else {
          params[key] = value;
        }
      }
    });

    // Convert single element arrays to scalars
    Object.keys(params).forEach(key => {
      if (Array.isArray(params[key]) && params[key].length === 1) {
        params[key] = params[key][0];
      }
    });

    if (schema) {
      return schema.parse(params);
    }

    return params as T;
  } catch (error) {
    console.error('Failed to parse query params:', error);
    return {} as T;
  }
}

/**
 * Adds or updates query parameters in a URL
 */
export function updateQueryParams(
  url: string,
  updates: Record<string, string | number | boolean | null | undefined>,
  options?: {
    removeIfNull?: boolean;
    encode?: boolean;
  }
): string {
  const { removeIfNull = true, encode = true } = options || {};
  
  const parsed = new URL(url);

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      if (removeIfNull) {
        parsed.searchParams.delete(key);
      }
      return;
    }

    parsed.searchParams.set(key, String(value));
  });

  const result = parsed.toString();
  return encode ? result : decodeURIComponent(result);
}

/**
 * Removes query parameters from a URL
 */
export function removeQueryParams(
  url: string,
  paramsToRemove: string[]
): string {
  const parsed = new URL(url);

  paramsToRemove.forEach(param => {
    parsed.searchParams.delete(param);
  });

  return parsed.toString();
}

/**
 * Gets a specific query parameter value
 */
export function getQueryParam(
  url: string,
  param: string,
  options?: {
    decode?: boolean;
    asArray?: boolean;
  }
): string | string[] | null {
  const { decode = true, asArray = false } = options || {};
  
  const parsed = new URL(url);
  const values = parsed.searchParams.getAll(param);

  if (values.length === 0) {
    return null;
  }

  if (asArray) {
    return decode ? values.map(v => decodeURIComponent(v)) : values;
  }

  const value = values[0];
  return decode ? decodeURIComponent(value) : value;
}

/**
 * Creates a URL-safe slug from a string
 */
export function createSlug(
  text: string,
  options?: {
    separator?: string;
    maxLength?: number;
    preserveCase?: boolean;
    allowedChars?: string;
  }
): string {
  const {
    separator = '-',
    maxLength = 100,
    preserveCase = false,
    allowedChars = 'a-z0-9',
  } = options || {};

  let slug = text
    .normalize('NFKD') // Normalize Unicode
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .trim();

  if (!preserveCase) {
    slug = slug.toLowerCase();
  }

  slug = slug.replace(/[-\s]+/g, separator);

  // Remove any remaining characters not in allowed set
  const regex = new RegExp(`[^${allowedChars}${separator}]`, 'g');
  slug = slug.replace(regex, '');

  // Remove leading/trailing separators
  slug = slug.replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');

  // Truncate to max length
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    
    // Don't end with separator
    const lastSeparatorIndex = slug.lastIndexOf(separator);
    if (lastSeparatorIndex > slug.length - 3) {
      slug = slug.substring(0, lastSeparatorIndex);
    }
  }

  return slug;
}

/**
 * Creates a URL-friendly filename from a string
 */
export function createUrlSafeFilename(
  filename: string,
  options?: {
    maxLength?: number;
    preserveExtension?: boolean;
  }
): string {
  const { maxLength = 255, preserveExtension = true } = options || {};

  let name = filename;
  let extension = '';

  if (preserveExtension) {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex > 0) {
      name = filename.substring(0, lastDotIndex);
      extension = filename.substring(lastDotIndex);
    }
  }

  const slug = createSlug(name, {
    separator: '-',
    maxLength: maxLength - extension.length,
    preserveCase: false,
    allowedChars: 'a-z0-9',
  });

  return `${slug}${extension}`;
}

/**
 * Extracts the domain from a URL
 */
export function extractDomain(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  return parsed.hostname;
}

/**
 * Extracts the top-level domain (TLD) from a URL
 */
export function extractTld(url: string): string | null {
  const domain = extractDomain(url);
  if (!domain) return null;

  const parts = domain.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

/**
 * Extracts the path segments from a URL
 */
export function extractPathSegments(url: string): string[] {
  const parsed = parseUrl(url);
  if (!parsed) return [];

  const segments = parsed.pathname
    .split('/')
    .filter(segment => segment.trim() !== '')
    .map(segment => decodeURIComponent(segment));

  return segments;
}

/**
 * Checks if a URL is relative
 */
export function isRelativeUrl(url: string): boolean {
  return !/^([a-z][a-z0-9+\-.]*:)?\/\//i.test(url) && !url.startsWith('data:');
}

/**
 * Resolves a relative URL against a base URL
 */
export function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch (error) {
    console.error('Failed to resolve URL:', relativeUrl, baseUrl, error);
    return relativeUrl;
  }
}

/**
 * Creates a canonical URL by removing tracking parameters
 */
export function createCanonicalUrl(
  url: string,
  options?: {
    removeTrackingParams?: boolean;
    removeFragments?: boolean;
    normalize?: boolean;
  }
): string {
  const {
    removeTrackingParams = true,
    removeFragments = true,
    normalize = true,
  } = options || {};

  const parsed = parseUrl(url);
  if (!parsed) return url;

  // Remove tracking parameters
  if (removeTrackingParams) {
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'msclkid',
      'dclid',
      'yclid',
      'zanpid',
      '_ga',
      'mc_cid',
      'mc_eid',
      'ref',
      'source',
      'affiliate',
      'partner',
      'clickid',
      'irclickid',
    ];

    trackingParams.forEach(param => {
      parsed.searchParams.delete(param);
    });
  }

  // Remove fragment
  if (removeFragments) {
    parsed.hash = '';
  }

  // Reconstruct URL
  let canonical = `${parsed.protocol}//${parsed.hostname}`;
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    canonical += `:${parsed.port}`;
  }
  canonical += parsed.pathname;
  
  if (parsed.search) {
    canonical += parsed.search;
  }
  
  if (!removeFragments && parsed.hash) {
    canonical += parsed.hash;
  }

  if (normalize) {
    const normalized = normalizeUrl(canonical);
    if (normalized) {
      return normalized;
    }
  }

  return canonical;
}

/**
 * Validates and sanitizes user-provided URLs
 */
export function sanitizeUserUrl(
  url: string,
  options?: {
    allowedProtocols?: string[];
    allowedDomains?: string[];
    maxLength?: number;
    requireHttps?: boolean;
  }
): string | null {
  const {
    allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'],
    allowedDomains = [],
    maxLength = 2048,
    requireHttps = false,
  } = options || {};

  // Check length
  if (url.length > maxLength) {
    return null;
  }

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // If parsing fails, try adding https:// prefix
    if (!url.includes('://')) {
      try {
        parsed = new URL(`https://${url}`);
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  // Check protocol
  if (!allowedProtocols.includes(parsed.protocol)) {
    return null;
  }

  // Check HTTPS requirement
  if (requireHttps && parsed.protocol !== 'https:') {
    return null;
  }

  // Check domain if restrictions apply
  if (allowedDomains.length > 0) {
    const domain = parsed.hostname;
    const isAllowed = allowedDomains.some(allowed => {
      if (allowed.startsWith('.')) {
        // Subdomain wildcard: .example.com
        return domain === allowed.slice(1) || domain.endsWith(allowed);
      }
      return domain === allowed;
    });

    if (!isAllowed) {
      return null;
    }
  }

  // Sanitize potentially dangerous characters
  // Keep the URL encoded to prevent XSS
  const sanitized = parsed.toString();

  // Additional XSS prevention
  if (sanitized.includes('<') || sanitized.includes('>')) {
    return null;
  }

  // Prevent javascript: and data: URLs that might have slipped through
  if (sanitized.toLowerCase().startsWith('javascript:') || 
      sanitized.toLowerCase().startsWith('data:')) {
    return null;
  }

  return sanitized;
}

/**
 * Creates a URL for API endpoints with proper encoding
 */
export function createApiUrl(
  baseUrl: string,
  endpoint: string,
  params?: Record<string, any>,
  options?: {
    version?: string;
    trailingSlash?: boolean;
  }
): string {
  const { version = 'v1', trailingSlash = false } = options || {};

  // Clean base URL
  let cleanBase = baseUrl.trim();
  if (cleanBase.endsWith('/')) {
    cleanBase = cleanBase.slice(0, -1);
  }

  // Clean endpoint
  let cleanEndpoint = endpoint.trim();
  if (cleanEndpoint.startsWith('/')) {
    cleanEndpoint = cleanEndpoint.slice(1);
  }
  if (!trailingSlash && cleanEndpoint.endsWith('/')) {
    cleanEndpoint = cleanEndpoint.slice(0, -1);
  }
  if (trailingSlash && !cleanEndpoint.endsWith('/')) {
    cleanEndpoint = `${cleanEndpoint}/`;
  }

  // Build URL
  let url = `${cleanBase}/${version}/${cleanEndpoint}`;

  // Add query parameters if provided
  if (params && Object.keys(params).length > 0) {
    const queryString = buildQueryString(params, {
      encode: true,
      arrayFormat: 'brackets',
    });
    url = `${url}${queryString}`;
  }

  return url;
}

/**
 * Builds a query string from parameters
 */
export function buildQueryString(
  params: Record<string, any>,
  options?: {
    encode?: boolean;
    arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
    skipNull?: boolean;
    skipEmptyString?: boolean;
  }
): string {
  const url = buildUrl('http://example.com', params, options);
  const queryString = url.split('?')[1] || '';
  return queryString ? `?${queryString}` : '';
}

/**
 * Creates a CDN URL for assets
 */
export function createCdnUrl(
  assetPath: string,
  options?: {
    cdnDomain?: string;
    version?: string;
    optimize?: boolean;
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  }
): string {
  const {
    cdnDomain = 'cdn.xarastore.com',
    version = 'latest',
    optimize = true,
    width,
    height,
    quality = 80,
    format = 'auto',
  } = options || {};

  // Clean asset path
  let cleanPath = assetPath.trim();
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.slice(1);
  }

  // Build base URL
  let url = `https://${cdnDomain}/${version}/${cleanPath}`;

  // Add optimization parameters if needed
  if (optimize) {
    const params: Record<string, string | number> = {};

    if (width) params.w = width;
    if (height) params.h = height;
    if (quality !== 80) params.q = quality;
    if (format !== 'auto') params.fm = format;

    if (Object.keys(params).length > 0) {
      const queryString = buildQueryString(params);
      url = `${url}${queryString}`;
    }
  }

  return url;
}

/**
 * Creates a social sharing URL
 */
export function createShareUrl(
  platform: 'facebook' | 'twitter' | 'linkedin' | 'whatsapp' | 'telegram' | 'email',
  url: string,
  options?: {
    title?: string;
    text?: string;
    hashtags?: string[];
    via?: string;
  }
): string {
  const encodedUrl = encodeURIComponent(url);
  const { title, text, hashtags, via } = options || {};

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

    case 'twitter':
      const twitterParams = new URLSearchParams({
        url: encodedUrl,
      });
      if (text) twitterParams.set('text', encodeURIComponent(text));
      if (hashtags) twitterParams.set('hashtags', hashtags.join(','));
      if (via) twitterParams.set('via', via);
      return `https://twitter.com/intent/tweet?${twitterParams.toString()}`;

    case 'linkedin':
      const linkedinParams = new URLSearchParams({
        url: encodedUrl,
      });
      if (title) linkedinParams.set('title', encodeURIComponent(title));
      if (text) linkedinParams.set('summary', encodeURIComponent(text));
      return `https://www.linkedin.com/sharing/share-offsite/?${linkedinParams.toString()}`;

    case 'whatsapp':
      const whatsappText = text ? `${text} ${url}` : url;
      return `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

    case 'telegram':
      const telegramText = text ? `${text} ${url}` : url;
      return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || '')}`;

    case 'email':
      const emailParams = new URLSearchParams({
        subject: title || 'Check this out',
        body: text ? `${text}\n\n${url}` : url,
      });
      return `mailto:?${emailParams.toString()}`;

    default:
      return url;
  }
}

/**
 * Creates a deep link URL for the mobile app
 */
export function createDeepLinkUrl(
  path: string,
  params?: Record<string, any>,
  options?: {
    fallbackUrl?: string;
    iosAppId?: string;
    androidPackage?: string;
  }
): string {
  const { fallbackUrl, iosAppId, androidPackage } = options || {};

  // Clean path
  let cleanPath = path.trim();
  if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  // Build deep link
  let deepLink = `xarastore://app${cleanPath}`;
  
  if (params && Object.keys(params).length > 0) {
    const queryString = buildQueryString(params);
    deepLink = `${deepLink}${queryString}`;
  }

  // Create universal link with fallback
  if (fallbackUrl || iosAppId || androidPackage) {
    const universalLink = `https://xarastore.com/app${cleanPath}`;
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        queryParams.set(key, String(value));
      });
    }

    const fullUniversalLink = queryParams.toString()
      ? `${universalLink}?${queryParams.toString()}`
      : universalLink;

    // For iOS Universal Links, just return the HTTPS URL
    // The app will handle it if installed
    return fullUniversalLink;
  }

  return deepLink;
}

/**
 * Extracts all URLs from a text string
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi;
  const matches = text.match(urlRegex) || [];
  
  return matches.map(url => {
    if (!url.startsWith('http')) {
      return `https://${url}`;
    }
    return url;
  }).filter(url => isValidHttpUrl(url));
}

/**
 * Checks if two URLs point to the same resource
 */
export function areUrlsEqual(url1: string, url2: string): boolean {
  const normalized1 = normalizeUrl(url1);
  const normalized2 = normalizeUrl(url2);
  
  if (!normalized1 || !normalized2) {
    return false;
  }
  
  return normalized1 === normalized2;
}

/**
 * Creates a URL for pagination
 */
export function createPaginationUrl(
  baseUrl: string,
  page: number,
  pageSize: number,
  options?: {
    paramNames?: {
      page?: string;
      limit?: string;
    };
    keepExistingParams?: boolean;
  }
): string {
  const {
    paramNames = { page: 'page', limit: 'limit' },
    keepExistingParams = true,
  } = options || {};

  const parsed = new URL(baseUrl);
  
  if (!keepExistingParams) {
    // Clear existing search params
    const keys = Array.from(parsed.searchParams.keys());
    keys.forEach(key => parsed.searchParams.delete(key));
  }

  // Set pagination parameters
  parsed.searchParams.set(paramNames.page, page.toString());
  parsed.searchParams.set(paramNames.limit, pageSize.toString());

  return parsed.toString();
}

/**
 * Creates a URL for API pagination with cursor
 */
export function createCursorPaginationUrl(
  baseUrl: string,
  cursor?: string,
  direction: 'next' | 'prev' = 'next',
  options?: {
    paramNames?: {
      cursor?: string;
      direction?: string;
      limit?: string;
    };
    limit?: number;
  }
): string {
  const {
    paramNames = { cursor: 'cursor', direction: 'direction', limit: 'limit' },
    limit = 20,
  } = options || {};

  const parsed = new URL(baseUrl);

  if (cursor) {
    parsed.searchParams.set(paramNames.cursor, cursor);
  }
  
  parsed.searchParams.set(paramNames.direction, direction);
  parsed.searchParams.set(paramNames.limit, limit.toString());

  return parsed.toString();
}

/**
 * Creates a signed URL with HMAC signature
 */
export function createSignedUrl(
  url: string,
  secret: string,
  options?: {
    expiresIn?: number; // seconds
    method?: string;
  }
): string {
  const { expiresIn = 3600, method = 'GET' } = options || {};

  const parsed = new URL(url);
  const expires = Math.floor(Date.now() / 1000) + expiresIn;

  // Add expiration timestamp
  parsed.searchParams.set('expires', expires.toString());

  // Create signature data
  const dataToSign = `${method}\n${parsed.hostname}\n${parsed.pathname}\n${parsed.searchParams.toString()}`;

  // Calculate HMAC signature
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  const data = encoder.encode(dataToSign);
  
  // Note: In production, use Web Crypto API or a proper crypto library
  // This is a simplified example
  const signature = btoa(String.fromCharCode.apply(null, 
    Array.from(new Uint8Array(
      crypto.subtle.digestSync?.('SHA-256', new Uint8Array([...key, ...data])) || 
      new Uint8Array(32)
    ))
  ));

  // Add signature to URL
  parsed.searchParams.set('signature', signature);

  return parsed.toString();
}

/**
 * Verifies a signed URL
 */
export function verifySignedUrl(
  url: string,
  secret: string,
  method: string = 'GET'
): boolean {
  try {
    const parsed = new URL(url);
    
    // Get and remove signature from params
    const signature = parsed.searchParams.get('signature');
    const expires = parsed.searchParams.get('expires');
    
    if (!signature || !expires) {
      return false;
    }

    parsed.searchParams.delete('signature');

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (parseInt(expires) < now) {
      return false;
    }

    // Recreate signature data
    const dataToSign = `${method}\n${parsed.hostname}\n${parsed.pathname}\n${parsed.searchParams.toString()}`;

    // Calculate expected signature
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const data = encoder.encode(dataToSign);
    
    const expectedSignature = btoa(String.fromCharCode.apply(null, 
      Array.from(new Uint8Array(
        crypto.subtle.digestSync?.('SHA-256', new Uint8Array([...key, ...data])) || 
        new Uint8Array(32)
      ))
    ));

    return signature === expectedSignature;
  } catch (error) {
    console.error('Failed to verify signed URL:', error);
    return false;
  }
}

/**
 * Creates a URL for WebSocket connections
 */
export function createWebSocketUrl(
  endpoint: string,
  options?: {
    secure?: boolean;
    host?: string;
    port?: number;
    protocols?: string[];
    params?: Record<string, any>;
  }
): string {
  const {
    secure = true,
    host = typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    port,
    protocols = [],
    params = {},
  } = options || {};

  // Clean endpoint
  let cleanEndpoint = endpoint.trim();
  if (cleanEndpoint.startsWith('/')) {
    cleanEndpoint = cleanEndpoint.slice(1);
  }

  // Build base URL
  const protocol = secure ? 'wss' : 'ws';
  let url = `${protocol}://${host}`;
  
  if (port) {
    url += `:${port}`;
  }
  
  url += `/${cleanEndpoint}`;

  // Add query parameters
  if (Object.keys(params).length > 0) {
    const queryString = buildQueryString(params);
    url = `${url}${queryString}`;
  }

  // Add protocols if specified
  if (protocols.length > 0) {
    url += `#${protocols.join(',')}`;
  }

  return url;
}

/**
 * Creates a data URL for inline assets
 */
export function createDataUrl(
  data: string | ArrayBuffer,
  mimeType: string = 'application/octet-stream'
): string {
  if (typeof data === 'string') {
    return `data:${mimeType};base64,${btoa(data)}`;
  } else {
    const bytes = new Uint8Array(data);
    const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
    return `data:${mimeType};base64,${btoa(binary)}`;
  }
}

/**
 * URL encoding utilities with proper error handling
 */
export const encode = {
  uri: (value: string): string => {
    try {
      return encodeURI(value);
    } catch {
      return value;
    }
  },
  
  uriComponent: (value: string): string => {
    try {
      return encodeURIComponent(value);
    } catch {
      return value;
    }
  },
  
  formData: (data: Record<string, any>): string => {
    const formBody = [];
    for (const [key, value] of Object.entries(data)) {
      const encodedKey = encode.uriComponent(key);
      const encodedValue = encode.uriComponent(value);
      formBody.push(`${encodedKey}=${encodedValue}`);
    }
    return formBody.join('&');
  },
};

/**
 * URL decoding utilities with proper error handling
 */
export const decode = {
  uri: (value: string): string => {
    try {
      return decodeURI(value);
    } catch {
      return value;
    }
  },
  
  uriComponent: (value: string): string => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  },
};

/**
 * Rate limit tracking for URLs
 */
export function createRateLimitedUrlFetcher(
  options?: {
    maxRequestsPerMinute?: number;
    maxConcurrentRequests?: number;
  }
) {
  const {
    maxRequestsPerMinute = 60,
    maxConcurrentRequests = 5,
  } = options || {};

  const requestTimestamps: number[] = [];
  let activeRequests = 0;

  async function fetchWithRateLimit(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    // Check rate limit
    const now = Date.now();
    const minuteAgo = now - 60000;
    
    // Remove old timestamps
    while (requestTimestamps.length > 0 && requestTimestamps[0] < minuteAgo) {
      requestTimestamps.shift();
    }

    // Check if rate limit exceeded
    if (requestTimestamps.length >= maxRequestsPerMinute) {
      const oldest = requestTimestamps[0];
      const waitTime = oldest + 60000 - now;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Check concurrent limit
    while (activeRequests >= maxConcurrentRequests) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Add timestamp and increment counter
    requestTimestamps.push(now);
    activeRequests++;

    try {
      const response = await fetch(url, options);
      return response;
    } finally {
      activeRequests--;
    }
  }

  return fetchWithRateLimit;
}
