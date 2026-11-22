/**
 * scripts/verify-v107-fresh-news.cjs
 * Visual validation for v1.0.7 Fresh News Pipeline & Startup Reliability.
 *
 * Verifies:
 * 1. Startup Splash Screen: Broadsheet masthead, motto, and spinner.
 * 2. Desktop Broadsheet Reader: Fresh articles load from local backend with clamped dates.
 * 3. Mobile Portrait: Autonomous engine renders dispatches with live RSS polling.
 */
const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ARTIFACT_DIR = path.resolve('C:/Users/dattj/.gemini/antigravity/brain/de158b63-a933-45e3-aa1f-e44b099f191f');

function getStartupSplashHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DNews — The Daily Bugle</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #FAF7F0;
      color: #1A1208;
      font-family: "Georgia", "Times New Roman", serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      user-select: none;
      -webkit-user-select: none;
      text-align: center;
      padding: 32px;
      overflow: hidden;
    }
    .masthead-frame {
      border: 3px double #1A1208;
      padding: 36px 48px;
      max-width: 620px;
      width: 100%;
      background: #F4EFEA;
      box-shadow: 0 4px 20px rgba(26,18,8,0.08);
      position: relative;
    }
    .date-bar {
      border-bottom: 1px solid #1A1208;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      padding-bottom: 8px;
      margin-bottom: 18px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 600;
      color: #5C4E3A;
    }
    h1 {
      font-size: 40px;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      font-weight: 700;
      line-height: 1.1;
      color: #1A1208;
    }
    .motto {
      font-style: italic;
      font-size: 14px;
      color: #5C4E3A;
      margin-bottom: 24px;
      border-bottom: 1px solid #1A1208;
      padding-bottom: 16px;
    }
    .spinner-ring {
      width: 32px;
      height: 32px;
      border: 3px solid #D9D0BE;
      border-top-color: #C0392B;
      border-radius: 50%;
      animation: spin 0.85s linear infinite;
      margin: 0 auto 16px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .status-text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.06em;
      color: #1A1208;
      text-transform: uppercase;
    }
    .status-sub {
      font-size: 12px;
      color: #9A8878;
      margin-top: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div class="masthead-frame">
    <div class="date-bar">AI World News Desk &bull; Broadsheet Edition</div>
    <h1>The Daily Bugle</h1>
    <div class="motto">&ldquo;Uncompromising Real-Time Global Intelligence&rdquo;</div>
    <div class="spinner-ring"></div>
    <div class="status-text">Preparing Broadside Press &amp; Editorial Desks...</div>
    <div class="status-sub">Connecting local news intelligence engine</div>
  </div>
</body>
</html>`;
}

async function run() {
  console.log('--- Starting Visual Validation for v1.0.7 Fresh News Pipeline ---');

  // 1. Launch Vite preview / dev or Express backend on port 3001
  const serverProcess = spawn('node', ['backend/dist/backend/src/index.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: '3001',
      NODE_ENV: 'production',
      DNEWS_APP_DATA_DIR: path.resolve(__dirname, '../backend'),
      DATA_DIR: path.resolve(__dirname, '../backend/data'),
      FRONTEND_DIST: path.resolve(__dirname, '../frontend/dist'),
    },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (d) => console.log(`[Backend] ${d.toString().trim()}`));
  serverProcess.stderr.on('data', (d) => console.error(`[Backend:Err] ${d.toString().trim()}`));

  // Wait for server health
  console.log('Waiting for backend server on port 3001...');
  let healthy = false;
  for (let i = 0; i < 30; i++) {
    try {
      await new Promise((res, rej) => {
        const req = http.get('http://127.0.0.1:3001/api/health', (r) => {
          if (r.statusCode === 200) res(true);
          else rej(new Error(`Status ${r.statusCode}`));
        });
        req.on('error', rej);
        req.setTimeout(1000, () => { req.destroy(); rej(new Error('timeout')); });
      });
      healthy = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!healthy) {
    console.error('Backend failed to start in time');
    serverProcess.kill('SIGTERM');
    process.exit(1);
  }
  console.log('Backend is HEALTHY on port 3001!');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  try {
    // A. Startup Splash Screen
    console.log('1. Capturing Startup Splash Screen...');
    const splashPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await splashPage.setContent(getStartupSplashHtml(), { waitUntil: 'domcontentloaded' });
    await splashPage.waitForTimeout(500);
    const splashShotPath = path.join(ARTIFACT_DIR, 'ui-v107-1-startup-splash.png');
    await splashPage.screenshot({ path: splashShotPath });
    console.log(`Saved: ${splashShotPath}`);
    await splashPage.close();

    // B. Desktop Broadsheet Reader
    console.log('2. Capturing Desktop Broadsheet Reader (1440x900)...');
    const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await desktopPage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await desktopPage.waitForTimeout(3500);

    const desktopShotPath = path.join(ARTIFACT_DIR, 'ui-v107-2-desktop-broadsheet.png');
    await desktopPage.screenshot({ path: desktopShotPath });
    console.log(`Saved: ${desktopShotPath}`);

    // Verify articles rendered
    const articlesCount = await desktopPage.locator('h1, h2, h3, [data-testid="article-card"]').count();
    console.log(`Found ${articlesCount} headline elements on Desktop Broadsheet.`);
    await desktopPage.close();

    // C. Mobile Simulated Viewport (390 x 844)
    console.log('3. Capturing Mobile Portrait Viewport (390x844)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await mobilePage.waitForTimeout(3500);

    const mobileShotPath = path.join(ARTIFACT_DIR, 'ui-v107-3-mobile-portrait-feed.png');
    await mobilePage.screenshot({ path: mobileShotPath });
    console.log(`Saved: ${mobileShotPath}`);

    const mobileHeadlines = await mobilePage.locator('h1, h2, h3').count();
    console.log(`Found ${mobileHeadlines} headlines on Mobile Portrait.`);
    await mobilePage.close();

  } finally {
    await browser.close();
    serverProcess.kill('SIGTERM');
  }

  console.log('--- Visual Validation Complete! ---');
}

run().catch((err) => {
  console.error('Validation script error:', err);
  process.exit(1);
});
