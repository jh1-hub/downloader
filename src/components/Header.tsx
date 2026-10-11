import React from 'react';
import { DownloadCloud, ExternalLink, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onOpenHelp: () => void;
  onScrollToSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHelp, onScrollToSettings }) => {
  return (
    <header className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <DownloadCloud className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-neutral-100 whitespace-nowrap">
            Web Image Extractor
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
          <a
            href="#extractor"
            className="hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0"
          >
            URL抽出
          </a>
          <a
            href="#extensions"
            className="hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0"
          >
            拡張子指定
          </a>
          <button
            type="button"
            onClick={onScrollToSettings}
            className="hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0 text-left"
          >
            保存先フォルダ設定
          </button>
          <a
            href="#gallery"
            className="hover:text-neutral-100 transition-colors whitespace-nowrap shrink-0"
          >
            画像ギャラリー
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenHelp}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800/80 hover:bg-neutral-800 hover:text-neutral-100 border border-neutral-700/60 rounded-lg transition-colors whitespace-nowrap"
          >
            <HelpCircle className="w-4 h-4 text-neutral-400" />
            <span>使い方ガイド</span>
          </button>
        </div>
      </div>
    </header>
  );
};
