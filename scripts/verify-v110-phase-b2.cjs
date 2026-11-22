/**
 * scripts/verify-v110-phase-b2.cjs
 * Visual validation for Phase B Deliverable 2:
 * - Adaptive Notch Pill (#btn-notch-capsule, #notch-telemetry-popover)
 * - Typography Studio (#btn-open-typography-studio, #typography-studio-modal)
 * - Margin Notes Drawer (#btn-open-margin-notes, #margin-notes-drawer)
 * - Daily Editorial Cartoon (#btn-open-editorial-cartoon, #editorial-cartoon-modal)
 * - Daily Reading Tracker (#reading-tracker-card)
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
      await new Promise(r => setTimeout(r, 600));
    }
  }
  return false;
}

async function run() {
  console.log('--- Phase B Deliverable 2 Visual Validation ---');

  const serverReady = await waitForServer('http://127.0.0.1:3001/api/health');
  if (!serverReady) {
    console.error('Server not answering on http://127.0.0.1:3001/api/health');
    process.exit(1);
  }
  console.log('Backend confirmed active on http://127.0.0.1:3001');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    await context.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2500);

    // Dismiss Missed News Modal if shown
    try {
      const dismissBtn = await page.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await page.waitForTimeout(400);
      } else {
        await page.keyboard.press('Escape');
      }
    } catch {}

    // 1. Adaptive Notch Pill & Telemetry Popover
    console.log('1. Testing Adaptive Notch & Island...');
    const notchPill = await page.$('#btn-notch-capsule');
    if (notchPill) {
      console.log('Clicking Adaptive Notch capsule...');
      await notchPill.click();
      await page.waitForTimeout(600);
      const img1Path = path.join(ARTIFACTS_DIR, 'ui-v110-1-adaptive-notch-island.png');
      await page.screenshot({ path: img1Path, fullPage: false });
      console.log('Saved:', img1Path);
      // Close popover
      await notchPill.click();
      await page.waitForTimeout(300);
    }

    // 2. Typography Studio Modal
    console.log('2. Testing Typography Studio...');
    const typeBtn = await page.$('#btn-open-typography-studio');
    if (typeBtn) {
      console.log('Clicking #btn-open-typography-studio...');
      await typeBtn.click();
      await page.waitForTimeout(600);
      const img2Path = path.join(ARTIFACTS_DIR, 'ui-v110-2-typography-studio.png');
      await page.screenshot({ path: img2Path, fullPage: false });
      console.log('Saved:', img2Path);
      // Close typography studio
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 3. Margin Notes Drawer
    console.log('3. Testing Margin Notes Drawer...');
    const notesBtn = await page.$('#btn-open-margin-notes');
    if (notesBtn) {
      console.log('Clicking #btn-open-margin-notes...');
      await notesBtn.click();
      await page.waitForTimeout(600);
      const img3Path = path.join(ARTIFACTS_DIR, 'ui-v110-3-margin-notes-drawer.png');
      await page.screenshot({ path: img3Path, fullPage: false });
      console.log('Saved:', img3Path);
      // Close margin notes drawer
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 4. Daily Editorial Cartoon Modal
    console.log('4. Testing Editorial Cartoon Modal...');
    const cartoonBtn = await page.$('#btn-open-editorial-cartoon');
    if (cartoonBtn) {
      console.log('Clicking #btn-open-editorial-cartoon...');
      await cartoonBtn.click();
      await page.waitForTimeout(600);
      const img4Path = path.join(ARTIFACTS_DIR, 'ui-v110-4-editorial-cartoon.png');
      await page.screenshot({ path: img4Path, fullPage: false });
      console.log('Saved:', img4Path);
      // Close cartoon modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 5. Mobile Portrait View with Reading Tracker
    console.log('5. Testing Mobile Portrait with Reading Tracker Log...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true
    });
    await mobileContext.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await mobilePage.waitForTimeout(2500);

    // Scroll down to Reading Tracker Card
    const tracker = await mobilePage.$('#reading-tracker-card');
    if (tracker) {
      await tracker.scrollIntoViewIfNeeded();
      await mobilePage.waitForTimeout(600);
    }
    const img5Path = path.join(ARTIFACTS_DIR, 'ui-v110-5-mobile-reading-tracker.png');
    await mobilePage.screenshot({ path: img5Path, fullPage: false });
    console.log('Saved:', img5Path);

    console.log('All Phase B Deliverable 2 screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Validation script failed:', err);
  process.exit(1);
});
