import { ScrapedImage, ScrapeResult } from '../types';

export const CORS_PROXIES = [
  {
    name: 'CORSProxy.io',
    type: 'raw',
    format: (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'AllOrigins Raw',
    type: 'raw',
    format: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'AllOrigins JSON',
    type: 'json',
    format: (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'CodeTabs',
    type: 'raw',
    format: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  },
  {
    name: 'ThingProxy',
    type: 'raw',
    format: (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
  },
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
 * Fetches HTML from a target URL with multi-proxy fallback and race execution
 */
export async function fetchHtmlWithCorsFallback(targetUrl: string): Promise<string> {
  // 1. Direct fetch attempt (works for CORS-enabled sites)
  try {
    const directRes = await fetch(targetUrl, { mode: 'cors' });
    if (directRes.ok) {
      const html = await directRes.text();
      if (html && html.length > 50) return html;
    }
  } catch {
    // Expected to fail for cross-origin targets without CORS
  }

  // 2. Helper to fetch single proxy with timeout
  const fetchFromProxy = async (proxy: (typeof CORS_PROXIES)[0], timeoutMs: number): Promise<string> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const proxyUrl = proxy.format(targetUrl);
      const res = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      if (proxy.type === 'json') {
        const json = await res.json();
        if (json?.contents && typeof json.contents === 'string') {
          return json.contents;
        }
        throw new Error('Invalid JSON proxy response');
      }

      const html = await res.text();
      if (html && html.length > 50) {
        return html;
      }
      throw new Error('Empty response');
    } catch (err: any) {
      clearTimeout(timer);
      throw err;
    }
  };

  // 3. Fast Parallel Attempt on top 2 proxies (CORSProxy.io and AllOrigins)
  try {
    const fastWinner = await Promise.any([
      fetchFromProxy(CORS_PROXIES[0], 8000),
      fetchFromProxy(CORS_PROXIES[1], 8000),
    ]);
    if (fastWinner) return fastWinner;
  } catch {
    // Top 2 failed or timed out, proceed to sequential fallback
  }

  // 4. Sequential fallback on remaining proxies
  for (let i = 2; i < CORS_PROXIES.length; i++) {
    try {
      const html = await fetchFromProxy(CORS_PROXIES[i], 10000);
      if (html) return html;
    } catch {
      // try next
    }
  }

  throw new Error(
    'Webページの取得に失敗しました (対象サイトが外部プロキシをブロックしているか、タイムアウトが発生しました)。「HTML直接貼り付け」モードを使用すると100%確実に解析できます。'
  );
}

/**
 * Parses HTML and extracts images in client-side environments (GitHub Pages & Direct HTML Paste)
 */
export function parseHtmlClientSide(
  html: string,
  targetUrl: string,
  allowedExtensions: string[]
): ScrapeResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  let pageTitle = doc.querySelector('title')?.textContent?.trim() || '';
  if (!pageTitle) {
    try {
      pageTitle = new URL(targetUrl).hostname;
    } catch {
      pageTitle = '貼り付けたHTML';
    }
  }

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
  // Try server endpoint first
  try {
    const serverRes = await fetch('/api/scrape', {
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

    if (serverRes.status !== 404 && serverRes.status !== 502) {
      const errData = await serverRes.json().catch(() => null);
      if (errData?.error && !errData.error.includes('aborted')) {
        throw new Error(errData.error);
      }
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('404')) {
      console.warn('Server scrape failed, attempting client CORS proxy:', err);
    }
  }

  // Client-side fallback for GitHub Pages or blocked servers
  const html = await fetchHtmlWithCorsFallback(url.trim());
  return parseHtmlClientSide(html, url.trim(), allowedExtensions);
}

/**
 * Extracts image links from pasted plain text / URL list (useful for smartphones)
 */
export function parseUrlsFromText(
  text: string,
  targetUrl: string,
  allowedExtensions: string[]
): ScrapeResult {
  const normalizedAllowedExts = allowedExtensions.map((e) => e.toLowerCase().replace(/^\./, ''));
  // Match URLs in text
  const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi;
  const matches = text.match(urlRegex) || [];

  const seen = new Set<string>();
  const images: ScrapedImage[] = [];

  matches.forEach((raw, idx) => {
    const cleaned = cleanUrl(raw, targetUrl || raw);
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);

    const ext = extractExtensionFromUrl(cleaned);
    if (ext && normalizedAllowedExts.includes(ext)) {
      images.push({
        id: `img_url_${idx}_${Math.random().toString(36).slice(2, 7)}`,
        url: cleaned,
        filename: getFilenameFromUrl(cleaned, ext),
        extension: ext,
        alt: '',
        sizeBytes: null,
        contentType: null,
        sourceTag: 'link',
      });
    }
  });

  return {
    success: true,
    pageTitle: targetUrl ? `貼り付けリスト (${targetUrl})` : '貼り付けた画像URLリスト',
    finalUrl: targetUrl || 'https://pasted-urls.local',
    totalFound: matches.length,
    filteredCount: images.length,
    images,
  };
}

/**
 * Generates a smartphone-friendly Bookmarklet that sends extracted images straight to this app
 */
export function generateBookmarkletCode(appUrl: string): string {
  const cleanAppUrl = appUrl.split('#')[0].split('?')[0];
  return `javascript:(function(){try{var s=new Set();document.querySelectorAll('img').forEach(function(i){if(i.src)s.add(i.src);if(i.dataset&&i.dataset.src)s.add(i.dataset.src);if(i.dataset&&i.dataset.original)s.add(i.dataset.original);});document.querySelectorAll('source').forEach(function(sc){if(sc.srcset)sc.srcset.split(',').forEach(function(p){var u=p.trim().split(' ')[0];if(u)s.add(u);});});document.querySelectorAll('a[href]').forEach(function(a){if(/\\.(jpe?g|png|webp|gif|avif)/i.test(a.href))s.add(a.href);});var arr=Array.from(s).filter(function(u){return /^https?:\\/\\//i.test(u);});if(arr.length===0){alert('ページ内に画像が見つかりませんでした');return;}var payload={title:document.title||'抽出画像',url:location.href,images:arr.slice(0,120)};var base='${cleanAppUrl.replace(/'/g, "\\'")}';window.open(base+(base.indexOf('#')===-1?'#':'&')+'import='+encodeURIComponent(JSON.stringify(payload)),'_blank');}catch(e){alert('エラー:'+e.message);}})();`;
}

