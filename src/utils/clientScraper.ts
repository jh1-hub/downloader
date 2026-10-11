import { ScrapedImage, ScrapeResult } from '../types';

export const CORS_PROXIES = [
  { name: 'AllOrigins', format: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: 'CORSProxy.io', format: (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}` },
  { name: 'CodeTabs', format: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
];

function cleanUrl(rawUrl: string, baseUrl: string): string | null {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) {
      return null;
    }
    const resolved = new URL(trimmed, baseUrl);
    resolved.hash = '';
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      return null;
    }
    return resolved.href;
  } catch {
    return null;
  }
}

function parseSrcset(srcset: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const parts = srcset.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const urlCandidate = trimmed.split(/\s+/)[0];
    const cleaned = cleanUrl(urlCandidate, baseUrl);
    if (cleaned) {
      urls.push(cleaned);
    }
  }
  return urls;
}

function extractExtensionFromUrl(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const lastDot = pathname.lastIndexOf('.');
    if (lastDot !== -1 && lastDot < pathname.length - 1) {
      const ext = pathname.slice(lastDot + 1).toLowerCase();
      if (/^[a-z0-9]{2,5}$/.test(ext)) {
        return ext;
      }
    }

    for (const [key, val] of parsed.searchParams.entries()) {
      const k = key.toLowerCase();
      if (k === 'format' || k === 'fm' || k === 'ext' || k === 'type') {
        const ext = val.toLowerCase().replace(/^\./, '');
        if (/^[a-z0-9]{2,5}$/.test(ext)) {
          return ext;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function getFilenameFromUrl(urlStr: string, fallbackExt: string = 'jpg'): string {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const parts = pathname.split('/').filter(Boolean);
    const lastPart = parts.length > 0 ? parts[parts.length - 1] : 'image';
    const cleanLast = decodeURIComponent(lastPart).replace(/[^a-zA-Z0-9._-]/g, '_');
    if (cleanLast.includes('.')) {
      return cleanLast;
    }
    return `${cleanLast}.${fallbackExt}`;
  } catch {
    return `image_${Date.now()}.${fallbackExt}`;
  }
}

/**
 * Fetches HTML from a target URL via CORS proxies for static environments like GitHub Pages
 */
export async function fetchHtmlWithCorsFallback(targetUrl: string): Promise<string> {
  // First try direct fetch (some URLs allow CORS)
  try {
    const directRes = await fetch(targetUrl, { mode: 'cors' });
    if (directRes.ok) {
      return await directRes.text();
    }
  } catch {
    // Expected to fail on most cross-origin sites
  }

  // Iterate through public CORS proxies
  let lastError: any = null;
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy.format(targetUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        if (html && html.length > 50) {
          return html;
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Webページの取得に失敗しました (CORS制約)。URLを確認するか、プロキシ経由で再試行してください: ${lastError?.message || ''}`
  );
}

/**
 * Parses HTML and extracts images in client-side environments (GitHub Pages)
 */
export function parseHtmlClientSide(
  html: string,
  targetUrl: string,
  allowedExtensions: string[]
): ScrapeResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const pageTitle = doc.querySelector('title')?.textContent?.trim() || new URL(targetUrl).hostname;
  const normalizedAllowedExts = allowedExtensions.map((e) => e.toLowerCase().replace(/^\./, ''));

  interface RawItem {
    url: string;
    sourceTag: ScrapedImage['sourceTag'];
    alt: string;
    width?: number | null;
    height?: number | null;
  }

  const rawItems: RawItem[] = [];

  // 1. <img> tags
  doc.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    const dataSrc =
      img.getAttribute('data-src') ||
      img.getAttribute('data-original') ||
      img.getAttribute('data-lazy-src') ||
      img.getAttribute('data-high-res-src');
    const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
    const alt = img.getAttribute('alt') || '';
    const w = parseInt(img.getAttribute('width') || '0', 10) || null;
    const h = parseInt(img.getAttribute('height') || '0', 10) || null;

    if (dataSrc) {
      const cleaned = cleanUrl(dataSrc, targetUrl);
      if (cleaned) rawItems.push({ url: cleaned, sourceTag: 'img', alt, width: w, height: h });
    }
    if (src) {
      const cleaned = cleanUrl(src, targetUrl);
      if (cleaned) rawItems.push({ url: cleaned, sourceTag: 'img', alt, width: w, height: h });
    }
    if (srcset) {
      const srcsetUrls = parseSrcset(srcset, targetUrl);
      for (const u of srcsetUrls) {
        rawItems.push({ url: u, sourceTag: 'srcset', alt, width: w, height: h });
      }
    }
  });

  // 2. <source> tags
  doc.querySelectorAll('source').forEach((source) => {
    const srcset = source.getAttribute('srcset') || source.getAttribute('src');
    if (srcset) {
      const srcsetUrls = parseSrcset(srcset, targetUrl);
      for (const u of srcsetUrls) {
        rawItems.push({ url: u, sourceTag: 'srcset', alt: '' });
      }
    }
  });

  // 3. <a> tags linking directly to images
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href) {
      const cleaned = cleanUrl(href, targetUrl);
      if (cleaned) {
        const ext = extractExtensionFromUrl(cleaned);
        if (ext) {
          rawItems.push({ url: cleaned, sourceTag: 'link', alt: a.textContent?.trim() || '' });
        }
      }
    }
  });

  // 4. Meta tags (OpenGraph, Twitter)
  doc.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"], link[rel="image_src"]').forEach((meta) => {
    const content = meta.getAttribute('content') || meta.getAttribute('href');
    if (content) {
      const cleaned = cleanUrl(content, targetUrl);
      if (cleaned) {
        rawItems.push({ url: cleaned, sourceTag: 'meta', alt: 'Meta Image' });
      }
    }
  });

  // 5. Elements with style="background-image: url(...)"
  doc.querySelectorAll('[style]').forEach((el) => {
    const style = el.getAttribute('style') || '';
    const bgMatch = style.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
    if (bgMatch) {
      for (const match of bgMatch) {
        const innerUrl = match.replace(/url\(\s*['"]?/, '').replace(/['"]?\s*\)/, '');
        const cleaned = cleanUrl(innerUrl, targetUrl);
        if (cleaned) {
          rawItems.push({ url: cleaned, sourceTag: 'style', alt: 'Background' });
        }
      }
    }
  });

  // Deduplicate
  const seenUrls = new Set<string>();
  const deduplicated: RawItem[] = [];
  for (const item of rawItems) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      deduplicated.push(item);
    }
  }

  // Filter by allowed extensions
  const filteredImages: ScrapedImage[] = [];
  for (let i = 0; i < deduplicated.length; i++) {
    const item = deduplicated[i];
    const ext = extractExtensionFromUrl(item.url);
    if (ext && normalizedAllowedExts.includes(ext)) {
      filteredImages.push({
        id: `img_client_${i}_${Math.random().toString(36).slice(2, 7)}`,
        url: item.url,
        filename: getFilenameFromUrl(item.url, ext),
        extension: ext,
        alt: item.alt,
        sizeBytes: null,
        contentType: null,
        sourceTag: item.sourceTag,
        width: item.width,
        height: item.height,
      });
    }
  }

  return {
    success: true,
    pageTitle,
    finalUrl: targetUrl,
    totalFound: deduplicated.length,
    filteredCount: filteredImages.length,
    images: filteredImages,
  };
}

/**
 * Universal Scrape function:
 * 1. Tries server /api/scrape first (if fullstack / Node environment)
 * 2. If 404 or fails, automatically falls back to client-side CORS scraping (GitHub Pages)
 */
export async function scrapeWebpageUniversal(
  url: string,
  allowedExtensions: string[]
): Promise<ScrapeResult> {
  // Try server endpoint
  try {
    const serverRes = await fetch('./api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url.trim(),
        allowedExtensions,
        checkSizes: true,
      }),
    });

    if (serverRes.ok) {
      return await serverRes.json();
    }
    // If 404, we are on GitHub Pages static host! Fall through to client scraper
    if (serverRes.status !== 404 && serverRes.status !== 502) {
      const errData = await serverRes.json().catch(() => null);
      if (errData?.error) {
        throw new Error(errData.error);
      }
    }
  } catch (err: any) {
    // If network error or 404, proceed to client-side scraper
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('404')) {
      console.warn('Server scrape failed, trying client scraper fallback:', err);
    }
  }

  // Client-side fallback for GitHub Pages
  const html = await fetchHtmlWithCorsFallback(url.trim());
  return parseHtmlClientSide(html, url.trim(), allowedExtensions);
}
