import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, X, DownloadCloud, Info } from 'lucide-react';

interface DownloadProgressModalProps {
  isOpen: boolean;
  current: number;
  total: number;
  currentFilename: string;
  isComplete: boolean;
  error: string | null;
  fallbackNote?: string | null;
  onCancel: () => void;
  onClose: () => void;
  destinationLabel: string;
}

export const DownloadProgressModal: React.FC<DownloadProgressModalProps> = ({
  isOpen,
  current,
  total,
  currentFilename,
  isComplete,
  error,
  fallbackNote,
  onCancel,
  onClose,
  destinationLabel,
}) => {
  if (!isOpen) return null;

  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : error ? (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              ) : (
                <DownloadCloud className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">
                {isComplete
                  ? 'ダウンロード完了'
                  : error
                  ? 'ダウンロード中断'
                  : '画像をダウンロード中'}
              </h3>
              <p className="text-xs text-neutral-400 truncate max-w-[260px]">
                保存先: {destinationLabel}
              </p>
            </div>
          </div>

          {(isComplete || error) && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-300 tabular-nums">
            <span>進捗:</span>
            <span>
              {current} / {total} 件 ({percentage}%)
            </span>
          </div>

          <div className="h-2.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
            <div
              className={`h-full transition-all duration-200 ${
                isComplete
                  ? 'bg-emerald-500'
                  : error
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-amber-500 to-amber-400'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="text-xs font-mono text-neutral-400 truncate">
            {isComplete
              ? 'すべての画像が正常に保存されました。'
              : error
              ? `エラー: ${error}`
              : `処理中: ${currentFilename || '準備中...'}`}
          </p>
        </div>

        {/* Fallback Notice if specific folder failed */}
        {fallbackNote && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{fallbackNote}</span>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-neutral-900">
          {!isComplete && !error ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors"
            >
              キャンセル
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors"
            >
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
