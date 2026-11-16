/**
 * scripts/verify-prd-e-cat5-watchdog.cjs
 * Visual validation for PRD E Category 5: Offline Resilience & 15-Second Watchdog.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ARTIFACT_DIR = path.resolve('C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f');
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404 || res.status === 200) return true;
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function run() {
  console.log('--- Starting Frontend Dev Server ---');
  const frontend = spawn('cmd.exe', ['/c', 'npm', 'run', 'dev', '--', '--port', '5173'], {
    cwd: path.resolve(__dirname, '../frontend'),
    stdio: 'ignore',
  });

  try {
    const ready = await waitForServer('http://localhost:5173', 25000);
    if (!ready) {
      throw new Error('Frontend server failed to start within timeout');
    }
    console.log('Frontend server is online at http://localhost:5173');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });

    await context.addInitScript(() => {
      sessionStorage.setItem('missed_news_dismissed', 'true');
      localStorage.setItem('missed_news_dismissed', 'true');
      sessionStorage.setItem('dismissed_welcome_back', '1');
      localStorage.setItem('dismissed_welcome_back', '1');
    });

    const page = await context.newPage();
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. Capture Normal Online Status Strip
    console.log('1. Capturing Normal Online Status Strip...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-prd-e-cat5-status-strip-online.png'),
    });

    // 2. Simulate Offline Transition
    console.log('2. Simulating Network Loss (Offline)...');
    await page.evaluate(() => {
      if (window.__APP_STORE__) {
        window.__APP_STORE__.getState().setConnectivityOnline(false);
      }
    });
    await page.waitForSelector('[data-testid="status-strip-offline-chip"]', { timeout: 5000 });
    await page.waitForTimeout(500);

    console.log('Capturing Offline Status Strip with 15s Watchdog Indicator...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-prd-e-cat5-status-strip-offline.png'),
    });

    // 3. Simulate Reconnect Transition
    console.log('3. Simulating Reconnection (Back Online)...');
    await page.evaluate(() => {
      if (window.__APP_STORE__) {
        window.__APP_STORE__.getState().setConnectivityOnline(true);
      }
    });
    await page.waitForSelector('[data-testid="status-strip-reconnected-chip"]', { timeout: 5000 });
    await page.waitForTimeout(500);

    console.log('Capturing Reconnected Status Strip...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-prd-e-cat5-status-strip-reconnected.png'),
    });

    // 4. Night Edition Offline State
    console.log('4. Capturing Night Edition Offline State...');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'night');
      if (window.__APP_STORE__) {
        window.__APP_STORE__.getState().setTheme('night');
        window.__APP_STORE__.getState().setConnectivityOnline(false);
      }
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-prd-e-cat5-night-offline.png'),
    });

    await browser.close();
    console.log('All visual validation screenshots captured successfully!');
  } finally {
    try {
      frontend.kill();
      // On Windows kill tree
      spawn('taskkill', ['/pid', frontend.pid.toString(), '/f', '/t']);
    } catch {
      // ignore
    }
  }
}

run().catch((err) => {
  console.error('Visual validation error:', err);
  process.exit(1);
});
