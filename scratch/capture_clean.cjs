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

  // Dismiss modal if open
  const skipBtn = page.locator('#btn-missed-news-skip');
  if (await skipBtn.count() > 0) {
    await skipBtn.click();
    console.log('Dismissed MissedNewsModal');
    await page.waitForTimeout(500);
  }

  // 1. Paper Theme screenshot (Clean, unblurred frontpage)
  const paperPath = path.resolve(artifactDir, 'ui-stepB-frontpage-paper.png');
  await page.screenshot({ path: paperPath });
  console.log('Saved Paper:', paperPath);

  // 2. Open Bat Menu by clicking #bat-menu-button or pressing 'b'
  await page.locator('#bat-menu-button').click();
  await page.waitForTimeout(500);

  // Click Desk Preferences
  const prefBtn = page.locator('button:has-text("Desk Preferences")');
  await prefBtn.click();
  await page.waitForTimeout(600);

  // Capture Settings Drawer (verifies spider kinematics section is deleted)
  const settingsPath = path.resolve(artifactDir, 'ui-stepB-settings-drawer.png');
  await page.screenshot({ path: settingsPath });
  console.log('Saved Settings Drawer:', settingsPath);

  // 3. Switch to Night Mode by clicking #btn-theme-night
  const nightBtn = page.locator('#btn-theme-night');
  await nightBtn.click();
  await page.waitForTimeout(600);

  // Close Settings Drawer
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // 4. Night Theme Front Page Screenshot
  const nightPath = path.resolve(artifactDir, 'ui-stepB-frontpage-night.png');
  await page.screenshot({ path: nightPath });
  console.log('Saved Night:', nightPath);

  await browser.close();
  console.log('Done.');
})();
