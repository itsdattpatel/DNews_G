const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function verifyCategory2() {
  console.log('--- Step 2 Verification: Auto-Advance (Every 7 Seconds) ---');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('header, article', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // 2. Enable Auto-Advance via TopBar toggle button
  console.log('2. Checking Auto-Advance state via TopBar button...');
  const autoAdvanceBtn = page.locator('#btn-auto-advance-toggle');
  await autoAdvanceBtn.waitFor({ state: 'visible', timeout: 10000 });
  const btnText = await autoAdvanceBtn.innerText();
  console.log(`   Initial Auto-Advance button text: "${btnText}"`);

  let progressContainer = page.locator('[data-testid="auto-advance-progress-container"]');
  let isProgressVisible = await progressContainer.isVisible();
  if (!isProgressVisible) {
    console.log('   Clicking Auto-Advance toggle button to enable...');
    await autoAdvanceBtn.click();
    await page.waitForTimeout(800);
  }

  // Verify progress bar container is visible
  progressContainer = page.locator('[data-testid="auto-advance-progress-container"]');
  isProgressVisible = await progressContainer.isVisible();
  console.log(`   Auto-Advance Progress Bar visible: ${isProgressVisible}`);

  // 3. Capture Active Auto-Advance in Paper Mode
  console.log('3. Capturing active Auto-Advance countdown in Paper Mode...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-step2-autoadvance-active-paper.png'),
    fullPage: false,
  });

  // 4. Test Hover Pause on Left Article Panel
  console.log('4. Hovering over Left Article Panel to test Hover-Pause...');
  const articlePanel = page.locator('#article-panel');
  await articlePanel.hover({ position: { x: 200, y: 200 } });
  await page.waitForTimeout(500);

  const pauseLabel = page.locator('[data-testid="auto-advance-pause-reason"]');
  const pauseText = await pauseLabel.innerText().catch(() => '');
  console.log(`   Pause label when hovering article panel: "${pauseText}"`);

  console.log('   Capturing Hover-Paused state...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-step2-autoadvance-hover-paused.png'),
    fullPage: false,
  });

  // 5. Open Settings Drawer to inspect Section 6 Auto-Advance Controls
  console.log('5. Opening Settings Drawer to inspect Auto-Advance controls...');
  // Move mouse away from panel
  await page.mouse.move(50, 50);
  await page.keyboard.press('b');
  await page.waitForTimeout(600);
  const settingsBtn = page.locator('button:has-text("Desk Settings"), button:has-text("Preferences")').first();
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await page.waitForTimeout(600);
  }

  console.log('   Capturing Settings Drawer with Auto-Advance slider...');
  const autoAdvanceSection = page.locator('#btn-toggle-auto-advance');
  if (await autoAdvanceSection.isVisible()) {
    await autoAdvanceSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-step2-settings-autoadvance.png'),
    fullPage: false,
  });

  // 6. Switch to Night Edition Theme
  console.log('6. Switching to Night Edition Mode...');
  const nightBtn = page.locator('#btn-theme-night');
  if (await nightBtn.isVisible()) {
    await nightBtn.click({ force: true });
    await page.waitForTimeout(600);
  }

  // Close Settings Drawer
  const closeSettingsBtn = page.locator('#close-settings-btn');
  if (await closeSettingsBtn.isVisible()) {
    await closeSettingsBtn.click({ force: true });
    await page.waitForTimeout(600);
  } else {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  // 7. Capture Night Edition with Auto-Advance Bar
  console.log('7. Capturing Night Edition with Auto-Advance...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-step2-autoadvance-night.png'),
    fullPage: false,
  });

  // 8. Test Spacebar Manual Pause Toggle
  console.log('8. Testing Spacebar Manual Pause...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  const manualPauseText = await pauseLabel.innerText().catch(() => '');
  console.log(`   Pause label after pressing Spacebar: "${manualPauseText}"`);

  await browser.close();
  console.log('--- Step 2 Verification Complete! Screenshots saved to artifact dir. ---');
}

verifyCategory2().catch((err) => {
  console.error('Step 2 verification error:', err);
  process.exit(1);
});
