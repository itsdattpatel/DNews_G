const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function verifyCategory10() {
  console.log('[Verify Cat 10] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('[Verify Cat 10] Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Close any startup catch-up modal
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) {
      store.setMissedNewsModalOpen(false);
    }
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Disable Plain Mode so the AI Summary column and Pass 1 triage banner are fully visible
  console.log('[Verify Cat 10] Disabling Plain Mode & enabling Two-Pass AI in settings...');
  await page.evaluate(async () => {
    const store = window.useAppStore?.getState();
    if (store) {
      await store.updateSettings({ plain_mode_enabled: false, two_pass_ai_enabled: true });
    }
  });
  await page.waitForTimeout(500);

  // 1. Paper Edition — Select unsummarized article 185832 (Pass 1 quick-scored)
  console.log('[Verify Cat 10] Step 1: Selecting unsummarized article 185832 in Paper Edition...');
  await page.evaluate(async () => {
    const store = window.useAppStore?.getState();
    if (store) {
      store.setMissedNewsModalOpen(false);
      store.setTheme('paper');
      store.setCurrentView('reader');
      await store.selectArticleById(185832);
    }
  });
  await page.waitForTimeout(1000);

  // Capture Screenshot 1: Paper Edition — Reader with Pass 1 Triage Banner & Summary Panel Pass 1 Card
  const shot1 = path.join(ARTIFACTS_DIR, 'ui-step10-pass1-banner-paper.png');
  await page.screenshot({ path: shot1 });
  console.log('[Verify Cat 10] Captured Screenshot 1:', shot1);

  // 2. Trigger Pass 2 Enrichment on article 185832
  console.log('[Verify Cat 10] Step 2: Triggering Pass 2 Enrichment on article 185832...');
  await page.evaluate(async () => {
    const store = window.useAppStore?.getState();
    if (store) {
      await store.enrichArticlePass2(185832);
      store.setTheme('night');
    }
  });
  await page.waitForTimeout(1500);

  // Capture Screenshot 2: Night Edition — Fully Enriched via Pass 2 with Executive Briefing
  const shot2 = path.join(ARTIFACTS_DIR, 'ui-step10-pass2-summarized-night.png');
  await page.screenshot({ path: shot2 });
  console.log('[Verify Cat 10] Captured Screenshot 2:', shot2);

  // 3. Settings Drawer — Section 9 Two-Pass AI & Live Quota Telemetry
  console.log('[Verify Cat 10] Step 3: Opening Settings Drawer Section 9...');
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) {
      store.setSettingsOpen(true);
    }
  });
  await page.waitForTimeout(800);

  // Scroll the drawer to Section 9
  await page.evaluate(() => {
    const el = document.getElementById('telemetry-tokens-saved');
    if (el) {
      el.scrollIntoView({ block: 'center' });
    }
  });
  await page.waitForTimeout(600);

  // Capture Screenshot 3: Settings Section 9 with Live Telemetry
  const shot3 = path.join(ARTIFACTS_DIR, 'ui-step10-two-pass-settings-telemetry.png');
  await page.screenshot({ path: shot3 });
  console.log('[Verify Cat 10] Captured Screenshot 3:', shot3);

  await browser.close();
  console.log('[Verify Cat 10] All visual verification screenshots captured successfully!');
}

verifyCategory10().catch((err) => {
  console.error('[Verify Cat 10] Error:', err);
  process.exit(1);
});
