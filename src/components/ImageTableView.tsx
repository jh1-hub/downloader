import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Maximize2,
  ExternalLink,
  ArrowUpDown,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';
import { ScrapedImage } from '../types';
import { formatBytes, getProxyImageUrl } from '../utils/fileDownloader';

interface ImageTableViewProps {
  images: ScrapedImage[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onPreview: (image: ScrapedImage) => void;
  onDownloadSingle: (image: ScrapedImage) => void;
  pageUrl: string;
}

export const ImageTableView: React.FC<ImageTableViewProps> = ({
  images,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onPreview,
  onDownloadSingle,
  pageUrl,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isAllSelected = images.length > 0 && selectedIds.size === images.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < images.length;

  const handleCopy = async (id: string, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="overflow-x-auto border border-neutral-800 rounded-xl bg-neutral-900/40">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-neutral-900 text-neutral-400 font-medium border-b border-neutral-800">
          <tr>
            <th className="py-3 px-3 w-10 text-center">
              <button
                type="button"
                onClick={onToggleSelectAll}
                className="text-neutral-400 hover:text-white transition-colors"
                title={isAllSelected ? '全選択解除' : '全選択'}
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                ) : isIndeterminate ? (
                  <MinusSquare className="w-4 h-4 text-amber-400" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-500" />
                )}
              </button>
            </th>
            <th className="py-3 px-2 w-14 text-center">プレビュー</th>
            <th className="py-3 px-3">ファイル名</th>
            <th className="py-3 px-3 w-20">拡張子</th>
            <th className="py-3 px-3 w-24 text-right">ファイルサイズ</th>
            <th className="py-3 px-3 w-24 text-center">解像度</th>
            <th className="py-3 px-3 w-20 text-center">取得元</th>
            <th className="py-3 px-4 w-28 text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/80 font-mono">
          {images.map((image) => {
            const isSelected = selectedIds.has(image.id);
            const proxySrc = getProxyImageUrl(image.url, pageUrl);

            return (
              <tr
                key={image.id}
                onClick={() => onToggleSelect(image.id)}
                className={`transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/5 hover:bg-amber-500/10'
                    : 'hover:bg-neutral-800/50'
                }`}
              >
                {/* Checkbox */}
                <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onToggleSelect(image.id)}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4 text-neutral-600" />
                    )}
                  </button>
                </td>

                {/* Thumbnail */}
                <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <div
                    onClick={() => onPreview(image)}
                    className="w-10 h-10 rounded bg-neutral-950 border border-neutral-800 overflow-hidden mx-auto flex items-center justify-center cursor-pointer hover:border-amber-400 transition-colors"
                    title="クリックして拡大"
                  >
                    <img
                      src={proxySrc}
                      alt={image.filename}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== image.url) {
                          target.src = image.url;
                        } else {
                          target.style.display = 'none';
                        }
                      }}
                    />
                  </div>
                </td>

                {/* Filename */}
                <td className="py-2.5 px-3 max-w-xs">
                  <div className="truncate text-neutral-200 font-medium" title={image.filename}>
                    {image.filename}
                  </div>
                  <div className="truncate text-[10px] text-neutral-500" title={image.url}>
                    {image.url}
                  </div>
                </td>

                {/* Extension */}
                <td className="py-2.5 px-3">
                  <span className="text-amber-400 uppercase font-semibold">
                    .{image.extension}
                  </span>
                </td>

                {/* Size */}
                <td className="py-2.5 px-3 text-right tabular-nums text-neutral-300">
                  {formatBytes(image.sizeBytes)}
                </td>

                {/* Dimensions */}
                <td className="py-2.5 px-3 text-center tabular-nums text-neutral-400 text-[11px]">
                  {image.width && image.height ? `${image.width}×${image.height}` : '—'}
                </td>

                {/* Source Tag */}
                <td className="py-2.5 px-3 text-center text-neutral-500 text-[11px]">
                  &lt;{image.sourceTag}&gt;
                </td>

                {/* Actions */}
                <td
                  className="py-2.5 px-4 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onPreview(image)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
                      title="プレビュー"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCopy(image.id, image.url, e)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
                      title="URLをコピー"
                    >
                      {copiedId === image.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded transition-colors"
                      title="元リンクを開く"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onDownloadSingle(image)}
                      className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-neutral-800 rounded transition-colors"
                      title="ダウンロード"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
