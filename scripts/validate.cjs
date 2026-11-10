const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const base = process.env.VALIDATE_BASE || 'http://127.0.0.1:5173/';
const output = path.resolve(__dirname, '../screenshots');
const openingTime = 1.75;
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

async function seek(page, time) {
  await page.evaluate(({ value, start }) => {
    const distance = document.querySelector('.journey').offsetHeight - innerHeight;
    scrollTo(0, distance * Math.max(0, value - start) / (9.5 - start));
    dispatchEvent(new Event('scroll'));
  }, { value: time, start: openingTime });
  await page.waitForFunction(({ value, start }) => {
    const distance = document.querySelector('.journey').offsetHeight - innerHeight;
    return Math.abs(scrollY - distance * Math.max(0, value - start) / (9.5 - start)) < 2;
  }, { value: time, start: openingTime });
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    for (const width of process.env.VALIDATE_WIDTH ? [Number(process.env.VALIDATE_WIDTH)] : [1280, 1440, 768, 390]) {
      const height = width === 1280 ? 832 : width === 1440 ? 900 : width === 768 ? 1024 : 844;
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: width === 390 });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.locator('.experience.is-ready').waitFor();
      if (width === 1280) {
        const opening = await page.evaluate(() => ({
          cloudY: Number(document.querySelector('[data-layer="clouds01"]')?.style.transform.match(/translate3d\([^,]+,\s*([\d.-]+)px/)?.[1]),
          exploreOpacity: Number(document.querySelector('[data-layer="explore"]')?.style.opacity),
        }));
        if (!(opening.cloudY < -150 && opening.cloudY > -220 && opening.exploreOpacity === 1)) throw new Error(`Opening composition is obscured: ${JSON.stringify(opening)}`);
      }
      await seek(page, 3.5);
      await page.getByText('Scene 2 of 4').waitFor();
      if (width === 1280) await page.screenshot({ path: path.join(output, 'state-2-1280.png') });
      if (width === 390) await page.screenshot({ path: path.join(output, 'state-2-390.png') });
      await seek(page, 6);
      await page.getByText('Scene 3 of 4').waitFor();
      if (width === 1280) await page.screenshot({ path: path.join(output, 'state-3-1280.png') });
      if (width === 390) await page.screenshot({ path: path.join(output, 'state-3-390.png') });
      await seek(page, 9.5);
      await page.getByText('Scene 4 of 4').waitFor({ timeout: 3000 });
      await page.locator('.gallery-card img').first().waitFor();
      await page.locator('.gallery-card img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.screenshot({ path: path.join(output, `state-4-${width}.png`) });
      console.log(JSON.stringify(await inspect(page, `state-4-${width}`)));
      if (width === 390) {
        await page.locator('.gallery-card.main.left').click();
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        console.log(JSON.stringify({ mobileGalleryLightbox: 'passed' }));
        await seek(page, 3.5);
        const beforeTouch = await page.evaluate(() => scrollY);
        const client = await context.newCDPSession(page);
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 700 }] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 350 }] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(250);
        const moved = await page.evaluate(() => scrollY);
        if (moved <= beforeTouch) throw new Error('Touch drag did not scroll the scene');
        console.log(JSON.stringify({ mobileTouchScroll: [beforeTouch, moved] }));
      }
      if (width === 1280) {
        await page.setViewportSize({ width: 1400, height: 900 });
        console.log(JSON.stringify(await inspect(page, 'resize-while-gallery')));
        await page.setViewportSize({ width: 1280, height: 832 });
        await seek(page, 6);
        await page.getByText('Scene 3 of 4').waitFor();
        console.log(JSON.stringify(await inspect(page, 'reverse-to-3')));
        await page.keyboard.press('r');
        await page.getByText('Scene 1 of 4').waitFor();
        console.log(JSON.stringify(await inspect(page, 'replay')));
      }
      await context.close();
    }
    if (process.env.VALIDATE_WIDTH && Number(process.env.VALIDATE_WIDTH) !== 1280) return;
    const context = await browser.newContext({ viewport: { width: 1280, height: 832 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('.experience.is-ready').waitFor();
    await page.screenshot({ path: path.join(output, 'state-1-1280.png') });
    const position = () => page.evaluate(() => Number(document.querySelector('[data-layer="clouds01"]')?.style.transform.match(/translate3d\([^,]+,\s*([\d.-]+)px/)?.[1]));
    const startY = await position();
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(150);
    const firstY = await position();
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(150);
    const secondY = await position();
    await page.waitForTimeout(250);
    const idleY = await position();
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(150);
    const reversedY = await position();
    if (!(startY > firstY && firstY > secondY && Math.abs(idleY - secondY) < 1 && reversedY > secondY)) {
      throw new Error(`Wheel did not scrub continuously and reverse: ${[startY, firstY, secondY, idleY, reversedY]}`);
    }
    console.log(JSON.stringify({ wheelCloudY: [startY, firstY, secondY, idleY, reversedY] }));
    await context.close();

    const captureContext = await browser.newContext({ viewport: { width: 1280, height: 832 } });
    const capturePage = await captureContext.newPage();
    capturePage.on('pageerror', error => errors.push(error.message));
    await capturePage.goto(base, { waitUntil: 'networkidle' });
    await capturePage.locator('.experience.is-ready').waitFor();
    for (const [time, name] of [[2.625, 'transition-1-2-mid'], [4.75, 'transition-2-3-mid'], [7, 'transition-3-4-seam'], [7.75, 'transition-3-4-mid']]) {
      await seek(capturePage, time);
      await capturePage.waitForTimeout(130);
      await capturePage.screenshot({ path: path.join(output, `${name}.png`) });
    }
    await captureContext.close();
    console.log(JSON.stringify({ errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
