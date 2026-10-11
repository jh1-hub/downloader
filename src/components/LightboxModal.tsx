import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  ExternalLink,
  Info,
} from 'lucide-react';
import { ScrapedImage } from '../types';
import { formatBytes, getProxyImageUrl } from '../utils/fileDownloader';

interface LightboxModalProps {
  image: ScrapedImage | null;
  images: ScrapedImage[];
  onClose: () => void;
  onSelectImage: (img: ScrapedImage) => void;
  onDownloadSingle: (img: ScrapedImage) => void;
  pageUrl: string;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  image,
  images,
  onClose,
  onSelectImage,
  onDownloadSingle,
  pageUrl,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!image) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, images]);

  if (!image) return null;

  const currentIndex = images.findIndex((img) => img.id === image.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handlePrev = () => {
    if (hasPrev) onSelectImage(images[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onSelectImage(images[currentIndex + 1]);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(image.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const proxySrc = getProxyImageUrl(image.url, pageUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[92vh] flex flex-col bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center gap-2 truncate pr-4">
            <span className="text-xs font-mono font-semibold uppercase text-amber-400">
              .{image.extension}
            </span>
            <span className="text-neutral-600">/</span>
            <span className="text-xs font-mono text-neutral-200 truncate" title={image.filename}>
              {image.filename}
            </span>
            <span className="text-neutral-500 text-xs font-mono">
              ({currentIndex + 1} / {images.length})
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>URLコピー</span>
            </button>
            <button
              type="button"
              onClick={() => onDownloadSingle(image)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ダウンロード</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Image Display */}
        <div className="relative flex-1 min-h-[300px] max-h-[70vh] bg-black/60 flex items-center justify-center p-4 overflow-hidden select-none">
          <img
            src={proxySrc}
            alt={image.filename}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[66vh] object-contain rounded"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== image.url) {
                target.src = image.url;
              }
            }}
          />

          {/* Navigation Arrows */}
          {hasPrev && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700/60 shadow-lg transition-all"
              title="前の画像 (←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {hasNext && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700/60 shadow-lg transition-all"
              title="次の画像 (→)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Footer / Metadata details */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-900/50 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-3">
            <span>サイズ: <strong className="text-neutral-200">{formatBytes(image.sizeBytes)}</strong></span>
            <span className="text-neutral-700">·</span>
            <span>解像度: <strong className="text-neutral-200">{image.width && image.height ? `${image.width}×${image.height}` : '自動'}</strong></span>
            <span className="text-neutral-700">·</span>
            <span>取得元タグ: <strong className="text-neutral-200">&lt;{image.sourceTag}&gt;</strong></span>
          </div>

          <div className="flex items-center gap-2 max-w-md truncate">
            <span className="text-neutral-500 shrink-0">URL:</span>
            <a
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-amber-400 hover:underline flex items-center gap-1"
            >
              <span className="truncate">{image.url}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
