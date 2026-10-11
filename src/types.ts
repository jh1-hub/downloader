export interface ScrapedImage {
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

export interface ScrapeResult {
  success: boolean;
  pageTitle: string;
  finalUrl: string;
  totalFound: number;
  filteredCount: number;
  images: ScrapedImage[];
}

export type DownloadMode = 'filesystem' | 'zip' | 'browser';

export type FilenamePattern = 'original' | 'numbered' | 'prefix_numbered' | 'domain_original';

export interface DownloadSettings {
  mode: DownloadMode;
  targetFolder: string; // Subfolder path (e.g. "images" or "scraped_2026")
  filenamePattern: FilenamePattern;
  customPrefix: string;
  selectedDirectoryHandle: any | null; // FileSystemDirectoryHandle if available
  directoryName: string | null;
}

export type ViewMode = 'grid' | 'table';
