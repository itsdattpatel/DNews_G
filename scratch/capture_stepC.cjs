const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\dattj\\.gemini\\antigravity\\brain\\26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Dismiss MissedNewsModal if present
  try {
    const skipBtn = await page.$('#btn-missed-news-skip');
    if (skipBtn && (await skipBtn.isVisible())) {
      await skipBtn.click();
      console.log('Dismissed MissedNewsModal');
      await page.waitForTimeout(500);
    }
  } catch (e) {}

  // 1. Evidence Highlight in Paper Edition (click sentence § 1)
  console.log('Activating sentence § 1...');
  const firstSentence = await page.$('[data-sentence-index="0"]');
  if (firstSentence) {
    await firstSentence.click();
    await page.waitForTimeout(800);
  }

  const paperPath = path.join(ARTIFACT_DIR, 'ui-stepC-evidence-highlight-paper.png');
  await page.screenshot({ path: paperPath, fullPage: false });
  console.log('Saved Paper Evidence Highlight:', paperPath);

  // 2. Activate Reading Mode
  console.log('Toggling Reading Mode...');
  const readingModeBtn = await page.$('#btn-reading-mode-toggle');
  if (readingModeBtn) {
    await readingModeBtn.click();
    await page.waitForTimeout(1200);
  }

  const readingPath = path.join(ARTIFACT_DIR, 'ui-stepC-reading-mode.png');
  await page.screenshot({ path: readingPath, fullPage: false });
  console.log('Saved Reading Mode:', readingPath);

  // Turn reading mode off before next screenshots
  if (readingModeBtn) {
    await readingModeBtn.click();
    await page.waitForTimeout(500);
  }

  // 3. Switch to Night Mode via Store and capture
  console.log('Switching to Night Mode via store...');
  await page.evaluate(() => {
    // Access zustand store
    const store = (window).__APP_STORE__ || (window).useAppStore;
    if (store && store.getState) {
      store.getState().setTheme('night');
    } else {
      document.documentElement.setAttribute('data-theme', 'night');
      document.documentElement.classList.add('dark');
      const root = document.querySelector('.app-shell');
      if (root) root.setAttribute('data-theme', 'night');
    }
  });
  // Also click Night Edition button in Bat Menu if present, or toggle theme
  await page.keyboard.press('b');
  await page.waitForTimeout(500);
  const nightBtn = await page.$('text=Night Edition');
  if (nightBtn) {
    await nightBtn.click();
    await page.waitForTimeout(600);
  }
  // Close Bat Menu
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Hover sentence § 2 in night mode
  const secondSentence = await page.$('[data-sentence-index="1"]');
  if (secondSentence) {
    await secondSentence.click();
    await page.waitForTimeout(600);
  }

  const nightPath = path.join(ARTIFACT_DIR, 'ui-stepC-evidence-highlight-night.png');
  await page.screenshot({ path: nightPath, fullPage: false });
  console.log('Saved Night Evidence Highlight:', nightPath);

  // 4. Open Settings Drawer and capture Section 5 (Evidence & Reading switches)
  console.log('Opening Settings Drawer...');
  await page.keyboard.press('b');
  await page.waitForTimeout(500);
  const deskPrefs = await page.$('text=Desk Preferences');
  if (deskPrefs) {
    await deskPrefs.click();
    await page.waitForTimeout(800);
  }

  const settingsPath = path.join(ARTIFACT_DIR, 'ui-stepC-settings-switches.png');
  await page.screenshot({ path: settingsPath, fullPage: false });
  console.log('Saved Settings Switches:', settingsPath);

  // 5. Toggle switches off to verify off states
  console.log('Toggling off Evidence Highlight...');
  const toggleEvidence = await page.$('#btn-toggle-evidence-highlight');
  if (toggleEvidence) {
    await toggleEvidence.click();
    await page.waitForTimeout(400);
  }
  const toggleReading = await page.$('#btn-toggle-reading-mode');
  if (toggleReading) {
    await toggleReading.click();
    await page.waitForTimeout(400);
  }

  const settingsToggledPath = path.join(ARTIFACT_DIR, 'ui-stepC-settings-toggled-off.png');
  await page.screenshot({ path: settingsToggledPath, fullPage: false });
  console.log('Saved Settings Toggled Off:', settingsToggledPath);

  await browser.close();
  console.log('Capture complete.');
}

run().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
