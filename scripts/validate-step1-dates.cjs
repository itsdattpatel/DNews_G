const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function validateStep1Dates() {
  console.log('Launching headless Chromium for Step 1 Dates Validation...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('header, nav, article', { timeout: 10000 });
  await page.waitForTimeout(2500);

  // 1. Locate dual timestamp elements
  const timestampLocators = page.locator('[data-testid="dual-timestamp"]');
  const count = await timestampLocators.count();
  console.log(`Found ${count} dual timestamp element(s) on current screen.`);

  // Inspect the first few timestamps text content
  for (let i = 0; i < Math.min(count, 5); i++) {
    const text = await timestampLocators.nth(i).innerText();
    const title = await timestampLocators.nth(i).getAttribute('title');
    console.log(`Timestamp #${i + 1}: text="${text.replace(/\n/g, ' ')}", title="${title}"`);
  }

  // 2. Paper theme frontpage screenshot
  console.log('Capturing Paper Theme with Dual Timestamps...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-step1-dates-paper.png'),
    fullPage: false
  });

  // 3. Hover over the first dual timestamp to inspect tooltip & hover state
  if (count > 0) {
    console.log('Hovering over main article byline timestamp...');
    const firstTimestamp = timestampLocators.first();
    await firstTimestamp.scrollIntoViewIfNeeded();
    await firstTimestamp.hover();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-step1-dates-hover-tooltip.png'),
      fullPage: false
    });
  }

  // 4. Switch to Night Edition theme via Bat Menu
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

  console.log('Capturing Night Edition with Dual Timestamps...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-step1-dates-night.png'),
    fullPage: false
  });

  // 5. Open Directory/Category view
  console.log('Navigating to Category Rail View...');
  const dirBtn = page.locator('button:has-text("Directory")').first();
  if (await dirBtn.isVisible()) {
    await dirBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-step1-dates-category-rail.png'),
      fullPage: false
    });
  }

  await browser.close();
  console.log('Validation complete! Screenshots saved to artifact directory.');
}

validateStep1Dates().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
