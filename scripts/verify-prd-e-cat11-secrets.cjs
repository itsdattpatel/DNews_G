/**
 * scripts/verify-prd-e-cat11-secrets.cjs
 * Visual validation for PRD E Category 11: In-App Secrets Manager in Settings.
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
      // retry
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function run() {
  console.log('--- Starting Frontend Dev Server for Category 11 Visual Validation ---');
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

    // Open Settings dialog
    console.log('1. Opening Settings dialog...');
    await page.evaluate(() => {
      if (window.useAppStore) {
        window.useAppStore.getState().setSettingsOpen(true);
      }
    });
    await page.waitForTimeout(1000);

    // Switch to AI & Plain mode section
    console.log('2. Navigating to AI & Plain mode tab...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const aiBtn = buttons.find((b) => b.textContent && b.textContent.includes('AI and Plain mode'));
      if (aiBtn) aiBtn.click();
    });
    await page.waitForTimeout(800);

    // Capture Paper Theme Secrets Manager
    console.log('3. Capturing Screenshot 1: In-App Secrets Manager (Paper Theme)...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-prd-e-cat11-secrets-manager-paper.png'),
    });

    // Toggle Night Edition theme
    console.log('4. Switching to Night Edition Theme...');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'night');
    });
    await page.waitForTimeout(500);

    console.log('5. Capturing Screenshot 2: In-App Secrets Manager (Night Edition)...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-prd-e-cat11-secrets-manager-night.png'),
    });

    await browser.close();
    console.log('Category 11 Visual Validation completed successfully!');
  } finally {
    try {
      process.kill(-frontend.pid);
    } catch {
      frontend.kill('SIGTERM');
    }
  }
}

run().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
