import React, { useState, useMemo } from 'react';
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
  ListOrdered,
} from 'lucide-react';
import { SequentialUrlGenerator } from './SequentialUrlGenerator';
import { detectSequencePattern, generateSequenceUrls } from '../utils/sequenceGenerator';

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
  onApplySequenceUrls?: (urls: string[]) => void;
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
    label: '連番サンプル (p001.jpg → p300.jpg)',
    url: 'https://example.com/gallery/p001.jpg',
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
  onApplySequenceUrls,
}) => {
  const [showSequenceGenerator, setShowSequenceGenerator] = useState(false);

  // Check if current URL or pasted text has a sequential pattern like p001.jpg
  const detectedPattern = useMemo(() => {
    const candidate = inputMode === 'url' ? url.trim() : rawText.trim().split('\n')[0];
    if (!candidate) return null;
    return detectSequencePattern(candidate);
  }, [url, rawText, inputMode]);

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

  const handleSequenceApplied = (generatedUrls: string[]) => {
    setRawText(generatedUrls.join('\n'));
    setInputMode('urls');
    setShowSequenceGenerator(false);
    if (onApplySequenceUrls) {
      onApplySequenceUrls(generatedUrls);
    } else {
      setTimeout(() => onExtract(), 50);
    }
  };

  return (
    <div id="extractor" className="space-y-3">
      {/* Input Mode Tabs & Smartphone / Sequence Quick Helpers */}
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

        {/* Right Action Buttons: Sequence generator & Smartphone Helper */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowSequenceGenerator(!showSequenceGenerator)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              showSequenceGenerator
                ? 'bg-amber-500 text-neutral-950 border-amber-400 font-semibold shadow-sm'
                : 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>連番URL生成 (p001→p300等)</span>
          </button>

          <button
            type="button"
            onClick={onOpenMobileGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 rounded-lg transition-colors whitespace-nowrap"
          >
            <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
            <span>スマホガイド</span>
          </button>
        </div>
      </div>

      {/* Pattern Detected Prompt banner */}
      {detectedPattern && !showSequenceGenerator && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-neutral-100 flex flex-wrap items-center gap-2">
                <span>連番ファイル名パターンを検出しました</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  {detectedPattern.filenameOnly || `${detectedPattern.numberStr}${detectedPattern.suffixUrl}`}
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 font-mono truncate mt-0.5">
                推察: {detectedPattern.prefixUrl.split('/').pop() || detectedPattern.prefixUrl}
                <span className="text-amber-400 font-bold">[{detectedPattern.numberStr}]</span>
                {detectedPattern.suffixUrl}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                const targetEnd = detectedPattern.explicitRange?.end || 300;
                const start = detectedPattern.explicitRange?.start || (detectedPattern.startNumber <= 1 ? 1 : 1);
                const generated = generateSequenceUrls(
                  detectedPattern.prefixUrl,
                  start,
                  targetEnd,
                  detectedPattern.padLength,
                  detectedPattern.suffixUrl,
                  1
                );
                handleSequenceApplied(generated);
              }}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>1 〜 300まで即座に生成</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSequenceGenerator(true)}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs rounded-xl transition-colors whitespace-nowrap border border-neutral-700"
            >
              詳細設定 →
            </button>
          </div>
        </div>
      )}

      {/* Sequential Generator Tool Accordion */}
      {showSequenceGenerator && (
        <SequentialUrlGenerator
          currentText={inputMode === 'url' ? url : rawText}
          onApplyUrls={handleSequenceApplied}
          onClose={() => setShowSequenceGenerator(false)}
        />
      )}

      {/* Mode 1: URL input */}
      {inputMode === 'url' && (
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
                placeholder="WebページのURLを入力 (例: https://example.com/gallery または p001.jpg)"
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

      {/* Mode 2: Image URLs / Text batch paste (Mobile-friendly) */}
      {inputMode === 'urls' && (
        <div className="space-y-3 p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-neutral-300 font-medium">
            <div className="flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-amber-400" />
              <span>画像URLリストまたはテキストを貼り付け:</span>
            </div>
            <span className="text-neutral-500 font-normal">
              ※ 連番URLの自動生成や、スマホでコピーしたURLをそのまま貼り付けて一括抽出できます
            </span>
          </div>

          <div className="relative rounded-xl border border-neutral-800 bg-neutral-950/80 focus-within:border-amber-500/60 transition-all">
            <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/80 text-xs text-neutral-400 bg-neutral-900/40 rounded-t-xl">
              <span>画像URLリスト（改行区切り）</span>
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
              placeholder="https://example.com/gallery/p001.jpg&#10;https://example.com/gallery/p002.jpg&#10;（URLを1つ入力して「連番URL生成」を押すと、p300.jpgまで自動展開できます）"
              rows={5}
              className="w-full p-3 bg-transparent text-xs text-neutral-200 placeholder:text-neutral-600 font-mono focus:outline-none resize-y"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowSequenceGenerator(true)}
              className="text-xs text-amber-300 hover:underline flex items-center gap-1"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>連番URL生成ツールを開く (p001 → p300)</span>
            </button>

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

      {/* Mode 3: Direct HTML paste */}
      {inputMode === 'html' && (
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
            onDrop={handleDropFile}
            className="relative rounded-xl border border-neutral-800 bg-neutral-950/80 focus-within:border-amber-500/60 transition-all"
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
