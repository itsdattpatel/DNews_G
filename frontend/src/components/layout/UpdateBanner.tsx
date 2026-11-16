/**
 * frontend/src/components/layout/UpdateBanner.tsx
 * Non-blocking slim Victorian update notification banner (PRD E Category 9).
 * Listens to Electron auto-updater events via window.electronBridge.
 * Supports:
 * - "Update Now": background download with real-time progress indicator.
 * - "Remind Me Later": dismisses in-memory for current session (re-alerts on next app startup).
 * - "What's New": opens GitHub release notes in default OS browser.
 * - "Restart to Apply": restarts DNews and applies installer payload.
 */
import React, { useEffect, useState } from 'react';
import type { UpdateInfo, UpdateProgress } from '../../types/electron';

export interface UpdateBannerProps {
  forcedInfo?: UpdateInfo | null;
  forcedStatus?:
    | 'idle'
    | 'available'
    | 'downloading'
    | 'downloaded'
    | 'error'
    | 'dismissed';
  forcedProgress?: number;
  forcedSpeed?: string;
  forcedErrorMessage?: string;
  onUpdateNow?: () => void;
  onRemindMeLater?: () => void;
  onOpenReleaseNotes?: () => void;
  onRestartToApply?: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  forcedInfo,
  forcedStatus,
  forcedProgress,
  forcedSpeed,
  forcedErrorMessage,
  onUpdateNow,
  onRemindMeLater,
  onOpenReleaseNotes,
  onRestartToApply,
}) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(forcedInfo ?? null);
  const [status, setStatus] = useState<
    'idle' | 'available' | 'downloading' | 'downloaded' | 'error' | 'dismissed'
  >(forcedStatus ?? 'idle');
  const [progress, setProgress] = useState<number>(forcedProgress ?? 0);
  const [speed, setSpeed] = useState<string>(forcedSpeed ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(forcedErrorMessage ?? null);

  useEffect(() => {
    if (forcedInfo !== undefined) setUpdateInfo(forcedInfo);
  }, [forcedInfo]);

  useEffect(() => {
    if (forcedStatus !== undefined) setStatus(forcedStatus);
  }, [forcedStatus]);

  useEffect(() => {
    if (forcedProgress !== undefined) setProgress(forcedProgress);
  }, [forcedProgress]);

  useEffect(() => {
    if (forcedSpeed !== undefined) setSpeed(forcedSpeed);
  }, [forcedSpeed]);

  useEffect(() => {
    if (forcedErrorMessage !== undefined) setErrorMessage(forcedErrorMessage);
  }, [forcedErrorMessage]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronBridge) return;

    const unsubs: Array<() => void> = [];

    if (window.electronBridge.onUpdateAvailable) {
      unsubs.push(
        window.electronBridge.onUpdateAvailable((info) => {
          setUpdateInfo(info);
          setStatus('available');
        }),
      );
    }

    if (window.electronBridge.onUpdateProgress) {
      unsubs.push(
        window.electronBridge.onUpdateProgress((prog: UpdateProgress) => {
          setStatus('downloading');
          setProgress(prog.percent);
          const mbps = (prog.bytesPerSecond / (1024 * 1024)).toFixed(1);
          setSpeed(`${mbps} MB/s`);
        }),
      );
    }

    if (window.electronBridge.onUpdateDownloaded) {
      unsubs.push(
        window.electronBridge.onUpdateDownloaded((info) => {
          setStatus('downloaded');
          if (!updateInfo) {
            setUpdateInfo(info);
          }
        }),
      );
    }

    if (window.electronBridge.onUpdateError) {
      unsubs.push(
        window.electronBridge.onUpdateError((err) => {
          setErrorMessage(err.message || 'Update failed');
          setStatus('error');
        }),
      );
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [updateInfo]);

  if (status === 'idle' || status === 'dismissed' || !updateInfo) {
    return null;
  }

  const handleUpdateNow = () => {
    if (onUpdateNow) {
      onUpdateNow();
      return;
    }
    setStatus('downloading');
    setProgress(0);
    void window.electronBridge?.downloadUpdate();
  };

  const handleRemindMeLater = () => {
    if (onRemindMeLater) {
      onRemindMeLater();
      return;
    }
    // In-memory dismissal only — next time user launches DNews, the check will fire again
    setStatus('dismissed');
  };

  const handleOpenReleaseNotes = () => {
    if (onOpenReleaseNotes) {
      onOpenReleaseNotes();
      return;
    }
    const targetUrl =
      updateInfo.url ||
      `https://github.com/itsdattpatel/DNews_G/releases/tag/v${updateInfo.version}`;
    void window.electronBridge?.openExternal(targetUrl);
  };

  const handleRestartToApply = () => {
    if (onRestartToApply) {
      onRestartToApply();
      return;
    }
    window.electronBridge?.installUpdate();
  };

  return (
    <div
      id="dnews-update-banner"
      role="alert"
      aria-live="polite"
      className="w-full bg-[#F2EDE2] dark:bg-[#1A1710] border-b border-[#D9D0BE] dark:border-[#2E2A22] text-[#1A1208] dark:text-[#E8E4DA] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-30 transition-all duration-200"
    >
      {/* Left: Vintage emblem & version text */}
      <div className="flex items-center gap-2.5">
        {/* Custom SVG Victorian Dispatch Arrow */}
        <span
          className="w-5 h-5 rounded flex items-center justify-center bg-[#C0392B] text-white flex-shrink-0"
          title="Edition Upgrade Available"
        >
          <svg
            className="w-3 h-3 fill-current"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2L4 10h5v10h6V10h5L12 2z" />
          </svg>
        </span>

        <div className="flex items-center gap-2">
          <span className="font-serif font-bold tracking-wide">
            {status === 'downloaded'
              ? `DNews v${updateInfo.version} Ready`
              : `DNews v${updateInfo.version} Available`}
          </span>

          <span className="text-[#5C4E3A] dark:text-[#A89880] hidden sm:inline">·</span>

          {status === 'available' && (
            <span className="text-[#5C4E3A] dark:text-[#A89880]">
              A new edition has been published.
            </span>
          )}

          {status === 'downloading' && (
            <span className="text-[#5C4E3A] dark:text-[#A89880]">
              Downloading dispatch payload ({progress}% {speed ? `· ${speed}` : ''})
            </span>
          )}

          {status === 'downloaded' && (
            <span className="text-[#1D6B38] dark:text-[#27AE60] font-medium">
              Payload verified. Restart to apply new edition.
            </span>
          )}

          {status === 'error' && (
            <span className="text-[#C0392B] dark:text-[#E74C3C]">
              {errorMessage || 'Unable to complete update check.'}
            </span>
          )}

          <button
            type="button"
            onClick={handleOpenReleaseNotes}
            className="underline text-[#5C4E3A] dark:text-[#A89880] hover:text-[#1A1208] dark:hover:text-[#FAF7F0] ml-1 transition-colors"
          >
            Release Notes
          </button>
        </div>
      </div>

      {/* Center: Progress Bar when downloading */}
      {status === 'downloading' && (
        <div className="flex-1 max-w-xs mx-4 hidden md:block">
          <div className="w-full bg-[#D9D0BE] dark:bg-[#2E2A22] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#C0392B] h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2">
        {status === 'available' && (
          <>
            <button
              id="btn-update-now"
              type="button"
              onClick={handleUpdateNow}
              className="px-3 py-1 bg-[#C0392B] hover:bg-[#922B21] text-white font-serif font-medium rounded shadow-sm transition-colors text-xs"
            >
              Update Now
            </button>
            <button
              id="btn-remind-me-later"
              type="button"
              onClick={handleRemindMeLater}
              className="px-3 py-1 border border-[#D9D0BE] dark:border-[#2E2A22] hover:border-[#1A1208] dark:hover:border-[#E8E4DA] text-[#5C4E3A] dark:text-[#A89880] hover:text-[#1A1208] dark:hover:text-[#E8E4DA] font-serif rounded transition-colors text-xs"
            >
              Remind Me Later
            </button>
          </>
        )}

        {status === 'downloaded' && (
          <button
            id="btn-restart-apply"
            type="button"
            onClick={handleRestartToApply}
            className="px-3 py-1 bg-[#1D6B38] hover:bg-[#15522b] text-white font-serif font-medium rounded shadow-sm transition-colors text-xs"
          >
            Restart to Apply
          </button>
        )}

        {status === 'error' && (
          <button
            type="button"
            onClick={handleUpdateNow}
            className="px-3 py-1 border border-[#C0392B] text-[#C0392B] hover:bg-[#C0392B] hover:text-white font-serif rounded transition-colors text-xs"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default UpdateBanner;
