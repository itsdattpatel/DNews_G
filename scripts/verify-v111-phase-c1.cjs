/**
 * scripts/verify-v111-phase-c1.cjs
 * Visual validation for Phase C Deliverable 1:
 * - #36 Expanded Global Feeds & Bureau Latency Scoreboard (#source-health-desk)
 * - #32 Custom RSS Studio (#custom-rss-studio)
 * - #31 Photojournalism Desk (#photojournalism-desk)
 */
const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f';

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1500, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  return false;
}

async function run() {
  console.log('--- Phase C Deliverable 1 Visual Validation ---');

  const serverReady = await waitForServer('http://127.0.0.1:3001/api/health');
  if (!serverReady) {
    console.error('Server not answering on http://127.0.0.1:3001/api/health');
    process.exit(1);
  }
  console.log('Backend confirmed active on http://127.0.0.1:3001');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 850 },
    });
    await context.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Dismiss Missed News Modal if present
    try {
      const dismissBtn = await page.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await page.waitForTimeout(400);
      } else {
        await page.keyboard.press('Escape');
      }
    } catch {}

    // 1. Wire Health & Latency Scoreboard (#source-health-desk)
    console.log('1. Navigating to Wire Health & Latency Scoreboard...');
    await page.evaluate(() => {
      window.useAppStore.getState().setCurrentView('source-health');
    });
    await page.waitForTimeout(1000);
    const healthDesk = await page.waitForSelector('#source-health-desk', { timeout: 5000 });
    if (healthDesk) {
      console.log('Source Health Desk loaded.');
      const pingBtn = await page.$('#btn-ping-bureaus');
      if (pingBtn) {
        console.log('Clicking Ping All Bureaus...');
        await pingBtn.click();
        await page.waitForTimeout(1200);
      }
      const img1Path = path.join(ARTIFACTS_DIR, 'ui-v111-1-source-health-scoreboard.png');
      await page.screenshot({ path: img1Path, fullPage: false });
      console.log('Saved:', img1Path);
    }

    // 2. Custom RSS Studio (#custom-rss-studio)
    console.log('2. Navigating to Custom RSS Studio...');
    await page.evaluate(() => {
      window.useAppStore.getState().setCurrentView('custom-rss');
    });
    await page.waitForTimeout(1000);
    const customRssStudio = await page.waitForSelector('#custom-rss-studio', { timeout: 5000 });
    if (customRssStudio) {
      console.log('Custom RSS Studio loaded. Filling syndicated feed form...');
      await page.fill('#input-feed-url', 'https://feeds.bbci.co.uk/news/world/rss.xml');
      await page.fill('#input-feed-name', 'BBC World News Dispatch');
      await page.fill('#input-feed-country', 'United Kingdom');
      await page.selectOption('#select-feed-category', 'World');
      await page.waitForTimeout(400);

      const syndicateBtn = await page.$('#btn-syndicate-feed');
      if (syndicateBtn) {
        console.log('Clicking Syndicate Wire...');
        await syndicateBtn.click();
        await page.waitForTimeout(1200);
      }

      const img2Path = path.join(ARTIFACTS_DIR, 'ui-v111-2-custom-rss-studio.png');
      await page.screenshot({ path: img2Path, fullPage: false });
      console.log('Saved:', img2Path);
    }

    // 3. Photojournalism Desk (#photojournalism-desk)
    console.log('3. Navigating to Photojournalism Desk...');
    await page.evaluate(() => {
      window.useAppStore.getState().setCurrentView('photojournalism');
    });
    await page.waitForTimeout(1000);
    const photoDesk = await page.waitForSelector('#photojournalism-desk', { timeout: 5000 });
    if (photoDesk) {
      console.log('Photojournalism Desk loaded.');
      await page.waitForTimeout(800);
      const img3Path = path.join(ARTIFACTS_DIR, 'ui-v111-3-photojournalism-gallery.png');
      await page.screenshot({ path: img3Path, fullPage: false });
      console.log('Saved:', img3Path);
    }

    console.log('Phase C Deliverable 1 Visual Validation SUCCESSFUL!');
  } catch (err) {
    console.error('Validation failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
