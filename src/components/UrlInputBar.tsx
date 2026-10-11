import React, { useState } from 'react';
import { Globe, Clipboard, X, Search, Loader2, Sparkles } from 'lucide-react';

interface UrlInputBarProps {
  url: string;
  setUrl: (url: string) => void;
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
  isLoading,
  onExtract,
}) => {
  const [copiedNotification, setCopiedNotification] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch {
      // Clipboard access not allowed or unavailable
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && url.trim()) {
      onExtract();
    }
  };

  return (
    <div id="extractor" className="space-y-3">
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
              onClick={handlePaste}
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

      {/* Sample Links Bar */}
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
    </div>
  );
};
