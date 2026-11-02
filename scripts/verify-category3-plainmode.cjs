const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function verifyCategory3() {
  console.log('[Verify Cat 3] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('[Verify Cat 3] Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Set Paper theme
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'paper');
  });
  await page.waitForTimeout(500);

  // Check topbar plain mode button
  const topBarToggle = await page.$('#btn-topbar-plain-mode');
  if (topBarToggle) {
    const text = (await topBarToggle.textContent()) || '';
    console.log('[Verify Cat 3] TopBar toggle button text:', text.trim());
    if (text.includes('OFF')) {
      console.log('[Verify Cat 3] Clicking TopBar Plain Mode button to activate Plain Mode...');
      await topBarToggle.click();
      await page.waitForTimeout(1000);
    }
  }

  // 1. Verify Plain Mode full-width container & hidden summary
  const plainContainer = await page.$('#reader-plain-mode-container');
  const summaryPanel = await page.$('#reader-summary-panel');
  console.log('[Verify Cat 3] Plain Mode container visible:', Boolean(plainContainer));
  console.log('[Verify Cat 3] Summary panel hidden:', summaryPanel === null);

  // 2. Verify Provider Badge in Plain Mode
  const providerBadgeText = (await page.textContent('#provider-badge')) || '';
  console.log('[Verify Cat 3] Provider Badge content:', providerBadgeText.trim());

  // 3. Verify ArticlePanel offline badges
  const translationBadge = await page.$('#badge-plainmode-translation');
  const highlightsBadge = await page.$('#badge-plainmode-highlights');
  console.log('[Verify Cat 3] Translation offline badge present:', Boolean(translationBadge));
  console.log('[Verify Cat 3] Highlights offline badge present:', Boolean(highlightsBadge));

  // Screenshot 1: Paper Mode Full-Width Reader
  const shot1 = path.join(ARTIFACTS_DIR, 'ui-step3-plainmode-fullwidth-paper.png');
  await page.screenshot({ path: shot1 });
  console.log('[Verify Cat 3] Saved screenshot 1:', shot1);

  // 4. Open Settings Drawer to inspect Section 7
  console.log('[Verify Cat 3] Opening Settings Drawer...');
  await page.click('#provider-badge');
  await page.waitForTimeout(800);

  // Scroll settings content down to reveal Section 7
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) form.scrollTop = form.scrollHeight;
  });
  await page.waitForTimeout(500);

  const plainModeSwitch = await page.$('#btn-toggle-plain-mode');
  console.log('[Verify Cat 3] Settings Plain Mode switch present:', Boolean(plainModeSwitch));

  const shot3 = path.join(ARTIFACTS_DIR, 'ui-step3-settings-plainmode.png');
  await page.screenshot({ path: shot3 });
  console.log('[Verify Cat 3] Saved screenshot 3:', shot3);

  // Switch to Night Edition via Settings button #btn-theme-night
  console.log('[Verify Cat 3] Switching to Night Edition...');
  const nightBtn = await page.$('#btn-theme-night');
  if (nightBtn) {
    await nightBtn.click({ force: true });
    await page.waitForTimeout(600);
  }

  // Close Settings with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // Screenshot 2: Night Edition Full-Width Reader
  const shot2 = path.join(ARTIFACTS_DIR, 'ui-step3-plainmode-fullwidth-night.png');
  await page.screenshot({ path: shot2 });
  console.log('[Verify Cat 3] Saved screenshot 2 (Night Edition):', shot2);

  // 5. Open Bat Menu and navigate to Archive Morgue
  console.log('[Verify Cat 3] Opening Bat Menu...');
  await page.keyboard.press('b');
  await page.waitForTimeout(600);

  const archiveItem = await page.$('button:has-text("Archive Morgue")');
  if (archiveItem) {
    console.log('[Verify Cat 3] Clicking Archive Morgue in Bat menu...');
    await archiveItem.click();
    await page.waitForTimeout(800);

    const archiveOfflineBadge = await page.$('#badge-archive-plainmode');
    console.log('[Verify Cat 3] Archive offline badge present:', Boolean(archiveOfflineBadge));

    const shot4 = path.join(ARTIFACTS_DIR, 'ui-step3-archive-plainmode.png');
    await page.screenshot({ path: shot4 });
    console.log('[Verify Cat 3] Saved screenshot 4:', shot4);
  } else {
    console.warn('[Verify Cat 3] Archive Morgue button not found in Bat menu');
  }

  await browser.close();
  console.log('[Verify Cat 3] Visual verification finished cleanly.');
}

verifyCategory3().catch((err) => {
  console.error('[Verify Cat 3] Error during visual verification:', err);
  process.exit(1);
});
