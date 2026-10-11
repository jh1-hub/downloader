import React, { useState } from 'react';
import { Plus, X, RotateCcw, Check, SlidersHorizontal } from 'lucide-react';

interface ExtensionSelectorProps {
  allowedExtensions: string[];
  setAllowedExtensions: React.Dispatch<React.SetStateAction<string[]>>;
  onApplyAndRescrape?: () => void;
  hasImagesExtracted: boolean;
}

const COMMON_PRESETS = [
  { ext: 'jpg', label: 'JPG' },
  { ext: 'jpeg', label: 'JPEG' },
  { ext: 'png', label: 'PNG' },
  { ext: 'webp', label: 'WebP' },
  { ext: 'gif', label: 'GIF' },
  { ext: 'svg', label: 'SVG' },
  { ext: 'avif', label: 'AVIF' },
  { ext: 'bmp', label: 'BMP' },
];

export const ExtensionSelector: React.FC<ExtensionSelectorProps> = ({
  allowedExtensions,
  setAllowedExtensions,
  onApplyAndRescrape,
  hasImagesExtracted,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleExtension = (ext: string) => {
    const lower = ext.toLowerCase().trim();
    if (allowedExtensions.includes(lower)) {
      if (allowedExtensions.length === 1) {
        setErrorMsg('最低1つの拡張子を選択してください');
        return;
      }
      setErrorMsg('');
      setAllowedExtensions((prev) => prev.filter((item) => item !== lower));
    } else {
      setErrorMsg('');
      setAllowedExtensions((prev) => [...prev, lower]);
    }
  };

  const addCustomExtension = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInput.trim().toLowerCase().replace(/^\./, '');
    if (!clean) return;

    if (!/^[a-z0-9]{2,6}$/.test(clean)) {
      setErrorMsg('英数字2〜6文字の有効な拡張子を入力してください');
      return;
    }

    if (allowedExtensions.includes(clean)) {
      setErrorMsg(`.${clean} は既に追加されています`);
      return;
    }

    setErrorMsg('');
    setAllowedExtensions((prev) => [...prev, clean]);
    setCustomInput('');
  };

  const resetToDefault = () => {
    setAllowedExtensions(['jpeg', 'jpg']);
    setErrorMsg('');
  };

  const selectAllPresets = () => {
    const all = Array.from(new Set([...allowedExtensions, ...COMMON_PRESETS.map((p) => p.ext)]));
    setAllowedExtensions(all);
    setErrorMsg('');
  };

  return (
    <div id="extensions" className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-neutral-200">
            対象拡張子の設定
          </h2>
          <span className="text-xs text-neutral-500">
            (現在: {allowedExtensions.map((e) => `.${e}`).join(', ')})
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={resetToDefault}
            className="flex items-center gap-1 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>JPEG/JPGにリセット</span>
          </button>
          <span className="text-neutral-700">|</span>
          <button
            type="button"
            onClick={selectAllPresets}
            className="text-neutral-400 hover:text-amber-300 transition-colors"
          >
            全プリセット追加
          </button>
        </div>
      </div>

      {/* Preset Toggles & Active Exts */}
      <div className="flex flex-wrap items-center gap-1.5">
        {COMMON_PRESETS.map((preset) => {
          const isActive = allowedExtensions.includes(preset.ext);
          return (
            <button
              key={preset.ext}
              type="button"
              onClick={() => toggleExtension(preset.ext)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-neutral-800/80 text-neutral-400 border border-neutral-700/60 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              {isActive && <Check className="w-3 h-3 text-amber-400" />}
              <span>.{preset.ext}</span>
            </button>
          );
        })}

        {/* Custom non-preset extensions */}
        {allowedExtensions
          .filter((ext) => !COMMON_PRESETS.some((p) => p.ext === ext))
          .map((customExt) => (
            <span
              key={customExt}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40"
            >
              <span>.{customExt}</span>
              <button
                type="button"
                onClick={() => toggleExtension(customExt)}
                className="hover:text-red-300 transition-colors ml-0.5"
                title="削除"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

        {/* Add Custom Extension Form */}
        <form onSubmit={addCustomExtension} className="flex items-center gap-1">
          <input
            type="text"
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              setErrorMsg('');
            }}
            placeholder="拡張子追加 (例: webp)"
            className="w-32 px-2.5 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/60 font-mono"
          />
          <button
            type="submit"
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-400 border border-neutral-700 rounded-lg transition-colors"
            title="拡張子を追加"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {errorMsg && (
        <p className="text-xs text-red-400 font-medium">{errorMsg}</p>
      )}

      {hasImagesExtracted && onApplyAndRescrape && (
        <div className="pt-1 flex items-center justify-between text-xs text-neutral-400">
          <span>拡張子設定を変更しました。現在のページをこの拡張子で再スキャンしますか？</span>
          <button
            type="button"
            onClick={onApplyAndRescrape}
            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-medium rounded-md border border-neutral-700 transition-colors"
          >
            再スキャンを実行
          </button>
        </div>
      )}
    </div>
  );
};
