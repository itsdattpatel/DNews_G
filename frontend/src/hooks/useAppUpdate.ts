/**
 * frontend/src/hooks/useAppUpdate.ts
 * In-App Version Update Checker querying GitHub Releases.
 * Supports direct .apk asset detection, download initiation, and semver comparison.
 */
import { useState, useEffect, useCallback } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const CURRENT_APP_VERSION = '1.0.7';
export const GITHUB_REPO = 'itsdattpatel/DNews_G';

export type UpdatePlatform = 'android' | 'desktop';

export interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
  content_type: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: ReleaseAsset[];
}

export interface UpdateInfo {
  isChecking: boolean;
  isUpdateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle: string;
  releaseNotes: string;
  publishedAt: string;
  platform: UpdatePlatform;
  apkAsset: ReleaseAsset | null;
  exeAsset: ReleaseAsset | null;
  platformAsset: ReleaseAsset | null;
  releaseUrl: string;
  lastChecked: Date | null;
  error: string | null;
  isDismissed: boolean;
}

/** Determine whether the current runtime expects an Android APK or Desktop installer. */
export function resolveUpdatePlatform(): UpdatePlatform {
  if (Capacitor.isNativePlatform()) return 'android';
  if (typeof window !== 'undefined' && window.electronBridge) return 'desktop';
  if (typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)) return 'android';
  return 'desktop';
}

/** Pick platform-matching binary assets while ignoring blockmaps and wrong-OS packages. */
export function selectReleaseAssets(
  assets: ReleaseAsset[],
  platform: UpdatePlatform,
): {
  apkAsset: ReleaseAsset | null;
  exeAsset: ReleaseAsset | null;
  platformAsset: ReleaseAsset | null;
} {
  const apkAsset =
    assets.find(
      (a) =>
        a.name.toLowerCase().endsWith('.apk') ||
        a.content_type === 'application/vnd.android.package-archive',
    ) || null;

  const exeAsset =
    assets.find((a) => {
      const lower = a.name.toLowerCase();
      return lower.endsWith('.exe') && !lower.endsWith('.blockmap');
    }) || null;

  return {
    apkAsset,
    exeAsset,
    platformAsset: platform === 'android' ? apkAsset : exeAsset,
  };
}

/** Resolve the best download URL for the active platform. */
export function getUpdateDownloadUrl(
  info: Pick<UpdateInfo, 'platform' | 'apkAsset' | 'exeAsset' | 'platformAsset' | 'releaseUrl'>,
): string {
  const targeted =
    info.platformAsset ?? (info.platform === 'android' ? info.apkAsset : info.exeAsset);
  return targeted?.browser_download_url || info.releaseUrl;
}

/** Format user-facing status & action labels matching the active runtime platform. */
export function getUpdateUiCopy(
  info: Pick<UpdateInfo, 'platform' | 'apkAsset' | 'exeAsset' | 'platformAsset'>,
): {
  summaryText: string;
  bannerDetailText: string;
  settingsButtonLabel: string;
  bannerButtonLabel: string;
} {
  const target =
    info.platformAsset ?? (info.platform === 'android' ? info.apkAsset : info.exeAsset);
  const sizeMb = target?.size ? (target.size / (1024 * 1024)).toFixed(1) : null;

  if (info.platform === 'android') {
    if (target) {
      return {
        summaryText: `Direct APK package available${sizeMb ? ` (${sizeMb} MB)` : ''}.`,
        bannerDetailText: ` A new mobile APK${sizeMb ? ` (${sizeMb} MB)` : ''} is ready for download.`,
        settingsButtonLabel: 'Download APK Update',
        bannerButtonLabel: 'DOWNLOAD APK',
      };
    }
    return {
      summaryText: 'New release assets published on GitHub.',
      bannerDetailText: ' An updated mobile release is available on GitHub.',
      settingsButtonLabel: 'Open Release Page',
      bannerButtonLabel: 'VIEW UPDATE',
    };
  }

  if (target) {
    return {
      summaryText: `Windows installer (.exe${sizeMb ? `, ${sizeMb} MB` : ''}) ready.`,
      bannerDetailText: ` A new Windows installer (.exe${sizeMb ? `, ${sizeMb} MB` : ''}) is ready for download.`,
      settingsButtonLabel: 'Download Installer (.exe)',
      bannerButtonLabel: 'DOWNLOAD .EXE',
    };
  }

  return {
    summaryText: 'New release assets published on GitHub.',
    bannerDetailText: ' An updated desktop release is available on GitHub.',
    settingsButtonLabel: 'Open Release Page',
    bannerButtonLabel: 'VIEW UPDATE',
  };
}

function compareVersions(v1: string, v2: string): number {
  // Normalize versions: strip leading 'v'
  const clean1 = v1.replace(/^v/i, '').trim();
  const clean2 = v2.replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export function useAppUpdate() {
  const initialPlatform = resolveUpdatePlatform();
  const [updateState, setUpdateState] = useState<UpdateInfo>({
    isChecking: false,
    isUpdateAvailable: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
    releaseTitle: '',
    releaseNotes: '',
    publishedAt: '',
    platform: initialPlatform,
    apkAsset: null,
    exeAsset: null,
    platformAsset: null,
    releaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
    lastChecked: null,
    error: null,
    isDismissed: false,
  });

  const checkForUpdates = useCallback(async (manual: boolean = false) => {
    setUpdateState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });

      if (!res.ok) {
        if (res.status === 404) {
          // No releases published yet on this repository
          setUpdateState(prev => ({
            ...prev,
            isChecking: false,
            isUpdateAvailable: false,
            lastChecked: new Date(),
          }));
          return;
        }
        throw new Error(`GitHub API error: ${res.status}`);
      }

      const release: GitHubRelease = await res.json();
      const latestVer = release.tag_name || '';
      const hasNewer = compareVersions(latestVer, CURRENT_APP_VERSION) > 0;
      const platform = resolveUpdatePlatform();
      const { apkAsset, exeAsset, platformAsset } = selectReleaseAssets(
        Array.isArray(release.assets) ? release.assets : [],
        platform,
      );

      const dismissedVer = localStorage.getItem('dnews_dismissed_update_version');
      const isDismissed = !manual && dismissedVer === latestVer;

      setUpdateState(prev => ({
        ...prev,
        isChecking: false,
        isUpdateAvailable: hasNewer,
        latestVersion: latestVer,
        releaseTitle: release.name || latestVer,
        releaseNotes: release.body || '',
        publishedAt: release.published_at || '',
        platform,
        apkAsset,
        exeAsset,
        platformAsset,
        releaseUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases`,
        lastChecked: new Date(),
        isDismissed,
      }));
    } catch (err: any) {
      setUpdateState(prev => ({
        ...prev,
        isChecking: false,
        error: err?.message || 'Unable to check for updates',
        lastChecked: new Date(),
      }));
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    const targetUrl = getUpdateDownloadUrl(updateState);
    if (!targetUrl) return;

    if (Capacitor.isNativePlatform()) {
      try {
        await Browser.open({ url: targetUrl });
      } catch {
        window.open(targetUrl, '_system');
      }
    } else if (typeof window !== 'undefined' && window.electronBridge?.openExternal) {
      await window.electronBridge.openExternal(targetUrl);
    } else {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  }, [updateState]);

  const dismissUpdate = useCallback(() => {
    if (updateState.latestVersion) {
      localStorage.setItem('dnews_dismissed_update_version', updateState.latestVersion);
    }
    setUpdateState(prev => ({ ...prev, isDismissed: true }));
  }, [updateState.latestVersion]);

  // Automatic background check on mount
  useEffect(() => {
    checkForUpdates(false);
  }, [checkForUpdates]);

  return {
    ...updateState,
    checkForUpdates: () => checkForUpdates(true),
    downloadAndInstall,
    dismissUpdate,
  };
}
