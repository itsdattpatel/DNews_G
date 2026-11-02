const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function verifyCategory8() {
  console.log('[Verify Cat 8] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('[Verify Cat 8] Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Set Paper theme
  await page.evaluate(() => {
    localStorage.setItem('news_desk_theme', 'paper');
    document.documentElement.setAttribute('data-theme', 'paper');
    const shell = document.getElementById('app-shell');
    if (shell) shell.setAttribute('data-theme', 'paper');
  });
  await page.waitForTimeout(500);

  // 1. Wait for Feed Counter button to load with real data
  console.log('[Verify Cat 8] Waiting for #btn-topbar-feed-counter...');
  await page.waitForSelector('#btn-topbar-feed-counter', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Capture Screenshot 1: TopBar with Live Feed Counter button
  const shot1 = path.join(ARTIFACTS_DIR, 'ui-step8-feed-counter-button.png');
  await page.screenshot({ path: shot1 });
  console.log('[Verify Cat 8] Captured Screenshot 1:', shot1);

  // 2. Click Feed Counter button to open the telemetry popover
  console.log('[Verify Cat 8] Clicking Feed Counter button to open popover...');
  await page.click('#btn-topbar-feed-counter');
  await page.waitForSelector('#feed-counter-popover', { timeout: 5000 });
  await page.waitForTimeout(800);

  // Capture Screenshot 2: Feed Counter Popover (Paper Edition)
  const shot2 = path.join(ARTIFACTS_DIR, 'ui-step8-feed-counter-popover-paper.png');
  await page.screenshot({ path: shot2 });
  console.log('[Verify Cat 8] Captured Screenshot 2:', shot2);

  // 3. Switch to Night Edition Theme
  console.log('[Verify Cat 8] Switching to Night Edition Theme...');
  await page.evaluate(() => {
    localStorage.setItem('news_desk_theme', 'night');
    document.documentElement.setAttribute('data-theme', 'night');
    const shell = document.getElementById('app-shell');
    if (shell) shell.setAttribute('data-theme', 'night');
  });
  await page.waitForTimeout(800);

  // Capture Screenshot 3: Feed Counter Popover (Night Edition)
  const shot3 = path.join(ARTIFACTS_DIR, 'ui-step8-feed-counter-popover-night.png');
  await page.screenshot({ path: shot3 });
  console.log('[Verify Cat 8] Captured Screenshot 3:', shot3);

  await browser.close();
  console.log('[Verify Cat 8] All visual validations and screenshots complete.');
}

verifyCategory8().catch((err) => {
  console.error('[Verify Cat 8] Error during validation:', err);
  process.exit(1);
});
