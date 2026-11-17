/**
 * electron/main.ts
 * Electron Main Process for DNews (PRD E Category 6, 7, 8).
 *
 * Responsibilities:
 * 1. Single-instance lock (app.requestSingleInstanceLock).
 * 2. Set DNEWS_APP_DATA_DIR to %APPDATA%\DNews before spawning backend.
 * 3. Spawn Express backend process with local SQLite isolation.
 * 4. Health-check wait on 127.0.0.1:3001/api/health before showing window.
 * 5. Window bounds persistence in %APPDATA%\DNews\window-state.json.
 * 6. System Tray management with minimize-to-tray & Quit action.
 * 7. IPC Bridge for version, notifications, external browser links.
 * 8. Graceful shutdown with WAL checkpoint flush.
 */
import { app, BrowserWindow, Menu, Tray, ipcMain, shell, Notification, screen, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn, type ChildProcess } from 'child_process';
import http from 'http';
import { TrayManager } from './tray';
import { AppUpdater } from './updater';

// App Identity
const APP_NAME = 'DNews';
const APP_ID = 'com.dnews.app';
app.name = APP_NAME;
app.setAppUserModelId(APP_ID);

// Paths & Directories (Ensure log file exists before single instance check)
const APP_DATA_ROOT = path.join(app.getPath('appData'), 'DNews');
if (!fs.existsSync(APP_DATA_ROOT)) {
  fs.mkdirSync(APP_DATA_ROOT, { recursive: true });
}
const LOGS_DIR = path.join(APP_DATA_ROOT, 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
const DESKTOP_LOG_FILE = path.join(LOGS_DIR, 'desktop.log');

export function logDesktop(message: string): void {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(DESKTOP_LOG_FILE, `[${timestamp}] ${message}\n`);
  } catch {
    // Ignore logging errors
  }
}

logDesktop('=== DNews Application Initializing ===');

// 1. Single-Instance Lock (PRD E Category 8)
const hasSingleInstanceLock = app.requestSingleInstanceLock();
logDesktop(`Single-instance lock status: ${hasSingleInstanceLock}`);
if (!hasSingleInstanceLock) {
  console.log('[Electron] Another instance of DNews is already running. Focusing existing window and exiting.');
  logDesktop('Another instance already running. Exiting cleanly.');
  app.quit();
  process.exit(0);
}

// Global State
let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
let appUpdater: AppUpdater | null = null;
let backendProcess: ChildProcess | null = null;
let isQuitting = false;

const WINDOW_STATE_FILE = path.join(APP_DATA_ROOT, 'window-state.json');
const USER_ENV_FILE = path.join(APP_DATA_ROOT, 'user.env');

// In-App Secrets Manager (PRD E Category 11): Load user.env secrets before backend spawn
function loadUserEnv(): void {
  try {
    if (fs.existsSync(USER_ENV_FILE)) {
      const content = fs.readFileSync(USER_ENV_FILE, 'utf-8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const k = trimmed.slice(0, idx).trim();
            const v = trimmed.slice(idx + 1).trim();
            if (k && v) {
              process.env[k] = v;
            }
          }
        }
      });
      console.log('[Electron] Successfully loaded user secrets from', USER_ENV_FILE);
    }
  } catch (err) {
    console.warn('[Electron] Failed to read user.env:', err);
  }
}
loadUserEnv();

// Propagate environment variables for backend child process
process.env['DNEWS_APP_DATA_DIR'] = APP_DATA_ROOT;
process.env['PORT'] = '3001';
process.env['HOST'] = '127.0.0.1';
process.env['NODE_ENV'] = app.isPackaged ? 'production' : 'development';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

function loadWindowState(): WindowState {
  const defaultState: WindowState = { width: 1440, height: 900, isMaximized: false };
  try {
    if (fs.existsSync(WINDOW_STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, 'utf-8'));
      if (typeof data.width === 'number' && typeof data.height === 'number') {
        return data;
      }
    }
  } catch {
    // fallback to defaults
  }
  return defaultState;
}

function saveWindowState(): void {
  if (!mainWindow) return;
  try {
    const isMaximized = mainWindow.isMaximized();
    if (!isMaximized) {
      const bounds = mainWindow.getBounds();
      fs.writeFileSync(
        WINDOW_STATE_FILE,
        JSON.stringify({
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
          isMaximized: false,
        }),
      );
    } else {
      fs.writeFileSync(
        WINDOW_STATE_FILE,
        JSON.stringify({
          width: 1440,
          height: 900,
          isMaximized: true,
        }),
      );
    }
  } catch {
    // ignore write errors during shutdown
  }
}

/**
 * Spawns the Express backend as a dedicated background child process.
 */
function spawnBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const candidates = app.isPackaged
      ? [
          path.join(process.resourcesPath, 'backend', 'dist', 'backend', 'src', 'index.js'),
          path.join(process.resourcesPath, 'backend', 'dist', 'index.js'),
          path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'dist', 'backend', 'src', 'index.js'),
          path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'dist', 'index.js'),
          path.join(app.getAppPath(), 'backend', 'dist', 'backend', 'src', 'index.js'),
          path.join(app.getAppPath(), 'backend', 'dist', 'index.js'),
        ]
      : [
          path.resolve(__dirname, '../../backend/dist/backend/src/index.js'),
          path.resolve(__dirname, '../../backend/dist/index.js'),
        ];
    const backendScript = candidates.find((p) => fs.existsSync(p)) || candidates[0];

    console.log(`[Electron] Starting backend process at: ${backendScript}`);
    logDesktop(`Starting backend process at: ${backendScript}`);

    // If running in development and script doesn't exist yet, warn but proceed
    if (!fs.existsSync(backendScript) && !app.isPackaged) {
      console.warn(`[Electron] Backend build not found at ${backendScript}. Assuming external dev server.`);
      logDesktop(`Backend build not found at ${backendScript}. Assuming external dev server.`);
      resolve();
      return;
    }

    try {
      // Runtime selection:
      // 1. Dedicated bundled Node runtime (process.resourcesPath/bin/node.exe)
      // 2. System Node.js binary
      // 3. Bundled Electron runtime (ELECTRON_RUN_AS_NODE=1)
      let runtimeBinary = process.execPath;
      let isElectronRunner = true;

      const bundledNode = path.join(process.resourcesPath, 'bin', 'node.exe');
      if (app.isPackaged && fs.existsSync(bundledNode)) {
        runtimeBinary = bundledNode;
        isElectronRunner = false;
        logDesktop(`Found bundled private Node.js runtime at ${bundledNode}`);
      } else {
        try {
          const { execSync } = require('child_process');
          const nodeVer = execSync('node -v', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }).toString().trim();
          if (nodeVer.startsWith('v')) {
            runtimeBinary = 'node';
            isElectronRunner = false;
            logDesktop(`Found system Node.js (${nodeVer}), utilizing system runtime for backend`);
          }
        } catch {
          logDesktop('System Node.js not detected; falling back to bundled Electron Node runtime');
        }
      }

      const nodePath = app.isPackaged
        ? [
            path.join(process.resourcesPath, 'backend', 'dist', 'node_modules'),
            path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'dist', 'node_modules'),
            path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules'),
            path.join(process.resourcesPath, 'app.asar', 'node_modules'),
            path.join(app.getAppPath(), 'node_modules'),
          ].join(path.delimiter)
        : process.env['NODE_PATH'];

      logDesktop(`Spawning backend using ${runtimeBinary} (isElectronRunner=${isElectronRunner}) with NODE_PATH=${nodePath}`);

      backendProcess = spawn(runtimeBinary, [backendScript], {
        env: {
          ...process.env,
          ...(isElectronRunner ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
          ...(nodePath ? { NODE_PATH: nodePath } : {}),
          DNEWS_APP_DATA_DIR: APP_DATA_ROOT,
          PORT: '3001',
          HOST: '127.0.0.1',
          FRONTEND_DIST: app.isPackaged
            ? path.join(process.resourcesPath, 'frontend', 'dist')
            : path.resolve(__dirname, '../../frontend/dist'),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      backendProcess.stdout?.on('data', (data) => {
        const str = data.toString();
        process.stdout.write(`[Backend] ${str}`);
        logDesktop(`[Backend] ${str.trim()}`);
      });

      backendProcess.stderr?.on('data', (data) => {
        const str = data.toString();
        process.stderr.write(`[Backend:Err] ${str}`);
        logDesktop(`[Backend:Err] ${str.trim()}`);
      });

      backendProcess.on('error', (err) => {
        console.error('[Electron] Backend process error:', err);
        logDesktop(`[Backend:Error] ${err.message}`);
      });

      backendProcess.on('exit', (code, signal) => {
        console.log(`[Electron] Backend process exited with code=${code}, signal=${signal}`);
        logDesktop(`[Backend:Exit] code=${code}, signal=${signal}`);
        backendProcess = null;
      });

      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Polls http://127.0.0.1:3001/api/health until server responds.
 */
function waitForBackendHealth(timeoutMs = 60000): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get('http://127.0.0.1:3001/api/health', (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else if (Date.now() - start < timeoutMs) {
          setTimeout(check, 300);
        } else {
          resolve(false);
        }
      });

      req.on('error', () => {
        if (Date.now() - start < timeoutMs) {
          setTimeout(check, 300);
        } else {
          resolve(false);
        }
      });

      req.setTimeout(1000, () => {
        req.destroy();
        if (Date.now() - start < timeoutMs) {
          setTimeout(check, 300);
        } else {
          resolve(false);
        }
      });
    };

    check();
  });
}

/**
 * Creates the primary application BrowserWindow.
 */
function createMainWindow(): void {
  const state = loadWindowState();
  const iconPath = path.resolve(__dirname, '../../assets/icon.ico');

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 680,
    title: 'DNews — The Daily Bugle',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#FAF7F0', // Cream broadsheet background prevents white flash
    show: false,                // Wait until ready-to-show to prevent flicker
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  // Intercept external links and open in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Load URL
  if (!app.isPackaged && process.env['ELECTRON_START_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_START_URL']);
  } else if (!app.isPackaged && process.env['NODE_ENV'] === 'development') {
    // In local dev, try 5173, fallback to backend 3001
    void mainWindow.loadURL('http://localhost:5173').catch(() => {
      void mainWindow?.loadURL('http://127.0.0.1:3001');
    });
  } else {
    // Packaged production mode: connect to Express server at 127.0.0.1:3001 which serves frontend and API.
    // Never fall back immediately to file:// on initial connection failure; retry with backoff.
    const targetUrl = 'http://127.0.0.1:3001';
    let loaded = false;
    const tryLoad = async (retries = 60) => {
      if (loaded || !mainWindow || mainWindow.isDestroyed()) return;
      try {
        await mainWindow.loadURL(targetUrl);
        loaded = true;
        logDesktop('Successfully loaded http://127.0.0.1:3001 into BrowserWindow');
      } catch (err) {
        logDesktop(`BrowserWindow connection to ${targetUrl} pending (${retries} attempts left): ${String(err)}`);
        if (retries > 0) {
          setTimeout(() => void tryLoad(retries - 1), 500);
        } else {
          logDesktop('Retries exhausted for http://127.0.0.1:3001. Falling back to local file load as emergency measure.');
          const indexPath = path.resolve(__dirname, '../../frontend/dist/index.html');
          void mainWindow?.loadFile(indexPath);
        }
      }
    };
    void tryLoad();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Window bounds tracking
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  // Minimize to Tray on Close (User choice in PRD E)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      saveWindowState();
      mainWindow?.hide();
      if (Notification.isSupported()) {
        new Notification({
          title: 'DNews Minimized',
          body: 'DNews is running in the system tray. Click the tray icon to restore.',
          icon: fs.existsSync(iconPath) ? iconPath : undefined,
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initializes the System Tray icon and context menu (PRD E Category 7).
 */
function createTray(): void {
  trayManager = new TrayManager({
    getMainWindow: () => mainWindow,
    onCheckNews: () => {
      console.log('[Electron:Tray] Triggering immediate news fetch cycle...');
      const req = http.request('http://127.0.0.1:3001/api/control-room/fetch-cycle', { method: 'POST' });
      req.on('error', (err) => console.warn('[Electron:Tray] Fetch cycle request error:', err.message));
      req.end();
    },
    onQuit: () => {
      isQuitting = true;
      app.quit();
    },
  });
  trayManager.init();
}

/**
 * Builds the application desktop menu.
 */
function createMenu(): void {
  const isMac = process.platform === 'darwin';
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Minimize to Tray',
          accelerator: 'CmdOrCtrl+M',
          click: () => mainWindow?.hide(),
        },
        { type: 'separator' },
        {
          label: 'Quit DNews',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => {
            appUpdater?.checkForUpdates();
          },
        },
        { type: 'separator' },
        {
          label: 'About DNews',
          click: () => {
            const version = app.getVersion();
            if (mainWindow) {
              void shell.openExternal('https://github.com/itsdattpatel/DNews_G');
            }
          },
        },
      ],
    },
  ];

  if (!app.isPackaged) {
    template[1].submenu.push({ type: 'separator' }, { role: 'toggleDevTools' });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-app-data-dir', () => APP_DATA_ROOT);
ipcMain.handle('open-external', (_event, url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    void shell.openExternal(url);
  }
});
ipcMain.on(
  'show-notification',
  (
    _event,
    {
      title,
      body,
      action,
    }: { title: string; body: string; action?: { type?: string; id?: number } },
  ) => {
    if (trayManager?.isMuted()) return;
    if (Notification.isSupported()) {
      const iconPath = path.resolve(__dirname, '../../assets/icon.ico');
      const notification = new Notification({
        title,
        body,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
      });

      notification.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          if (!mainWindow.isVisible()) mainWindow.show();
          mainWindow.focus();
          if (action) {
            mainWindow.webContents.send('notification-action', action);
          }
        }
      });

      notification.show();
    }
  },
);
ipcMain.on('quit-app', () => {
  isQuitting = true;
  app.quit();
});

// App Lifecycle
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  console.log('[Electron] App ready, launching DNews desktop environment...');
  logDesktop('App ready, launching DNews desktop environment...');

  // Bypass YouTube and media embed restrictions in Electron (PRD Live News Embed Resilience)
  try {
    const youtubeFilter = {
      urls: [
        '*://*.youtube.com/*',
        '*://*.youtube-nocookie.com/*',
        '*://*.googlevideo.com/*',
      ],
    };

    session.defaultSession.webRequest.onBeforeSendHeaders(youtubeFilter, (details, callback) => {
      const requestHeaders = { ...details.requestHeaders };
      requestHeaders['Referer'] = 'https://www.youtube.com/';
      requestHeaders['Origin'] = 'https://www.youtube.com';
      requestHeaders['Sec-Fetch-Site'] = 'same-origin';
      callback({ requestHeaders });
    });

    session.defaultSession.webRequest.onHeadersReceived(youtubeFilter, (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };
      delete responseHeaders['x-frame-options'];
      delete responseHeaders['X-Frame-Options'];

      if (responseHeaders['content-security-policy']) {
        responseHeaders['content-security-policy'] = responseHeaders['content-security-policy'].map((csp) =>
          csp.replace(/frame-ancestors[^;]+;?/gi, '')
        );
      }
      if (responseHeaders['Content-Security-Policy']) {
        responseHeaders['Content-Security-Policy'] = responseHeaders['Content-Security-Policy'].map((csp) =>
          csp.replace(/frame-ancestors[^;]+;?/gi, '')
        );
      }

      callback({ responseHeaders });
    });
    logDesktop('Configured YouTube embed Referer/Origin webRequest filters.');
  } catch (err: any) {
    logDesktop(`Failed to register YouTube webRequest filters: ${err.message}`);
  }

  createMenu();
  createTray();

  try {
    await spawnBackend();
    const healthy = await waitForBackendHealth();
    if (healthy) {
      console.log('[Electron] Backend health check PASSED (127.0.0.1:3001/api/health is online).');
      logDesktop('Backend health check PASSED (127.0.0.1:3001/api/health is online).');
    } else {
      console.warn('[Electron] Backend health check timed out. Creating window regardless.');
      logDesktop('Backend health check TIMED OUT (127.0.0.1:3001/api/health unreachable). Creating window regardless.');
    }
  } catch (err) {
    console.error('[Electron] Failed to start backend:', err);
    logDesktop(`[Electron] Failed to start backend: ${err instanceof Error ? err.stack || err.message : String(err)}`);
  }

  createMainWindow();

  // Initialize auto-updater (PRD E Category 9)
  appUpdater = new AppUpdater(() => mainWindow);
  // Silent background check 3 seconds after startup
  setTimeout(() => {
    appUpdater?.checkForUpdates();
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Graceful Shutdown (PRD E Category 8)
app.on('before-quit', (event) => {
  if (!isQuitting) {
    isQuitting = true;
  }

  if (trayManager) {
    trayManager.destroy();
    trayManager = null;
  }

  if (backendProcess && !backendProcess.killed) {
    console.log('[Electron] Terminating backend process gracefully...');
    try {
      backendProcess.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});
