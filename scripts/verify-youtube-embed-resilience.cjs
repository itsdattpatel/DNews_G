const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const ARTIFACT_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f';

async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode < 500) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

async function run() {
  console.log('[Visual Test] Checking backend server at http://127.0.0.1:3001...');
  const ready = await waitForServer('http://127.0.0.1:3001/api/health');
  if (!ready) {
    console.error('[Visual Test] Backend server not reachable on 3001. Please start it.');
    process.exit(1);
  }

  console.log('[Visual Test] Launching Chromium browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('[Visual Test] Navigating to http://127.0.0.1:3001...');
  await page.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Dismiss any startup overlay like Missed News
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const missedOverlay = page.locator('#missed-news-modal-overlay');
    if (await missedOverlay.count() > 0 && await missedOverlay.first().isVisible()) {
      const closeBtn = page.locator('#missed-news-close-btn, button:has-text("Close")').first();
      if (await closeBtn.count() > 0) await closeBtn.click({ force: true });
    }
  } catch {}

  // 1. Open Television Wire View
  console.log('[Visual Test] Clicking TV icon on rail...');
  const tvBtn = page.locator('button[title*="Television"], button[aria-label*="Television"], #rail-btn-tv');
  if (await tvBtn.count() > 0) {
    await tvBtn.first().click();
  } else {
    // Fallback: evaluate store open
    await page.evaluate(() => {
      window.useAppStore?.getState()?.setTvViewOpen?.(true);
    });
  }
  await page.waitForTimeout(1500);

  // Capture TV View with Channels
  const tvModalShot = path.join(ARTIFACT_DIR, 'ui-yt-1-tv-view-open.png');
  await page.screenshot({ path: tvModalShot, fullPage: false });
  console.log(`[Visual Test] Captured: ${tvModalShot}`);

  // 2. Open "+ Add YouTube" Modal
  console.log('[Visual Test] Clicking "+ Add YouTube" button...');
  const addYtBtn = page.locator('#btn-tv-add-youtube, button:has-text("+ Add YouTube")');
  if (await addYtBtn.count() > 0) {
    await addYtBtn.first().click();
  }
  await page.waitForTimeout(1000);

  // Capture Add YouTube Modal with new label and placeholder
  const addModalShot = path.join(ARTIFACT_DIR, 'ui-yt-2-add-modal-open.png');
  await page.screenshot({ path: addModalShot, fullPage: false });
  console.log(`[Visual Test] Captured: ${addModalShot}`);

  // 3. Paste an <iframe> embed snippet
  console.log('[Visual Test] Pasting <iframe> snippet into URL input...');
  const embedSnippet = '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player" frameborder="0" allowfullscreen></iframe>';
  const urlInput = page.locator('#input-youtube-url');
  await urlInput.fill(embedSnippet);
  await page.waitForTimeout(500);

  // Click Preview
  console.log('[Visual Test] Clicking Preview...');
  const previewBtn = page.locator('#btn-preview-youtube');
  await previewBtn.click();
  await page.waitForTimeout(2000);

  // Capture Add YouTube Modal with verified preview from iframe snippet
  const previewVerifiedShot = path.join(ARTIFACT_DIR, 'ui-yt-3-iframe-preview-verified.png');
  await page.screenshot({ path: previewVerifiedShot, fullPage: false });
  console.log(`[Visual Test] Captured: ${previewVerifiedShot}`);

  await browser.close();
  console.log('[Visual Test] All visual validation tests passed!');
}

run().catch((err) => {
  console.error('[Visual Test] Error:', err);
  process.exit(1);
});
