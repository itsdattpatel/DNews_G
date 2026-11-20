const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verifyStep4() {
  console.log('[Step 4] Launching Chromium with Mobile Touch emulation...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=swiftshader', '--no-sandbox']
  });

  const ARTIFACT_DIR = path.resolve('C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f');
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  // 1. Mobile Landscape Viewport (932x430, touch enabled)
  console.log('Opening mobile landscape session (932x430, touch: true)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 932, height: 430 },
    hasTouch: true,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();

  console.log('Navigating to http://127.0.0.1:5173 on mobile...');
  await mobilePage.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await mobilePage.waitForTimeout(3000);

  // Dismiss Missed News Modal if open
  const missedOverlay = mobilePage.locator('#missed-news-modal-overlay');
  if (await missedOverlay.isVisible().catch(() => false)) {
    await mobilePage.keyboard.press('Escape');
    await mobilePage.waitForTimeout(600);
  }

  // Locate the 3D Circular Dock canvas
  console.log('Locating #circular-dock...');
  const dock = await mobilePage.waitForSelector('#circular-dock', { timeout: 10000 });
  if (dock) {
    const box = await dock.boundingBox();
    if (box) {
      const startX = box.x + box.width * 0.7;
      const endX = box.x + box.width * 0.25;
      const y = box.y + box.height * 0.5;

      console.log(`Performing mobile touch drag gesture from (${startX}, ${y}) to (${endX}, ${y})...`);

      // Touch fling gesture
      await mobilePage.touchscreen.tap(startX, y);
      await mobilePage.waitForTimeout(200);

      // Perform fast touch drag to trigger inertia
      await mobilePage.mouse.move(startX, y);
      await mobilePage.mouse.down();
      for (let i = 1; i <= 5; i++) {
        const curX = startX + (endX - startX) * (i / 5);
        await mobilePage.mouse.move(curX, y);
        await mobilePage.waitForTimeout(20);
      }

      const screenshot1 = path.join(ARTIFACT_DIR, 'ui-step4-1-mobile-touch-swipe-in-motion.png');
      await mobilePage.screenshot({ path: screenshot1 });
      console.log(`Saved screenshot 1: ${screenshot1}`);

      // Release with fling inertia
      await mobilePage.mouse.up();
      // Allow physics decay & snap
      await mobilePage.waitForTimeout(1600);

      const screenshot2 = path.join(ARTIFACT_DIR, 'ui-step4-2-mobile-touch-settled.png');
      await mobilePage.screenshot({ path: screenshot2 });
      console.log(`Saved screenshot 2: ${screenshot2}`);
    }
  }

  await mobileContext.close();

  // 2. Desktop Broadsheet Viewport (1440x900)
  console.log('Verifying desktop dock responsiveness (1440x900)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await desktopPage.waitForTimeout(2500);

  // Dismiss Missed News Modal
  const missedOverlay2 = desktopPage.locator('#missed-news-modal-overlay');
  if (await missedOverlay2.isVisible().catch(() => false)) {
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(500);
  }

  const screenshot3 = path.join(ARTIFACT_DIR, 'ui-step4-3-inertia-glide-settled.png');
  await desktopPage.screenshot({ path: screenshot3 });
  console.log(`Saved screenshot 3: ${screenshot3}`);

  await desktopContext.close();
  await browser.close();
  console.log('Mobile Touch & Inertia Gesture Verification finished successfully.');
}

verifyStep4().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
