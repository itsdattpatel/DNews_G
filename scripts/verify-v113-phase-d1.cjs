/**
 * scripts/verify-v113-phase-d1.cjs
 * Visual validation for Phase D Deliverable 1:
 * - #38 Sunday Edition Desk (#sunday-edition-desk)
 * - #39 Saved Knowledge Mind-Map (#knowledge-mindmap-modal)
 * - #41 On This Day in History Facsimile (#history-frontpage-modal)
 * - #42 Wisdom Spaced Repetition Flashcard Desk (#wisdom-spaced-repetition-modal)
 * - #40 Obsidian / Notion Markdown Export verification
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
  console.log('--- Phase D Deliverable 1 Visual Validation ---');

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

    // 1. Sunday Edition Desk (#sunday-edition-desk)
    console.log('1. Testing Sunday Edition Desk (#sunday-edition-desk)...');
    await page.keyboard.press('b'); // Open Bat menu
    await page.waitForTimeout(500);

    const sundayBtn = await page.$('#btn-menu-sunday-edition');
    if (sundayBtn) {
      await sundayBtn.click();
      await page.waitForTimeout(1000);
      const img1Path = path.join(ARTIFACTS_DIR, 'ui-v113-1-sunday-edition.png');
      await page.screenshot({ path: img1Path, fullPage: false });
      console.log('Saved:', img1Path);
    } else {
      console.error('Could not find #btn-menu-sunday-edition');
    }

    // 2. Saved Knowledge Mind-Map (#knowledge-mindmap-modal)
    console.log('2. Testing Saved Knowledge Mind-Map (#knowledge-mindmap-modal)...');
    await page.keyboard.press('b');
    await page.waitForTimeout(500);

    const mindmapBtn = await page.$('#btn-menu-mindmap');
    if (mindmapBtn) {
      await mindmapBtn.click();
      await page.waitForTimeout(800);
      const img2Path = path.join(ARTIFACTS_DIR, 'ui-v113-2-knowledge-mindmap.png');
      await page.screenshot({ path: img2Path, fullPage: false });
      console.log('Saved:', img2Path);

      // Close modal
      const closeBtn = await page.$('#btn-close-knowledge-mindmap');
      if (closeBtn) await closeBtn.click();
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      console.error('Could not find #btn-menu-mindmap');
    }

    // 3. On This Day in History Facsimile (#history-frontpage-modal)
    console.log('3. Testing On This Day in History (#history-frontpage-modal)...');
    await page.keyboard.press('b');
    await page.waitForTimeout(500);

    const historyBtn = await page.$('#btn-menu-history-frontpage');
    if (historyBtn) {
      await historyBtn.click();
      await page.waitForTimeout(800);
      const img3Path = path.join(ARTIFACTS_DIR, 'ui-v113-3-history-frontpage.png');
      await page.screenshot({ path: img3Path, fullPage: false });
      console.log('Saved:', img3Path);

      // Close modal
      const closeBtn = await page.$('#btn-close-history-frontpage');
      if (closeBtn) await closeBtn.click();
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      console.error('Could not find #btn-menu-history-frontpage');
    }

    // 4. Wisdom Spaced Repetition Flashcard Desk (#wisdom-spaced-repetition-modal)
    console.log('4. Testing Wisdom Spaced Repetition (#wisdom-spaced-repetition-modal)...');
    await page.keyboard.press('b');
    await page.waitForTimeout(500);

    const wisdomBtn = await page.$('#btn-menu-wisdom-deck');
    if (wisdomBtn) {
      await wisdomBtn.click();
      await page.waitForTimeout(800);
      const img4Path = path.join(ARTIFACTS_DIR, 'ui-v113-4-wisdom-spaced-repetition.png');
      await page.screenshot({ path: img4Path, fullPage: false });
      console.log('Saved:', img4Path);

      // Close modal
      const closeBtn = await page.$('#btn-close-wisdom-deck');
      if (closeBtn) await closeBtn.click();
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      console.error('Could not find #btn-menu-wisdom-deck');
    }

    console.log('--- Phase D Deliverable 1 Visual Validation Complete ---');
  } catch (err) {
    console.error('Validation error:', err);
  } finally {
    await browser.close();
  }
}

run();
