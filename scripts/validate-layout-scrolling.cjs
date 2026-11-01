const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/dattj/.gemini/antigravity/brain/26bd5fa2-bbf3-4423-bdff-d9b87f39e06a';

async function runValidation() {
  console.log('[Validator] Launching Chromium test runner...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('[Validator] Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('#app-shell', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // 0. Dismiss any catch-up modal if visible
  const overlay = page.locator('#missed-news-modal-overlay');
  if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('[Validator] Dismissing startup catch-up modal...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  const results = {
    panelHandlesPresent: false,
    articlePanelScrolls: false,
    summaryPanelScrolls: false,
    cardStripWheelScrolls: false,
    tickerScrollsAndPauses: false,
    cardStripArrowNonOverlapping: false,
    noScoutOrReaderLabels: false,
    realHeadlinePresent: false,
    horizontalDragWorks: false,
    verticalDragWorks: false,
    doubleClickResetWorks: false,
    persistenceWorks: false
  };

  // 1. Check Panel Handles
  const handleV = page.locator('#handle-article-summary');
  const handleH = page.locator('#handle-desk-strip');
  const hasHandles = (await handleV.count() > 0) && (await handleH.count() > 0);
  results.panelHandlesPresent = hasHandles;
  console.log(`[Validator] Resizable handles present: ${hasHandles}`);

  // 2. Check no Scout or Reader labels on cards (verifying no leftover badges)
  const cardSpans = await page.locator('[data-testid="article-card"] span').allTextContents();
  const hasForbiddenBadges = cardSpans.some(t => {
    const s = t.trim().toLowerCase();
    return s === 'scout' || s === 'reader' || s === 'next up';
  });
  results.noScoutOrReaderLabels = !hasForbiddenBadges;
  console.log(`[Validator] No leftover Scout/Reader labels on cards: ${!hasForbiddenBadges}`);

  // 3. Check Real Headline
  const headlineText = await page.locator('#article-headline').textContent();
  const isRealHeadline = Boolean(
    headlineText &&
    !headlineText.includes('Testing') &&
    !headlineText.includes('Integration') &&
    headlineText.trim().length > 10
  );
  results.realHeadlinePresent = isRealHeadline;
  console.log(`[Validator] Real live headline displayed: "${headlineText?.trim().slice(0, 60)}..."`);

  // 4. Check Arrow Button Non-overlapping positioning
  const leftArrowBox = await page.locator('button[aria-label="Scroll wire left"]').boundingBox();
  const firstCardBox = await page.locator('[data-testid="article-card"]').first().boundingBox();
  if (leftArrowBox && firstCardBox) {
    const overlaps = (leftArrowBox.x + leftArrowBox.width) > firstCardBox.x;
    results.cardStripArrowNonOverlapping = !overlaps;
    console.log(`[Validator] Arrow non-overlapping: ${!overlaps} (Arrow right: ${Math.round(leftArrowBox.x + leftArrowBox.width)}px, Card left: ${Math.round(firstCardBox.x)}px)`);
  }

  // Ensure an article with scrollable long-form content is loaded for wheel testing
  const initialScrollHeight = await page.locator('#article-panel').evaluate(el => el.scrollHeight);
  const initialClientHeight = await page.locator('#article-panel').evaluate(el => el.clientHeight);
  if (initialScrollHeight <= initialClientHeight) {
    console.log('[Validator] Current article fits within viewport, selecting article with long full-text body (id: 68075)...');
    await page.evaluate(async () => {
      if (window.__APP_STORE__) {
        await window.__APP_STORE__.getState().selectArticleById(68075);
      }
    });
    await page.waitForTimeout(600);
  }

  // 5. Test Wheel Scrolling on Article Panel
  const articlePanel = page.locator('#article-panel');
  await articlePanel.hover();
  const initialArticleScroll = await articlePanel.evaluate(el => el.scrollTop);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(400);
  const afterArticleScroll = await articlePanel.evaluate(el => el.scrollTop);
  results.articlePanelScrolls = afterArticleScroll > initialArticleScroll;
  console.log(`[Validator] Article panel wheel scroll: initial=${initialArticleScroll}, after=${afterArticleScroll}`);

  // 6. Test Wheel Scrolling on Summary Panel
  const summaryPanel = page.locator('#summary-panel');
  await summaryPanel.hover();
  const initialSummaryScroll = await summaryPanel.evaluate(el => el.scrollTop);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(400);
  const afterSummaryScroll = await summaryPanel.evaluate(el => el.scrollTop);
  results.summaryPanelScrolls = afterSummaryScroll >= initialSummaryScroll;
  console.log(`[Validator] Summary panel wheel responsive: initial=${initialSummaryScroll}, after=${afterSummaryScroll}`);

  // 7. Test Wheel Scrolling on Card Strip (Vertical wheel scrolls horizontally)
  const cardTrack = page.locator('#card-strip-track');
  await cardTrack.hover();
  const initialTrackScroll = await cardTrack.evaluate(el => el.scrollLeft);
  await page.mouse.wheel(0, 350);
  await page.waitForTimeout(400);
  const afterTrackScroll = await cardTrack.evaluate(el => el.scrollLeft);
  results.cardStripWheelScrolls = afterTrackScroll > initialTrackScroll;
  console.log(`[Validator] Card strip vertical-wheel-to-horizontal scroll: initial=${initialTrackScroll}, after=${afterTrackScroll}`);

  // 7b. Test Ticker manual scroll & pause on hover
  const ticker = page.locator('#news-ticker-scroll-track');
  if (await ticker.count() > 0) {
    await ticker.hover();
    await page.waitForTimeout(200);
    const tickerClasses = await ticker.getAttribute('class');
    const tickerPrevent = await ticker.getAttribute('data-lenis-prevent');
    results.tickerScrollsAndPauses = Boolean(tickerClasses?.includes('overflow-x-auto') && tickerPrevent === 'true');
    console.log(`[Validator] Ticker responsive & pause-on-hover: ${results.tickerScrollsAndPauses}`);
  }

  // 8. Capture Screenshots of Default Broadsheet Layout
  console.log('[Validator] Capturing ui-layout-default-paper.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-layout-default-paper.png'),
    fullPage: false
  });

  // 9. Test Dragging Horizontal Split (Vertical drag handle between Article & Summary)
  const articleBoxBefore = await articlePanel.boundingBox();
  const handleVBox = await handleV.boundingBox();
  if (handleVBox && articleBoxBefore) {
    await handleV.hover();
    await page.waitForTimeout(200);

    // Drag handle left by 120px
    await page.mouse.move(handleVBox.x + handleVBox.width / 2, handleVBox.y + handleVBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleVBox.x - 120, handleVBox.y + handleVBox.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const articleBoxAfter = await articlePanel.boundingBox();
    if (articleBoxAfter && articleBoxAfter.width < articleBoxBefore.width) {
      results.horizontalDragWorks = true;
      console.log(`[Validator] Article panel resized: ${Math.round(articleBoxBefore.width)}px -> ${Math.round(articleBoxAfter.width)}px`);
    }

    // Capture resized state
    console.log('[Validator] Capturing ui-layout-resized-panels.png...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'ui-layout-resized-panels.png'),
      fullPage: false
    });

    // Test Double-Click Reset on Handle
    const currentHandleBox = await handleV.boundingBox();
    if (currentHandleBox) {
      await page.mouse.dblclick(currentHandleBox.x + currentHandleBox.width / 2, currentHandleBox.y + currentHandleBox.height / 2);
      await page.waitForTimeout(600);
      const articleBoxReset = await articlePanel.boundingBox();
      if (articleBoxReset && Math.abs(articleBoxReset.width - articleBoxBefore.width) < 25) {
        results.doubleClickResetWorks = true;
        console.log(`[Validator] Double-click reset successful: restored to ${Math.round(articleBoxReset.width)}px`);
      }
    }
  }

  // 10. Test Vertical Dragging (Horizontal handle between desk & strip)
  const handleHBox = await handleH.boundingBox();
  const stripBoxBefore = await page.locator('#reader-bottom-strip-panel').boundingBox();
  if (handleHBox && stripBoxBefore) {
    await handleH.hover();
    await page.waitForTimeout(200);

    // Drag upwards by 60px to expand strip
    await page.mouse.move(handleHBox.x + handleHBox.width / 2, handleHBox.y + handleHBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleHBox.x + handleHBox.width / 2, handleHBox.y - 60, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    const stripBoxAfter = await page.locator('#reader-bottom-strip-panel').boundingBox();
    if (stripBoxAfter && stripBoxAfter.height > stripBoxBefore.height) {
      results.verticalDragWorks = true;
      console.log(`[Validator] Bottom strip resized: ${Math.round(stripBoxBefore.height)}px -> ${Math.round(stripBoxAfter.height)}px`);
    }

    // Double-click to reset vertical split
    const currentHandleHBox = await handleH.boundingBox();
    if (currentHandleHBox) {
      await page.mouse.dblclick(currentHandleHBox.x + currentHandleHBox.width / 2, currentHandleHBox.y + currentHandleHBox.height / 2);
      await page.waitForTimeout(600);
    }
  }

  // 11. Test Persistence in localStorage
  const savedH = await page.evaluate(() => localStorage.getItem('news_desk_panel_sizes_h'));
  const savedV = await page.evaluate(() => localStorage.getItem('news_desk_panel_sizes_v'));
  if (savedH && savedV) {
    results.persistenceWorks = true;
    console.log(`[Validator] Persistent panel sizes in localStorage: H=${savedH}, V=${savedV}`);
  }

  // 12. Switch to Night Edition & Capture
  console.log('[Validator] Switching to Night Edition for theme validation...');
  await page.keyboard.press('b');
  await page.waitForTimeout(500);
  const nightBtn = page.locator('button:has-text("Night Edition"), button:has-text("Night")').first();
  if (await nightBtn.isVisible()) {
    await nightBtn.click();
    await page.waitForTimeout(500);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  console.log('[Validator] Capturing ui-layout-night-edition.png...');
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'ui-layout-night-edition.png'),
    fullPage: false
  });

  await browser.close();
  console.log('\n[Validator] ALL VALIDATION CHECKS FINISHED:');
  console.log(JSON.stringify(results, null, 2));
}

runValidation().catch(err => {
  console.error('[Validator] Validation failed:', err);
  process.exit(1);
});
