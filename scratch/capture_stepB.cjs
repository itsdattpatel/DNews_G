const { chromium } = require('playwright');
const path = require('path');

const artifactDir = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Dismiss catch-up modal if visible
  try {
    const skipBtn = page.locator('button:has-text("Skip")');
    if (await skipBtn.isVisible({ timeout: 1000 })) {
      await skipBtn.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {
    // Ignore timeout
  }

  // 1. Front Page in Paper Theme (Clean)
  const paperPath = path.resolve(artifactDir, 'ui-stepB-frontpage-paper.png');
  await page.screenshot({ path: paperPath });
  console.log('Captured:', paperPath);

  // 2. Open Settings Menu to show spider kinematics section is deleted
  try {
    const batBtn = page.locator('#btn-topbar-bat');
    await batBtn.click();
    await page.waitForTimeout(500);
    const settingsItem = page.locator('button:has-text("Desk Preferences")');
    await settingsItem.click();
    await page.waitForTimeout(600);
    const settingsPath = path.resolve(artifactDir, 'ui-stepB-settings-drawer.png');
    await page.screenshot({ path: settingsPath });
    console.log('Captured:', settingsPath);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  } catch (e) {
    console.error('Settings capture error:', e);
  }

  // 3. Toggle Night Theme
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'night');
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(500);
  const nightPath = path.resolve(artifactDir, 'ui-stepB-frontpage-night.png');
  await page.screenshot({ path: nightPath });
  console.log('Captured:', nightPath);

  // 4. Category Rail Empty State
  try {
    const railBtn = page.locator('button[aria-label="Category Rail"]');
    if (await railBtn.count() > 0) {
      await railBtn.click();
      await page.waitForTimeout(800);
      const searchInput = page.locator('#category-search-input');
      if (await searchInput.count() > 0) {
        await searchInput.fill('xyznonexistentquery999');
        await page.waitForTimeout(600);
        const emptyCatPath = path.resolve(artifactDir, 'ui-stepB-category-empty.png');
        await page.screenshot({ path: emptyCatPath });
        console.log('Captured:', emptyCatPath);
      }
    }
  } catch (e) {
    console.error('Category rail capture error:', e);
  }

  await browser.close();
  console.log('Done capturing crisp Step B verification screenshots.');
})();
