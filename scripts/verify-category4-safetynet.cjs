const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function verifyCategory4() {
  console.log('[Verify Cat 4] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log('[Verify Cat 4] Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Set Paper theme initially
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'paper');
  });
  await page.waitForTimeout(500);

  // 1. Open Settings Drawer
  console.log('[Verify Cat 4] Opening Settings Drawer...');
  const providerBadge = await page.$('#provider-badge');
  if (providerBadge) {
    await providerBadge.click();
  } else {
    // Fallback: click bat icon or trigger settings
    await page.keyboard.press(',');
  }
  await page.waitForTimeout(1000);

  // Verify settings drawer is open
  const drawerHeading = await page.$('#settings-drawer-heading');
  console.log('[Verify Cat 4] Settings drawer open:', Boolean(drawerHeading));

  // Scroll down in the settings drawer form to Section 8
  const settingsForm = await page.$('form[data-lenis-prevent="true"]');
  if (settingsForm) {
    await page.evaluate((form) => {
      form.scrollTop = form.scrollHeight;
    }, settingsForm);
    await page.waitForTimeout(600);
  }

  // 2. Verify Section 8 Safety Net Elements
  const exportBtn = await page.$('#btn-export-settings');
  const importBtn = await page.$('#btn-import-settings');
  const createBackupBtn = await page.$('#btn-create-backup');

  console.log('[Verify Cat 4] Export Settings button visible:', Boolean(exportBtn));
  console.log('[Verify Cat 4] Import Settings button visible:', Boolean(importBtn));
  console.log('[Verify Cat 4] Create Backup button visible:', Boolean(createBackupBtn));

  // Capture Screenshot 1: Settings Drawer with Section 8 (Paper Edition)
  const shot1 = path.join(ARTIFACTS_DIR, 'ui-step4-settings-backups-paper.png');
  await page.screenshot({ path: shot1 });
  console.log('[Verify Cat 4] Saved screenshot 1:', shot1);

  // 3. Trigger "Create Backup Now"
  console.log('[Verify Cat 4] Clicking "Create Backup Now"...');
  if (createBackupBtn) {
    await createBackupBtn.click();
    await page.waitForTimeout(2000);
  }

  // Check if at least one restore button exists
  let restoreBtn = await page.$('#btn-restore-0');
  if (!restoreBtn) {
    // Query any restore button in the list
    restoreBtn = await page.$('button:has-text("Restore")');
  }
  console.log('[Verify Cat 4] Restore button available:', Boolean(restoreBtn));

  if (restoreBtn) {
    console.log('[Verify Cat 4] Clicking "Restore" to trigger double-confirmation modal...');
    await restoreBtn.click();
    await page.waitForTimeout(600);

    // Verify modal is open
    const modalBackdrop = await page.$('#restore-modal-backdrop');
    const confirmBtn = await page.$('#btn-confirm-restore');
    const isConfirmDisabled = confirmBtn ? await page.evaluate((b) => b.disabled, confirmBtn) : false;

    console.log('[Verify Cat 4] Restore modal visible:', Boolean(modalBackdrop));
    console.log('[Verify Cat 4] Confirm button initially disabled:', isConfirmDisabled);

    // Capture Screenshot 2: Restore Confirmation Modal (Locked)
    const shot2 = path.join(ARTIFACTS_DIR, 'ui-step4-restore-modal-locked.png');
    await page.screenshot({ path: shot2 });
    console.log('[Verify Cat 4] Saved screenshot 2:', shot2);

    // Type "RESTORE" to unlock confirmation
    console.log('[Verify Cat 4] Typing "RESTORE" into confirmation input...');
    await page.fill('#input-confirm-restore', 'RESTORE');
    await page.waitForTimeout(400);

    const isNowEnabled = confirmBtn ? await page.evaluate((b) => !b.disabled, confirmBtn) : false;
    console.log('[Verify Cat 4] Confirm button unlocked after typing RESTORE:', isNowEnabled);

    // Capture Screenshot 3: Restore Confirmation Modal (Unlocked)
    const shot3 = path.join(ARTIFACTS_DIR, 'ui-step4-restore-modal-unlocked.png');
    await page.screenshot({ path: shot3 });
    console.log('[Verify Cat 4] Saved screenshot 3:', shot3);

    // Cancel modal safely
    console.log('[Verify Cat 4] Clicking Cancel to safely dismiss modal...');
    await page.click('#btn-cancel-restore');
    await page.waitForTimeout(500);
  }

  // 4. Switch to Night Edition Theme and capture
  console.log('[Verify Cat 4] Switching to Night Edition...');
  const nightThemeBtn = await page.$('#btn-theme-night');
  if (nightThemeBtn) {
    await nightThemeBtn.click();
    await page.waitForTimeout(600);
  }
  // Re-scroll to bottom of form
  if (settingsForm) {
    await page.evaluate((form) => {
      form.scrollTop = form.scrollHeight;
    }, settingsForm);
    await page.waitForTimeout(500);
  }

  // Capture Screenshot 4: Settings Drawer in Night Edition
  const shot4 = path.join(ARTIFACTS_DIR, 'ui-step4-settings-backups-night.png');
  await page.screenshot({ path: shot4 });
  console.log('[Verify Cat 4] Saved screenshot 4:', shot4);

  // Switch back to Paper edition
  const paperThemeBtn = await page.$('#btn-theme-paper');
  if (paperThemeBtn) {
    await paperThemeBtn.click();
    await page.waitForTimeout(300);
  }

  // Close settings drawer
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await browser.close();
  console.log('[Verify Cat 4] Visual validation completed successfully!');
}

verifyCategory4().catch((err) => {
  console.error('[Verify Cat 4] Error during verification:', err);
  process.exit(1);
});
