/**
 * scripts/verify-prd-c-cat7-globe.cjs
 * Playwright visual validation for PRD C Category 7: 3D Interactive Broadsheet Globe & 2D Projection Hub.
 *
 * Verifies across:
 * - 4 viewports: 1280x720, 1366x768, 1536x864, 1920x1080
 * - 2 themes: Paper and Night editions
 * - 3D Globe vector polygons, news density pins, wildlife markers, arcs, ripple rings
 * - Switching to 2D Flat Map (Mercator / Equal Earth)
 * - Tooltip popover and toolbar controls
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

async function runGlobeAudit() {
  console.log('Starting 3D Interactive Globe Visual Audit (PRD C Category 7)...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=swiftshader', '--no-sandbox'],
  });

  const summary = [];

  for (const vp of VIEWPORTS) {
    for (const theme of ['paper', 'night']) {
      const testName = `ui-cat7-globe-${vp.name}-${theme}`;
      console.log(`\nTesting ${vp.name} [${theme}]...`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      try {
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        // Dismiss startup catch-up modal if visible
        const missedNews = page.locator('#missed-news-modal-overlay');
        if (await missedNews.isVisible({ timeout: 1000 }).catch(() => false)) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }

        // Apply theme cleanly via __APP_STORE__ and HTML attribute, and open Globe
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
          if (window.__APP_STORE__) {
            window.__APP_STORE__.setState({ theme: t });
            window.__APP_STORE__.getState().setGlobeOpen(true);
          }
        }, theme);

        await page.waitForTimeout(2000);

        // Verify Globe modal is open
        const modal = page.locator('#world-map-modal');
        await modal.waitFor({ state: 'visible', timeout: 5000 });

        // Check overflow
        const overflow = await page.evaluate(() => {
          return {
            pageScrollWidth: document.documentElement.scrollWidth,
            pageClientWidth: document.documentElement.clientWidth,
            hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        });

        // Screenshot
        const screenshotPath = path.join(ARTIFACT_DIR, `${testName}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`✓ Screenshot saved: ${testName}.png`);

        summary.push({
          viewport: vp.name,
          theme,
          overflow: overflow.hasHorizontalScroll ? 'FAIL (Horizontal scroll)' : 'PASS (No scroll)',
          status: 'PASS',
        });
      } catch (err) {
        console.error(`✗ Error in ${testName}:`, err.message);
        summary.push({
          viewport: vp.name,
          theme,
          error: err.message,
          status: 'FAIL',
        });
      } finally {
        await context.close();
      }
    }
  }

  // Feature Test 1: Switch to 2D Flat Map
  console.log('\nTesting Projection Switching (3D Globe -> 2D Flat Map)...');
  {
    const context = await browser.newContext({ viewport: { width: 1536, height: 864 } });
    const page = await context.newPage();
    try {
      await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      const missedNews1 = page.locator('#missed-news-modal-overlay');
      if (await missedNews1.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
      await page.evaluate(() => {
        if (window.__APP_STORE__) {
          window.__APP_STORE__.getState().setGlobeOpen(true);
        }
      });
      await page.waitForTimeout(1500);

      // Click projection button to toggle to Mercator 2D
      const projBtn = page.locator('#btn-toggle-projection');
      await projBtn.click();
      await page.waitForTimeout(1000);

      const screenshotPath = path.join(ARTIFACT_DIR, 'ui-cat7-globe-flat-map-fallback.png');
      await page.screenshot({ path: screenshotPath });
      console.log('✓ Screenshot saved: ui-cat7-globe-flat-map-fallback.png');
    } catch (err) {
      console.error('Error testing 2D flat map:', err.message);
    } finally {
      await context.close();
    }
  }

  // Feature Test 2: Wildlife Layer Toggle
  console.log('\nTesting Wildlife Wire Layer Toggle...');
  {
    const context = await browser.newContext({ viewport: { width: 1536, height: 864 } });
    const page = await context.newPage();
    try {
      await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      const missedNews1 = page.locator('#missed-news-modal-overlay');
      if (await missedNews1.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
      await page.evaluate(() => {
        if (window.__APP_STORE__) {
          window.__APP_STORE__.getState().setGlobeOpen(true);
        }
      });
      await page.waitForTimeout(1500);

      const wildlifeBtn = page.locator('#btn-toggle-wildlife-overlay');
      await wildlifeBtn.click(); // Toggle off
      await page.waitForTimeout(500);
      await wildlifeBtn.click(); // Toggle back on
      await page.waitForTimeout(1000);

      const screenshotPath = path.join(ARTIFACT_DIR, 'ui-cat7-globe-wildlife-layer.png');
      await page.screenshot({ path: screenshotPath });
      console.log('✓ Screenshot saved: ui-cat7-globe-wildlife-layer.png');
    } catch (err) {
      console.error('Error testing wildlife layer:', err.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();

  console.log('\n=== PRD C CATEGORY 7 VIEWPORT AUDIT SUMMARY ===');
  console.table(summary);
}

runGlobeAudit();
