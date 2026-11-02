const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function verifyCategory7() {
  console.log('[Verify Cat 7] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('[Verify Cat 7] Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Set Paper theme
  await page.evaluate(() => {
    localStorage.setItem('news_desk_theme', 'paper');
    document.documentElement.setAttribute('data-theme', 'paper');
    const shell = document.getElementById('app-shell');
    if (shell) shell.setAttribute('data-theme', 'paper');
  });
  await page.waitForTimeout(500);

  // 1. Open TV View
  console.log('[Verify Cat 7] Opening TV View...');
  const tvBtn = await page.$('#btn-topbar-tv');
  if (tvBtn) {
    await tvBtn.click();
  } else {
    await page.keyboard.press('t');
  }

  // Wait for channels list and subpage tabs to load
  console.log('[Verify Cat 7] Waiting for channels & tabs to load...');
  await page.waitForSelector('#tab-subpage-live', { timeout: 10000 });
  await page.waitForSelector('.tv-channel-item', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Adjust volume slider to demonstrate volume change
  const volumeSlider = await page.$('#input-tv-volume');
  if (volumeSlider) {
    await volumeSlider.fill('0.85');
    await page.waitForTimeout(300);
  }

  // Test keyboard navigation (ArrowDown to switch channel)
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(800);

  // Capture Screenshot 1: TV View Subpages - LIVE Tab (Paper Edition)
  const shot1 = path.join(ARTIFACTS_DIR, 'ui-step7-tv-subpages-live-paper.png');
  await page.screenshot({ path: shot1 });
  console.log('[Verify Cat 7] Captured Screenshot 1:', shot1);

  // 2. Switch to Night Edition Theme
  console.log('[Verify Cat 7] Switching to Night Edition Theme...');
  await page.evaluate(() => {
    localStorage.setItem('news_desk_theme', 'night');
    document.documentElement.setAttribute('data-theme', 'night');
    const shell = document.getElementById('app-shell');
    if (shell) shell.setAttribute('data-theme', 'night');
  });
  await page.waitForTimeout(800);

  // Capture Screenshot 2: TV View Subpages - LIVE Tab (Night Edition)
  const shot2 = path.join(ARTIFACTS_DIR, 'ui-step7-tv-subpages-live-night.png');
  await page.screenshot({ path: shot2 });
  console.log('[Verify Cat 7] Captured Screenshot 2:', shot2);

  // 3. Switch back to Paper and inspect FAULTY FEEDS tab
  await page.evaluate(() => {
    localStorage.setItem('news_desk_theme', 'paper');
    document.documentElement.setAttribute('data-theme', 'paper');
    const shell = document.getElementById('app-shell');
    if (shell) shell.setAttribute('data-theme', 'paper');
  });
  await page.waitForTimeout(500);

  console.log('[Verify Cat 7] Clicking FAULTY FEEDS tab...');
  const faultyTab = await page.$('#tab-subpage-faulty');
  if (faultyTab) {
    await faultyTab.click();
    await page.waitForTimeout(1000);
  }

  // Capture Screenshot 3: FAULTY FEEDS Subpage
  const shot3 = path.join(ARTIFACTS_DIR, 'ui-step7-tv-subpage-faulty.png');
  await page.screenshot({ path: shot3 });
  console.log('[Verify Cat 7] Captured Screenshot 3:', shot3);

  // 4. Inspect STOPPED LINKS tab & Edit URL modal
  console.log('[Verify Cat 7] Clicking STOPPED LINKS tab...');
  const stoppedTab = await page.$('#tab-subpage-stopped');
  if (stoppedTab) {
    await stoppedTab.click();
    await page.waitForTimeout(1000);
  }

  // Click edit button on the first stopped channel if present
  const editButtons = await page.$$('button[id^="btn-edit-channel-"]');
  if (editButtons.length > 0) {
    console.log('[Verify Cat 7] Clicking Edit URL button on stopped channel...');
    await editButtons[0].click();
    await page.waitForTimeout(500);
  }

  // Capture Screenshot 4: Edit Channel URL Modal
  const shot4 = path.join(ARTIFACTS_DIR, 'ui-step7-tv-edit-channel-modal.png');
  await page.screenshot({ path: shot4 });
  console.log('[Verify Cat 7] Captured Screenshot 4:', shot4);

  await browser.close();
  console.log('[Verify Cat 7] All validations and screenshots complete.');
}

verifyCategory7().catch((err) => {
  console.error('[Verify Cat 7] Error during validation:', err);
  process.exit(1);
});
