/**
 * frontend/src/components/common/AppUpdateBanner.tsx
 * Broadsheet Newspaper In-App Update Dispatch Banner.
 * Appears when GitHub Releases detects a newer version than current (v1.0.5).
 * Allows one-click download of the latest Android APK or release archive.
 */
import React from 'react';
import { useAppUpdate } from '../../hooks/useAppUpdate';
import { broadsheetAudio } from '../../utils/broadsheetAudio';
import { Download, X } from 'lucide-react';

export const AppUpdateBanner: React.FC = () => {
  const {
    isUpdateAvailable,
    isDismissed,
    latestVersion,
    currentVersion,
    releaseTitle,
    apkAsset,
    downloadAndInstall,
    dismissUpdate,
  } = useAppUpdate();

  if (!isUpdateAvailable || isDismissed) {
    return null;
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleDownload = () => {
    broadsheetAudio.playTeletypeClick();
    downloadAndInstall();
  };

  const handleDismiss = () => {
    broadsheetAudio.playTeletypeClick();
    dismissUpdate();
  };

  return (
    <aside
      id="app-update-dispatch-banner"
      role="region"
      aria-label="New Edition Available"
      className="fixed top-12 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-xl bg-paper border-2 border-ink shadow-elevated p-3 md:p-4 animate-in fade-in slide-in-from-top-4 duration-200 select-none"
    >
      {/* Top Banner Masthead Strip */}
      <div className="flex items-center justify-between border-b border-ink/30 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-accent animate-ping" />
          <span className="font-mono text-[10px] md:text-xs font-bold tracking-widest uppercase text-accent">
            TELETYPE WIRE // EXTRA EDITION AVAILABLE
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-ink-muted hover:text-ink hover:bg-paper-alt border border-transparent hover:border-ink/20 rounded-2xs transition-colors"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-headline font-bold text-sm md:text-base text-ink">
              {releaseTitle || `Edition ${latestVersion}`}
            </h4>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-ink text-paper rounded-2xs">
              {latestVersion}
            </span>
          </div>
          <p className="font-body text-xs text-ink-secondary leading-snug">
            Your current desk edition is <span className="font-mono font-bold text-ink">v{currentVersion}</span>. 
            {apkAsset ? (
              <span> A new mobile APK ({formatFileSize(apkAsset.size)}) is ready for download.</span>
            ) : (
              <span> An updated release build is available on GitHub.</span>
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={handleDownload}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-ink text-paper hover:bg-ink-secondary font-mono text-xs font-bold border border-ink shadow-sm transition-all active:translate-y-0.5"
          >
            <Download size={13} />
            <span>{apkAsset ? 'DOWNLOAD APK' : 'VIEW UPDATE'}</span>
          </button>
          <button
            onClick={handleDismiss}
            className="px-2.5 py-1.5 bg-paper-alt hover:bg-paper text-ink-secondary hover:text-ink font-mono text-xs border border-ink/40 rounded-2xs transition-colors"
          >
            LATER
          </button>
        </div>
      </div>
    </aside>
  );
};
