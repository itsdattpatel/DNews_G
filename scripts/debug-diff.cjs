const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function debug() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const b64A = fs.readFileSync('playwright-screenshots/baseline/01-main-reader-paper.png').toString('base64');
  const b64B = fs.readFileSync('playwright-screenshots/current/01-main-reader-paper.png').toString('base64');

  await page.setContent(`
    <html>
      <body style="margin:0; background:pink;">
        <canvas id="c"></canvas>
      </body>
    </html>
  `);

  const report = await page.evaluate(async ({ b64A, b64B }) => {
    const loadImg = (s) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = 'data:image/png;base64,' + s;
    });

    const [imgA, imgB] = await Promise.all([loadImg(b64A), loadImg(b64B)]);
    const canvas = document.getElementById('c');
    canvas.width = imgA.width;
    canvas.height = imgA.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(imgA, 0, 0);
    const dataA = ctx.getImageData(0, 0, imgA.width, imgA.height).data;

    ctx.clearRect(0, 0, imgA.width, imgA.height);
    ctx.drawImage(imgB, 0, 0);
    const dataB = ctx.getImageData(0, 0, imgB.width, imgB.height).data;

    // Output visual diff: highlight diffs in red
    const diffImg = ctx.createImageData(imgA.width, imgA.height);
    let diffCount = 0;
    for (let i = 0; i < dataA.length; i += 4) {
      const dr = Math.abs(dataA[i] - dataB[i]);
      const dg = Math.abs(dataA[i+1] - dataB[i+1]);
      const db = Math.abs(dataA[i+2] - dataB[i+2]);
      if (dr > 15 || dg > 15 || db > 15) {
        diffCount++;
        diffImg.data[i] = 255;
        diffImg.data[i+1] = 0;
        diffImg.data[i+2] = 0;
        diffImg.data[i+3] = 255;
      } else {
        diffImg.data[i] = dataB[i];
        diffImg.data[i+1] = dataB[i+1];
        diffImg.data[i+2] = dataB[i+2];
        diffImg.data[i+3] = 40;
      }
    }
    ctx.putImageData(diffImg, 0, 0);
    return {
      diffCount,
      width: imgA.width,
      height: imgA.height,
      dataUrl: canvas.toDataURL('image/png')
    };
  }, { b64A, b64B });

  console.log('Diff count:', report.diffCount, 'of', report.width * report.height);
  const base64Data = report.dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync('playwright-screenshots/diff-01.png', base64Data, 'base64');
  console.log('Saved diff image to playwright-screenshots/diff-01.png');

  await browser.close();
}

debug().catch(console.error);
