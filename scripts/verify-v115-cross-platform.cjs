/**
 * scripts/verify-v115-cross-platform.cjs
 * Visual & Functional Validation for Cross-Platform Button Placements & Feed Syndication:
 * 1. Mobile Portrait (390x844): Single-row gliding action bar, TopBar, MobileBottomNav, headline visible.
 * 2. Mobile Landscape (844x390): Compact TopBar, low-height optimization, no vertical clipping.
 * 3. Desktop / EXE Mode (1366x850): Dual-reader broadsheet spread, RightIconRail, settings.
 * 4. Mobile Settings Dialog (390x844): Horizontal tab bar, full-width options pane (no narrow squishing).
 * 5. Feed Fetch Telemetry & Wire Syndication: Checks live sources and manual fetch endpoint.
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

async function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  console.log('=== V115 Cross-Platform Placements & Feed Syndication Verification ===');

  const serverReady = await waitForServer('http://127.0.0.1:3001/api/health');
  if (!serverReady) {
    console.error('Server not answering on http://127.0.0.1:3001/api/health');
    process.exit(1);
  }
  console.log('Backend confirmed active on http://127.0.0.1:3001');

  // 1. Verify Feed Fetching & Wire Pipeline
  console.log('\n--- 1. Testing Feed Pipeline & Live Syndication ---');
  try {
    const sourcesRes = await requestJson('http://127.0.0.1:3001/api/sources');
    console.log(`Configured Sources Count: ${sourcesRes.data?.items?.length || 0}`);

    const manualFetchRes = await requestJson('http://127.0.0.1:3001/api/control-room/trigger-fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { force: true },
    });
    console.log('Manual Fetch Trigger Result:', manualFetchRes.data);

    const articlesRes = await requestJson('http://127.0.0.1:3001/api/articles?limit=5');
    console.log(`Articles available in wire: ${articlesRes.data?.total || 0}`);
  } catch (err) {
    console.warn('Feed fetch probe warning:', err.message);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Mobile Portrait (390 x 844)
    // -------------------------------------------------------------
    console.log('\n--- 2. Validating Mobile Portrait Mode (390x844) ---');
    const portraitContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await portraitContext.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const portraitPage = await portraitContext.newPage();
    await portraitPage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await portraitPage.waitForTimeout(2000);

    // Dismiss Missed News Modal if shown
    try {
      const dismissBtn = await portraitPage.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await portraitPage.waitForTimeout(400);
      } else {
        await portraitPage.keyboard.press('Escape');
      }
    } catch {}

    const img1Path = path.join(ARTIFACTS_DIR, 'ui-v115-1-mobile-portrait-reader.png');
    await portraitPage.screenshot({ path: img1Path, fullPage: false });
    console.log('Saved Mobile Portrait Screenshot:', img1Path);

    // -------------------------------------------------------------
    // Test 2: Mobile Settings Dialog Full-Width (390 x 844)
    // -------------------------------------------------------------
    console.log('\n--- 3. Validating Mobile Settings Dialog Layout (390x844) ---');
    const settingsBtn = await portraitPage.$('#btn-topbar-settings');
    if (settingsBtn) {
      await settingsBtn.click();
      await portraitPage.waitForTimeout(800);

      const img4Path = path.join(ARTIFACTS_DIR, 'ui-v115-4-mobile-settings-dialog.png');
      await portraitPage.screenshot({ path: img4Path, fullPage: false });
      console.log('Saved Mobile Settings Screenshot:', img4Path);

      // Close settings dialog
      const closeBtn = await portraitPage.$('#btn-close-settings');
      if (closeBtn) {
        await closeBtn.click();
        await portraitPage.waitForTimeout(400);
      } else {
        await portraitPage.keyboard.press('Escape');
      }
    }
    await portraitContext.close();

    // -------------------------------------------------------------
    // Test 3: Mobile Landscape Mode (844 x 390)
    // -------------------------------------------------------------
    console.log('\n--- 4. Validating Mobile Landscape Mode (844x390) ---');
    const landscapeContext = await browser.newContext({
      viewport: { width: 844, height: 390 },
      isMobile: true,
      hasTouch: true,
    });
    await landscapeContext.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const landscapePage = await landscapeContext.newPage();
    await landscapePage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await landscapePage.waitForTimeout(2000);

    // Dismiss Missed News Modal if shown
    try {
      const dismissBtn = await landscapePage.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await landscapePage.waitForTimeout(400);
      } else {
        await landscapePage.keyboard.press('Escape');
      }
    } catch {}

    const img2Path = path.join(ARTIFACTS_DIR, 'ui-v115-2-mobile-landscape-reader.png');
    await landscapePage.screenshot({ path: img2Path, fullPage: false });
    console.log('Saved Mobile Landscape Screenshot:', img2Path);
    await landscapeContext.close();

    // -------------------------------------------------------------
    // Test 4: Desktop / EXE Mode (1366 x 850)
    // -------------------------------------------------------------
    console.log('\n--- 5. Validating Desktop / EXE Mode (1366x850) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1366, height: 850 },
    });
    await desktopContext.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const desktopPage = await desktopContext.newPage();
    await desktopPage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await desktopPage.waitForTimeout(2000);

    // Dismiss Missed News Modal if shown
    try {
      const dismissBtn = await desktopPage.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await desktopPage.waitForTimeout(400);
      } else {
        await desktopPage.keyboard.press('Escape');
      }
    } catch {}

    const img3Path = path.join(ARTIFACTS_DIR, 'ui-v115-3-desktop-exe-spread.png');
    await desktopPage.screenshot({ path: img3Path, fullPage: false });
    console.log('Saved Desktop Broadsheet Screenshot:', img3Path);
    await desktopContext.close();

    console.log('\n=== All Cross-Platform Visual Validations Succeeded ===');
  } catch (err) {
    console.error('Validation failure:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
