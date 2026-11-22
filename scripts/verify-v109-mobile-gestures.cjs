/**
 * scripts/verify-v109-mobile-gestures.cjs
 * Visual validation for Phase B Deliverable 1:
 * - Mobile Bottom Navigation Bar (#mobile-bottom-nav)
 * - Pull-to-refresh broadsheet ink-stamp indicator (#pull-to-refresh-indicator)
 * - Bionic speed-reading fixation stems (#btn-toggle-bionic-reading)
 * - Mobile responsive full-fit layout
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
  console.log('--- Phase B Deliverable 1 Visual Validation ---');

  // Verify server is answering on port 3001
  const serverReady = await waitForServer('http://127.0.0.1:3001/api/health');
  if (!serverReady) {
    console.error('Server not answering on http://127.0.0.1:3001/api/health. Ensure backend is running.');
    process.exit(1);
  }
  console.log('Backend confirmed active on http://127.0.0.1:3001');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    // 1. Mobile Portrait Viewport (390 x 844)
    console.log('1. Testing Mobile Portrait (390x844)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
    });
    const page = await mobileContext.newPage();
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    // Verify Mobile Bottom Nav
    const bottomNav = await page.$('#mobile-bottom-nav');
    console.log('Mobile bottom nav present:', !!bottomNav);

    // Capture initial Mobile Portrait view with bottom nav visible
    const img1Path = path.join(ARTIFACTS_DIR, 'ui-v109-1-mobile-bottom-nav.png');
    await page.screenshot({ path: img1Path, fullPage: false });
    console.log('Saved:', img1Path);

    // 2. Test Pull-to-Refresh Gesture Simulation
    console.log('2. Simulating Pull-to-Refresh touch pull...');
    const panel = await page.$('#article-panel');
    if (panel) {
      const box = await panel.boundingBox();
      if (box) {
        // Dispatch touchstart, touchmove downwards by 120px to trigger rubber stamp
        await page.mouse.move(box.x + box.width / 2, box.y + 40);
        await page.mouse.down();
        for (let y = 40; y <= 160; y += 15) {
          await page.mouse.move(box.x + box.width / 2, box.y + y);
          await page.waitForTimeout(30);
        }
        await page.waitForTimeout(300);
        const imgPullPath = path.join(ARTIFACTS_DIR, 'ui-v109-2-pull-to-refresh-stamp.png');
        await page.screenshot({ path: imgPullPath, fullPage: false });
        console.log('Saved:', imgPullPath);
        await page.mouse.up();
      }
    }

    // 3. Test Bionic Speed-Reading Activation
    console.log('3. Testing Bionic Speed-Reading activation...');
    const bionicBtn = await page.$('#btn-toggle-bionic-reading');
    if (bionicBtn) {
      console.log('Clicking #btn-toggle-bionic-reading...');
      await bionicBtn.click();
      await page.waitForTimeout(800);

      // Verify bolded fixation stems exist
      const boldStems = await page.$$('.bionic-stem');
      console.log(`Found ${boldStems.length} bionic fixation stems rendered in story text!`);

      const imgBionicPath = path.join(ARTIFACTS_DIR, 'ui-v109-3-bionic-reading-active.png');
      await page.screenshot({ path: imgBionicPath, fullPage: false });
      console.log('Saved:', imgBionicPath);
    } else {
      console.warn('Button #btn-toggle-bionic-reading not found in DOM!');
    }

    // 4. Desktop Broadsheet View (1280 x 800)
    console.log('4. Testing Desktop Broadsheet (1280x800)...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await desktopPage.waitForTimeout(2500);

    // Toggle Bionic on desktop as well to verify broadsheet reading experience
    const desktopBionic = await desktopPage.$('#btn-toggle-bionic-reading');
    if (desktopBionic) {
      await desktopBionic.click();
      await desktopPage.waitForTimeout(600);
    }

    const imgDesktopPath = path.join(ARTIFACTS_DIR, 'ui-v109-4-desktop-broadsheet.png');
    await desktopPage.screenshot({ path: imgDesktopPath, fullPage: false });
    console.log('Saved:', imgDesktopPath);

    console.log('All Phase B Deliverable 1 screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Validation script failed:', err);
  process.exit(1);
});
