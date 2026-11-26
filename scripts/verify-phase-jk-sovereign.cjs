/**
 * scripts/verify-phase-jk-sovereign.cjs
 * Visual validation for Phase J & K: Mobile OS Integration & Sovereign Enclave (Features 43-50).
 */
const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f';

async function waitForServer(url, timeoutMs = 25000) {
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
  console.log('=== Phase J & K Visual Verification: Mobile Power Tools & Archival Sovereignty ===');

  const serverReady = await waitForServer('http://127.0.0.1:3001/api/time');
  if (!serverReady) {
    console.error('Server not answering on http://127.0.0.1:3001/api/time');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await desktopContext.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await desktopPage.waitForTimeout(2500);

    try {
      const dismissBtn = await desktopPage.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await desktopPage.waitForTimeout(400);
      } else {
        await desktopPage.keyboard.press('Escape');
      }
    } catch {}

    // -------------------------------------------------------------
    // Test 1: Quick-Share Vintage Clipping Card (#44)
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Quick-Share Vintage Clipping Card (#44) ---');
    const clipBtn = await desktopPage.$('#btn-share-vintage-clip');
    if (clipBtn) {
      await clipBtn.click();
    } else {
      await desktopPage.keyboard.press('s');
    }
    await desktopPage.waitForTimeout(1200);

    const shot1 = path.join(ARTIFACTS_DIR, 'ui-phase-jk-1-vintage-clipping.png');
    await desktopPage.screenshot({ path: shot1 });
    console.log(`Saved screenshot 1: ${shot1}`);

    // -------------------------------------------------------------
    // Test 3: Local P2P Mesh Sync (#47)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing P2P Mesh Sync Tab (#47) ---');
    const meshTab = desktopPage.locator('nav[aria-label="Sovereign Desks"] button:has-text("#47 P2P Mesh Sync")');
    if (await meshTab.count() > 0) {
      await meshTab.first().click({ force: true });
      await desktopPage.waitForTimeout(1000);
    }

    const shot3 = path.join(ARTIFACTS_DIR, 'ui-phase-jk-3-mesh-wayback.png');
    await desktopPage.screenshot({ path: shot3 });
    console.log(`Saved screenshot 3: ${shot3}`);

    // -------------------------------------------------------------
    // Test 4: FIDO2 Hardware Key Lock (#49)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing FIDO2 Key Lock Tab (#49) ---');
    const fidoTab = desktopPage.locator('nav[aria-label="Sovereign Desks"] button:has-text("#49 FIDO2 Key Lock")');
    if (await fidoTab.count() > 0) {
      await fidoTab.first().click({ force: true });
      await desktopPage.waitForTimeout(1000);
    }

    const bindBtn = desktopPage.locator('button:has-text("Bind Hardware Key")');
    if (await bindBtn.count() > 0) {
      await bindBtn.first().click();
      await desktopPage.waitForTimeout(600);
    }

    const shot4 = path.join(ARTIFACTS_DIR, 'ui-phase-jk-4-fido2-key-lock.png');
    await desktopPage.screenshot({ path: shot4 });
    console.log(`Saved screenshot 4: ${shot4}`);

    // Close drawer and toggle E-Ink mode (#45)
    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(400);

    console.log('\n--- 4. Testing 1-Bit E-Ink Display Mode (#45) ---');
    const einkBtn = await desktopPage.$('#btn-toggle-eink');
    if (einkBtn) {
      await einkBtn.click();
      await desktopPage.waitForTimeout(700);
    }

    const shot2 = path.join(ARTIFACTS_DIR, 'ui-phase-jk-2-eink-monochrome.png');
    await desktopPage.screenshot({ path: shot2 });
    console.log(`Saved screenshot 2: ${shot2}`);

    // Reset E-Ink back to Paper so persistent DB state stays default Paper
    if (einkBtn) {
      await einkBtn.click();
      await desktopPage.waitForTimeout(400);
    }

    await desktopContext.close();

    // -------------------------------------------------------------
    // Test 5: Mobile Portrait Viewport (390x844) & Android 4x2 Widget Preview (#43)
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Mobile Viewport (Portrait 390x844) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await mobileContext.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await mobilePage.waitForTimeout(2500);

    try {
      const dismissBtn = await mobilePage.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await mobilePage.waitForTimeout(400);
      } else {
        await mobilePage.keyboard.press('Escape');
      }
    } catch {}

    const mobileSovBtn = await mobilePage.$('#btn-sovereign-enclave');
    if (mobileSovBtn) {
      await mobileSovBtn.click();
      await mobilePage.waitForTimeout(900);
    } else {
      await mobilePage.keyboard.press('s');
      await mobilePage.waitForTimeout(900);
    }

    const widgetTab = mobilePage.locator('nav[aria-label="Sovereign Desks"] button:has-text("#43 Android Widget")');
    if (await widgetTab.count() > 0) {
      await widgetTab.first().click({ force: true });
      await mobilePage.waitForTimeout(1000);
    }

    const shot5 = path.join(ARTIFACTS_DIR, 'ui-phase-jk-5-mobile-sovereign-enclave.png');
    await mobilePage.screenshot({ path: shot5 });
    console.log(`Saved screenshot 5: ${shot5}`);

    await mobileContext.close();
    console.log('\n=== All Phase J & K Visual Validation Screenshots Captured Successfully! ===');
  } catch (err) {
    console.error('Visual verification error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
