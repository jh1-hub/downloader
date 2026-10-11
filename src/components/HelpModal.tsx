import React from 'react';
import { X, CheckCircle, FolderOpen, SlidersHorizontal, Download, Globe } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-400" />
            Web画像ダウンローダーの使い方
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-neutral-300 leading-relaxed">
          <div className="p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2">
            <div className="font-semibold text-neutral-100 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-xs">
                1
              </span>
              URLを入力して画像リンクを抽出
            </div>
            <p className="text-neutral-400">
              抽出したいWebサイトのURLを入力し、「画像リンクを取得」をクリックします。サーバー側でHTMLを解析し、&lt;img&gt;、&lt;picture&gt;、&lt;a&gt;リンク、OpenGraphメタタグ、CSS背景画像からすべての対象画像を高速検出します。
            </p>
          </div>

          <div className="p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2">
            <div className="font-semibold text-neutral-100 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-xs">
                2
              </span>
              対象拡張子の自由な変更 (拡張子は変更できる)
            </div>
            <p className="text-neutral-400">
              デフォルトでは <span className="font-mono text-amber-300">.jpg / .jpeg</span> が対象です。上部の「対象拡張子の設定」から、PNG、WebP、GIF、SVG、AVIFなどのプリセット追加や、任意の拡張子（例: webp, ico など）を入力して自由に追加・解除できます。
            </p>
          </div>

          <div className="p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2">
            <div className="font-semibold text-neutral-100 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-xs">
                3
              </span>
              ダウンロード先の指定と自動フォールバック
            </div>
            <p className="text-neutral-400">
              以下の保存方式から自由に選択できます。<strong>保存先が未指定の場合や、お使いの環境でアクセスが制限されている場合でも、自動的にデフォルトの保存場所（ダウンロードフォルダ）へ確実に保存されます。</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>
                <strong className="text-neutral-200">ZIP一括保存 (デフォルト・推奨):</strong> PCの標準ダウンロードフォルダに1つのZIPアーカイブとして安全に保存します。内部サブフォルダ（例: images/）の設定も可能です。
              </li>
              <li>
                <strong className="text-neutral-200">個別ファイル保存:</strong> ブラウザの標準ダウンロード機能で、各画像ファイルを個別にダウンロードフォルダへ順次保存します。
              </li>
              <li>
                <strong className="text-neutral-200">ローカルフォルダ指定 (対応環境):</strong> PC上の特定フォルダを選択して直接保存します。※iframe環境などセキュリティで直接書き込みが制限されている場合は、自動的にデフォルトの保存場所（ZIP）に安全に保存されます。
              </li>
            </ul>
          </div>

          <div className="p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2">
            <div className="font-semibold text-neutral-100 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-xs">
                4
              </span>
              ファイル命名規則・フィルタリング
            </div>
            <p className="text-neutral-400">
              元のファイル名のほか、「001.jpgなどの連番のみ」「photo_001.jpgなどのプレフィックス連番」「ドメイン名付与」からファイル命名規則を選択できます。また、ファイルサイズでの絞り込み（アイコンや微小画像の除外）やキーワード検索も可能です。
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
