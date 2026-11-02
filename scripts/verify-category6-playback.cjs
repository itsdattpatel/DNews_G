const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function verifyCategory6() {
  console.log('[Verify Cat 6] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('[Verify Cat 6] Navigating to http://localhost:5173...');
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
  console.log('[Verify Cat 6] Opening TV View...');
  const tvBtn = await page.$('#btn-topbar-tv');
  if (tvBtn) {
    await tvBtn.click();
  } else {
    await page.keyboard.press('t');
  }

  // Wait for channels list to load
  console.log('[Verify Cat 6] Waiting for channels to load...');
  await page.waitForSelector('.tv-channel-item', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Select Top 5 Shelf Tab to pick a channel with verified YouTube Live embed
  const top5ShelfBtn = await page.$('#btn-tv-shelf-top5');
  if (top5ShelfBtn) {
    await top5ShelfBtn.click();
    await page.waitForTimeout(1000);
  }

  // Click on the first Top-5 channel (e.g. ABC News Australia)
  const top5Cards = await page.$$('.tv-channel-item');
  if (top5Cards.length > 0) {
    await top5Cards[0].click();
    await page.waitForTimeout(800);
  }

  // 2. Multi-Method Playback: Switch to YouTube Live method
  console.log('[Verify Cat 6] Testing Multi-Method Playback Switcher...');
  const youtubeMethodBtn = await page.$('#btn-method-youtube');
  console.log('[Verify Cat 6] YouTube method button visible:', Boolean(youtubeMethodBtn));
  if (youtubeMethodBtn) {
    await youtubeMethodBtn.click();
    await page.waitForTimeout(1000);
  }

  // Test Copy Stream URL button
  const copyBtn = await page.$('#btn-copy-stream-url');
  if (copyBtn) {
    await copyBtn.click();
    await page.waitForTimeout(400);
  }

  // Capture Screenshot 1: TV View with YouTube Live Embed & Method Switcher (Paper Edition)
  const shot1 = path.join(ARTIFACTS_DIR, 'ui-step6-tv-youtube-player-paper.png');
  await page.screenshot({ path: shot1 });
  console.log('[Verify Cat 6] Captured Screenshot 1:', shot1);

  // 3. Switch to Night Edition Theme
  console.log('[Verify Cat 6] Switching to Night Edition Theme...');
  await page.evaluate(() => {
    localStorage.setItem('news_desk_theme', 'night');
    document.documentElement.setAttribute('data-theme', 'night');
    const shell = document.getElementById('app-shell');
    if (shell) shell.setAttribute('data-theme', 'night');
  });
  await page.waitForTimeout(800);

  // Capture Screenshot 2: TV View with YouTube Live Embed & Method Switcher (Night Edition)
  const shot2 = path.join(ARTIFACTS_DIR, 'ui-step6-tv-youtube-player-night.png');
  await page.screenshot({ path: shot2 });
  console.log('[Verify Cat 6] Captured Screenshot 2:', shot2);

  // Switch back to Paper for modal screenshot
  await page.evaluate(() => {
    localStorage.setItem('news_desk_theme', 'paper');
    document.documentElement.setAttribute('data-theme', 'paper');
    const shell = document.getElementById('app-shell');
    if (shell) shell.setAttribute('data-theme', 'paper');
  });
  await page.waitForTimeout(500);

  // 4. Open "Add YouTube Stream" Modal
  console.log('[Verify Cat 6] Opening "+ Add YouTube" Modal...');
  const addYtBtn = await page.$('#btn-tv-add-youtube');
  console.log('[Verify Cat 6] Add YouTube button visible:', Boolean(addYtBtn));
  if (addYtBtn) {
    await addYtBtn.click();
    await page.waitForTimeout(800);
  }

  // Type @ndtv handle into URL input
  const urlInput = await page.$('#input-youtube-url');
  if (urlInput) {
    await urlInput.fill('@ndtv');
    await page.waitForTimeout(300);
  }

  // Click Preview button
  const previewBtn = await page.$('#btn-preview-youtube');
  if (previewBtn) {
    await previewBtn.click();
    await page.waitForTimeout(1500);
  }

  // Capture Screenshot 3: Add YouTube Modal with Verified Preview & Channel ID Guide
  const shot3 = path.join(ARTIFACTS_DIR, 'ui-step6-add-youtube-modal.png');
  await page.screenshot({ path: shot3 });
  console.log('[Verify Cat 6] Captured Screenshot 3:', shot3);

  await browser.close();
  console.log('[Verify Cat 6] All Category 6 verification screenshots successfully captured!');
}

verifyCategory6().catch((err) => {
  console.error('[Verify Cat 6] Error:', err);
  process.exit(1);
});
