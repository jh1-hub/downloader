import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Hash,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  ListOrdered,
  Copy,
  SlidersHorizontal,
  RefreshCw,
  FolderInput,
} from 'lucide-react';
import {
  detectSequencePattern,
  generateSequenceUrls,
  SequencePattern,
} from '../utils/sequenceGenerator';

interface SequentialUrlGeneratorProps {
  currentText: string;
  onApplyUrls: (urls: string[]) => void;
  onClose?: () => void;
}

export const SequentialUrlGenerator: React.FC<SequentialUrlGeneratorProps> = ({
  currentText,
  onApplyUrls,
  onClose,
}) => {
  const [pattern, setPattern] = useState<SequencePattern | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [startNum, setStartNum] = useState<number>(1);
  const [endNum, setEndNum] = useState<number>(300);
  const [padLength, setPadLength] = useState<number>(3);
  const [step, setStep] = useState<number>(1);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  // Auto-detect pattern from the current text or first URL in text
  useEffect(() => {
    const urls = currentText.match(/https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi);
    const candidate = urls && urls.length > 0 ? urls[0] : currentText.trim();

    if (candidate) {
      setInputUrl(candidate);
      const detected = detectSequencePattern(candidate);
      if (detected) {
        setPattern(detected);
        if (detected.explicitRange) {
          setStartNum(detected.explicitRange.start);
          setEndNum(detected.explicitRange.end);
          setPadLength(detected.explicitRange.pad);
        } else {
          setStartNum(detected.startNumber);
          setPadLength(detected.padLength);
          // Default end number: if user entered 1, suggest 300 (per user's example)
          if (detected.startNumber <= 1) {
            setEndNum(300);
          } else {
            setEndNum(Math.max(detected.startNumber + 50, 300));
          }
        }
      }
    }
  }, [currentText]);

  const handleUrlChange = (val: string) => {
    setInputUrl(val);
    const detected = detectSequencePattern(val);
    if (detected) {
      setPattern(detected);
      if (detected.explicitRange) {
        setStartNum(detected.explicitRange.start);
        setEndNum(detected.explicitRange.end);
        setPadLength(detected.explicitRange.pad);
      } else {
        setStartNum(detected.startNumber);
        setPadLength(detected.padLength);
      }
    }
  };

  const handleSetSample = () => {
    const sample = 'https://example.com/gallery/p001.jpg';
    setInputUrl(sample);
    handleUrlChange(sample);
    setStartNum(1);
    setEndNum(300);
    setPadLength(3);
  };

  const handleGenerate = () => {
    if (!pattern) return;
    const generated = generateSequenceUrls(
      pattern.prefixUrl,
      startNum,
      endNum,
      padLength,
      pattern.suffixUrl,
      step
    );
    onApplyUrls(generated);
  };

  const handleCopyUrls = async () => {
    if (!pattern) return;
    const generated = generateSequenceUrls(
      pattern.prefixUrl,
      startNum,
      endNum,
      padLength,
      pattern.suffixUrl,
      step
    );
    try {
      await navigator.clipboard.writeText(generated.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const totalCount = Math.max(0, Math.floor((Math.abs(endNum - startNum) + 1) / Math.max(1, step)));

  const previewFirst = pattern
    ? `${pattern.prefixUrl}${String(startNum).padStart(padLength, '0')}${pattern.suffixUrl}`
    : '';
  const previewSecond = pattern && totalCount > 1
    ? `${pattern.prefixUrl}${String(startNum + (startNum <= endNum ? step : -step)).padStart(padLength, '0')}${pattern.suffixUrl}`
    : '';
  const previewLast = pattern
    ? `${pattern.prefixUrl}${String(endNum).padStart(padLength, '0')}${pattern.suffixUrl}`
    : '';

  return (
    <div className="p-4 bg-amber-500/10 border border-amber-500/40 rounded-2xl space-y-4 transition-all animate-in fade-in shadow-md">
      {/* Title & expand/close bar */}
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-neutral-100 flex flex-wrap items-center gap-2">
              <span>連番URL自動推察・一括生成</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                例: p001.jpg → p300.jpg
              </span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              1つの画像URLからファイル名（例: p001.jpg）の数字を自動判別し、前後の連番URL（〜p300.jpgなど）を一括生成します
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title={isExpanded ? '折りたたむ' : '展開'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
              title="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3.5 pt-2 border-t border-amber-500/20">
          {/* Base URL input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <label className="text-neutral-300 font-medium">
                基準となる画像URL:
              </label>
              <button
                type="button"
                onClick={handleSetSample}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1"
              >
                サンプル（p001.jpg）を挿入
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="例: https://example.com/gallery/p001.jpg または p[001-300].jpg"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs font-mono text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
              />
            </div>
          </div>

          {/* Pattern Breakdown Pills */}
          {pattern && (
            <div className="p-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-xs space-y-1.5">
              <div className="text-[11px] text-neutral-400 font-semibold flex items-center justify-between">
                <span>推察されたファイル名構造:</span>
                <span className="text-emerald-400 font-mono text-[10px]">自動検出完了 ✓</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 truncate max-w-[200px]" title={pattern.prefixUrl}>
                  前置: {pattern.prefixUrl.split('/').pop() || pattern.prefixUrl}
                </span>
                <span className="text-amber-400 font-bold">+</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                  連番: [{String(startNum).padStart(padLength, '0')} 〜 {String(endNum).padStart(padLength, '0')}]
                </span>
                <span className="text-amber-400 font-bold">+</span>
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  拡張子/後置: {pattern.suffixUrl || '(なし)'}
                </span>
              </div>
            </div>
          )}

          {/* Quick Preceding / Succeeding Inference Buttons */}
          <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                前後の推察・範囲プリセット:
              </span>
              <span className="text-[10px] text-neutral-400">ワンクリックで範囲設定</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setStartNum(1);
                  setEndNum(300);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  startNum === 1 && endNum === 300
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                ★ 1 〜 300 (質問例)
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartNum(1);
                  setEndNum(100);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  startNum === 1 && endNum === 100
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                1 〜 100
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartNum(1);
                  setEndNum(200);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  startNum === 1 && endNum === 200
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                1 〜 200
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartNum(1);
                  setEndNum(50);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  startNum === 1 && endNum === 50
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                1 〜 50
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartNum(1);
                  setEndNum(500);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  startNum === 1 && endNum === 500
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                1 〜 500
              </button>
              {pattern && startNum > 1 && (
                <button
                  type="button"
                  onClick={() => setStartNum(1)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all"
                >
                  前を補完 (1から開始)
                </button>
              )}
            </div>
          </div>

          {/* Sequence controls: start, end, padding, step */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Start Number */}
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-300 font-medium flex items-center justify-between">
                <span>開始番号:</span>
              </label>
              <input
                type="number"
                min={0}
                max={99999}
                value={startNum}
                onChange={(e) => setStartNum(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* End Number */}
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-300 font-medium flex items-center justify-between">
                <span>終了番号:</span>
                <span className="text-[10px] text-amber-300">例: 300</span>
              </label>
              <input
                type="number"
                min={0}
                max={99999}
                value={endNum}
                onChange={(e) => setEndNum(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Padding length */}
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-300 font-medium">ゼロ埋め桁数:</label>
              <select
                value={padLength}
                onChange={(e) => setPadLength(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              >
                <option value={0}>なし (1, 2, ...)</option>
                <option value={2}>2桁 (01, 02, ...)</option>
                <option value={3}>3桁 (001, 002, ...)</option>
                <option value={4}>4桁 (0001, 0002, ...)</option>
                <option value={5}>5桁 (00001, ...)</option>
              </select>
            </div>

            {/* Step */}
            <div className="space-y-1">
              <label className="text-[11px] text-neutral-300 font-medium">間隔 (ステップ):</label>
              <input
                type="number"
                min={1}
                max={100}
                value={step}
                onChange={(e) => setStep(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          {pattern && (
            <div className="p-3 bg-neutral-950/90 border border-neutral-800 rounded-xl space-y-1.5 font-mono text-[11px] text-neutral-400 shadow-inner">
              <div className="flex items-center justify-between text-neutral-200 font-semibold pb-1.5 border-b border-neutral-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  生成プレビュー
                </span>
                <span className="text-amber-300 font-bold tabular-nums">合計 {totalCount} 枚</span>
              </div>
              <div className="truncate text-neutral-300">
                1枚目: <span className="text-amber-400 font-medium">{previewFirst}</span>
              </div>
              {totalCount > 1 && (
                <div className="truncate text-neutral-400">
                  2枚目: <span>{previewSecond}</span>
                </div>
              )}
              {totalCount > 2 && (
                <div className="text-neutral-500 pl-4 py-0.5">... (計 {totalCount - 2} 件省略)</div>
              )}
              {totalCount > 1 && (
                <div className="truncate text-neutral-300">
                  {totalCount}枚目: <span className="text-amber-400 font-medium">{previewLast}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyUrls}
              disabled={!pattern || totalCount === 0}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 disabled:opacity-50 text-neutral-200 text-xs font-medium rounded-xl transition-colors border border-neutral-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'コピー完了！' : `${totalCount}件のURLをコピー`}</span>
            </button>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!pattern || totalCount === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-md"
            >
              <ListOrdered className="w-4 h-4" />
              <span>
                {totalCount} 件の連番画像を読み込んで一覧表示
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
