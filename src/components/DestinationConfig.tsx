import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  FolderCheck,
  Archive,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCode,
  HardDrive,
  Info,
  Check,
} from 'lucide-react';
import { DownloadSettings, DownloadMode, FilenamePattern } from '../types';

interface DestinationConfigProps {
  settings: DownloadSettings;
  setSettings: React.Dispatch<React.SetStateAction<DownloadSettings>>;
}

export const DestinationConfig: React.FC<DestinationConfigProps> = ({
  settings,
  setSettings,
}) => {
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [isSubframe, setIsSubframe] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.self !== window.top) {
        setIsSubframe(true);
      }
    } catch {
      setIsSubframe(true);
    }
  }, []);

  const isFileSystemSupported =
    !isSubframe &&
    typeof window !== 'undefined' &&
    typeof (window as any).showDirectoryPicker === 'function';

  const handlePickDirectory = async () => {
    setPermissionNotice(null);

    // If running in an iframe, the browser will throw SecurityError. Avoid calling showDirectoryPicker.
    if (isSubframe) {
      setPermissionNotice(
        '現在の表示環境（iframe/埋め込みプレビュー）ではブラウザのセキュリティ仕様によりPC上のフォルダ直接選択ダイアログの表示が制限されています。ダウンロード時はブラウザのデフォルト保存場所（ダウンロードフォルダ）へ自動保存されます。'
      );
      setSettings((prev) => ({
        ...prev,
        mode: 'zip',
        selectedDirectoryHandle: null,
        directoryName: null,
      }));
      return;
    }

    if (!isFileSystemSupported) {
      setPermissionNotice(
        'お使いのブラウザはフォルダ選択APIに対応していません。デフォルトの保存場所（ダウンロードフォルダ）に保存されます。'
      );
      setSettings((prev) => ({
        ...prev,
        mode: 'zip',
        selectedDirectoryHandle: null,
        directoryName: null,
      }));
      return;
    }

    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      if (handle) {
        setSettings((prev) => ({
          ...prev,
          mode: 'filesystem',
          selectedDirectoryHandle: handle,
          directoryName: handle.name,
        }));
        setPermissionNotice(null);
      }
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        // User cancelled the native picker dialog - not an error
        return;
      }
      // SecurityError or NotAllowedError
      setPermissionNotice(
        'フォルダへの直接アクセスが制限されています。デフォルトの保存場所（ダウンロードフォルダ）に保存されます。'
      );
      setSettings((prev) => ({
        ...prev,
        mode: 'zip',
        selectedDirectoryHandle: null,
        directoryName: null,
      }));
    }
  };

  const handleUseDefaultDestination = (mode: 'zip' | 'browser') => {
    setSettings((prev) => ({
      ...prev,
      mode,
      selectedDirectoryHandle: null,
      directoryName: null,
    }));
    setPermissionNotice(null);
  };

  const setFilenamePattern = (pattern: FilenamePattern) => {
    setSettings((prev) => ({ ...prev, filenamePattern: pattern }));
  };

  return (
    <div
      id="destination-settings"
      className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-neutral-200">
            保存先・ダウンロード設定
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
          <span>現在の保存先:</span>
          <span className="text-amber-300 font-medium">
            {settings.directoryName
              ? `📁 ${settings.directoryName}`
              : '📁 デフォルト（ダウンロードフォルダ）'}
          </span>
        </div>
      </div>

      {/* Permission or Subframe Notice */}
      {permissionNotice && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>{permissionNotice}</span>
        </div>
      )}

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* Mode 1: Default ZIP (Recommended & Default) */}
        <button
          type="button"
          onClick={() => handleUseDefaultDestination('zip')}
          className={`p-3 rounded-xl border text-left transition-all ${
            settings.mode === 'zip'
              ? 'bg-amber-500/10 border-amber-500/50 text-neutral-100 shadow-sm'
              : 'bg-neutral-800/40 border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-2 text-xs font-semibold">
              <Archive className="w-4 h-4 text-amber-400" />
              ZIPで一括保存 (デフォルト)
            </span>
            {settings.mode === 'zip' && (
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <p className="text-xs text-neutral-400 line-clamp-2">
            PCの「ダウンロード」フォルダに1つのZIPとしてまとめて確実に保存
          </p>
        </button>

        {/* Mode 2: Sequential browser download to default folder */}
        <button
          type="button"
          onClick={() => handleUseDefaultDestination('browser')}
          className={`p-3 rounded-xl border text-left transition-all ${
            settings.mode === 'browser'
              ? 'bg-amber-500/10 border-amber-500/50 text-neutral-100 shadow-sm'
              : 'bg-neutral-800/40 border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-2 text-xs font-semibold">
              <Download className="w-4 h-4 text-amber-400" />
              個別ファイルで保存
            </span>
            {settings.mode === 'browser' && (
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <p className="text-xs text-neutral-400 line-clamp-2">
            ブラウザの「ダウンロード」フォルダに各画像を直接順次保存
          </p>
        </button>

        {/* Mode 3: Local Folder Direct Selection */}
        <button
          type="button"
          onClick={handlePickDirectory}
          className={`p-3 rounded-xl border text-left transition-all ${
            settings.mode === 'filesystem' && settings.selectedDirectoryHandle
              ? 'bg-amber-500/10 border-amber-500/50 text-neutral-100 shadow-sm'
              : 'bg-neutral-800/40 border-neutral-800 text-neutral-300 hover:bg-neutral-800/80 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-2 text-xs font-semibold">
              <FolderOpen className="w-4 h-4 text-amber-400" />
              ローカルフォルダを指定
            </span>
            {settings.mode === 'filesystem' && settings.selectedDirectoryHandle && (
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <p className="text-xs text-neutral-400 line-clamp-2">
            {isSubframe
              ? 'iframe環境ではデフォルト保存（ダウンロードフォルダ）へ自動保存'
              : 'PC上の特定フォルダを選択（未選択・制限時はデフォルト保存）'}
          </p>
        </button>
      </div>

      {/* Directory Status / Subfolder setup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Destination folder status & action */}
        <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-lg flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
              <FolderCheck className="w-3.5 h-3.5 text-amber-400" />
              保存場所の状態:
            </span>
            {settings.directoryName ? (
              <button
                type="button"
                onClick={() => handleUseDefaultDestination('zip')}
                className="text-xs text-neutral-400 hover:text-amber-300 underline"
              >
                デフォルト保存に戻す
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePickDirectory}
                className="px-2.5 py-1 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded border border-neutral-700 transition-colors"
              >
                フォルダを指定する
              </button>
            )}
          </div>

          <div className="text-xs font-mono bg-neutral-900 px-2.5 py-1.5 rounded border border-neutral-800/80 flex items-center justify-between text-neutral-300">
            <span className="truncate">
              {settings.directoryName ? (
                <>
                  📁 <span className="text-amber-300 font-semibold">{settings.directoryName}</span>
                </>
              ) : (
                <span className="text-neutral-400">
                  📁 デフォルトの保存場所（ブラウザの「ダウンロード」フォルダ）
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Subfolder input */}
        <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-lg flex flex-col justify-between gap-2">
          <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
            <span>内部サブフォルダ名 (任意):</span>
            <span className="text-neutral-500 font-normal">空欄で直下保存</span>
          </label>
          <input
            type="text"
            value={settings.targetFolder}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, targetFolder: e.target.value }))
            }
            placeholder="例: images または 2026-10"
            className="w-full px-2.5 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/60 font-mono"
          />
        </div>
      </div>

      {/* Filename Renaming Pattern */}
      <div className="pt-2 border-t border-neutral-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-neutral-400" />
            ファイル名の命名規則:
          </span>
          {settings.filenamePattern === 'prefix_numbered' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-400">プレフィックス:</span>
              <input
                type="text"
                value={settings.customPrefix}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, customPrefix: e.target.value }))
                }
                placeholder="photo"
                className="w-24 px-2 py-0.5 text-xs bg-neutral-800 border border-neutral-700 rounded text-neutral-200 font-mono"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {[
            { id: 'original', label: '元のファイル名', example: 'photo_01.jpg' },
            { id: 'numbered', label: '連番のみ', example: '001.jpg, 002.jpg' },
            { id: 'prefix_numbered', label: 'プレフィックス＋連番', example: 'img_001.jpg' },
            { id: 'domain_original', label: 'ドメイン名＋元名', example: 'site_photo.jpg' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilenamePattern(item.id as FilenamePattern)}
              className={`p-2 rounded-lg border text-left text-xs transition-all ${
                settings.filenamePattern === item.id
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 font-medium'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <div className="truncate">{item.label}</div>
              <div className="font-mono text-[11px] text-neutral-500 truncate mt-0.5">
                {item.example}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
