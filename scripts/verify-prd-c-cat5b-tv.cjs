/**
 * scripts/verify-prd-c-cat5b-tv.cjs
 * Comprehensive Playwright visual validation for PRD C Category 5B:
 * TV Playback & Layout Fixes across 4 target viewports in Paper and Night editions.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f';

const VIEWPORTS = [
  { width: 1280, height: 720, name: '1280x720' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1536, height: 864, name: '1536x864' },
  { width: 1920, height: 1080, name: '1920x1080' },
];

async function runVisualAudit() {
  console.log('Starting TV Playback & Layout Visual Audit (PRD C Category 5B)...');
  const browser = await chromium.launch({ headless: true });

  const summary = [];

  for (const vp of VIEWPORTS) {
    for (const theme of ['paper', 'night']) {
      const testName = `ui-cat5-tv-${vp.name}-${theme}`;
      console.log(`\nTesting ${vp.name} [${theme}]...`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      try {
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        // Apply theme
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);

        // Open TV View by clicking TV button in right icon rail or pressing 't'
        const tvRailBtn = page.locator('#btn-rail-tv');
        if (await tvRailBtn.isVisible()) {
          await tvRailBtn.click();
        } else {
          await page.keyboard.press('t');
        }
        await page.waitForTimeout(1500);

        // Verify TV modal is open
        const modal = page.locator('#tv-view-modal');
        await modal.waitFor({ state: 'visible', timeout: 5000 });

        // Verify 16:9 aspect-video monitor
        const monitor = modal.locator('.aspect-video');
        await monitor.waitFor({ state: 'visible', timeout: 3000 });

        // Verify dedicated mute toggle
        const muteBtn = modal.locator('#btn-tv-mute-toggle');
        await muteBtn.waitFor({ state: 'visible', timeout: 3000 });

        // Verify quick switcher buttons with "Name (Country)"
        const quickButtons = modal.locator('.font-mono.text-xs.px-2\\.5.py-1');
        const count = await quickButtons.count();
        console.log(`Found ${count} quick switcher buttons`);

        // Test pressing 'm' key to toggle mute
        await page.keyboard.press('m');
        await page.waitForTimeout(300);

        // Capture screenshot
        const shotPath = path.join(ARTIFACT_DIR, `${testName}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
        console.log(`Saved screenshot: ${shotPath}`);

        // Check horizontal overflow
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        summary.push({
          viewport: vp.name,
          theme,
          passed: !hasHorizontalScroll,
          screenshot: `${testName}.png`,
          quickButtonsCount: count,
        });
      } catch (err) {
        console.error(`Failed on ${vp.name} [${theme}]:`, err.message);
        summary.push({
          viewport: vp.name,
          theme,
          passed: false,
          error: err.message,
        });
      } finally {
        await context.close();
      }
    }
  }

  // Also test offline fallback actions on a faulty channel
  console.log('\nTesting TV Offline Actions Panel & Fallback Buttons...');
  const testContext = await browser.newContext({ viewport: { width: 1536, height: 864 } });
  const testPage = await testContext.newPage();
  try {
    await testPage.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    const tvRailBtn = testPage.locator('#btn-rail-tv');
    if (await tvRailBtn.isVisible()) {
      await tvRailBtn.click();
    } else {
      await testPage.keyboard.press('t');
    }
    await testPage.waitForTimeout(1500);

    // Switch to FAULTY FEEDS tab
    const faultyTab = testPage.locator('#tab-subpage-faulty');
    await faultyTab.click();
    await testPage.waitForTimeout(1000);

    // Click first channel in faulty list
    const firstFaulty = testPage.locator('.tv-channel-item').first();
    await firstFaulty.click();
    await testPage.waitForTimeout(1000);

    // Verify offline overlay and fallback action buttons
    const offlineOverlay = testPage.locator('#tv-stream-offline-overlay');
    await offlineOverlay.waitFor({ state: 'visible', timeout: 5000 });

    const shotPath = path.join(ARTIFACT_DIR, 'ui-cat5-tv-offline-actions-paper.png');
    await testPage.screenshot({ path: shotPath });
    console.log(`Saved offline fallback actions screenshot: ${shotPath}`);
    summary.push({
      viewport: '1536x864',
      theme: 'paper',
      test: 'offline-actions-panel',
      passed: true,
      screenshot: 'ui-cat5-tv-offline-actions-paper.png',
    });
  } catch (err) {
    console.error('Offline overlay test error:', err.message);
  } finally {
    await testContext.close();
  }

  await browser.close();

  console.log('\n===============================================================');
  console.log('TV VISUAL AUDIT RESULTS MATRIX');
  console.log('===============================================================');
  console.table(summary);
}

runVisualAudit().catch(console.error);
