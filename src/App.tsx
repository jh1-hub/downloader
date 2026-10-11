import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Download,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  LayoutGrid,
  List,
  ArrowUpDown,
  Search,
  HardDrive,
  FileCheck2,
  FolderOpen,
  Archive,
  AlertCircle,
  Sparkles,
  Info,
  FileCode,
  Smartphone,
  Link2,
} from 'lucide-react';
import {
  ScrapedImage,
  ScrapeResult,
  DownloadSettings,
  ViewMode,
  FilenamePattern,
} from './types';
import { Header } from './components/Header';
import { UrlInputBar, InputMode } from './components/UrlInputBar';
import { ExtensionSelector } from './components/ExtensionSelector';
import { DestinationConfig } from './components/DestinationConfig';
import { ImageCard } from './components/ImageCard';
import { ImageTableView } from './components/ImageTableView';
import { LightboxModal } from './components/LightboxModal';
import { DownloadProgressModal } from './components/DownloadProgressModal';
import { HelpModal } from './components/HelpModal';
import { MobileGuideModal } from './components/MobileGuideModal';
import {
  formatBytes,
  generateFilename,
  downloadSingleFile,
  downloadToDirectoryHandle,
  downloadAsZip,
  downloadSequentiallyInBrowser,
} from './utils/fileDownloader';
import {
  scrapeWebpageUniversal,
  parseHtmlClientSide,
  parseUrlsFromText,
} from './utils/clientScraper';
import {
  detectSequencePattern,
  generateSequenceUrls,
  isDirectImageUrl,
} from './utils/sequenceGenerator';

export default function App() {
  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [allowedExtensions, setAllowedExtensions] = useState<string[]>(['jpeg', 'jpg']);
  const [isMobileGuideOpen, setIsMobileGuideOpen] = useState(false);
  const [downloadSettings, setDownloadSettings] = useState<DownloadSettings>({
    mode: 'zip',
    targetFolder: 'images',
    filenamePattern: 'original',
    customPrefix: 'img',
    selectedDirectoryHandle: null,
    directoryName: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrapeInfo, setScrapeInfo] = useState<{
    pageTitle: string;
    finalUrl: string;
    totalFound: number;
    filteredCount: number;
  } | null>(null);

  const [images, setImages] = useState<ScrapedImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter & View State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [minSizeKb, setMinSizeKb] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'original' | 'size_desc' | 'size_asc' | 'name_asc'>('original');
  const [activeExtFilter, setActiveExtFilter] = useState<string>('all');

  // Modals
  const [previewImage, setPreviewImage] = useState<ScrapedImage | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Download Progress State
  const [downloadProgress, setDownloadProgress] = useState<{
    isOpen: boolean;
    current: number;
    total: number;
    currentFilename: string;
    isComplete: boolean;
    error: string | null;
    fallbackNote?: string | null;
  }>({
    isOpen: false,
    current: 0,
    total: 0,
    currentFilename: '',
    isComplete: false,
    error: null,
    fallbackNote: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const settingsSectionRef = useRef<HTMLDivElement | null>(null);

  const handleScrollToSettings = () => {
    const el = document.getElementById('destination-settings');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Support 1-tap Bookmarklet hash import payload: #import={"title":"...","url":"...","images":[...]}
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.includes('import=')) {
        const match = hash.match(/import=([^&]+)/);
        if (match) {
          const decoded = decodeURIComponent(match[1]);
          const payload = JSON.parse(decoded);
          if (payload && Array.isArray(payload.images) && payload.images.length > 0) {
            setUrl(payload.url || '');
            const importedList: ScrapedImage[] = [];
            payload.images.forEach((imgUrl: string, idx: number) => {
              const clean = imgUrl.split('#')[0];
              const ext = clean.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
              importedList.push({
                id: `img_imported_${idx}_${Math.random().toString(36).slice(2, 7)}`,
                url: clean,
                filename: `image_${idx + 1}.${ext}`,
                extension: ext,
                alt: '',
                sizeBytes: null,
                contentType: null,
                sourceTag: 'link',
              });
            });

            setImages(importedList);
            setScrapeInfo({
              pageTitle: payload.title || 'ブックマークレットからインポート',
              finalUrl: payload.url || window.location.href,
              totalFound: payload.images.length,
              filteredCount: importedList.length,
            });

            const allIds = new Set<string>();
            importedList.forEach((it) => allIds.add(it.id));
            setSelectedIds(allIds);

            // Clean the hash from the browser address bar
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to parse import hash payload:', err);
    }
  }, [allowedExtensions]);

  // Perform Scraping (Universal: URL, URL list or Direct HTML paste)
  const handleExtract = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let data: ScrapeResult;

      if (inputMode === 'urls') {
        if (!rawText.trim()) {
          setError('画像URLリストまたはテキストを入力してください');
          setIsLoading(false);
          return;
        }
        data = parseUrlsFromText(
          rawText,
          url.trim() || 'https://local-source.com',
          allowedExtensions
        );
      } else if (inputMode === 'html') {
        if (!rawText.trim()) {
          setError('解析するHTMLソースコードを入力してください');
          setIsLoading(false);
          return;
        }
        data = parseHtmlClientSide(
          rawText,
          url.trim() || 'https://local-source.com',
          allowedExtensions
        );
      } else {
        const trimmedUrl = url.trim();
        if (!trimmedUrl) {
          setError('WebページのURLまたは画像URLを入力してください');
          setIsLoading(false);
          return;
        }

        const seqPattern = detectSequencePattern(trimmedUrl);

        // 1. Explicit bracket range syntax like p[001-300].jpg or p{1-300}.jpg
        if (seqPattern?.explicitRange) {
          const generated = generateSequenceUrls(
            seqPattern.prefixUrl,
            seqPattern.explicitRange.start,
            seqPattern.explicitRange.end,
            seqPattern.explicitRange.pad,
            seqPattern.suffixUrl,
            1
          );
          handleApplySequenceUrls(generated);
          return;
        }

        // 2. Direct image URL with detected sequence (e.g. p001.jpg)
        if (isDirectImageUrl(trimmedUrl) && seqPattern?.detected) {
          // Auto-infer sequence up to 300 (or user-specified high range)
          const targetEnd = seqPattern.startNumber <= 1 ? 300 : Math.max(seqPattern.startNumber + 50, 300);
          const start = seqPattern.startNumber <= 1 ? 1 : 1;
          const generated = generateSequenceUrls(
            seqPattern.prefixUrl,
            start,
            targetEnd,
            seqPattern.padLength,
            seqPattern.suffixUrl,
            1
          );
          handleApplySequenceUrls(generated);
          return;
        }

        // 3. Single direct image URL without sequence
        if (isDirectImageUrl(trimmedUrl)) {
          data = parseUrlsFromText(trimmedUrl, trimmedUrl, allowedExtensions, true);
        } else {
          // Standard webpage scraping
          data = await scrapeWebpageUniversal(trimmedUrl, allowedExtensions);
        }
      }

      setImages(data.images || []);
      setScrapeInfo({
        pageTitle: data.pageTitle,
        finalUrl: data.finalUrl,
        totalFound: data.totalFound,
        filteredCount: data.filteredCount,
      });

      // By default select all images
      const initialSelected = new Set<string>();
      (data.images || []).forEach((img: ScrapedImage) => initialSelected.add(img.id));
      setSelectedIds(initialSelected);
      setActiveExtFilter('all');
    } catch (err: any) {
      console.warn('Scrape error:', err);
      setError(err.message || 'リンク取得中にエラーが発生しました');
      setImages([]);
      setScrapeInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sequential URL generation (e.g. p001.jpg -> p300.jpg)
  const handleApplySequenceUrls = (generatedUrls: string[]) => {
    if (generatedUrls.length === 0) return;
    setRawText(generatedUrls.join('\n'));
    setInputMode('urls');

    const firstUrl = generatedUrls[0];
    const firstExt = firstUrl.split('?')[0].split('.').pop()?.toLowerCase();
    if (firstExt && !allowedExtensions.includes(firstExt)) {
      setAllowedExtensions((prev) => [...prev, firstExt]);
    }

    const data = parseUrlsFromText(
      generatedUrls.join('\n'),
      firstUrl || url,
      allowedExtensions,
      true // bypass extension filter so none are dropped
    );

    const firstFilename = firstUrl.split('/').pop() || 'image_1';
    const lastFilename = generatedUrls[generatedUrls.length - 1].split('/').pop() || '';

    setImages(data.images || []);
    setScrapeInfo({
      pageTitle: `連番推察: ${firstFilename} 〜 ${lastFilename} (${data.images.length}枚)`,
      finalUrl: firstUrl || url,
      totalFound: data.totalFound,
      filteredCount: data.filteredCount,
    });

    const initialSelected = new Set<string>();
    (data.images || []).forEach((img: ScrapedImage) => initialSelected.add(img.id));
    setSelectedIds(initialSelected);
    setActiveExtFilter('all');
    setError(null);
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredImages.length) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      filteredImages.forEach((img) => next.add(img.id));
      setSelectedIds(next);
    }
  };

  const handleInvertSelection = () => {
    const next = new Set<string>();
    filteredImages.forEach((img) => {
      if (!selectedIds.has(img.id)) {
        next.add(img.id);
      }
    });
    setSelectedIds(next);
  };

  // Filtered & Sorted Images
  const filteredImages = useMemo(() => {
    let result = [...images];

    // Search query filter (filename or url)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (img) =>
          img.filename.toLowerCase().includes(q) ||
          img.url.toLowerCase().includes(q) ||
          (img.alt && img.alt.toLowerCase().includes(q))
      );
    }

    // Extension filter
    if (activeExtFilter !== 'all') {
      result = result.filter((img) => img.extension.toLowerCase() === activeExtFilter);
    }

    // Min size filter
    if (minSizeKb > 0) {
      const minBytes = minSizeKb * 1024;
      result = result.filter((img) => img.sizeBytes === null || img.sizeBytes >= minBytes);
    }

    // Sorting
    switch (sortBy) {
      case 'size_desc':
        result.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
        break;
      case 'size_asc':
        result.sort((a, b) => (a.sizeBytes || 0) - (b.sizeBytes || 0));
        break;
      case 'name_asc':
        result.sort((a, b) => a.filename.localeCompare(b.filename));
        break;
      case 'original':
      default:
        // maintain original scrape order
        break;
    }

    return result;
  }, [images, searchQuery, activeExtFilter, minSizeKb, sortBy]);

  // Selected Images subset
  const selectedImagesList = useMemo(() => {
    return filteredImages.filter((img) => selectedIds.has(img.id));
  }, [filteredImages, selectedIds]);

  const selectedTotalBytes = useMemo(() => {
    return selectedImagesList.reduce((acc, img) => acc + (img.sizeBytes || 0), 0);
  }, [selectedImagesList]);

  // Download Single Image
  const handleDownloadSingle = async (image: ScrapedImage) => {
    try {
      const filename = generateFilename(
        image,
        0,
        1,
        downloadSettings.filenamePattern,
        downloadSettings.customPrefix,
        scrapeInfo?.finalUrl || url
      );
      await downloadSingleFile(image, filename, scrapeInfo?.finalUrl || url);
    } catch (err: any) {
      alert(`ダウンロードエラー: ${err.message}`);
    }
  };

  // Bulk Download (Selected or All)
  const handleBulkDownload = async (targetItems: ScrapedImage[]) => {
    if (targetItems.length === 0) return;

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const itemsToDownload = targetItems.map((img, idx) => ({
      image: img,
      filename: generateFilename(
        img,
        idx,
        targetItems.length,
        downloadSettings.filenamePattern,
        downloadSettings.customPrefix,
        scrapeInfo?.finalUrl || url
      ),
    }));

    setDownloadProgress({
      isOpen: true,
      current: 0,
      total: itemsToDownload.length,
      currentFilename: itemsToDownload[0]?.filename || '',
      isComplete: false,
      error: null,
      fallbackNote: null,
    });

    const onProgress = (current: number, total: number, currentFilename: string) => {
      setDownloadProgress((prev) => ({
        ...prev,
        current,
        total,
        currentFilename,
      }));
    };

    let usedFallback = false;

    try {
      const referer = scrapeInfo?.finalUrl || url;

      if (downloadSettings.mode === 'filesystem' && downloadSettings.selectedDirectoryHandle) {
        try {
          await downloadToDirectoryHandle(
            downloadSettings.selectedDirectoryHandle,
            downloadSettings.targetFolder,
            itemsToDownload,
            referer,
            onProgress,
            signal
          );
        } catch (fsErr: any) {
          if (signal?.aborted) throw fsErr;
          console.warn('Folder save failed, automatically falling back to default download location:', fsErr);
          usedFallback = true;
          onProgress(0, itemsToDownload.length, 'デフォルトの保存場所（ダウンロードフォルダ）にZIPとして保存中...');

          const zipName = `${(scrapeInfo?.pageTitle || 'scraped_images')
            .slice(0, 30)
            .replace(/[^a-zA-Z0-9_\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]/g, '_')}_${Date.now()}.zip`;

          await downloadAsZip(
            downloadSettings.targetFolder,
            itemsToDownload,
            referer,
            zipName,
            onProgress,
            signal
          );
        }
      } else if (downloadSettings.mode === 'browser') {
        await downloadSequentiallyInBrowser(itemsToDownload, referer, onProgress, signal);
      } else {
        // Default download location (ZIP archive into Downloads folder)
        const zipName = `${(scrapeInfo?.pageTitle || 'scraped_images')
          .slice(0, 30)
          .replace(/[^a-zA-Z0-9_\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]/g, '_')}_${Date.now()}.zip`;

        await downloadAsZip(
          downloadSettings.targetFolder,
          itemsToDownload,
          referer,
          zipName,
          onProgress,
          signal
        );
      }

      setDownloadProgress((prev) => ({
        ...prev,
        isComplete: true,
        fallbackNote: usedFallback
          ? '指定フォルダへのアクセスが制限されていたため、デフォルトの保存場所（ダウンロードフォルダ）にZIPとして安全に保存しました。'
          : null,
      }));
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('キャンセル')) {
        setDownloadProgress((prev) => ({
          ...prev,
          error: 'ダウンロードがキャンセルされました',
        }));
      } else {
        setDownloadProgress((prev) => ({
          ...prev,
          error: err.message || 'ダウンロード中にエラーが発生しました',
        }));
      }
    }
  };

  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const destinationLabel = useMemo(() => {
    if (downloadSettings.mode === 'filesystem' && downloadSettings.directoryName) {
      return `📁 ${downloadSettings.directoryName}${downloadSettings.targetFolder ? ` / ${downloadSettings.targetFolder}` : ''}`;
    }
    if (downloadSettings.mode === 'zip') {
      return `📦 ZIPアーカイブ${downloadSettings.targetFolder ? ` (${downloadSettings.targetFolder}/)` : ''}`;
    }
    return '🌐 ブラウザ標準ダウンロード';
  }, [downloadSettings]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      <Header
        onOpenHelp={() => setIsHelpOpen(true)}
        onScrollToSettings={handleScrollToSettings}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Controls Grid: URL input, Extension Selector, Destination Config */}
        <section className="space-y-4">
          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100">
              Web画像リンク抽出 &amp; 一括ダウンローダー
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              WebページのURLから画像リンク（JPEG/JPG等）を自動抽出し、拡張子の自由変更やローカル保存先フォルダの指定で一括保存できます。
            </p>
          </div>

          <UrlInputBar
            url={url}
            setUrl={setUrl}
            rawText={rawText}
            setRawText={setRawText}
            inputMode={inputMode}
            setInputMode={setInputMode}
            isLoading={isLoading}
            onExtract={handleExtract}
            onOpenMobileGuide={() => setIsMobileGuideOpen(true)}
            onApplySequenceUrls={handleApplySequenceUrls}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ExtensionSelector
              allowedExtensions={allowedExtensions}
              setAllowedExtensions={setAllowedExtensions}
              onApplyAndRescrape={handleExtract}
              hasImagesExtracted={images.length > 0}
            />

            <DestinationConfig
              settings={downloadSettings}
              setSettings={setDownloadSettings}
            />
          </div>
        </section>

        {/* Error Notification with Smart Fallback CTA */}
        {error && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs space-y-2.5 animate-in fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-neutral-100">{error}</span>
                  {inputMode === 'url' && (
                    <p className="text-neutral-300 leading-relaxed">
                      💡 <strong>ヒント:</strong> 対象サイトが外部プロキシからのアクセスを拒否またはタイムアウトさせている可能性があります。お使いのブラウザで開けているページであれば、<strong>「HTML直接貼り付け」</strong>を利用すると、CORS制限を一切受けずに100%確実に全画像を取得できます。
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-neutral-400 hover:text-neutral-200 shrink-0"
              >
                閉じる
              </button>
            </div>

            {inputMode === 'url' && (
              <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('urls');
                    setError(null);
                  }}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>画像URL貼り付け (スマホ簡単)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('html');
                    setError(null);
                  }}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>HTMLソース貼り付け</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileGuideOpen(true)}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>スマホでの簡単抽出ガイド</span>
                </button>
                <button
                  type="button"
                  onClick={handleExtract}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 rounded-lg transition-colors"
                >
                  再試行
                </button>
              </div>
            )}
          </div>
        )}

        {/* Result Header & Controls Bar */}
        {scrapeInfo && (
          <section id="gallery" className="space-y-4 pt-2">
            {/* Page Info Kicker (Zero-Pill Discipline: unboxed clean text with · separators) */}
            <div className="p-4 bg-neutral-900/40 border border-neutral-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-neutral-100 truncate max-w-xl">
                  {scrapeInfo.pageTitle}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-400 tabular-nums">
                  <span>総検出: {scrapeInfo.totalFound} 枚</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span>対象拡張子一致: {scrapeInfo.filteredCount} 枚</span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <a
                    href={scrapeInfo.finalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-amber-400 hover:underline truncate max-w-xs"
                  >
                    {scrapeInfo.finalUrl}
                  </a>
                </div>
              </div>

              {/* Primary Batch Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleBulkDownload(selectedImagesList)}
                  disabled={selectedImagesList.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    選択した画像をダウンロード ({selectedImagesList.length}件 / {formatBytes(selectedTotalBytes)})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkDownload(filteredImages)}
                  disabled={filteredImages.length === 0}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-850 disabled:bg-neutral-900 disabled:text-neutral-600 rounded-xl border border-neutral-700 transition-colors"
                >
                  <span>すべて一括ダウンロード ({filteredImages.length}件)</span>
                </button>
              </div>
            </div>

            {/* Filter, Search & View Toolbar */}
            <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
              {/* Left: Selection toggles & Search */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 font-mono text-neutral-300">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 transition-colors"
                  >
                    {selectedIds.size === filteredImages.length ? '全解除' : '全選択'}
                  </button>
                  <button
                    type="button"
                    onClick={handleInvertSelection}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 transition-colors text-neutral-400 hover:text-neutral-200"
                  >
                    選択反転
                  </button>
                </div>

                <div className="relative min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ファイル名で検索..."
                    className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>
              </div>

              {/* Right: Extension tabs, Min Size, Sorting & View Toggle */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Extension Filter Segmented Control */}
                <div className="flex items-center gap-1 p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveExtFilter('all')}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      activeExtFilter === 'all'
                        ? 'bg-neutral-800 text-amber-300 font-medium'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    すべて ({images.length})
                  </button>
                  {allowedExtensions.map((ext) => {
                    const count = images.filter((i) => i.extension.toLowerCase() === ext).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={ext}
                        type="button"
                        onClick={() => setActiveExtFilter(ext)}
                        className={`px-2 py-1 rounded text-xs transition-colors uppercase ${
                          activeExtFilter === ext
                            ? 'bg-neutral-800 text-amber-300 font-medium'
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        .{ext} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Min size filter */}
                <select
                  value={minSizeKb}
                  onChange={(e) => setMinSizeKb(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 font-mono text-xs focus:outline-none"
                >
                  <option value={0}>サイズ制限なし</option>
                  <option value={10}>10 KB 以上 (アイコン除外)</option>
                  <option value={50}>50 KB 以上 (高画質のみ)</option>
                  <option value={200}>200 KB 以上</option>
                </select>

                {/* Sort Order */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 font-mono text-xs focus:outline-none"
                >
                  <option value="original">検出順</option>
                  <option value="size_desc">サイズ大 → 小</option>
                  <option value="size_asc">サイズ小 → 大</option>
                  <option value="name_asc">名前順 (A-Z)</option>
                </select>

                {/* View Switcher (Grid / Table) */}
                <div className="flex items-center gap-1 p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-neutral-800 text-amber-300'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title="グリッド表示"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'table'
                        ? 'bg-neutral-800 text-amber-300'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title="テーブル詳細表示"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Gallery Content */}
            {filteredImages.length === 0 ? (
              <div className="p-12 text-center border border-neutral-800 rounded-2xl bg-neutral-900/30 space-y-2">
                <Info className="w-8 h-8 mx-auto text-neutral-500" />
                <h4 className="text-sm font-medium text-neutral-300">
                  該当する画像が見つかりませんでした
                </h4>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  現在の拡張子フィルタ（{allowedExtensions.map((e) => `.${e}`).join(', ')}）やファイルサイズ設定に一致する画像がありません。上部の拡張子設定から他の拡張子を追加してみてください。
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredImages.map((image) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    isSelected={selectedIds.has(image.id)}
                    onToggleSelect={handleToggleSelect}
                    onPreview={setPreviewImage}
                    onDownloadSingle={handleDownloadSingle}
                    pageUrl={scrapeInfo.finalUrl}
                  />
                ))}
              </div>
            ) : (
              <ImageTableView
                images={filteredImages}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onToggleSelectAll={handleToggleSelectAll}
                onPreview={setPreviewImage}
                onDownloadSingle={handleDownloadSingle}
                pageUrl={scrapeInfo.finalUrl}
              />
            )}
          </section>
        )}

        {/* Empty Initial State / Introduction */}
        {!scrapeInfo && !isLoading && (
          <section className="py-12 px-6 text-center border border-neutral-850 rounded-2xl bg-neutral-900/20 max-w-2xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
              <Download className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-neutral-200">
                URLを入力して画像をスキャン
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
                上部の入力欄にWebページのURLを入力して「画像リンクを取得」を押してください。指定された拡張子の画像を自動抽出し、プレビュー一覧の表示と一括・選択ダウンロードが可能になります。
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setIsHelpOpen(true)}
                className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>詳しい使い方・保存先フォルダ設定ガイドを見る →</span>
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 mt-12 text-center text-xs text-neutral-600 font-mono">
        Web Image Extractor &amp; Bulk Downloader · Client-Side Directory Streaming &amp; ZIP Packaging
      </footer>

      {/* Lightbox Modal */}
      <LightboxModal
        image={previewImage}
        images={filteredImages}
        onClose={() => setPreviewImage(null)}
        onSelectImage={setPreviewImage}
        onDownloadSingle={handleDownloadSingle}
        pageUrl={scrapeInfo?.finalUrl || url}
      />

      {/* Download Progress Modal */}
      <DownloadProgressModal
        isOpen={downloadProgress.isOpen}
        current={downloadProgress.current}
        total={downloadProgress.total}
        currentFilename={downloadProgress.currentFilename}
        isComplete={downloadProgress.isComplete}
        error={downloadProgress.error}
        fallbackNote={downloadProgress.fallbackNote}
        onCancel={handleCancelDownload}
        onClose={() =>
          setDownloadProgress((prev) => ({ ...prev, isOpen: false }))
        }
        destinationLabel={destinationLabel}
      />

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Mobile Guide Modal */}
      <MobileGuideModal
        isOpen={isMobileGuideOpen}
        onClose={() => setIsMobileGuideOpen(false)}
        appUrl={window.location.href}
      />
    </div>
  );
}
