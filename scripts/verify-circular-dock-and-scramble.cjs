/**
 * scripts/verify-circular-dock-and-scramble.cjs
 * Visual validation for Circular Dock, Unified Reader, and ScrambledText Settings.
 */
const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f';

async function run() {
  console.log('[Visual Test] Launching Chromium browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    console.log('[Visual Test] Navigating to http://127.0.0.1:5173 ...');
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Dismiss Missed News Modal if present
    const missedOverlay = page.locator('#missed-news-modal-overlay');
    if (await missedOverlay.isVisible().catch(() => false)) {
      console.log('[Visual Test] Dismissing Missed News Modal...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // 1. Capture Main Unified Desk with Circular Dock
    const screen1Path = path.join(ARTIFACTS_DIR, 'ui-dock-1-unified-desk-circular.png');
    await page.screenshot({ path: screen1Path, fullPage: false });
    console.log(`[Visual Test] Saved: ${screen1Path}`);

    // Check active headline
    const headline = page.locator('#article-headline');
    const headlineText = await headline.innerText().catch(() => '');
    console.log(`[Visual Test] Active Headline: "${headlineText.slice(0, 60)}..."`);

    // 2. Click card #2 in Circular Dock to verify focus change and elevation
    console.log('[Visual Test] Finding cards in Circular Dock...');
    const cards = page.locator('#circular-dock [data-testid="article-card"]');
    const cardCount = await cards.count();
    console.log(`[Visual Test] Total cards in dock: ${cardCount}`);

    if (cardCount > 2) {
      console.log('[Visual Test] Clicking card #2 to verify focus change and elevation...');
      await cards.nth(2).click({ force: true });
      await page.waitForTimeout(1000);

      const screen2Path = path.join(ARTIFACTS_DIR, 'ui-dock-2-active-story-changed.png');
      await page.screenshot({ path: screen2Path, fullPage: false });
      console.log(`[Visual Test] Saved: ${screen2Path}`);
    }

    // 3. Open Settings Modal
    console.log('[Visual Test] Opening Settings Dialog...');
    await page.keyboard.press('Control+,');
    await page.waitForTimeout(1000);

    // Click Reading section inside modal
    const modal = page.locator('#unified-settings-modal-overlay');
    if (await modal.isVisible().catch(() => false)) {
      console.log('[Visual Test] Modal visible! Navigating to Reading tab...');
      const readingTab = modal.locator('button:has-text("Reading")').first();
      await readingTab.click({ force: true });
      await page.waitForTimeout(800);
    }

    const screen3Path = path.join(ARTIFACTS_DIR, 'ui-dock-3-scramble-settings.png');
    await page.screenshot({ path: screen3Path, fullPage: false });
    console.log(`[Visual Test] Saved: ${screen3Path}`);

    console.log('[Visual Test] All visual validation screenshots successfully captured!');
  } catch (err) {
    console.error('[Visual Test] Error during visual validation:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
