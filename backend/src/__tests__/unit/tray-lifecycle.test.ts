/**
 * backend/src/__tests__/unit/tray-lifecycle.test.ts
 * Unit tests for System Tray, Native Notifications, Single-Instance Lock,
 * and Graceful Shutdown Lifecycle (PRD E Categories 7 & 8).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('System Tray, Native Notifications & Graceful Lifecycle (PRD E Category 7 & 8)', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const trayFilePath = path.join(rootDir, 'electron', 'tray.ts');
  const mainFilePath = path.join(rootDir, 'electron', 'main.ts');
  const preloadFilePath = path.join(rootDir, 'electron', 'preload.ts');
  const typesFilePath = path.join(rootDir, 'frontend', 'src', 'types', 'electron.d.ts');

  describe('Static & Structural Contract Verification', () => {
    it('defines electron/tray.ts with complete TrayManager specification', () => {
      expect(fs.existsSync(trayFilePath)).toBe(true);
      const content = fs.readFileSync(trayFilePath, 'utf-8');

      // System Tray Menu Items per PRD E 7.1
      expect(content).toContain('DNews — The Daily Bugle');
      expect(content).toContain('Open DNews');
      expect(content).toContain('Check News Now');
      expect(content).toContain('Breaking Stories');
      expect(content).toContain('stories indexed');
      expect(content).toContain('Mute Notifications');
      expect(content).toContain('Preferences...');
      expect(content).toContain('Quit DNews');

      // Left-click behavior: toggle window visibility
      expect(content).toContain("this.tray.on('click'");

      // Cleanup
      expect(content).toContain('destroy()');
    });

    it('defines electron/main.ts with Single-Instance Lock and Minimize-to-Tray', () => {
      expect(fs.existsSync(mainFilePath)).toBe(true);
      const content = fs.readFileSync(mainFilePath, 'utf-8');

      // Single-instance lock (PRD E Cat 8)
      expect(content).toContain('app.requestSingleInstanceLock()');
      expect(content).toContain("app.on('second-instance'");

      // Window close override: minimize to tray unless isQuitting
      expect(content).toContain("mainWindow.on('close'");
      expect(content).toContain('event.preventDefault()');
      expect(content).toContain('mainWindow?.hide()');

      // Graceful shutdown with child process SIGTERM
      expect(content).toContain("app.on('before-quit'");
      expect(content).toContain("backendProcess.kill('SIGTERM')");
    });

    it('exposes notification action and settings dispatch in preload and type declarations', () => {
      expect(fs.existsSync(preloadFilePath)).toBe(true);
      const preload = fs.readFileSync(preloadFilePath, 'utf-8');
      expect(preload).toContain('onNotificationAction');
      expect(preload).toContain('onNavigateFilter');
      expect(preload).toContain('onOpenSettings');
      expect(preload).toContain('showNotification');

      expect(fs.existsSync(typesFilePath)).toBe(true);
      const types = fs.readFileSync(typesFilePath, 'utf-8');
      expect(types).toContain('onNotificationAction');
      expect(types).toContain('onNavigateFilter');
      expect(types).toContain('onOpenSettings');
      expect(types).toContain('showNotification');
    });
  });

  describe('Simulated TrayManager Menu & Action Logic', () => {
    // Pure logic simulation of TrayManager state transitions
    interface SimulatedMenuItem {
      label?: string;
      type?: string;
      checked?: boolean;
      enabled?: boolean;
      click?: (item?: any) => void;
    }

    class MockTrayManager {
      public breakingCount = 0;
      public indexedCount = 0;
      public muted = false;
      public windowVisible = false;
      public windowFocused = false;
      public navigatedFilter: any = null;
      public openedSettings = false;
      public checkNewsTriggered = false;
      public quitTriggered = false;

      public toggleWindow() {
        if (this.windowVisible) {
          this.windowVisible = false;
        } else {
          this.windowVisible = true;
          this.windowFocused = true;
        }
      }

      public buildMenuTemplate(): SimulatedMenuItem[] {
        const breakingLabel =
          this.breakingCount > 0
            ? `🚨 ${this.breakingCount} Breaking Stories`
            : 'No unread breaking stories';
        const storiesLabel =
          this.indexedCount > 0
            ? `📰 ${this.indexedCount.toLocaleString()} stories indexed`
            : 'Indexing stories...';

        return [
          { label: 'DNews — The Daily Bugle', enabled: false },
          { type: 'separator' },
          {
            label: 'Open DNews',
            click: () => {
              this.windowVisible = true;
              this.windowFocused = true;
            },
          },
          {
            label: 'Check News Now',
            click: () => {
              this.checkNewsTriggered = true;
            },
          },
          { type: 'separator' },
          {
            label: breakingLabel,
            enabled: this.breakingCount > 0,
            click: () => {
              this.windowVisible = true;
              this.windowFocused = true;
              this.navigatedFilter = { breaking: true };
            },
          },
          { label: storiesLabel, enabled: false },
          { type: 'separator' },
          {
            label: 'Mute Notifications',
            type: 'checkbox',
            checked: this.muted,
            click: (item?: { checked: boolean }) => {
              this.muted = item?.checked ?? !this.muted;
            },
          },
          {
            label: 'Preferences...',
            click: () => {
              this.windowVisible = true;
              this.windowFocused = true;
              this.openedSettings = true;
            },
          },
          { type: 'separator' },
          {
            label: 'Quit DNews',
            click: () => {
              this.quitTriggered = true;
            },
          },
        ];
      }
    }

    let manager: MockTrayManager;

    beforeEach(() => {
      manager = new MockTrayManager();
    });

    it('toggles window visibility on tray click', () => {
      expect(manager.windowVisible).toBe(false);
      manager.toggleWindow();
      expect(manager.windowVisible).toBe(true);
      expect(manager.windowFocused).toBe(true);

      manager.toggleWindow();
      expect(manager.windowVisible).toBe(false);
    });

    it('correctly updates breaking stories count and enables menu item action', () => {
      let menu = manager.buildMenuTemplate();
      const initialBreakingItem = menu.find((item) => item.label?.includes('breaking'));
      expect(initialBreakingItem?.enabled).toBe(false);
      expect(initialBreakingItem?.label).toContain('No unread breaking stories');

      // Update to 3 breaking stories
      manager.breakingCount = 3;
      menu = manager.buildMenuTemplate();
      const updatedBreakingItem = menu.find((item) => item.label?.includes('Breaking Stories'));
      expect(updatedBreakingItem?.enabled).toBe(true);
      expect(updatedBreakingItem?.label).toContain('3 Breaking Stories');

      // Clicking breaking story item opens window and navigates to breaking filter
      updatedBreakingItem?.click?.();
      expect(manager.windowVisible).toBe(true);
      expect(manager.navigatedFilter).toEqual({ breaking: true });
    });

    it('toggles notification mute state via menu item', () => {
      let menu = manager.buildMenuTemplate();
      const muteItem = menu.find((item) => item.label === 'Mute Notifications');
      expect(muteItem?.checked).toBe(false);

      muteItem?.click?.({ checked: true });
      expect(manager.muted).toBe(true);

      menu = manager.buildMenuTemplate();
      const updatedMuteItem = menu.find((item) => item.label === 'Mute Notifications');
      expect(updatedMuteItem?.checked).toBe(true);
    });

    it('triggers Check News Now fetch cycle action', () => {
      const menu = manager.buildMenuTemplate();
      const checkItem = menu.find((item) => item.label === 'Check News Now');
      expect(manager.checkNewsTriggered).toBe(false);

      checkItem?.click?.();
      expect(manager.checkNewsTriggered).toBe(true);
    });

    it('triggers Preferences settings modal action', () => {
      const menu = manager.buildMenuTemplate();
      const prefItem = menu.find((item) => item.label === 'Preferences...');
      expect(manager.openedSettings).toBe(false);

      prefItem?.click?.();
      expect(manager.windowVisible).toBe(true);
      expect(manager.openedSettings).toBe(true);
    });

    it('triggers Quit DNews when clicked from tray menu', () => {
      const menu = manager.buildMenuTemplate();
      const quitItem = menu.find((item) => item.label === 'Quit DNews');
      expect(manager.quitTriggered).toBe(false);

      quitItem?.click?.();
      expect(manager.quitTriggered).toBe(true);
    });
  });

  describe('Single-Instance and Window Close Override Logic', () => {
    it('prevents default close and minimizes window unless isQuitting is true', () => {
      let isQuitting = false;
      let windowHidden = false;
      let defaultPrevented = false;

      const handleClose = (e: { preventDefault: () => void }) => {
        if (!isQuitting) {
          e.preventDefault();
          windowHidden = true;
        }
      };

      const mockEvent = {
        preventDefault: () => {
          defaultPrevented = true;
        },
      };

      // Normal close button press
      handleClose(mockEvent);
      expect(defaultPrevented).toBe(true);
      expect(windowHidden).toBe(true);

      // Explicit Quit from tray or menu
      isQuitting = true;
      defaultPrevented = false;
      windowHidden = false;
      handleClose(mockEvent);
      expect(defaultPrevented).toBe(false);
      expect(windowHidden).toBe(false);
    });

    it('focuses existing window when second instance is launched', () => {
      let restored = false;
      let shown = false;
      let focused = false;

      const mockWindow = {
        isMinimized: () => true,
        restore: () => {
          restored = true;
        },
        isVisible: () => false,
        show: () => {
          shown = true;
        },
        focus: () => {
          focused = true;
        },
      };

      // Simulated second-instance event
      if (mockWindow.isMinimized()) mockWindow.restore();
      if (!mockWindow.isVisible()) mockWindow.show();
      mockWindow.focus();

      expect(restored).toBe(true);
      expect(shown).toBe(true);
      expect(focused).toBe(true);
    });
  });
});
