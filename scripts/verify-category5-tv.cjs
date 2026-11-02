const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function verifyCategory5() {
  console.log('[Verify Cat 5] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('[Verify Cat 5] Navigating to http://localhost:5173...');
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
  console.log('[Verify Cat 5] Opening TV View...');
  const tvBtn = await page.$('#btn-topbar-tv');
  if (tvBtn) {
    await tvBtn.click();
  } else {
    await page.keyboard.press('t');
  }

  // Wait for channels list to load from API
  console.log('[Verify Cat 5] Waiting for channels to load...');
  await page.waitForSelector('.tv-channel-item', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 2. Select Top 5 Shelf Tab
  console.log('[Verify Cat 5] Selecting Top 5 Shelf Tab...');
  const top5ShelfBtn = await page.$('#btn-tv-shelf-top5');
  if (top5ShelfBtn) {
    await top5ShelfBtn.click();
    await page.waitForTimeout(1000);
  }

  // Verify channels loaded
  const top5Cards = await page.$$('.tv-channel-item');
  console.log('[Verify Cat 5] Top 5 Channel cards found:', top5Cards.length);

  // Click on the first channel to activate it
  if (top5Cards.length > 0) {
    await top5Cards[0].click();
    await page.waitForTimeout(800);
  }

  // Capture Screenshot 1: Top 5 Curated Outlets (Paper Edition)
  const shot1 = path.join(ARTIFACTS_DIR, 'ui-step5-tv-top5-paper.png');
  await page.screenshot({ path: shot1 });
  console.log('[Verify Cat 5] Captured Screenshot 1:', shot1);

  // 3. Switch to Night Edition Theme
  console.log('[Verify Cat 5] Switching to Night Edition Theme...');
  await page.evaluate(() => {
    localStorage.setItem('news_desk_theme', 'night');
    document.documentElement.setAttribute('data-theme', 'night');
    const shell = document.getElementById('app-shell');
    if (shell) shell.setAttribute('data-theme', 'night');
  });
  await page.waitForTimeout(800);

  // Capture Screenshot 2: Top 5 Curated Outlets (Night Edition)
  const shot2 = path.join(ARTIFACTS_DIR, 'ui-step5-tv-top5-night.png');
  await page.screenshot({ path: shot2 });
  console.log('[Verify Cat 5] Captured Screenshot 2:', shot2);

  // 4. Select India Shelf Tab
  console.log('[Verify Cat 5] Selecting India Shelf Tab...');
  const indiaShelfBtn = await page.$('#btn-tv-shelf-india');
  if (indiaShelfBtn) {
    await indiaShelfBtn.click();
    await page.waitForTimeout(1000);
  }

  const indiaCards = await page.$$('.tv-channel-item');
  console.log('[Verify Cat 5] India Shelf Channel cards found:', indiaCards.length);

  // Click on NDTV (first card)
  if (indiaCards.length > 0) {
    await indiaCards[0].click();
    await page.waitForTimeout(800);
  }

  // Switch back to Paper for India Shelf view
  await page.evaluate(() => {
    localStorage.setItem('news_desk_theme', 'paper');
    document.documentElement.setAttribute('data-theme', 'paper');
    const shell = document.getElementById('app-shell');
    if (shell) shell.setAttribute('data-theme', 'paper');
  });
  await page.waitForTimeout(800);

  // Capture Screenshot 3: India Top 5 Outlets Filter & Banner (Paper Edition)
  const shot3 = path.join(ARTIFACTS_DIR, 'ui-step5-tv-shelf-india.png');
  await page.screenshot({ path: shot3 });
  console.log('[Verify Cat 5] Captured Screenshot 3:', shot3);

  await browser.close();
  console.log('[Verify Cat 5] All validation screenshots successfully captured!');
}

verifyCategory5().catch((err) => {
  console.error('[Verify Cat 5] Error:', err);
  process.exit(1);
});
