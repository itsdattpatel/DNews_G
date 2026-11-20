const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testVerticalPortrait() {
  console.log('[Vertical Inspection] Launching Chromium with Mobile Portrait emulation...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=swiftshader', '--no-sandbox']
  });

  const ARTIFACT_DIR = path.resolve('C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f');
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  // Mobile Portrait Viewport (390x844, touch enabled - typical modern phone like iPhone 14/15)
  const portraitContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  });
  const page = await portraitContext.newPage();

  console.log('Navigating to http://127.0.0.1:5173 in vertical portrait mode...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  // Dismiss Missed News Modal if open
  const missedOverlay = page.locator('#missed-news-modal-overlay');
  if (await missedOverlay.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  // 1. Capture full vertical portrait overview
  const screenshot1 = path.join(ARTIFACT_DIR, 'ui-vertical-1-portrait-overview.png');
  await page.screenshot({ path: screenshot1 });
  console.log(`Saved screenshot 1: ${screenshot1}`);

  // 2. Test scrolling the reader article in portrait
  console.log('Testing scrolling down the article in portrait...');
  const articlePanel = await page.$('#article-panel');
  if (articlePanel) {
    await articlePanel.evaluate((el) => {
      el.scrollTop = 400;
    });
    await page.waitForTimeout(1000);
    const screenshot2 = path.join(ARTIFACT_DIR, 'ui-vertical-2-article-scrolled.png');
    await page.screenshot({ path: screenshot2 });
    console.log(`Saved screenshot 2: ${screenshot2}`);
  }

  // 3. Test dock touch interaction in portrait
  console.log('Testing dock interaction in portrait...');
  const dock = await page.$('#circular-dock');
  if (dock) {
    const box = await dock.boundingBox();
    if (box) {
      console.log(`Dock bounding box: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`);
      // Swipe horizontally across the bottom dock
      const startX = box.x + box.width * 0.8;
      const endX = box.x + box.width * 0.2;
      const y = box.y + box.height * 0.5;

      await page.mouse.move(startX, y);
      await page.mouse.down();
      for (let i = 1; i <= 5; i++) {
        const curX = startX + (endX - startX) * (i / 5);
        await page.mouse.move(curX, y);
        await page.waitForTimeout(30);
      }
      await page.mouse.up();
      await page.waitForTimeout(1500);

      const screenshot3 = path.join(ARTIFACT_DIR, 'ui-vertical-3-dock-swiped-portrait.png');
      await page.screenshot({ path: screenshot3 });
      console.log(`Saved screenshot 3: ${screenshot3}`);
    }
  }

  // 4. Test Layout Switcher in portrait
  const btnWire = await page.$('#btn-layout-wire');
  if (btnWire) {
    await btnWire.click();
    await page.waitForTimeout(1000);
    const screenshot4 = path.join(ARTIFACT_DIR, 'ui-vertical-4-wire-portrait.png');
    await page.screenshot({ path: screenshot4 });
    console.log(`Saved screenshot 4: ${screenshot4}`);
  }

  await portraitContext.close();
  await browser.close();
  console.log('Vertical portrait inspection complete.');
}

testVerticalPortrait().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
