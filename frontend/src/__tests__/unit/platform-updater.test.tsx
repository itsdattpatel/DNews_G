/**
 * frontend/src/__tests__/unit/platform-updater.test.tsx
 * TDD tests ensuring Desktop/Electron selects Windows .exe installers
 * while Android Capacitor selects .apk packages.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Capacitor } from '@capacitor/core';
import * as UpdateHook from '../../hooks/useAppUpdate';
import { AppUpdateBanner } from '../../components/common/AppUpdateBanner';
import { UnifiedSettingsDialog } from '../../components/settings/UnifiedSettingsDialog';

const MOCK_RELEASE_ASSETS: UpdateHook.ReleaseAsset[] = [
  {
    name: 'DNews-v1.0.7.apk',
    size: 10333601,
    browser_download_url: 'https://github.com/itsdattpatel/DNews_G/releases/download/v1.0.7/DNews-v1.0.7.apk',
    content_type: 'application/vnd.android.package-archive',
  },
  {
    name: 'DNews-Setup-1.0.7.exe.blockmap',
    size: 220873,
    browser_download_url: 'https://github.com/itsdattpatel/DNews_G/releases/download/v1.0.7/DNews-Setup-1.0.7.exe.blockmap',
    content_type: 'application/octet-stream',
  },
  {
    name: 'DNews-Setup-1.0.7.exe',
    size: 217940258,
    browser_download_url: 'https://github.com/itsdattpatel/DNews_G/releases/download/v1.0.7/DNews-Setup-1.0.7.exe',
    content_type: 'application/x-msdownload',
  },
];

describe('Platform-Aware GitHub Release Updater (EXE vs APK)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('selects .exe (ignoring .exe.blockmap and .apk) for desktop platform and .apk for android platform', () => {
    const helper = (UpdateHook as any).selectReleaseAssets;
    expect(typeof helper).toBe('function');

    const desktopSelection = helper(MOCK_RELEASE_ASSETS, 'desktop');
    expect(desktopSelection.platformAsset?.name).toBe('DNews-Setup-1.0.7.exe');
    expect(desktopSelection.exeAsset?.name).toBe('DNews-Setup-1.0.7.exe');
    expect(desktopSelection.apkAsset?.name).toBe('DNews-v1.0.7.apk');

    const androidSelection = helper(MOCK_RELEASE_ASSETS, 'android');
    expect(androidSelection.platformAsset?.name).toBe('DNews-v1.0.7.apk');
  });

  it('resolves desktop platform when running in Electron or non-native desktop browser', () => {
    const resolvePlatform = (UpdateHook as any).resolveUpdatePlatform;
    expect(typeof resolvePlatform).toBe('function');

    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    expect(resolvePlatform()).toBe('desktop');

    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    expect(resolvePlatform()).toBe('android');
  });

  it('renders AppUpdateBanner for Desktop EXE download rather than APK when platform is desktop', () => {
    const exeAsset = MOCK_RELEASE_ASSETS[2];
    const apkAsset = MOCK_RELEASE_ASSETS[0];
    const html = renderToStaticMarkup(
      <AppUpdateBanner
        forcedUpdate={{
          isUpdateAvailable: true,
          isDismissed: false,
          currentVersion: '1.0.6.1',
          latestVersion: 'v1.0.7',
          releaseTitle: 'v1.0.7',
          platform: 'desktop',
          apkAsset,
          exeAsset,
          platformAsset: exeAsset,
          releaseUrl: 'https://github.com/itsdattpatel/DNews_G/releases/tag/v1.0.7',
        } as any}
      />,
    );

    expect(html).toContain('Windows installer (.exe');
    expect(html).toContain('DOWNLOAD .EXE');
    expect(html).not.toContain('DOWNLOAD APK');
    expect(html).not.toContain('mobile APK');
  });

  it('does NOT offer APK on desktop even if release only has an .apk asset', () => {
    const apkAsset = MOCK_RELEASE_ASSETS[0];
    const html = renderToStaticMarkup(
      <AppUpdateBanner
        forcedUpdate={{
          isUpdateAvailable: true,
          isDismissed: false,
          currentVersion: '1.0.6.1',
          latestVersion: 'v1.0.7',
          releaseTitle: 'v1.0.7',
          platform: 'desktop',
          apkAsset,
          exeAsset: null,
          platformAsset: null,
          releaseUrl: 'https://github.com/itsdattpatel/DNews_G/releases/tag/v1.0.7',
        } as any}
      />,
    );

    expect(html).toContain('VIEW UPDATE');
    expect(html).not.toContain('DOWNLOAD APK');
    expect(html).not.toContain('mobile APK');
  });

  it('renders UnifiedSettingsDialog with Desktop Installer (.exe) copy on desktop and APK copy on Android', () => {
    const exeAsset = MOCK_RELEASE_ASSETS[2];
    const apkAsset = MOCK_RELEASE_ASSETS[0];

    const desktopSettingsHtml = renderToStaticMarkup(
      <UnifiedSettingsDialog
        forceOpen={true}
        initialSection="general"
        forcedUpdate={{
          isUpdateAvailable: true,
          currentVersion: '1.0.6.1',
          latestVersion: 'v1.0.7',
          platform: 'desktop',
          apkAsset,
          exeAsset,
          platformAsset: exeAsset,
          releaseUrl: 'https://github.com/itsdattpatel/DNews_G/releases/tag/v1.0.7',
        }}
      />,
    );
    expect(desktopSettingsHtml).toContain('Windows installer (.exe');
    expect(desktopSettingsHtml).toContain('Download Installer (.exe)');
    expect(desktopSettingsHtml).not.toContain('Download APK Update');

    const androidSettingsHtml = renderToStaticMarkup(
      <UnifiedSettingsDialog
        forceOpen={true}
        initialSection="general"
        forcedUpdate={{
          isUpdateAvailable: true,
          currentVersion: '1.0.6.1',
          latestVersion: 'v1.0.7',
          platform: 'android',
          apkAsset,
          exeAsset,
          platformAsset: apkAsset,
          releaseUrl: 'https://github.com/itsdattpatel/DNews_G/releases/tag/v1.0.7',
        }}
      />,
    );
    expect(androidSettingsHtml).toContain('Direct APK package available');
    expect(androidSettingsHtml).toContain('Download APK Update');
    expect(androidSettingsHtml).not.toContain('Download Installer (.exe)');

    expect(
      UpdateHook.getUpdateDownloadUrl({
        platform: 'desktop',
        apkAsset,
        exeAsset,
        platformAsset: exeAsset,
        releaseUrl: 'https://github.com/itsdattpatel/DNews_G/releases/tag/v1.0.7',
      }),
    ).toContain('DNews-Setup-1.0.7.exe');
  });
});
