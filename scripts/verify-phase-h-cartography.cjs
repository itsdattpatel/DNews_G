/**
 * scripts/verify-phase-h-cartography.cjs
 * Visual validation for Phase H: Cartography, Chokepoints & Data Markets (Features 29-35).
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
  console.log('=== Phase H Visual Verification: Cartography, Chokepoints & Data Markets ===');

  const serverReady = await waitForServer('http://127.0.0.1:3001/api/time');
  if (!serverReady) {
    console.error('Server not answering on http://127.0.0.1:3001/api/time');
    process.exit(1);
  }
  console.log('Backend active on http://127.0.0.1:3001');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Desktop Mode & Masthead Market Ticker + War Room Action Bar
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Desktop Masthead Market Ticker & War Room Buttons ---');
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

    // Screenshot 1: Desktop Masthead Market Ticker & Rail
    const shot1 = path.join(ARTIFACTS_DIR, 'ui-phase-h-1-desktop-masthead-ticker.png');
    await desktopPage.screenshot({ path: shot1 });
    console.log(`Saved screenshot 1: ${shot1}`);

    // -------------------------------------------------------------
    // Test 2: Open War Room to Maritime Chokepoints Tab (#30)
    // -------------------------------------------------------------
    console.log('\n--- 2. Opening War Room Desk (Maritime Chokepoints Tab) ---');
    const chokepointsBtn = await desktopPage.$('#btn-war-room-chokepoints');
    if (chokepointsBtn) {
      await chokepointsBtn.click();
      await desktopPage.waitForTimeout(1200);
    } else {
      await desktopPage.keyboard.press('w');
      await desktopPage.waitForTimeout(1000);
      const cpTab = desktopPage.locator('nav[aria-label="Cartography Desks"] button:has-text("#30 Chokepoints")');
      if (await cpTab.count() > 0) await cpTab.first().click({ force: true });
      await desktopPage.waitForTimeout(1000);
    }

    const shot2 = path.join(ARTIFACTS_DIR, 'ui-phase-h-2-maritime-chokepoints.png');
    await desktopPage.screenshot({ path: shot2 });
    console.log(`Saved screenshot 2: ${shot2}`);

    // -------------------------------------------------------------
    // Test 3: Supply Chain Disruption Flowchart (SVG DAG) (#32)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Supply Chain Disruption DAG Tab (#32) ---');
    const dagTab = desktopPage.locator('nav[aria-label="Cartography Desks"] button:has-text("#32 Supply Chain DAG")');
    if (await dagTab.count() > 0) {
      await dagTab.first().click({ force: true });
      await desktopPage.waitForTimeout(1200);
    }

    const shot3 = path.join(ARTIFACTS_DIR, 'ui-phase-h-3-supply-chain-dag.png');
    await desktopPage.screenshot({ path: shot3 });
    console.log(`Saved screenshot 3: ${shot3}`);

    // -------------------------------------------------------------
    // Test 4: Interactive Parliament & Coalition Simulator (#34)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Interactive Parliament Seat Simulator (#34) ---');
    const simTab = desktopPage.locator('nav[aria-label="Cartography Desks"] button:has-text("#34 Parliament Sim")');
    if (await simTab.count() > 0) {
      await simTab.first().click({ force: true });
      await desktopPage.waitForTimeout(1500);
    }

    const shot4 = path.join(ARTIFACTS_DIR, 'ui-phase-h-4-parliament-simulator.png');
    await desktopPage.screenshot({ path: shot4 });
    console.log(`Saved screenshot 4: ${shot4}`);

    await desktopPage.keyboard.press('Escape');
    await desktopPage.waitForTimeout(400);
    await desktopContext.close();

    // -------------------------------------------------------------
    // Test 5: Mobile Mode (Portrait 390x844) & War Room Desk
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

    const mobileWarRoomBtn = await mobilePage.$('#btn-war-room-desk');
    if (mobileWarRoomBtn) {
      await mobileWarRoomBtn.click();
      await mobilePage.waitForTimeout(1200);
    } else {
      await mobilePage.keyboard.press('w');
      await mobilePage.waitForTimeout(1200);
    }

    const shot5 = path.join(ARTIFACTS_DIR, 'ui-phase-h-5-mobile-war-room.png');
    await mobilePage.screenshot({ path: shot5 });
    console.log(`Saved screenshot 5: ${shot5}`);

    await mobileContext.close();
    console.log('\n=== All Phase H Visual Validation Screenshots Captured Successfully! ===');
  } catch (err) {
    console.error('Visual verification error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
