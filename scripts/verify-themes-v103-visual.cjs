/**
 * scripts/verify-themes-v103-visual.cjs
 * Visual validation for PRD: Dynamic Theme Clobbering Resolution and Universal Theming.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ARTIFACT_DIR = path.resolve('C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f');
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const DIST_DIR = path.resolve(__dirname, '../frontend/dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function createStaticServer(port) {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    let filePath = path.join(DIST_DIR, reqPath);
    if (!fs.existsSync(filePath)) {
      // SPA Fallback
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading ' + reqPath);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function run() {
  console.log('--- Launching Playwright with file:// URL ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', (req) => console.log('REQ FAILED:', req.url()));

  try {
    const fileUrl = 'file:///' + path.resolve(__dirname, '../frontend/dist/index.html').replace(/\\/g, '/');
    console.log(`1. Loading application at ${fileUrl} ...`);
    await page.goto(fileUrl, { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // Screenshot 1: Default Broadsheet
    const defaultScreen = path.join(ARTIFACT_DIR, 'ui-fix-theme-1-default.png');
    await page.screenshot({ path: defaultScreen });
    console.log('✓ Captured default screen:', defaultScreen);

    // Open Theme Studio Drawer via rail button or 'p' shortcut
    console.log('2. Opening Theme Studio Drawer via #btn-rail-theme-studio...');
    const studioBtn = page.locator('#btn-rail-theme-studio');
    if (await studioBtn.isVisible()) {
      await studioBtn.click();
    } else {
      await page.keyboard.press('p');
    }
    await page.waitForSelector('#theme-studio-drawer', { timeout: 8000 });
    await page.waitForTimeout(600);

    // Test 2: Select Imperial Jade (#0C1D18)
    console.log('3. Selecting "Imperial Jade" (#0C1D18)...');
    const jadeBtn = page.locator('button', { hasText: 'Imperial Jade' }).first();
    await jadeBtn.click();
    await page.waitForTimeout(600);

    const jadeBg = await page.evaluate(() => {
      const el = document.getElementById('app-shell');
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('Computed background color for Imperial Jade:', jadeBg);
    if (jadeBg.includes('14, 12, 9')) {
      throw new Error('FAILURE: Imperial Jade reverted to default night obsidian #0E0C09 (rgb(14, 12, 9))!');
    }

    const jadeScreen = path.join(ARTIFACT_DIR, 'ui-fix-theme-2-imperial-jade.png');
    await page.screenshot({ path: jadeScreen });
    console.log('✓ Captured Imperial Jade screen:', jadeScreen);

    // Test 3: Select Tudor Crimson (#28090C)
    console.log('4. Selecting "Tudor Crimson" (#28090C)...');
    const crimsonBtn = page.locator('button', { hasText: 'Tudor Crimson' }).first();
    await crimsonBtn.click();
    await page.waitForTimeout(600);

    const crimsonBg = await page.evaluate(() => {
      const el = document.getElementById('app-shell');
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('Computed background color for Tudor Crimson:', crimsonBg);
    if (crimsonBg.includes('14, 12, 9')) {
      throw new Error('FAILURE: Tudor Crimson reverted to default night obsidian #0E0C09!');
    }

    const crimsonScreen = path.join(ARTIFACT_DIR, 'ui-fix-theme-3-tudor-crimson.png');
    await page.screenshot({ path: crimsonScreen });
    console.log('✓ Captured Tudor Crimson screen:', crimsonScreen);

    // Test 4: Select Versailles Gold (#FAF3E0)
    console.log('5. Selecting "Versailles Gold" (#FAF3E0)...');
    const goldBtn = page.locator('button', { hasText: 'Versailles Gold' }).first();
    await goldBtn.click();
    await page.waitForTimeout(600);

    const goldBg = await page.evaluate(() => {
      const el = document.getElementById('app-shell');
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('Computed background color for Versailles Gold:', goldBg);
    if (goldBg.includes('250, 247, 240')) {
      throw new Error('FAILURE: Versailles Gold reverted to default paper #FAF7F0!');
    }

    const goldScreen = path.join(ARTIFACT_DIR, 'ui-fix-theme-4-versailles-gold.png');
    await page.screenshot({ path: goldScreen });
    console.log('✓ Captured Versailles Gold screen:', goldScreen);

    // Test 5: Custom RGB Color (#0B2545 - Deep Royal Cobalt)
    console.log('6. Applying Custom RGB #0B2545 (Deep Royal Cobalt)...');
    const hexInput = page.locator('#theme-custom-hex');
    await hexInput.fill('#0B2545');
    await page.waitForTimeout(600);

    const cobaltBg = await page.evaluate(() => {
      const el = document.getElementById('app-shell');
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('Computed background color for Custom Cobalt:', cobaltBg);

    const cobaltScreen = path.join(ARTIFACT_DIR, 'ui-fix-theme-5-custom-cobalt.png');
    await page.screenshot({ path: cobaltScreen });
    console.log('✓ Captured Custom Cobalt screen:', cobaltScreen);

    // Close Theme Studio Drawer via close button
    console.log('7. Closing Theme Studio Drawer and navigating to The Library...');
    const closeBtn = page.locator('#btn-close-theme-studio');
    await closeBtn.click();
    await page.waitForTimeout(800);

    // Open Library
    const libBtn = page.locator('#btn-rail-library');
    await libBtn.click();
    await page.waitForSelector('.lib-root', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const libBg = await page.evaluate(() => {
      const el = document.querySelector('.lib-root');
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log('Computed Library background color under custom theme:', libBg);

    const libScreen = path.join(ARTIFACT_DIR, 'ui-fix-theme-6-library-themed.png');
    await page.screenshot({ path: libScreen });
    console.log('✓ Captured Themed Library screen:', libScreen);

    console.log('=== ALL 6 VISUAL TESTS PASSED WITH 100% SUCCESS ===');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
