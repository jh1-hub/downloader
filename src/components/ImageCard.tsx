import React, { useState } from 'react';
import {
  Download,
  ExternalLink,
  Copy,
  Check,
  Maximize2,
  Image as ImageIcon,
  CheckSquare,
  Square,
} from 'lucide-react';
import { ScrapedImage } from '../types';
import { formatBytes, getProxyImageUrl } from '../utils/fileDownloader';

interface ImageCardProps {
  image: ScrapedImage;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onPreview: (image: ScrapedImage) => void;
  onDownloadSingle: (image: ScrapedImage) => void;
  pageUrl: string;
}

export const ImageCard: React.FC<ImageCardProps> = ({
  image,
  isSelected,
  onToggleSelect,
  onPreview,
  onDownloadSingle,
  pageUrl,
}) => {
  const [currentSrc, setCurrentSrc] = useState(getProxyImageUrl(image.url, pageUrl));
  const [triedDirect, setTriedDirect] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleImgError = () => {
    if (!triedDirect) {
      setTriedDirect(true);
      setCurrentSrc(image.url); // Direct fallback for static GitHub Pages
    } else {
      setHasError(true);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(image.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDownloadSingle(image);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect(image.id);
  };

  return (
    <div
      onClick={() => onToggleSelect(image.id)}
      className={`group relative bg-neutral-900 border rounded-xl overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'border-amber-500/80 shadow-[0_0_0_1px_rgba(245,158,11,0.5)] bg-neutral-900/90'
          : 'border-neutral-800 hover:border-neutral-700/80 hover:bg-neutral-850'
      }`}
    >
      {/* Top Bar Overlay on Hover / Active */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
        <button
          type="button"
          onClick={handleToggle}
          className="p-1 rounded-md bg-neutral-950/80 backdrop-blur-sm text-neutral-300 hover:text-white pointer-events-auto transition-colors"
          title={isSelected ? '選択解除' : '選択'}
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-amber-400" />
          ) : (
            <Square className="w-4 h-4 text-neutral-400" />
          )}
        </button>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(image);
            }}
            className="p-1.5 rounded-md bg-neutral-950/80 backdrop-blur-sm text-neutral-300 hover:text-white transition-colors"
            title="拡大プレビュー"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-md bg-neutral-950/80 backdrop-blur-sm text-neutral-300 hover:text-white transition-colors"
            title="URLをコピー"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <a
            href={image.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md bg-neutral-950/80 backdrop-blur-sm text-neutral-300 hover:text-white transition-colors"
            title="別タブで元リンクを開く"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Image Preview Area */}
      <div className="relative aspect-4/3 w-full bg-neutral-950 flex items-center justify-center overflow-hidden">
        {!hasError ? (
          <img
            src={currentSrc}
            alt={image.alt || image.filename}
            onError={handleImgError}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-contain p-1 transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-neutral-600 gap-1.5 text-center">
            <ImageIcon className="w-8 h-8 stroke-[1.5]" />
            <span className="text-[11px] font-mono text-neutral-500 truncate max-w-full">
              .{image.extension.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Card Info Details */}
      <div className="p-3 border-t border-neutral-800/80 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4
            className="text-xs font-mono font-medium text-neutral-200 truncate flex-1"
            title={image.filename}
          >
            {image.filename}
          </h4>
          <button
            type="button"
            onClick={handleDownload}
            className="p-1 text-neutral-400 hover:text-amber-400 transition-colors shrink-0"
            title="この画像をダウンロード"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clean Unboxed Metadata with · separator */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400 tabular-nums">
          <span className="uppercase text-amber-400/90 font-medium">.{image.extension}</span>
          <span aria-hidden="true" className="text-neutral-600">·</span>
          <span>{formatBytes(image.sizeBytes)}</span>
          {image.width && image.height && (
            <>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>{image.width}×{image.height}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
