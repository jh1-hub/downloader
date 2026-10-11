import JSZip from 'jszip';
import { ScrapedImage, DownloadSettings, FilenamePattern } from '../types';
import { CORS_PROXIES } from './clientScraper';

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes === 0) return '不明';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function generateFilename(
  image: ScrapedImage,
  index: number,
  total: number,
  pattern: FilenamePattern,
  customPrefix: string,
  pageUrl?: string
): string {
  const padLength = Math.max(3, String(total).length);
  const numStr = String(index + 1).padStart(padLength, '0');
  const ext = image.extension ? `.${image.extension.toLowerCase()}` : '.jpg';

  let rawName = image.filename.replace(/\.[^/.]+$/, '');
  if (!rawName) rawName = `image_${numStr}`;

  switch (pattern) {
    case 'numbered':
      return `${numStr}${ext}`;
    case 'prefix_numbered':
      return `${customPrefix || 'image'}_${numStr}${ext}`;
    case 'domain_original': {
      let host = 'site';
      if (pageUrl) {
        try {
          host = new URL(pageUrl).hostname.replace(/[^a-zA-Z0-9]/g, '_');
        } catch {
          // ignore
        }
      }
      return `${host}_${rawName}${ext}`;
    }
    case 'original':
    default:
      return `${rawName}${ext}`;
  }
}

export function getProxyImageUrl(url: string, referer?: string, download?: boolean, filename?: string): string {
  const params = new URLSearchParams();
  params.set('url', url);
  if (referer) params.set('referer', referer);
  if (download) params.set('download', '1');
  if (filename) params.set('filename', filename);
  return `./api/proxy-image?${params.toString()}`;
}

export async function fetchImageBlob(url: string, referer?: string): Promise<Blob> {
  // 1. Try local server proxy (Dev / Fullstack environment)
  try {
    const proxyUrl = getProxyImageUrl(url, referer);
    const response = await fetch(proxyUrl);
    if (response.ok) {
      return await response.blob();
    }
  } catch {
    // Server proxy not available (e.g. GitHub Pages static hosting)
  }

  // 2. Try direct fetch (many CDNs allow CORS)
  try {
    const directRes = await fetch(url, { mode: 'cors' });
    if (directRes.ok) {
      return await directRes.blob();
    }
  } catch {
    // Direct fetch blocked by CORS
  }

  // 3. Fallback to public CORS proxy for GitHub Pages
  for (const proxy of CORS_PROXIES) {
    try {
      const pUrl = proxy.format(url);
      const res = await fetch(pUrl);
      if (res.ok) {
        return await res.blob();
      }
    } catch {
      // try next
    }
  }

  throw new Error(`画像の取得に失敗しました: ${url}`);
}

/**
 * Download a single file. Tries client blob trigger first; if restricted, uses server attachment endpoint.
 */
export async function downloadSingleFile(
  image: ScrapedImage,
  filename: string,
  referer?: string
): Promise<void> {
  try {
    const blob = await fetchImageBlob(image.url, referer);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    console.warn('Direct blob download failed, falling back to server attachment trigger:', err);
    // Direct server attachment download fallback
    const directUrl = getProxyImageUrl(image.url, referer, true, filename);
    const a = document.createElement('a');
    a.href = directUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export interface ProgressCallback {
  (current: number, total: number, currentFilename: string): void;
}

/**
 * Downloads multiple files to a directory selected by File System Access API.
 * Throws if the directory handle lacks permission or fails completely so caller can fall back.
 */
export async function downloadToDirectoryHandle(
  dirHandle: any,
  subfolderPath: string,
  items: Array<{ image: ScrapedImage; filename: string }>,
  referer: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<number> {
  if (!dirHandle) {
    throw new Error('保存先フォルダが選択されていません');
  }

  let targetHandle = dirHandle;

  // Request/verify write permission if required by browser
  try {
    if (typeof dirHandle.queryPermission === 'function') {
      const perm = await dirHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        const reqPerm = await dirHandle.requestPermission({ mode: 'readwrite' });
        if (reqPerm !== 'granted') {
          throw new Error('フォルダへの書き込み権限が許可されませんでした');
        }
      }
    }
  } catch (err: any) {
    console.warn('Permission query error:', err);
    throw new Error(`フォルダ権限エラー: ${err.message || 'アクセスが拒否されました'}`);
  }

  // If subfolder is specified, get or create it
  if (subfolderPath && subfolderPath.trim()) {
    const parts = subfolderPath
      .trim()
      .replace(/\\/g, '/')
      .split('/')
      .filter(Boolean);
    for (const part of parts) {
      targetHandle = await targetHandle.getDirectoryHandle(part, { create: true });
    }
  }

  let completed = 0;
  let writeErrors = 0;

  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) {
      throw new Error('ダウンロードがキャンセルされました');
    }
    const item = items[i];
    if (onProgress) {
      onProgress(i, items.length, item.filename);
    }

    try {
      const blob = await fetchImageBlob(item.image.url, referer);
      const fileHandle = await targetHandle.getFileHandle(item.filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      completed++;
    } catch (err: any) {
      console.warn(`Error writing file ${item.filename}:`, err);
      writeErrors++;
      if (writeErrors >= 3 && completed === 0) {
        // If the first 3 files all failed to write to disk, filesystem access is broken in this context
        throw new Error('フォルダへのファイル書き込みに失敗しました');
      }
    }
  }

  if (completed === 0 && items.length > 0) {
    throw new Error('選択フォルダへファイルを書き込めませんでした');
  }

  if (onProgress) {
    onProgress(items.length, items.length, '完了');
  }
  return completed;
}

/**
 * Generates and downloads a ZIP file to the default Downloads folder.
 */
export async function downloadAsZip(
  subfolderPath: string,
  items: Array<{ image: ScrapedImage; filename: string }>,
  referer: string,
  zipName: string = 'images.zip',
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<void> {
  const zip = new JSZip();
  let folder = zip;

  if (subfolderPath && subfolderPath.trim()) {
    const cleanSub = subfolderPath.trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
    if (cleanSub) {
      folder = zip.folder(cleanSub) || zip;
    }
  }

  let successfulFetches = 0;

  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) {
      throw new Error('ダウンロードがキャンセルされました');
    }
    const item = items[i];
    if (onProgress) {
      onProgress(i, items.length, item.filename);
    }

    try {
      const blob = await fetchImageBlob(item.image.url, referer);
      folder.file(item.filename, blob);
      successfulFetches++;
    } catch (err) {
      console.warn(`Failed to include ${item.filename} in zip:`, err);
    }
  }

  if (successfulFetches === 0 && items.length > 0) {
    // Try server-side fallback
    if (onProgress) {
      onProgress(items.length, items.length, 'サーバー側でZIP生成中...');
    }
    const serverRes = await fetch('/api/download-zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: items.map((it) => ({ url: it.image.url, filename: it.filename })),
        folderPrefix: subfolderPath,
      }),
    });

    if (!serverRes.ok) {
      throw new Error('ZIPアーカイブの生成に失敗しました');
    }

    const blob = await serverRes.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    return;
  }

  if (onProgress) {
    onProgress(items.length, items.length, 'ZIPアーカイブ生成中...');
  }

  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const blobUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

/**
 * Sequential browser downloads to the default Downloads folder
 */
export async function downloadSequentiallyInBrowser(
  items: Array<{ image: ScrapedImage; filename: string }>,
  referer: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) {
      throw new Error('ダウンロードがキャンセルされました');
    }
    const item = items[i];
    if (onProgress) {
      onProgress(i, items.length, item.filename);
    }

    try {
      await downloadSingleFile(item.image, item.filename, referer);
    } catch (err) {
      console.warn(`Error downloading ${item.filename}:`, err);
    }

    // Short pause to prevent browser throttling/popup blocking
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  if (onProgress) {
    onProgress(items.length, items.length, '完了');
  }
}
