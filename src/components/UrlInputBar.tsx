import React, { useState } from 'react';
import {
  Globe,
  FileCode,
  Link2,
  Clipboard,
  X,
  Search,
  Loader2,
  Sparkles,
  Smartphone,
  Info,
} from 'lucide-react';

export type InputMode = 'url' | 'urls' | 'html';

interface UrlInputBarProps {
  url: string;
  setUrl: (url: string) => void;
  rawText: string;
  setRawText: (text: string) => void;
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  isLoading: boolean;
  onExtract: () => void;
  onOpenMobileGuide: () => void;
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
  rawText,
  setRawText,
  inputMode,
  setInputMode,
  isLoading,
  onExtract,
  onOpenMobileGuide,
}) => {
  const [dragOver, setDragOver] = useState(false);

  const handlePasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      // ignore
    }
  };

  const handlePasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setRawText(text);
    } catch {
      // ignore
    }
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) setRawText(content);
      };
      reader.readAsText(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && url.trim()) {
      onExtract();
    }
  };

  return (
    <div id="extractor" className="space-y-3">
      {/* Input Mode Tabs & Smartphone Quick Helper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setInputMode('url')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
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
            onClick={() => setInputMode('urls')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              inputMode === 'urls'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-amber-400" />
            <span>画像URL貼付 (スマホ推奨)</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('html')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              inputMode === 'html'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-amber-400" />
            <span>HTMLソース貼付</span>
          </button>
        </div>

        {/* Smartphone Helper Button */}
        <button
          type="button"
          onClick={onOpenMobileGuide}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>スマホでの簡単な抽出方法</span>
        </button>
      </div>

      {inputMode === 'url' && (
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
      )}

      {inputMode === 'urls' && (
        /* Mode 2: Image URLs / Text batch paste (Mobile-friendly) */
        <div className="space-y-3 p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-neutral-300 font-medium">
            <div className="flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-amber-400" />
              <span>画像URLリストまたはテキストを貼り付け:</span>
            </div>
            <span className="text-neutral-500 font-normal">
              ※ 画像リンク（.jpg, .png等）が含まれる文章をそのまま貼り付けても自動抽出されます
            </span>
          </div>

          <div className="relative rounded-xl border border-neutral-800 bg-neutral-950/80 focus-within:border-amber-500/60 transition-all">
            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/80 text-xs text-neutral-400 bg-neutral-900/40 rounded-t-xl">
              <span>画像URL（複数行・改行区切り可、またはURLを含むテキスト）</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteText}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>貼り付け</span>
                </button>
                {rawText && (
                  <button
                    type="button"
                    onClick={() => setRawText('')}
                    className="hover:text-red-300 transition-colors flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>クリア</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.png&#10;（スマホで画像を長押ししてコピーしたURLや、メモ・テキストをここに貼り付けてください）"
              rows={5}
              className="w-full p-3 bg-transparent text-xs text-neutral-200 placeholder:text-neutral-600 font-mono focus:outline-none resize-y"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onExtract}
              disabled={isLoading || !rawText.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm rounded-xl transition-all shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>解析中...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>貼り付けたURLから画像を抽出</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {inputMode === 'html' && (
        /* Mode 3: Direct HTML paste (PC-friendly) */
        <div className="space-y-3 p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
              <FileCode className="w-4 h-4 text-amber-400" />
              <span>ページの基準URL (相対リンクの解決用・任意):</span>
            </div>
            <span className="text-neutral-500">
              ※ 画像URLが &quot;/img/photo.jpg&quot; 等の場合に完全なURLに復元します
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
              <span>HTMLソースコードを貼り付け、または .html ファイルをドロップ</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteText}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>貼り付け</span>
                </button>
                {rawText && (
                  <button
                    type="button"
                    onClick={() => setRawText('')}
                    className="hover:text-red-300 transition-colors flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>クリア</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="ページのソースコード (Ctrl+U) をここに貼り付けてください..."
              rows={6}
              className="w-full p-3 bg-transparent text-xs text-neutral-200 placeholder:text-neutral-600 font-mono focus:outline-none resize-y"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onExtract}
              disabled={isLoading || !rawText.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed text-neutral-950 font-semibold text-sm rounded-xl transition-all shadow-sm"
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
