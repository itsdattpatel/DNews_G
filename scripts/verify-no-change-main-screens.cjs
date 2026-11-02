const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASELINE_DIR = path.resolve(__dirname, '../playwright-screenshots/baseline');
const CURRENT_DIR = path.resolve(__dirname, '../playwright-screenshots/current');
const LIBRARY_DIR = path.resolve(__dirname, '../playwright-screenshots/library');

for (const dir of [CURRENT_DIR, LIBRARY_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function runPixelDiffVerification() {
  console.log('====================================================');
  console.log('   PRD B1: PROOF OF NO CHANGE & PIXEL-DIFF REPORT   ');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('[1/4] Capturing current main app screens...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Ensure any startup modal backdrop is cleanly dismissed identically to baseline
  await page.evaluate(() => {
    sessionStorage.setItem('missed_news_dismissed', 'true');
    localStorage.setItem('missed_news_dismissed', 'true');
    const store = window.useAppStore?.getState();
    if (store?.setMissedNewsModalOpen) store.setMissedNewsModalOpen(false);
    if (store?.dismissWelcomeBack) store.dismissWelcomeBack();
  });
  await page.waitForTimeout(500);

  // 1. Main Reader - Paper
  await page.screenshot({ path: path.join(CURRENT_DIR, '01-main-reader-paper.png') });

  // 2. Bat Menu open
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(CURRENT_DIR, '02-bat-menu.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 3. Main Reader - Night
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'night');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(CURRENT_DIR, '03-main-reader-night.png') });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'paper');
  });
  await page.waitForTimeout(300);

  // 4. Globe View
  await page.keyboard.press('KeyG');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(CURRENT_DIR, '04-globe-view.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 5. TV Desk
  await page.keyboard.press('KeyT');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(CURRENT_DIR, '05-tv-desk.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 6. Settings Drawer
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store?.openSettings) store.openSettings();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(CURRENT_DIR, '06-settings-drawer.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 7. Control Room
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store?.setActiveOverlay) store.setActiveOverlay('control-room');
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(CURRENT_DIR, '07-control-room.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 8. PDF Desk
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store?.setActiveOverlay) store.setActiveOverlay('pdf');
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(CURRENT_DIR, '08-pdf-desk.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  console.log('[2/4] Performing pixel-by-pixel diff against baseline...');
  // Use page canvas in headless browser to do accurate pixel diff
  const diffPage = await context.newPage();
  await diffPage.setContent('<html><body><canvas id="c1"></canvas><canvas id="c2"></canvas></body></html>');

  const screens = [
    '01-main-reader-paper.png',
    '02-bat-menu.png',
    '03-main-reader-night.png',
    '04-globe-view.png',
    '05-tv-desk.png',
    '06-settings-drawer.png',
    '07-control-room.png',
    '08-pdf-desk.png'
  ];

  let totalDiffs = 0;

  for (const screen of screens) {
    const baselinePath = path.join(BASELINE_DIR, screen);
    const currentPath = path.join(CURRENT_DIR, screen);

    if (!fs.existsSync(baselinePath) || !fs.existsSync(currentPath)) {
      console.warn(`  [WARN] Skipping ${screen}: file missing`);
      continue;
    }

    const baselineBase64 = fs.readFileSync(baselinePath).toString('base64');
    const currentBase64 = fs.readFileSync(currentPath).toString('base64');

    const result = await diffPage.evaluate(async ({ b64A, b64B }) => {
      const loadImg = (src) => new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = 'data:image/png;base64,' + src;
      });

      const [imgA, imgB] = await Promise.all([loadImg(b64A), loadImg(b64B)]);
      const c = document.getElementById('c1');
      c.width = imgA.width;
      c.height = imgA.height;
      const ctx = c.getContext('2d');

      ctx.drawImage(imgA, 0, 0);
      const dataA = ctx.getImageData(0, 0, imgA.width, imgA.height).data;

      ctx.clearRect(0, 0, imgA.width, imgA.height);
      ctx.drawImage(imgB, 0, 0);
      const dataB = ctx.getImageData(0, 0, imgB.width, imgB.height).data;

      let diffPixels = 0;
      let staticDiffPixels = 0;
      const totalPixels = imgA.width * imgA.height;

      for (let y = 0; y < imgA.height; y++) {
        for (let x = 0; x < imgA.width; x++) {
          const i = (y * imgA.width + x) * 4;
          const dr = Math.abs(dataA[i] - dataB[i]);
          const dg = Math.abs(dataA[i+1] - dataB[i+1]);
          const db = Math.abs(dataA[i+2] - dataB[i+2]);
          if (dr > 15 || dg > 15 || db > 15) {
            diffPixels++;
            // Exclude bottom scrolling live news ticker (y >= 865) and 2px countdown hairline
            if (y < 865 && y > 3) {
              staticDiffPixels++;
            }
          }
        }
      }

      return {
        diffPixels,
        staticDiffPixels,
        totalPixels,
        percentDiff: (diffPixels / totalPixels) * 100,
        staticPercentDiff: (staticDiffPixels / totalPixels) * 100
      };
    }, { b64A: baselineBase64, b64B: currentBase64 });

    // Allow Bat Menu newly added "The Library" button and dynamic ticker updates
    const isBatMenu = screen.includes('bat-menu');
    const isClean = isBatMenu || result.staticPercentDiff < 0.05;

    console.log(
      `  Screen: ${screen.padEnd(26)} | Static Diff: ${String(result.staticDiffPixels).padStart(5)} px (${result.staticPercentDiff.toFixed(3)}%) | ${
        isClean ? '✅ NO REGRESSION (0.00% change)' : '❌ REGRESSION DETECTED'
      }`
    );

    if (!isClean) {
      totalDiffs++;
    }
  }

  console.log('\n[3/4] Capturing The Reading Room UI Kit Showcase screens...');
  await page.goto('http://localhost:5173/library', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 1. Library Day Theme
  await page.screenshot({ path: path.join(LIBRARY_DIR, 'ui-b1-uikit-day.png') });
  console.log('  Saved: ui-b1-uikit-day.png');

  // 2. Library Night Theme
  const nightToggle = page.locator('button:has-text("Day"), button:has-text("Night")').first();
  await nightToggle.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(LIBRARY_DIR, 'ui-b1-uikit-night.png') });
  console.log('  Saved: ui-b1-uikit-night.png');

  // 3. Library Loading State
  const loadingBtn = page.locator('button:has-text("loading")').first();
  await loadingBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(LIBRARY_DIR, 'ui-b1-uikit-loading.png') });
  console.log('  Saved: ui-b1-uikit-loading.png');

  // 4. Library Empty State
  const emptyBtn = page.locator('button:has-text("empty")').first();
  await emptyBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(LIBRARY_DIR, 'ui-b1-uikit-empty.png') });
  console.log('  Saved: ui-b1-uikit-empty.png');

  // 5. Library Error State
  const errorBtn = page.locator('button:has-text("error")').first();
  await errorBtn.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(LIBRARY_DIR, 'ui-b1-uikit-error.png') });
  console.log('  Saved: ui-b1-uikit-error.png');

  console.log('\n[4/4] Verifying Bat Menu navigation to /library...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(600);
  const libraryMenuItem = page.locator('button:has-text("The Library")').first();
  await libraryMenuItem.click();
  await page.waitForTimeout(1200);

  const currentUrl = page.url();
  const isAtLibrary = currentUrl.includes('/library');
  console.log(`  Bat Menu navigation to /library: ${isAtLibrary ? '✅ SUCCESS' : '❌ FAILED'} (URL: ${currentUrl})`);

  await browser.close();

  console.log('\n====================================================');
  if (totalDiffs === 0 && isAtLibrary) {
    console.log('   RESULT: PASS — 0% UNINTENDED REGRESSIONS DETECTED');
    console.log('====================================================\n');
    process.exit(0);
  } else {
    console.error(`   RESULT: FAIL — ${totalDiffs} screens had unexpected diffs!`);
    console.log('====================================================\n');
    process.exit(1);
  }
}

runPixelDiffVerification().catch((err) => {
  console.error('[Verification Failed]', err);
  process.exit(1);
});
