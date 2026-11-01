const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const ARTIFACT_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function verifyCategory1B() {
  console.log('--- Step 1B Verification: Real-Time Foundation ---');

  // 1. Verify /api/time
  console.log('1. Checking /api/time endpoint...');
  const timeData = await getJson('http://127.0.0.1:3001/api/time');
  console.log('   /api/time response:', timeData);
  if (!timeData.utc || !timeData.timestamp) {
    throw new Error('Invalid /api/time response');
  }

  // 2. Verify /api/session/current
  console.log('2. Checking /api/session/current endpoint...');
  const sessionData = await getJson('http://127.0.0.1:3001/api/session/current');
  console.log('   /api/session/current response:', JSON.stringify(sessionData, null, 2));

  // 3. Launch Playwright for Visual Validation
  console.log('3. Launching Playwright to test Welcome-Back Card & UI Integration...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Mock /api/session/current to simulate a 42-minute downtime gap with 18 dispatches arrived
  await page.route('**/api/session/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        session: {
          id: 99,
          started_at: new Date().toISOString(),
          last_heartbeat_at: new Date().toISOString(),
          articles_ingested_in_session: 18,
        },
        downtime: {
          detected: true,
          missed_minutes: 42,
          missed_window_start: new Date(Date.now() - 42 * 60000).toISOString(),
          missed_window_end: new Date().toISOString(),
          previous_clean: false,
        },
      }),
    });
  });

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('header, article', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Check if WelcomeBackCard is visible
  const welcomeCard = page.locator('[data-testid="welcome-back-card"]');
  const isCardVisible = await welcomeCard.isVisible();
  console.log(`   Welcome-Back Card visible: ${isCardVisible}`);

  // Screenshot in Paper Mode
  console.log('   Capturing Paper Mode with Welcome-Back Card...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-step1b-welcome-back-paper.png'),
    fullPage: false,
  });

  // Switch to Night Edition Mode
  console.log('   Switching to Night Edition Mode...');
  await page.keyboard.press('b');
  await page.waitForTimeout(500);
  const nightBtn = page.locator('button:has-text("Night Edition"), button:has-text("Night")').first();
  if (await nightBtn.isVisible()) {
    await nightBtn.click();
    await page.waitForTimeout(500);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Screenshot in Night Mode
  console.log('   Capturing Night Edition Mode with Welcome-Back Card...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-step1b-welcome-back-night.png'),
    fullPage: false,
  });

  // Test dismissing the card
  console.log('   Testing card dismissal via close button...');
  const closeBtn = welcomeCard.locator('button[aria-label="Dismiss welcome back notice"]');
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(400);
    const stillVisible = await welcomeCard.isVisible();
    console.log(`   Card visible after dismissal: ${stillVisible} (expected: false)`);
  }

  await browser.close();
  console.log('--- Step 1B Verification Complete! ---');
}

verifyCategory1B().catch((err) => {
  console.error('Step 1B verification error:', err);
  process.exit(1);
});
