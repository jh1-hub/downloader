import React, { useState } from 'react';
import {
  Globe,
  FileCode,
  Clipboard,
  X,
  Search,
  Loader2,
  Sparkles,
  Upload,
  BookOpen,
  Check,
} from 'lucide-react';

export type InputMode = 'url' | 'html';

interface UrlInputBarProps {
  url: string;
  setUrl: (url: string) => void;
  rawHtml: string;
  setRawHtml: (html: string) => void;
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  isLoading: boolean;
  onExtract: () => void;
}

const SAMPLE_URLS = [
  {
    label: 'Wikipedia: 富士山 (Wikimedia)',
    url: 'https://ja.wikipedia.org/wiki/%E5%AF%8C%E5%A3%AB%E5%B1%B1',
  },
  {
    label: 'NASA Astronomy (APOD)',
    url: 'https://apod.nasa.gov/apod/archivepix.html',
  },
  {
    label: 'Wikimedia: Featured pictures',
    url: 'https://commons.wikimedia.org/wiki/Commons:Featured_pictures',
  },
];

export const UrlInputBar: React.FC<UrlInputBarProps> = ({
  url,
  setUrl,
  rawHtml,
  setRawHtml,
  inputMode,
  setInputMode,
  isLoading,
  onExtract,
}) => {
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handlePasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      // ignore
    }
  };

  const handlePasteHtml = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setRawHtml(text);
    } catch {
      // ignore
    }
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.html') || file.name.endsWith('.htm') || file.type.includes('html'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) setRawHtml(content);
      };
      reader.readAsText(file);
    }
  };

  const handleCopyBookmarklet = async () => {
    // A lightweight bookmarklet that copies document.documentElement.outerHTML to clipboard
    const code = `javascript:(function(){try{navigator.clipboard.writeText(document.documentElement.outerHTML).then(function(){alert('HTMLソースをクリップボードにコピーしました！ダウンローダーの「HTML直接貼り付け」に貼り付けてください。');});}catch(e){var t=document.createElement('textarea');t.value=document.documentElement.outerHTML;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);alert('HTMLソースをコピーしました！');}})();`;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedBookmarklet(true);
      setTimeout(() => setCopiedBookmarklet(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && url.trim()) {
      onExtract();
    }
  };

  return (
    <div id="extractor" className="space-y-3">
      {/* Input Mode Selector Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
          <button
            type="button"
            onClick={() => setInputMode('url')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              inputMode === 'url'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>URLから自動取得</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('html')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              inputMode === 'html'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>HTML直接貼り付け (確実・CORS制限なし)</span>
          </button>
        </div>

        {/* Bookmarklet Quick Helper */}
        <button
          type="button"
          onClick={handleCopyBookmarklet}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-amber-300 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 rounded-lg transition-colors font-mono"
          title="ブックマークバーに登録すると、閲覧中ページのHTMLを1クリックでコピーできます"
        >
          {copiedBookmarklet ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{copiedBookmarklet ? 'ブックマークレットをコピー完了！' : 'HTML一括コピー用ブックマークレット'}</span>
        </button>
      </div>

      {inputMode === 'url' ? (
        /* Mode 1: URL input */
        <>
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-amber-400 transition-colors">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="WebページのURLを入力 (例: https://example.com/gallery)"
                className="w-full pl-10 pr-20 py-2.5 bg-neutral-900 border border-neutral-700/80 rounded-xl text-neutral-100 placeholder:text-neutral-500 text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono"
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors rounded"
                    title="URLをクリア"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePasteUrl}
                  className="p-1 text-neutral-400 hover:text-amber-400 transition-colors rounded"
                  title="クリップボードから貼り付け"
                >
                  <Clipboard className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={onExtract}
              disabled={isLoading || !url.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm rounded-xl transition-all shadow-sm shrink-0 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>解析中...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>画像リンクを取得</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Samples */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span className="flex items-center gap-1 text-neutral-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>クイック試用:</span>
            </span>
            {SAMPLE_URLS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => setUrl(sample.url)}
                className="text-neutral-400 hover:text-amber-300 hover:underline transition-colors decoration-neutral-600"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        /* Mode 2: Direct HTML paste */
        <div className="space-y-3 p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
              <FileCode className="w-4 h-4 text-amber-400" />
              <span>ページの基準URL (相対リンクの解決用・任意):</span>
            </div>
            <span className="text-neutral-500">
              ※ 画像URLが &quot;/img/photo.jpg&quot; 等の場合に完全なURLに変換するために使用します
            </span>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="対象ページのURL (例: https://example.com/gallery)"
              className="w-full pl-9 pr-10 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder:text-neutral-500 font-mono focus:outline-none focus:border-amber-500/60"
            />
            {url && (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* HTML Textarea & Drop area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDropFile}
            className={`relative rounded-xl border transition-all ${
              dragOver
                ? 'border-amber-500 bg-amber-500/5'
                : 'border-neutral-800 bg-neutral-950/80 focus-within:border-amber-500/60'
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/80 text-xs text-neutral-400 bg-neutral-900/40 rounded-t-xl">
              <span>HTMLソースコードを貼り付け、または .html ファイルをドラッグ＆ドロップ</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteHtml}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>貼り付け</span>
                </button>
                {rawHtml && (
                  <button
                    type="button"
                    onClick={() => setRawHtml('')}
                    className="hover:text-red-300 transition-colors flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>クリア</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={rawHtml}
              onChange={(e) => setRawHtml(e.target.value)}
              placeholder="ブラウザでページを開き、[Ctrl+U]（ページのソースを表示）で全選択コピーしたHTMLをここに貼り付けてください..."
              rows={6}
              className="w-full p-3 bg-transparent text-xs text-neutral-200 placeholder:text-neutral-600 font-mono focus:outline-none resize-y"
            />
          </div>

          {/* Instructions and Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-neutral-400 space-y-0.5">
              <p>💡 <strong>HTML取得方法:</strong></p>
              <p>1. 対象ページを通常ブラウザで開く</p>
              <p>2. 右クリック → 「ページのソースを表示（Ctrl+U）」</p>
              <p>3. 全て選択（Ctrl+A）→ コピー（Ctrl+C）して上記に貼り付け</p>
            </div>

            <button
              type="button"
              onClick={onExtract}
              disabled={isLoading || !rawHtml.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm rounded-xl transition-all shadow-sm shrink-0 whitespace-nowrap self-end sm:self-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>解析中...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>貼り付けたHTMLから画像を抽出</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
