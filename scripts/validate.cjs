const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const base = 'http://127.0.0.1:5173/';
const output = path.resolve(__dirname, '../screenshots');
fs.mkdirSync(output, { recursive: true });

async function inspect(page, label) {
  return page.evaluate((name) => ({
    name,
    viewport: [innerWidth, innerHeight],
    document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    brokenImages: [...document.images].filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src),
    galleryCards: document.querySelectorAll('.gallery-card').length,
    scene: document.querySelector('[aria-live="polite"]')?.textContent,
    galleryHeadingVisible: (() => {
      const el = document.querySelector('.gallery-info h1');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    })(),
  }), label);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    for (const width of [1280, 1440, 768, 390]) {
      const height = width === 1280 ? 832 : width === 1440 ? 900 : width === 768 ? 1024 : 844;
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: width === 390 });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.locator('.experience.is-ready').waitFor();
      if (width === 1280) await page.screenshot({ path: path.join(output, 'state-1-1280.png') });
      await page.keyboard.press('ArrowDown');
      await page.getByText('Scene 2 of 4').waitFor();
      if (width === 1280) await page.screenshot({ path: path.join(output, 'state-2-1280.png') });
      if (width === 390) await page.screenshot({ path: path.join(output, 'state-2-390.png') });
      await page.waitForTimeout(300);
      if (width === 390) {
        const client = await context.newCDPSession(page);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 700 }] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 350 }] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.keyboard.press('ArrowDown');
      }
      await page.getByText('Scene 3 of 4').waitFor();
      if (width === 1280) await page.screenshot({ path: path.join(output, 'state-3-1280.png') });
      if (width === 390) await page.screenshot({ path: path.join(output, 'state-3-390.png') });
      await page.waitForTimeout(300);
      await page.keyboard.press('ArrowDown');
      await page.getByText('Scene 4 of 4').waitFor({ timeout: 3000 });
      await page.screenshot({ path: path.join(output, `state-4-${width}.png`) });
      console.log(JSON.stringify(await inspect(page, `state-4-${width}`)));
      if (width === 390) {
        await page.locator('.gallery-card.main.left').click();
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        console.log(JSON.stringify({ mobileGalleryLightbox: 'passed' }));
      }
      if (width === 1280) {
        await page.setViewportSize({ width: 1400, height: 900 });
        console.log(JSON.stringify(await inspect(page, 'resize-while-gallery')));
        await page.setViewportSize({ width: 1280, height: 832 });
        await page.mouse.wheel(0, -500);
        await page.getByText('Scene 3 of 4').waitFor();
        console.log(JSON.stringify(await inspect(page, 'reverse-to-3')));
        await page.keyboard.press('r');
        await page.getByText('Scene 1 of 4').waitFor();
        console.log(JSON.stringify(await inspect(page, 'replay')));
      }
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 1280, height: 832 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('.experience.is-ready').waitFor();
    await page.clock.install();
    await page.keyboard.press('r');
    await page.clock.runFor(2200);
    const cloudY = await page.evaluate(() => Number(document.querySelector('[data-layer="clouds01"]')?.style.transform.match(/translate3d\([^,]+,\s*([\d.-]+)px/)?.[1]));
    if (!(cloudY < -50 && cloudY > -320)) throw new Error(`Opening cloud did not advance through its midpoint: ${cloudY}`);
    console.log(JSON.stringify({ openingCloudMidpointY: cloudY }));
    await context.close();

    const captureContext = await browser.newContext({ viewport: { width: 1280, height: 832 } });
    const capturePage = await captureContext.newPage();
    capturePage.on('pageerror', error => errors.push(error.message));
    await capturePage.goto(base, { waitUntil: 'networkidle' });
    await capturePage.locator('.experience.is-ready').waitFor();
    for (const [time, name] of [[1.75, 'transition-1-2-mid'], [4.75, 'transition-2-3-mid'], [7.75, 'transition-3-4-mid']]) {
      await capturePage.evaluate((value) => window.__parallaxTestSeek(value), time);
      await capturePage.screenshot({ path: path.join(output, `${name}.png`) });
    }
    await captureContext.close();
    console.log(JSON.stringify({ errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
