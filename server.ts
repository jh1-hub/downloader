import express, { Request, Response } from 'express';
import * as cheerio from 'cheerio';
import JSZip from 'jszip';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

interface ExtractedImage {
  id: string;
  url: string;
  filename: string;
  extension: string;
  alt: string;
  sizeBytes: number | null;
  contentType: string | null;
  sourceTag: 'img' | 'link' | 'meta' | 'style' | 'srcset';
  width?: number | null;
  height?: number | null;
}

const DEFAULT_EXTENSIONS = ['jpeg', 'jpg'];

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
      // Valid extension chars only
      if (/^[a-z0-9]{2,5}$/.test(ext)) {
        return ext;
      }
    }

    // Check query parameters like ?format=jpg or ?fm=png or ?ext=jpeg
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

// Scrape API
app.post('/api/scrape', async (req: Request, res: Response) => {
  const { url, allowedExtensions = DEFAULT_EXTENSIONS, checkSizes = true } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  let targetUrl: string;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Invalid URL protocol. Only HTTP and HTTPS are supported.' });
    }
    targetUrl = parsed.href;
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const normalizedAllowedExts = (allowedExtensions as string[]).map(ext =>
    ext.trim().toLowerCase().replace(/^\./, '')
  ).filter(Boolean);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Target website returned HTTP ${response.status}: ${response.statusText}`,
      });
    }

    const html = await response.text();
    const finalUrl = response.url || targetUrl;
    const $ = cheerio.load(html);

    const pageTitle = $('title').first().text().trim() || new URL(finalUrl).hostname;

    interface RawItem {
      url: string;
      sourceTag: ExtractedImage['sourceTag'];
      alt: string;
      width?: number | null;
      height?: number | null;
    }

    const rawItems: RawItem[] = [];

    // 1. <img> tags
    $('img').each((_, el) => {
      const $img = $(el);
      const src = $img.attr('src');
      const dataSrc = $img.attr('data-src') || $img.attr('data-original') || $img.attr('data-lazy-src') || $img.attr('data-high-res-src');
      const srcset = $img.attr('srcset') || $img.attr('data-srcset');
      const alt = $img.attr('alt') || '';
      const w = parseInt($img.attr('width') || '0', 10) || null;
      const h = parseInt($img.attr('height') || '0', 10) || null;

      if (dataSrc) {
        const cleaned = cleanUrl(dataSrc, finalUrl);
        if (cleaned) rawItems.push({ url: cleaned, sourceTag: 'img', alt, width: w, height: h });
      }
      if (src) {
        const cleaned = cleanUrl(src, finalUrl);
        if (cleaned) rawItems.push({ url: cleaned, sourceTag: 'img', alt, width: w, height: h });
      }
      if (srcset) {
        const srcsetUrls = parseSrcset(srcset, finalUrl);
        for (const u of srcsetUrls) {
          rawItems.push({ url: u, sourceTag: 'srcset', alt, width: w, height: h });
        }
      }
    });

    // 2. <picture> <source> tags
    $('source').each((_, el) => {
      const $source = $(el);
      const srcset = $source.attr('srcset') || $source.attr('src');
      if (srcset) {
        const srcsetUrls = parseSrcset(srcset, finalUrl);
        for (const u of srcsetUrls) {
          rawItems.push({ url: u, sourceTag: 'srcset', alt: '' });
        }
      }
    });

    // 3. <a> tags linking directly to images
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const cleaned = cleanUrl(href, finalUrl);
        if (cleaned) {
          const ext = extractExtensionFromUrl(cleaned);
          if (ext) {
            rawItems.push({ url: cleaned, sourceTag: 'link', alt: $(el).text().trim() });
          }
        }
      }
    });

    // 4. Meta tags (OpenGraph, Twitter)
    $('meta[property="og:image"], meta[name="twitter:image"], link[rel="image_src"]').each((_, el) => {
      const content = $(el).attr('content') || $(el).attr('href');
      if (content) {
        const cleaned = cleanUrl(content, finalUrl);
        if (cleaned) {
          rawItems.push({ url: cleaned, sourceTag: 'meta', alt: 'Meta Image' });
        }
      }
    });

    // 5. Elements with style="background-image: url(...)"
    $('[style]').each((_, el) => {
      const style = $(el).attr('style') || '';
      const bgMatch = style.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
      if (bgMatch) {
        for (const match of bgMatch) {
          const innerUrl = match.replace(/url\(\s*['"]?/, '').replace(/['"]?\s*\)/, '');
          const cleaned = cleanUrl(innerUrl, finalUrl);
          if (cleaned) {
            rawItems.push({ url: cleaned, sourceTag: 'style', alt: 'Background' });
          }
        }
      }
    });

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const deduplicatedItems: RawItem[] = [];

    for (const item of rawItems) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        deduplicatedItems.push(item);
      }
    }

    // Filter by allowed extensions
    const filteredImages: ExtractedImage[] = [];

    for (let i = 0; i < deduplicatedItems.length; i++) {
      const item = deduplicatedItems[i];
      let ext = extractExtensionFromUrl(item.url);

      // If no extension found in URL, but default/allowed ext requested,
      // we check if allowedExtensions contains 'all' or if ext matches
      const isAllowed = ext && normalizedAllowedExts.includes(ext);

      // If allowed, add to list
      if (isAllowed) {
        const filename = getFilenameFromUrl(item.url, ext || 'jpg');
        filteredImages.push({
          id: `img_${i}_${Math.random().toString(36).slice(2, 8)}`,
          url: item.url,
          filename,
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

    // Optionally probe HEAD requests for file size and content type (concurrency limit 8)
    if (checkSizes && filteredImages.length > 0) {
      const probeBatch = async (batch: ExtractedImage[]) => {
        await Promise.all(
          batch.map(async (img) => {
            try {
              const probeCtrl = new AbortController();
              const probeTimeout = setTimeout(() => probeCtrl.abort(), 4000);
              const headRes = await fetch(img.url, {
                method: 'HEAD',
                signal: probeCtrl.signal,
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                  Referer: finalUrl,
                },
              });
              clearTimeout(probeTimeout);

              if (headRes.ok) {
                const len = headRes.headers.get('content-length');
                if (len) img.sizeBytes = parseInt(len, 10);
                const cType = headRes.headers.get('content-type');
                if (cType) img.contentType = cType;
              }
            } catch {
              // Ignore probe failures, preview will still work
            }
          })
        );
      };

      const BATCH_SIZE = 8;
      for (let i = 0; i < Math.min(filteredImages.length, 64); i += BATCH_SIZE) {
        await probeBatch(filteredImages.slice(i, i + BATCH_SIZE));
      }
    }

    return res.json({
      success: true,
      pageTitle,
      finalUrl,
      totalFound: deduplicatedItems.length,
      filteredCount: filteredImages.length,
      images: filteredImages,
    });
  } catch (error: any) {
    console.error('Scrape error:', error);
    return res.status(500).json({
      error: `Failed to scrape URL: ${error?.message || 'Unknown network error'}`,
    });
  }
});

// Proxy Image API to bypass CORS and optionally download as attachment
app.get('/api/proxy-image', async (req: Request, res: Response) => {
  const imageUrl = req.query.url as string;
  const referer = req.query.referer as string;
  const isDownload = req.query.download === '1';
  const customFilename = req.query.filename as string;

  if (!imageUrl) {
    return res.status(400).send('Image URL is required');
  }

  try {
    const parsed = new URL(imageUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const tryFetch = async (useReferer?: string) => {
      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      };
      if (useReferer) {
        headers['Referer'] = useReferer;
      }
      return await fetch(imageUrl, {
        signal: controller.signal,
        headers,
      });
    };

    let imgRes = await tryFetch(referer || `${parsed.protocol}//${parsed.hostname}/`);
    
    // If blocked by strict referer policy, retry without Referer
    if (!imgRes.ok && (imgRes.status === 403 || imgRes.status === 400)) {
      imgRes = await tryFetch(undefined);
    }
    clearTimeout(timeout);

    if (!imgRes.ok) {
      return res.status(imgRes.status).send(`Failed to fetch image: HTTP ${imgRes.status}`);
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (isDownload) {
      const cleanName = (customFilename || getFilenameFromUrl(imageUrl)).replace(/[^a-zA-Z0-9._-]/g, '_');
      res.setHeader('Content-Disposition', `attachment; filename="${cleanName}"`);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(500).send(`Proxy error: ${err.message}`);
  }
});

// ZIP Download API
app.post('/api/download-zip', async (req: Request, res: Response) => {
  const { images, folderPrefix = '' } = req.body;

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'No images specified' });
  }

  try {
    const zip = new JSZip();
    const cleanFolder = folderPrefix
      ? folderPrefix.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '') + '/'
      : '';

    const fetchImageBuffer = async (img: { url: string; filename: string }) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const r = await fetch(img.url, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });
        clearTimeout(timeout);
        if (r.ok) {
          const buf = await r.arrayBuffer();
          return { filename: img.filename, buffer: Buffer.from(buf) };
        }
      } catch (err) {
        console.error(`Failed to download ${img.url}:`, err);
      }
      return null;
    };

    // Process in batches of 6
    const results: Array<{ filename: string; buffer: Buffer }> = [];
    const BATCH_SIZE = 6;
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
      const chunk = images.slice(i, i + BATCH_SIZE);
      const batchRes = await Promise.all(chunk.map(fetchImageBuffer));
      for (const item of batchRes) {
        if (item) results.push(item);
      }
    }

    if (results.length === 0) {
      return res.status(502).json({ error: 'Could not fetch any of the requested images.' });
    }

    // Add to ZIP
    for (const item of results) {
      zip.file(`${cleanFolder}${item.filename}`, item.buffer);
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="images_bulk_${Date.now()}.zip"`);
    return res.send(zipBuffer);
  } catch (error: any) {
    console.error('ZIP error:', error);
    return res.status(500).json({ error: 'Failed to generate ZIP archive' });
  }
});

// Setup dev server with Vite middlewares, or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
