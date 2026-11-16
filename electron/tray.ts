/**
 * electron/tray.ts
 * System Tray management and dynamic menu for DNews (PRD E Category 7).
 */
import { Menu, Tray, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';

export interface TrayManagerOptions {
  getMainWindow: () => BrowserWindow | null;
  onCheckNews: () => void;
  onQuit: () => void;
}

export class TrayManager {
  private tray: Tray | null = null;
  private options: TrayManagerOptions;
  private breakingCount: number = 0;
  private indexedCount: number = 0;
  private muted: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(options: TrayManagerOptions) {
    this.options = options;
  }

  public init(): void {
    const trayIconPath = path.resolve(__dirname, '../../assets/icon-tray.png');
    const fallbackPath = path.resolve(__dirname, '../../assets/icon.ico');
    const chosenIcon = fs.existsSync(trayIconPath) ? trayIconPath : fallbackPath;

    if (!fs.existsSync(chosenIcon)) {
      console.warn('[TrayManager] Tray icon not found at', chosenIcon);
      return;
    }

    this.tray = new Tray(chosenIcon);
    this.tray.setToolTip('DNews — The Daily Bugle');

    // Left click toggles window
    this.tray.on('click', () => {
      const win = this.options.getMainWindow();
      if (win?.isVisible()) {
        win.hide();
      } else if (win) {
        win.show();
        win.focus();
      }
    });

    this.updateContextMenu();

    // Poll counts every 60s
    this.pollCounts();
    this.pollTimer = setInterval(() => this.pollCounts(), 60_000);
  }

  public updateCounts(breaking: number, total: number): void {
    this.breakingCount = breaking;
    this.indexedCount = total;
    this.updateContextMenu();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateContextMenu();
  }

  private pollCounts(): void {
    const req = http.get('http://127.0.0.1:3001/api/feed/counter', (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const data = JSON.parse(raw);
            const total = typeof data.total_articles_ingested === 'number' ? data.total_articles_ingested : 0;
            const breaking = typeof data.breaking_count === 'number' ? data.breaking_count : 0;
            this.breakingCount = breaking;
            this.indexedCount = total;
            this.updateContextMenu();
          }
        } catch {
          // ignore parsing error
        }
      });
    });
    req.on('error', () => {
      // ignore when backend is starting or offline
    });
    req.setTimeout(2000, () => req.destroy());
  }

  public updateContextMenu(): void {
    if (!this.tray) return;

    const breakingLabel = this.breakingCount > 0 
      ? `🚨 ${this.breakingCount} Breaking Stories` 
      : 'No unread breaking stories';
    const storiesLabel = this.indexedCount > 0 
      ? `📰 ${this.indexedCount.toLocaleString()} stories indexed` 
      : 'Indexing stories...';

    const menu = Menu.buildFromTemplate([
      {
        label: 'DNews — The Daily Bugle',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Open DNews',
        click: () => {
          const win = this.options.getMainWindow();
          if (win) {
            win.show();
            win.focus();
          }
        },
      },
      {
        label: 'Check News Now',
        click: () => {
          this.options.onCheckNews();
        },
      },
      { type: 'separator' },
      {
        label: breakingLabel,
        enabled: this.breakingCount > 0,
        click: () => {
          const win = this.options.getMainWindow();
          if (win) {
            win.show();
            win.focus();
            win.webContents.send('navigate-filter', { breaking: true });
          }
        },
      },
      {
        label: storiesLabel,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Mute Notifications',
        type: 'checkbox',
        checked: this.muted,
        click: (item) => {
          this.setMuted(item.checked);
        },
      },
      {
        label: 'Preferences...',
        click: () => {
          const win = this.options.getMainWindow();
          if (win) {
            win.show();
            win.focus();
            win.webContents.send('open-settings');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit DNews',
        click: () => {
          this.options.onQuit();
        },
      },
    ]);

    this.tray.setContextMenu(menu);
  }

  public destroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
