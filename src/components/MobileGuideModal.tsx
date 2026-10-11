import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Link2,
  FileCode,
  ArrowRight,
} from 'lucide-react';
import { generateBookmarkletCode } from '../utils/clientScraper';

interface MobileGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl: string;
}

export const MobileGuideModal: React.FC<MobileGuideModalProps> = ({
  isOpen,
  onClose,
  appUrl,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const bookmarkletCode = generateBookmarkletCode(appUrl || window.location.href);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-neutral-100">
                スマホ（iPhone / Android）での簡単な抽出方法
              </h2>
              <p className="text-xs text-neutral-400">
                HTMLソースをコピーできないスマホ環境向けの3つの解決策
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-neutral-300">
          {/* Method 1: The Bookmarklet (Best solution for mobile) */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 text-sm flex items-center gap-2">
                <Bookmark className="w-4 h-4" />
                方法1: 1タップ抽出ブックマーク（最速・おすすめ）
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                一番かんたん
              </span>
            </div>

            <p className="text-neutral-300 leading-relaxed">
              ブラウザに一度ブックマークを登録するだけで、<strong>閲覧中のどんなページでも、ブックマークをタップするだけで全画像がこのダウンローダーに自動転送</strong>されます！HTMLをコピーする手間は一切不要です。
            </p>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>登録用ブックマークレットコード:</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded text-xs transition-colors flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'コピーしました！' : 'コードをコピー'}</span>
                </button>
              </div>
              <textarea
                readOnly
                value={bookmarkletCode}
                rows={2}
                className="w-full p-2 bg-neutral-900 border border-neutral-800 rounded font-mono text-[10px] text-neutral-400 select-all"
              />
            </div>

            {/* Step by step for iOS/Android */}
            <div className="p-3 bg-neutral-950/80 rounded-lg space-y-1.5 text-[11px] text-neutral-400 border border-neutral-800/80">
              <strong className="text-neutral-200">登録手順（30秒）:</strong>
              <ol className="list-decimal pl-4 space-y-1 text-neutral-300">
                <li>このページをSafariまたはChromeで「ブックマークに追加」します。</li>
                <li>ブックマークの編集画面を開き、名前を「📸 画像抽出」等に変更します。</li>
                <li>URL欄の内容を消し、上の「コードをコピー」でコピーした内容を貼り付け保存します。</li>
                <li><strong>使い方:</strong> 画像を保存したいWebページを開き、ブックマークから「📸 画像抽出」をタップするだけで、このダウンローダーに全画像が即座に読み込まれます！</li>
              </ol>
            </div>
          </div>

          {/* Method 2: Image URL / Text batch paste */}
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-2">
            <span className="font-bold text-neutral-100 text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4 text-amber-400" />
              方法2: 「画像URL一覧を貼り付け」タブを利用
            </span>
            <p className="text-neutral-400 leading-relaxed">
              スマホで画像を長押しして「リンクをコピー」したURLや、SNS・メモ等にある画像リンクテキストをまとめて貼り付けるだけで、含まれるすべての画像リンク（.jpg, .png等）を自動抽出できます。
            </p>
          </div>

          {/* Method 3: Android Chrome view-source trick */}
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-2">
            <span className="font-bold text-neutral-100 text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4 text-neutral-400" />
              方法3: Android Chromeの「view-source:」
            </span>
            <p className="text-neutral-400 leading-relaxed">
              AndroidのChromeでは、URLの先頭に <code>view-source:https://...</code> と入力して開くことでソースコードが表示されます。一部のコードをコピーして貼り付ける場合にも活用できます。
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
