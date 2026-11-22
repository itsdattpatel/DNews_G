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
import net from 'net';
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
let activeBackendPort = 3001;
let backendCrashed = false;
let isBackendHealthy = false;

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
 * Probes http://127.0.0.1:<port>/api/health with a quick timeout.
 */
function checkPortHealth(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Checks if a port is completely available for binding on 127.0.0.1.
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Proactively checks port 3001 and scans for alternates if conflict is detected.
 */
async function resolveBackendPort(defaultPort = 3001): Promise<{ port: number; reuseRunning: boolean }> {
  // 1. Is defaultPort already running a healthy DNews backend?
  const isHealthy = await checkPortHealth(defaultPort);
  if (isHealthy) {
    logDesktop(`Healthy DNews backend already detected on port ${defaultPort}. Reusing existing instance.`);
    return { port: defaultPort, reuseRunning: true };
  }

  // 2. Is defaultPort free to bind?
  const available = await isPortAvailable(defaultPort);
  if (available) {
    return { port: defaultPort, reuseRunning: false };
  }

  // 3. Port 3001 is occupied by an unresponsive or conflicting process. Find next free port between 3002 and 3010.
  logDesktop(`Port ${defaultPort} is occupied and not responding to health check. Scanning for alternate port...`);
  for (let candidate = defaultPort + 1; candidate <= defaultPort + 10; candidate++) {
    const candidateHealthy = await checkPortHealth(candidate);
    if (candidateHealthy) {
      logDesktop(`Healthy backend found on alternate port ${candidate}. Reusing.`);
      return { port: candidate, reuseRunning: true };
    }
    const candidateFree = await isPortAvailable(candidate);
    if (candidateFree) {
      logDesktop(`Found free alternate port ${candidate} for backend process.`);
      return { port: candidate, reuseRunning: false };
    }
  }

  return { port: defaultPort, reuseRunning: false };
}

/**
 * Resolves the true location of index.html in both packaged and local development modes.
 */
function getPackagedIndexPath(): string | null {
  const candidates = [
    path.join(process.resourcesPath, 'frontend', 'dist', 'index.html'),
    path.join(app.getAppPath(), 'frontend', 'dist', 'index.html'),
    path.resolve(__dirname, '../../frontend/dist/index.html'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  logDesktop(`getPackagedIndexPath resolved: ${found || 'NONE_FOUND'}`);
  return found || null;
}

/**
 * Spawns the Express backend as a dedicated background child process.
 */
function spawnBackend(port = 3001): Promise<void> {
  return new Promise((resolve, reject) => {
    backendCrashed = false;
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

    console.log(`[Electron] Starting backend process on port ${port} at: ${backendScript}`);
    logDesktop(`Starting backend process on port ${port} at: ${backendScript}`);

    // If running in development and script doesn't exist yet, warn but proceed
    if (!fs.existsSync(backendScript) && !app.isPackaged) {
      console.warn(`[Electron] Backend build not found at ${backendScript}. Assuming external dev server.`);
      logDesktop(`Backend build not found at ${backendScript}. Assuming external dev server.`);
      resolve();
      return;
    }

    try {
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

      logDesktop(`Spawning backend using ${runtimeBinary} (port=${port}, isElectronRunner=${isElectronRunner}) with NODE_PATH=${nodePath}`);

      backendProcess = spawn(runtimeBinary, [backendScript], {
        env: {
          ...process.env,
          ...(isElectronRunner ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
          ...(nodePath ? { NODE_PATH: nodePath } : {}),
          DNEWS_APP_DATA_DIR: APP_DATA_ROOT,
          PORT: String(port),
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
        backendCrashed = true;
      });

      backendProcess.on('exit', (code, signal) => {
        console.log(`[Electron] Backend process exited with code=${code}, signal=${signal}`);
        logDesktop(`[Backend:Exit] code=${code}, signal=${signal}`);
        backendCrashed = true;
        backendProcess = null;
      });

      resolve();
    } catch (err) {
      backendCrashed = true;
      reject(err);
    }
  });
}

/**
 * Polls http://127.0.0.1:<port>/api/health until server responds or child process exits.
 */
function waitForBackendHealth(port = 3001, timeoutMs = 8000): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (backendCrashed) {
        logDesktop('Backend process crashed during startup; aborting health check early.');
        resolve(false);
        return;
      }

      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else if (Date.now() - start < timeoutMs) {
          setTimeout(check, 250);
        } else {
          resolve(false);
        }
      });

      req.on('error', () => {
        if (backendCrashed) {
          resolve(false);
        } else if (Date.now() - start < timeoutMs) {
          setTimeout(check, 250);
        } else {
          resolve(false);
        }
      });

      req.setTimeout(800, () => {
        req.destroy();
        if (backendCrashed) {
          resolve(false);
        } else if (Date.now() - start < timeoutMs) {
          setTimeout(check, 250);
        } else {
          resolve(false);
        }
      });
    };

    check();
  });
}

/**
 * Inline Broadsheet Startup Splash Screen (PRD_FRESH_NEWS_PIPELINE)
 * Prevents blank cream or white flash during Node.js/SQLite cold-start.
 */
function getStartupSplashHtml(): string {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DNews — The Daily Bugle</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #FAF7F0;
      color: #1A1208;
      font-family: "Georgia", "Times New Roman", serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      user-select: none;
      -webkit-user-select: none;
      text-align: center;
      padding: 32px;
      overflow: hidden;
    }
    .masthead-frame {
      border: 3px double #1A1208;
      padding: 36px 48px;
      max-width: 620px;
      width: 100%;
      background: #F4EFEA;
      box-shadow: 0 4px 20px rgba(26,18,8,0.08);
      position: relative;
    }
    .date-bar {
      border-bottom: 1px solid #1A1208;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      padding-bottom: 8px;
      margin-bottom: 18px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 600;
      color: #5C4E3A;
    }
    h1 {
      font-size: 40px;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      font-weight: 700;
      line-height: 1.1;
      color: #1A1208;
    }
    .motto {
      font-style: italic;
      font-size: 14px;
      color: #5C4E3A;
      margin-bottom: 24px;
      border-bottom: 1px solid #1A1208;
      padding-bottom: 16px;
    }
    .spinner-ring {
      width: 32px;
      height: 32px;
      border: 3px solid #D9D0BE;
      border-top-color: #C0392B;
      border-radius: 50%;
      animation: spin 0.85s linear infinite;
      margin: 0 auto 16px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .status-text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: #1A1208;
      text-transform: uppercase;
    }
    .status-sub {
      font-size: 12px;
      color: #9A8878;
      margin-top: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div class="masthead-frame">
    <div class="date-bar">AI World News Desk &bull; Broadsheet Edition</div>
    <h1>The Daily Bugle</h1>
    <div class="motto">&ldquo;Uncompromising Real-Time Global Intelligence&rdquo;</div>
    <div class="spinner-ring"></div>
    <div class="status-text">Preparing Broadside Press &amp; Editorial Desks...</div>
    <div class="status-sub">Connecting local news intelligence engine</div>
  </div>
</body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

/**
 * Creates the primary application BrowserWindow.
 */
function createMainWindow(port = 3001, backendHealthy = false): void {
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
      webSecurity: false,       // Allows seamless local fallback & cross-origin proxy resilience
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

  // Comprehensive renderer diagnostics (PRD E Desktop Resilience)
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logDesktop(`Renderer failed to load: ${validatedURL} (code: ${errorCode}, desc: ${errorDescription})`);
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      logDesktop(`[Renderer Console L${level}] ${message} (${sourceId}:${line})`);
    }
  });

  const loadLocalFallback = () => {
    const indexPath = getPackagedIndexPath();
    if (indexPath && mainWindow && !mainWindow.isDestroyed()) {
      logDesktop(`Loading packaged broadsheet index directly: ${indexPath}`);
      void mainWindow.loadFile(indexPath).then(() => {
        if (mainWindow && !mainWindow.isVisible()) {
          mainWindow.show();
          mainWindow.focus();
        }
      });
    } else {
      logDesktop('CRITICAL: Packaged index.html not found among candidates!');
    }
  };

  const targetUrl = `http://127.0.0.1:${port}`;
  let liveLoaded = false;
  let supervisorTimer: NodeJS.Timeout | null = null;

  const navigateToLive = async () => {
    if (liveLoaded || !mainWindow || mainWindow.isDestroyed()) return;
    try {
      await mainWindow.loadURL(targetUrl);
      liveLoaded = true;
      logDesktop(`Successfully connected and navigated to live backend at ${targetUrl}`);
      if (supervisorTimer) {
        clearInterval(supervisorTimer);
        supervisorTimer = null;
      }
    } catch (err) {
      logDesktop(`Navigation to ${targetUrl} pending: ${String(err)}`);
    }
  };

  // Continuous Connection Supervisor: polls backend health and hot-hands-off the moment it turns ready
  const startSupervisor = () => {
    if (supervisorTimer) clearInterval(supervisorTimer);
    let attempts = 0;
    const maxAttempts = 120; // 60 seconds total at 500ms intervals

    supervisorTimer = setInterval(async () => {
      attempts++;
      if (liveLoaded || !mainWindow || mainWindow.isDestroyed()) {
        if (supervisorTimer) clearInterval(supervisorTimer);
        return;
      }

      const healthy = await checkPortHealth(port);
      if (healthy) {
        logDesktop(`Connection supervisor detected healthy backend on attempt #${attempts}. Navigating...`);
        isBackendHealthy = true;
        await navigateToLive();
      } else if (attempts >= maxAttempts) {
        logDesktop(`Connection supervisor exhausted ${maxAttempts} attempts. Falling back to local file.`);
        if (supervisorTimer) clearInterval(supervisorTimer);
        loadLocalFallback();
      }
    }, 500);
  };

  // Load URL
  if (!app.isPackaged && process.env['ELECTRON_START_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_START_URL']);
  } else if (!app.isPackaged && process.env['NODE_ENV'] === 'development') {
    // In local dev, try 5173, fallback to backend port
    void mainWindow.loadURL('http://localhost:5173').catch(() => {
      void mainWindow?.loadURL(`http://127.0.0.1:${port}`);
    });
  } else {
    // Packaged production mode:
    if (backendHealthy) {
      void navigateToLive();
    } else {
      // Backend is still warming up Node/SQLite; show authentic broadsheet startup splash
      logDesktop('Backend is initializing. Displaying broadsheet startup splash screen...');
      void mainWindow.loadURL(getStartupSplashHtml());
      startSupervisor();
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Safety fallback: if ready-to-show has not fired in 1500ms, force show
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      logDesktop('Forcing mainWindow.show() via safety fallback timeout');
      mainWindow.show();
      mainWindow.focus();
    }
  }, 1500);

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
      console.log(`[Electron:Tray] Triggering immediate news fetch cycle on port ${activeBackendPort}...`);
      const req = http.request(`http://127.0.0.1:${activeBackendPort}/api/control-room/fetch-cycle`, { method: 'POST' });
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
ipcMain.handle('get-backend-port', () => activeBackendPort);
ipcMain.handle('get-backend-healthy', () => isBackendHealthy);
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
    const { port, reuseRunning } = await resolveBackendPort(3001);
    activeBackendPort = port;
    if (reuseRunning) {
      isBackendHealthy = true;
      logDesktop(`Reusing healthy backend on 127.0.0.1:${activeBackendPort}`);
    } else {
      await spawnBackend(activeBackendPort);
      // Spawn is started. We open window immediately with broadsheet splash,
      // and allow up to 45 seconds for cold-start database check
      void waitForBackendHealth(activeBackendPort, 45000).then((healthy) => {
        if (healthy) {
          isBackendHealthy = true;
          logDesktop(`Backend health check PASSED (127.0.0.1:${activeBackendPort}/api/health online)`);
        } else {
          logDesktop(`Backend health check timed out on port ${activeBackendPort}.`);
        }
      });
    }
  } catch (err) {
    console.error('[Electron] Failed to initialize backend:', err);
    logDesktop(`[Electron] Failed to initialize backend: ${err instanceof Error ? err.stack || err.message : String(err)}`);
  }

  createMainWindow(activeBackendPort, isBackendHealthy);

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
