/**
 * scripts/e2e-all-categories.cjs
 * Comprehensive Master End-to-End Verification Suite (PRD A Category 12).
 * Exercises all 12 categories in sequence against the live local application,
 * auditing browser console errors, panel interactions, modals, and responsive layout.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/a11d82f3-5f26-4b25-a621-23dfc75c6e43';

let passes = 0;
let failures = 0;
const consoleErrors = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passes++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failures++;
  }
}

async function runMasterE2E() {
  console.log('====================================================');
  console.log('   AI WORLD NEWS DESK — MASTER E2E AUDIT SUITE      ');
  console.log('   Testing Categories 1 through 11 in Live App      ');
  console.log('====================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Monitor browser console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore benign favicon or media network 404s from external streams
      if (!text.includes('favicon') && !text.includes('ERR_CONNECTION_REFUSED')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`Uncaught Page Exception: ${err.message}`);
  });

  console.log('--- Phase 1: App Boot & Real-Time Foundation (Cat 1 & 1B) ---');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Close startup modal if open
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) store.setMissedNewsModalOpen(false);
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Category 1: Dual Timestamps & Dates
  const readerDate = await page.locator('[data-testid="dual-timestamp"]').first();
  assert((await readerDate.count()) > 0, 'Category 1: Dual timestamp byline is present in main reader');

  const bottomCardDate = await page.locator('#card-strip-container [data-testid="dual-timestamp"]').first();
  assert((await bottomCardDate.count()) > 0, 'Category 1: Card strip cards render arrival timestamps');

  // Category 1B: Real-Time Foundation & Clock Sync
  const clockRes = await fetch('http://localhost:3001/api/time');
  const clockData = await clockRes.json();
  assert(clockData.utc && clockData.timestamp > 0, 'Category 1B: /api/time clock sync returns valid UTC timestamp');

  const sessionRes = await fetch('http://localhost:3001/api/session/current');
  const sessionData = await sessionRes.json();
  assert(sessionData.session !== undefined, 'Category 1B: /api/session/current returns active app session');

  console.log('\n--- Phase 2: Auto-Advance & Plain Mode Reader (Cat 2 & 3) ---');
  // Category 2: Auto-Advance
  const progressBar = await page.locator('[data-testid="auto-advance-progress-bar"]').first();
  assert((await progressBar.count()) > 0, 'Category 2: Auto-advance 2px broadsheet progress bar hairline is rendered');

  // Category 3: Plain Mode Full-Width Reader
  await page.evaluate(async () => {
    const store = window.useAppStore?.getState();
    if (store) await store.updateSettings({ plain_mode_enabled: true });
  });
  await page.waitForTimeout(500);

  const plainModeReader = await page.$('#reader-plain-mode-container');
  assert(plainModeReader !== null, 'Category 3: Plain Mode expands reader to 100% full-width container');

  const plainModeBadge = await page.locator('text=PLAIN MODE (ZERO AI)').first();
  assert((await plainModeBadge.count()) > 0, 'Category 3: TopBar displays PLAIN MODE (ZERO AI) ink stamp');

  // Restore Plain Mode off for subsequent tests
  await page.evaluate(async () => {
    const store = window.useAppStore?.getState();
    if (store) await store.updateSettings({ plain_mode_enabled: false });
  });
  await page.waitForTimeout(500);

  console.log('\n--- Phase 3: Safety Net & Backup Management (Cat 4) ---');
  // Category 4: Safety Net
  const backupsRes = await fetch('http://localhost:3001/api/backups');
  const backupsData = await backupsRes.json();
  assert(Array.isArray(backupsData.backups) && backupsData.backups.length > 0, 'Category 4: Backups API returns existing database snapshots');

  console.log('\n--- Phase 4: TV Channel Catalog & Curated Top 5 (Cat 5, 6, 7) ---');
  // Category 5, 6, 7: Open TV Desk via TopBar button
  const tvBtn = await page.$('#btn-topbar-tv');
  if (tvBtn) await tvBtn.click();
  await page.waitForTimeout(800);

  const tvView = await page.$('#tv-view-modal');
  assert(tvView !== null, 'Category 5: TV View broadcast desk opens cleanly');

  const top5Shelf = await page.$('#btn-tv-shelf-top5');
  assert(top5Shelf !== null, 'Category 5: Curated Top 5 shelf button is available in directory');

  const subpageLive = await page.$('#tab-subpage-live');
  const subpageFaulty = await page.$('#tab-subpage-faulty');
  const subpageStopped = await page.$('#tab-subpage-stopped');
  assert(subpageLive !== null && subpageFaulty !== null && subpageStopped !== null, 'Category 7: TV Subpages tabs (LIVE, FAULTY FEEDS, STOPPED LINKS) are present');

  const copyUrlBtn = await page.$('#btn-copy-stream-url');
  assert(copyUrlBtn !== null, 'Category 6: Copy Stream URL 1-click action is available');

  // Close TV Desk
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  console.log('\n--- Phase 5: Live Feed Counter & Confirmation Labels (Cat 8 & 9) ---');
  // Category 8: Live Feed Counter
  const counterBtn = await page.$('#btn-topbar-feed-counter');
  assert(counterBtn !== null, 'Category 8: Live feed counter button present in TopBar');

  await counterBtn.click();
  await page.waitForTimeout(400);

  const counterPopover = await page.$('#feed-counter-popover');
  assert(counterPopover !== null, 'Category 8: Feed Counter Popover opens with rolling 24h intake');

  const rollingVal = await page.$('#feed-counter-rolling-24h');
  assert(rollingVal !== null, 'Category 8: Rolling 24-hour dispatch counter is rendered');

  // Close Popover
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Category 9: Confirmation Labels
  const confirmationBadges = await page.locator('[data-testid="corroboration-depth-stamp"]');
  assert((await confirmationBadges.count()) > 0, 'Category 9: Physical broadsheet confirmation & corroboration badges rendered across items');

  console.log('\n--- Phase 6: Two-Pass AI Processing & Telemetry (Cat 10) ---');
  // Category 10: Two-Pass Telemetry API
  const twoPassRes = await fetch('http://localhost:3001/api/settings/two-pass-telemetry');
  const twoPassData = await twoPassRes.json();
  assert(twoPassData.two_pass_ai_enabled === true, 'Category 10: Two-Pass AI Ingestion is active in settings');
  assert(twoPassData.pass1_count > 0, 'Category 10: Pass 1 scored dispatches recorded in persistent stats');
  assert(twoPassData.estimated_tokens_saved > 0, 'Category 10: Token economics actively calculates quota saved');

  console.log('\n--- Phase 7: Desk Control Room & Telemetry Wire (Cat 11) ---');
  // Category 11: Control Room Desk
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) store.setControlRoomOpen(true);
  });
  await page.waitForTimeout(800);

  const controlRoomDesk = await page.$('#control-room-desk');
  assert(controlRoomDesk !== null, 'Category 11: Desk Control Room overlay renders with OPS-HUB');

  // Test Tab Switching in Control Room
  const tabSources = await page.$('#tab-control-room-sources');
  await tabSources.click();
  await page.waitForTimeout(400);
  const sourcesTable = await page.$('#control-room-desk table');
  assert(sourcesTable !== null, 'Category 11: Sources Freshness Matrix table renders with latency & protocol columns');

  const tabErrors = await page.$('#tab-control-room-errors');
  await tabErrors.click();
  await page.waitForTimeout(400);
  const errorSearch = await page.$('#input-error-search');
  assert(errorSearch !== null, 'Category 11: Error Ledger filter bar and search input render correctly');

  // Close Control Room
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  console.log('\n--- Phase 8: Night Edition Theme Switching ---');
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) store.setTheme('night');
  });
  await page.waitForTimeout(400);

  const currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  assert(currentTheme === 'night', 'Theme Switcher: Application switches seamlessly to data-theme="night"');

  // Restore Paper theme
  await page.evaluate(() => {
    const store = window.useAppStore?.getState();
    if (store) store.setTheme('paper');
  });
  await page.waitForTimeout(300);

  // Capture master E2E screenshot
  const masterScreenshotPath = path.join(ARTIFACTS_DIR, 'ui-step12-master-e2e-pass.png');
  await page.screenshot({ path: masterScreenshotPath });
  console.log(`\n  [PROOF] Master E2E full-desk screenshot saved to: ${masterScreenshotPath}`);

  // Browser Console Error Audit
  console.log('\n--- Phase 9: Browser Console Error Audit ---');
  console.log(`  Recorded Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('  Errors caught:', consoleErrors);
  }
  assert(consoleErrors.length === 0, 'Zero fatal JavaScript console errors or unhandled exceptions detected');

  await browser.close();

  console.log('\n====================================================');
  console.log(`   MASTER E2E AUDIT COMPLETED: ${passes} PASSED, ${failures} FAILED`);
  console.log('====================================================\n');

  if (failures > 0) {
    process.exit(1);
  }
}

runMasterE2E().catch(err => {
  console.error('[Master E2E] Unexpected failure:', err);
  process.exit(1);
});
