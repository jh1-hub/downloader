export interface SequencePattern {
  detected: boolean;
  prefixUrl: string; // The URL part before the sequential number (e.g. "https://example.com/images/p")
  numberStr: string; // e.g. "001"
  startNumber: number; // e.g. 1
  padLength: number; // e.g. 3
  suffixUrl: string; // The URL part after the sequential number (e.g. ".jpg" or "_hq.jpg")
  samplePreview: string; // e.g. "https://example.com/images/p002.jpg"
  filenameOnly?: string; // e.g. "p001.jpg"
  explicitRange?: {
    start: number;
    end: number;
    pad: number;
  };
}

/**
 * Checks if a string or URL ends with a common image extension
 */
export function isDirectImageUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const clean = urlStr.split('?')[0].split('#')[0].toLowerCase();
    return /\.(jpe?g|png|webp|gif|bmp|avif|tiff?)($|\/)/i.test(clean) || /\.(jpe?g|png|webp|gif|bmp|avif|tiff?)$/i.test(clean);
  } catch {
    return false;
  }
}

/**
 * Detects sequential number in an image URL filename or query param
 * Examples supported:
 * - https://example.com/images/p001.jpg -> prefix: ".../p", num: "001", suffix: ".jpg"
 * - https://example.com/001.jpg -> prefix: ".../", num: "001", suffix: ".jpg"
 * - https://example.com/p001_raw.jpg -> prefix: ".../p", num: "001", suffix: "_raw.jpg"
 * - https://example.com/gallery/p[001-300].jpg -> explicit range pattern
 * - p001.jpg (relative or local filename)
 */
export function detectSequencePattern(urlStr: string): SequencePattern | null {
  if (!urlStr || typeof urlStr !== 'string') return null;

  const trimmed = urlStr.trim();
  if (!trimmed) return null;

  // 1. Check for explicit bracket/brace range syntax: e.g. p[001-300].jpg or p{1-300}.jpg
  const rangeMatch = trimmed.match(/^(.*?)[\[\{](\d+)\s*[-~～]\s*(\d+)[\]\}](.*?)$/);
  if (rangeMatch) {
    const prefixUrl = rangeMatch[1];
    const startStr = rangeMatch[2];
    const endStr = rangeMatch[3];
    const suffixUrl = rangeMatch[4];
    const startNum = parseInt(startStr, 10);
    const endNum = parseInt(endStr, 10);
    const padLength = Math.max(startStr.length, endStr.length > 3 ? endStr.length : 0);

    const nextNumStr = String(startNum + 1).padStart(padLength, '0');
    return {
      detected: true,
      prefixUrl,
      numberStr: startStr,
      startNumber: startNum,
      padLength,
      suffixUrl,
      samplePreview: `${prefixUrl}${nextNumStr}${suffixUrl}`,
      explicitRange: {
        start: startNum,
        end: endNum,
        pad: padLength,
      },
    };
  }

  // 2. Try URL object parsing
  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname;

    // Find the filename segment after the last slash
    const lastSlash = pathname.lastIndexOf('/');
    const filename = lastSlash !== -1 ? pathname.slice(lastSlash + 1) : pathname;

    // Separate base filename and extension (e.g., "p001_raw" and ".jpg")
    const extMatch = filename.match(/(\.[a-zA-Z0-9]+)$/);
    const fileExt = extMatch ? extMatch[1] : '';
    const baseName = extMatch ? filename.slice(0, -fileExt.length) : filename;

    // Look for sequential digits in baseName.
    // We prefer the LAST digit sequence in baseName so e.g. "vol2_page001" picks "001"
    const digitMatch = baseName.match(/^(.*?)(\d+)([^0-9]*)$/);
    if (digitMatch) {
      const filePrefix = digitMatch[1]; // e.g. "p"
      const numStr = digitMatch[2]; // e.g. "001"
      const intermediateSuffix = digitMatch[3]; // e.g. "" or "_raw"

      const baseDir = lastSlash !== -1 ? pathname.slice(0, lastSlash + 1) : '';
      const prefixUrl = `${parsed.origin}${baseDir}${filePrefix}`;
      const suffixUrl = `${intermediateSuffix}${fileExt}${parsed.search}${parsed.hash}`;

      const startNum = parseInt(numStr, 10);
      const padLength = numStr.length;
      const nextNumStr = String(startNum + 1).padStart(padLength, '0');

      return {
        detected: true,
        prefixUrl,
        numberStr: numStr,
        startNumber: startNum,
        padLength,
        suffixUrl,
        samplePreview: `${prefixUrl}${nextNumStr}${suffixUrl}`,
        filenameOnly: filename,
      };
    }

    // Also check query parameters (e.g. ?file=p001.jpg or ?page=001)
    for (const [key, val] of parsed.searchParams.entries()) {
      const qDigitMatch = val.match(/^(.*?)(\d+)([^0-9]*)$/);
      if (qDigitMatch) {
        // Construct pattern where query param value is substituted
        const qPrefix = qDigitMatch[1];
        const numStr = qDigitMatch[2];
        const qSuffix = qDigitMatch[3];

        const startNum = parseInt(numStr, 10);
        const padLength = numStr.length;

        // Base URL before this param value
        const paramsCopy = new URLSearchParams(parsed.searchParams);
        paramsCopy.delete(key);
        const otherSearch = paramsCopy.toString() ? `?${paramsCopy.toString()}&` : '?';
        const prefixUrl = `${parsed.origin}${parsed.pathname}${otherSearch}${key}=${qPrefix}`;
        const suffixUrl = `${qSuffix}${parsed.hash}`;
        const nextNumStr = String(startNum + 1).padStart(padLength, '0');

        return {
          detected: true,
          prefixUrl,
          numberStr: numStr,
          startNumber: startNum,
          padLength,
          suffixUrl,
          samplePreview: `${prefixUrl}${nextNumStr}${suffixUrl}`,
        };
      }
    }
  } catch {
    // If not a full URL (e.g. relative string "p001.jpg" or "gallery/p001.jpg")
    const lastSlash = trimmed.lastIndexOf('/');
    const filename = lastSlash !== -1 ? trimmed.slice(lastSlash + 1) : trimmed;
    const baseDir = lastSlash !== -1 ? trimmed.slice(0, lastSlash + 1) : '';

    const extMatch = filename.match(/(\.[a-zA-Z0-9]+)$/);
    const fileExt = extMatch ? extMatch[1] : '';
    const baseName = extMatch ? filename.slice(0, -fileExt.length) : filename;

    const digitMatch = baseName.match(/^(.*?)(\d+)([^0-9]*)$/);
    if (digitMatch) {
      const filePrefix = digitMatch[1];
      const numStr = digitMatch[2];
      const intermediateSuffix = digitMatch[3];

      const prefixUrl = `${baseDir}${filePrefix}`;
      const suffixUrl = `${intermediateSuffix}${fileExt}`;
      const startNum = parseInt(numStr, 10);
      const padLength = numStr.length;
      const nextNumStr = String(startNum + 1).padStart(padLength, '0');

      return {
        detected: true,
        prefixUrl,
        numberStr: numStr,
        startNumber: startNum,
        padLength,
        suffixUrl,
        samplePreview: `${prefixUrl}${nextNumStr}${suffixUrl}`,
        filenameOnly: filename,
      };
    }
  }

  return null;
}

/**
 * Generates an array of sequential URLs from startNum to endNum
 * Supports both ascending (e.g. 1 -> 300) and descending (e.g. 300 -> 1)
 */
export function generateSequenceUrls(
  prefixUrl: string,
  startNum: number,
  endNum: number,
  padLength: number,
  suffixUrl: string,
  step: number = 1
): string[] {
  const urls: string[] = [];
  const safeStep = Math.max(1, Math.abs(step));
  const isAscending = startNum <= endNum;

  // Maximum cap to prevent memory issues
  const MAX_CAP = 3000;
  let count = 0;

  if (isAscending) {
    for (let i = startNum; i <= endNum && count < MAX_CAP; i += safeStep) {
      const numStr = padLength > 0 ? String(i).padStart(padLength, '0') : String(i);
      urls.push(`${prefixUrl}${numStr}${suffixUrl}`);
      count++;
    }
  } else {
    for (let i = startNum; i >= endNum && count < MAX_CAP; i -= safeStep) {
      const numStr = padLength > 0 ? String(i).padStart(padLength, '0') : String(i);
      urls.push(`${prefixUrl}${numStr}${suffixUrl}`);
      count++;
    }
  }

  return urls;
}
