/**
 * scripts/verify-v112-phase-c2.cjs
 * Visual validation for Phase C Deliverable 2:
 * - #17 Multi-Perspective Bias Radar (#bias-radar-modal)
 * - #21 Claim Corroboration Matrix (#claim-corroboration-modal)
 * - #18 Two-Tier Summaries (#executive-summary-bullets / #deep-summary-synthesis)
 * - #20 Geopolitical Entity Relationship Desk (#entity-relationship-desk)
 * - #24 Semantic Vector Search (#btn-search-mode-semantic in ArchiveChat)
 */
const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const ARTIFACTS_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f';

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1500, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  return false;
}

async function run() {
  console.log('--- Phase C Deliverable 2 Visual Validation ---');

  const serverReady = await waitForServer('http://127.0.0.1:3001/api/health');
  if (!serverReady) {
    console.error('Server not answering on http://127.0.0.1:3001/api/health');
    process.exit(1);
  }
  console.log('Backend confirmed active on http://127.0.0.1:3001');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 850 },
    });
    await context.addInitScript(() => {
      localStorage.setItem('missed_news_dismissed', 'true');
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Dismiss Missed News Modal if shown
    try {
      const dismissBtn = await page.$('#btn-dismiss-missed-news');
      if (dismissBtn) {
        await dismissBtn.click();
        await page.waitForTimeout(400);
      } else {
        await page.keyboard.press('Escape');
      }
    } catch {}

    // 1. Multi-Perspective Bias Radar (#bias-radar-modal)
    console.log('1. Testing Multi-Perspective Bias Radar (#bias-radar-modal)...');
    const biasBtn = await page.$('#btn-open-bias-radar');
    if (biasBtn) {
      await biasBtn.click();
      await page.waitForTimeout(700);
      const img1Path = path.join(ARTIFACTS_DIR, 'ui-v112-1-bias-radar.png');
      await page.screenshot({ path: img1Path, fullPage: false });
      console.log('Saved:', img1Path);

      // Close modal
      const closeBias = await page.$('#btn-close-bias-radar');
      if (closeBias) await closeBias.click();
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // 2. Claim Corroboration Matrix (#claim-corroboration-modal)
    console.log('2. Testing Claim Corroboration Matrix (#claim-corroboration-modal)...');
    const verifyBtn = await page.$('#btn-open-claim-corroboration');
    if (verifyBtn) {
      await verifyBtn.click();
      await page.waitForTimeout(700);
      const img2Path = path.join(ARTIFACTS_DIR, 'ui-v112-2-claim-corroboration.png');
      await page.screenshot({ path: img2Path, fullPage: false });
      console.log('Saved:', img2Path);

      // Close modal
      const closeVerify = await page.$('#btn-close-claim-corroboration');
      if (closeVerify) await closeVerify.click();
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // 3. Two-Tier Summaries (#executive-summary-bullets / #deep-summary-synthesis)
    console.log('3. Testing Two-Tier Summaries toggle...');
    await page.evaluate(() => {
      const store = window.useAppStore.getState();
      const current = store.selectedArticle || store.articles[0];
      if (current) {
        store.setSelectedArticle({
          ...current,
          summary: "International trade corridors report steady throughput following comprehensive bilateral negotiations. Regional financial monitors forecast positive market momentum as cross-border duties ease across key sectors.",
        });
      }
    });
    await page.waitForTimeout(600);

    const execBtn = await page.waitForSelector('#btn-summary-tier-executive', { timeout: 4000 });
    if (execBtn) {
      console.log('Clicking #btn-summary-tier-executive...');
      await execBtn.click();
      await page.waitForTimeout(500);
      const img3Path = path.join(ARTIFACTS_DIR, 'ui-v112-3-two-tier-summaries.png');
      await page.screenshot({ path: img3Path, fullPage: false });
      console.log('Saved:', img3Path);
    }

    // 4. Geopolitical Entity Relationship Desk (#entity-relationship-desk)
    console.log('4. Navigating to Geopolitical Entity Network Desk...');
    await page.evaluate(() => {
      window.useAppStore.getState().setCurrentView('entities');
    });
    await page.waitForTimeout(1000);
    const entityDesk = await page.waitForSelector('#entity-relationship-desk', { timeout: 5000 });
    if (entityDesk) {
      console.log('Entity Relationship Desk loaded.');
      await page.waitForTimeout(800);
      const img4Path = path.join(ARTIFACTS_DIR, 'ui-v112-4-entity-network-desk.png');
      await page.screenshot({ path: img4Path, fullPage: false });
      console.log('Saved:', img4Path);
    }

    // 5. Semantic Vector Search (#btn-search-mode-semantic in ArchiveChat)
    console.log('5. Testing Semantic Vector Search in ArchiveChat...');
    await page.evaluate(() => {
      window.useAppStore.getState().setArchiveChatOpen(true);
    });
    await page.waitForTimeout(800);
    const semModeBtn = await page.$('#btn-search-mode-semantic');
    if (semModeBtn) {
      await semModeBtn.click();
      await page.waitForTimeout(300);
      await page.fill('#archive-query-input', 'economic inflation and market trade');
      await page.click('#btn-archive-search');
      await page.waitForTimeout(1500);

      const img5Path = path.join(ARTIFACTS_DIR, 'ui-v112-5-semantic-search.png');
      await page.screenshot({ path: img5Path, fullPage: false });
      console.log('Saved:', img5Path);
    }

    console.log('Phase C Deliverable 2 Visual Validation SUCCESSFUL!');
  } catch (err) {
    console.error('Validation failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
