const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('header, nav, article', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // 1. Paper theme frontpage with real news
  console.log('Capturing Paper Theme Frontpage with Real Live News...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-livenews-frontpage-paper.png'),
    fullPage: false
  });

  // 2. Hover over summary sentence to verify Evidence Highlight on real news
  console.log('Triggering Evidence Highlight on real news...');
  const summarySentences = page.locator('.summary-sentence-item');
  const count = await summarySentences.count();
  if (count > 0) {
    await summarySentences.first().hover();
    await page.waitForTimeout(600);
  }
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-livenews-evidence-highlight.png'),
    fullPage: false
  });

  // 3. Switch to Night Edition via Bat Menu
  console.log('Switching to Night Edition via Bat Menu...');
  await page.keyboard.press('b');
  await page.waitForTimeout(600);
  const nightBtn = page.locator('button:has-text("Night Edition"), button:has-text("Night")').first();
  if (await nightBtn.isVisible()) {
    await nightBtn.click();
    await page.waitForTimeout(600);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-livenews-frontpage-night.png'),
    fullPage: false
  });

  await browser.close();
  console.log('Screenshots captured successfully in artifact directory.');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
