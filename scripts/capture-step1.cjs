const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/?showcase=true ...');
  await page.goto('http://localhost:5173/?showcase=true', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Capture Paper Theme (Default)
  const paperPath = path.resolve('C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a/ui-step1-design-system-paper.png');
  await page.screenshot({ path: paperPath, fullPage: true });
  console.log('Saved Paper Theme screenshot:', paperPath);

  // 2. Toggle to Night Theme
  const switchElement = page.locator('button[aria-label="Toggle Night Edition"]');
  await switchElement.click();
  await page.waitForTimeout(800);

  const nightPath = path.resolve('C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a/ui-step1-design-system-night.png');
  await page.screenshot({ path: nightPath, fullPage: true });
  console.log('Saved Night Theme screenshot:', nightPath);

  // 3. Capture regular Shell with new styles
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const shellPath = path.resolve('C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a/ui-step1-shell-styled.png');
  await page.screenshot({ path: shellPath, fullPage: true });
  console.log('Saved Shell screenshot:', shellPath);

  await browser.close();
  console.log('All screenshots captured successfully.');
})();
