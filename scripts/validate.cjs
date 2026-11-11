const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const base = process.env.VALIDATE_BASE || 'http://127.0.0.1:5173/';
const output = path.resolve(__dirname, '../screenshots');
const openingTime = 1.75;
fs.mkdirSync(output, { recursive: true });

async function inspect(page, label) {
  const result = await page.evaluate((name) => ({
    name,
    viewport: [innerWidth, innerHeight],
    document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    brokenImages: [...document.images].filter(img => img.complete && img.naturalWidth === 0).map(img => img.src),
    galleryCards: document.querySelectorAll('.gallery-card').length,
    scene: document.querySelector('[aria-live="polite"]')?.textContent,
    galleryHeadingVisible: (() => {
      const el = document.querySelector('.gallery-info h1');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    })(),
  }), label);
  if (result.brokenImages.length) throw new Error(`Broken images in ${label}: ${result.brokenImages.join(', ')}`);
  return result;
}

async function assertSceneImagesReady(page) {
  const missing = await page.locator('.scene-stage img').evaluateAll(images => images
    .filter(image => !image.complete || image.naturalWidth === 0)
    .map(image => image.getAttribute('src')));
  if (missing.length) throw new Error(`Scene became visible before its images decoded: ${missing.join(', ')}`);
}

async function seek(page, time) {
  await page.evaluate(({ value, start }) => {
    const distance = document.querySelector('.journey').offsetHeight - innerHeight - (innerWidth > 800 ? innerHeight * 1.35 : 0);
    scrollTo(0, distance * Math.max(0, value - start) / (9.5 - start));
    dispatchEvent(new Event('scroll'));
  }, { value: time, start: openingTime });
  await page.waitForFunction(({ value, start }) => {
    const distance = document.querySelector('.journey').offsetHeight - innerHeight - (innerWidth > 800 ? innerHeight * 1.35 : 0);
    return Math.abs(scrollY - distance * Math.max(0, value - start) / (9.5 - start)) < 2;
  }, { value: time, start: openingTime });
}

async function inspectLightboxImage(page) {
  const image = page.getByRole('dialog').locator('img');
  await image.evaluate(element => element.decode());
  await page.locator('.lightbox-media img.is-loaded').waitFor({ timeout: 3000 });
  const bounds = await image.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, naturalWidth: element.naturalWidth, naturalHeight: element.naturalHeight, viewportWidth: innerWidth, viewportHeight: innerHeight };
  });
  if (bounds.x < 0 || bounds.y < 0 || bounds.right > bounds.viewportWidth || bounds.bottom > bounds.viewportHeight || Math.abs(bounds.width / bounds.height - bounds.naturalWidth / bounds.naturalHeight) > .01) {
    throw new Error(`Full-size photo is clipped or distorted: ${JSON.stringify(bounds)}`);
  }
  return bounds;
}

async function inspectGalleryArrival(browser, errors) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 832 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('.experience.is-ready').waitFor();
    const revealStart = await page.evaluate(() => document.querySelector('.journey').offsetHeight - 2 * innerHeight);
    await page.evaluate(() => {
      window.firstRevealMax = 0;
      window.addEventListener('scroll', () => { window.firstRevealMax = Math.max(window.firstRevealMax, scrollY); }, { passive: true });
    });
    await page.mouse.wheel(0, revealStart + 600);
    await page.mouse.wheel(0, 300);
    await page.waitForFunction(expected => window.firstRevealMax > expected + innerHeight * .2, revealStart, { timeout: 3000 });
    await page.waitForFunction(expected => Math.abs(scrollY - expected) < 3, revealStart, { timeout: 5000 });
    const firstReturn = await page.evaluate(() => ({
      scrollY, whiteTop: document.querySelector('.destination-reveal').getBoundingClientRect().top,
      promptTop: document.querySelector('.gallery-scroll-hint').getBoundingClientRect().top,
      arrowBottom: document.querySelector('.gallery-arrows button').getBoundingClientRect().bottom,
      navTop: document.querySelector('.navigation').getBoundingClientRect().top,
      maxY: window.firstRevealMax,
    }));
    if (firstReturn.maxY < revealStart + 166 || firstReturn.whiteTop < 830 || firstReturn.promptTop >= 832 || firstReturn.arrowBottom > 832 || firstReturn.navTop < -2) {
      throw new Error(`First white-curve preview did not rise and return to the full gallery: ${JSON.stringify(firstReturn)}`);
    }
    await page.waitForTimeout(160);
    await page.mouse.wheel(0, 400);
    await page.waitForFunction(expected => Math.abs(scrollY - expected) < 3, revealStart + 832, { timeout: 5000 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => scrollY < 2);
    await page.evaluate(() => { window.firstRevealMax = 0; });
    await page.mouse.wheel(0, revealStart + 40);
    await page.waitForFunction(expected => window.firstRevealMax > expected + 20, revealStart, { timeout: 3000 });
    await page.waitForFunction(expected => Math.abs(scrollY - expected) < 3, revealStart, { timeout: 5000 });
    const smallPreviewMax = await page.evaluate(() => window.firstRevealMax);
    if (smallPreviewMax >= revealStart + 832 * .1) throw new Error(`Small first preview crossed the completion threshold: ${smallPreviewMax}`);
    await page.locator('.navigation a[href="#experiences"]').click();
    await page.waitForFunction(() => Math.abs(document.getElementById('experiences').getBoundingClientRect().top) < 2, null, { timeout: 7000 });
    console.log(JSON.stringify({ firstPreviewMax: Math.round(firstReturn.maxY), smallPreviewMax: Math.round(smallPreviewMax), returnedTo: Math.round(firstReturn.scrollY), whiteTop: Math.round(firstReturn.whiteTop), nextGestureRevealed: true, topReset: true, navigationFromGallery: true, errors }));
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  try {
    if (process.env.VALIDATE_PHASE === 'arrival') {
      await inspectGalleryArrival(browser, errors);
      if (errors.length) throw new Error(`Page errors: ${errors.join('; ')}`);
      return;
    }
    if (!process.env.VALIDATE_PHASE) await inspectGalleryArrival(browser, errors);
    if (process.env.VALIDATE_PHASE !== 'capture') {
    for (const width of process.env.VALIDATE_PHASE === 'short' ? [] : process.env.VALIDATE_WIDTH ? [Number(process.env.VALIDATE_WIDTH)] : [1280, 1440]) {
      if (width <= 800) throw new Error('Static mobile layouts are checked by npm run validate:site');
      const height = width === 1280 ? 832 : 900;
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.locator('.experience.is-ready').waitFor();
      await assertSceneImagesReady(page);
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
      await seek(page, 6);
      await page.getByText('Scene 3 of 4').waitFor();
      if (width === 1280) await page.screenshot({ path: path.join(output, 'state-3-1280.png') });
      await seek(page, 9.5);
      await page.getByText('Scene 4 of 4').waitFor({ timeout: 3000 });
      await page.locator('.gallery-card img').first().waitFor();
      await page.locator('.gallery-card img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.waitForTimeout(100);
      if (width === 1280) {
        const layout = await page.evaluate(() => ({
          cardTop: document.querySelector('.gallery-card.is-active').getBoundingClientRect().top,
          cardBottom: document.querySelector('.gallery-card.is-active').getBoundingClientRect().bottom,
          copyBottom: document.querySelector('.gallery-info p').getBoundingClientRect().bottom,
          photoSources: [...document.querySelectorAll('.gallery-card img')].map(image => image.getAttribute('src')),
          photoRatios: [...document.querySelectorAll('.gallery-card img')].map(image => image.naturalWidth / image.naturalHeight),
        }));
        if (layout.cardBottom > height - 55) throw new Error(`Carousel card bottom is clipped: ${layout.cardBottom}`);
        if (layout.cardTop - layout.copyBottom < 35) throw new Error(`Gallery copy is too close to carousel: ${JSON.stringify(layout)}`);
        if (new Set(layout.photoSources).size !== 4) throw new Error(`Gallery still contains duplicate photos: ${JSON.stringify(layout.photoSources)}`);
        if (layout.photoRatios.some(ratio => ratio < 1.25)) throw new Error(`Gallery still contains a portrait thumbnail: ${JSON.stringify(layout.photoRatios)}`);
      }
      await page.screenshot({ path: path.join(output, `state-4-${width}.png`) });
      if (await page.getByRole('button', { name: /Replay/ }).count()) throw new Error('Replay button is still present');
      console.log(JSON.stringify(await inspect(page, `state-4-${width}`)));
      if (width === 1280) {
        await page.getByRole('button', { name: 'Next photo' }).click();
        await page.getByText('03 / 04').waitFor();
        await page.mouse.move(640, 520);
        await page.mouse.down();
        await page.mouse.move(470, 520, { steps: 6 });
        await page.mouse.up();
        await page.getByText('04 / 04').waitFor();
        if (await page.getByRole('dialog').count()) throw new Error('Dragging the carousel opened a photo');
        await page.getByRole('button', { name: 'Previous photo' }).click();
        await page.getByText('03 / 04').waitFor();
        await page.mouse.move(640, 520);
        await page.mouse.wheel(140, 0);
        await page.getByText('04 / 04').waitFor();
        await page.getByRole('button', { name: 'Next photo' }).click();
        await page.getByText('01 / 04').waitFor();
        await page.getByRole('button', { name: 'Previous photo' }).click();
        await page.getByText('04 / 04').waitFor();
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
    if (process.env.VALIDATE_WIDTH && Number(process.env.VALIDATE_WIDTH) !== 1280) {
      if (errors.length) throw new Error(`Page errors: ${errors.join('; ')}`);
      return;
    }
    const shortContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    const shortPage = await shortContext.newPage();
    shortPage.on('pageerror', error => errors.push(error.message));
    await shortPage.goto(base, { waitUntil: 'networkidle' });
    await shortPage.locator('.experience.is-ready').waitFor();
    await seek(shortPage, 9.5);
    await shortPage.getByText('Scene 4 of 4').waitFor();
    await shortPage.locator('.gallery-card img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await shortPage.waitForTimeout(100);
    const arrowBottom = await shortPage.getByRole('button', { name: 'Next photo' }).evaluate((element) => element.getBoundingClientRect().bottom);
    if (arrowBottom > 700) throw new Error(`Carousel arrow is too close to bottom at 1280 × 720: ${arrowBottom}`);
    await shortPage.screenshot({ path: path.join(output, 'state-4-1280x720.png') });
    await shortPage.getByRole('button', { name: 'Next photo' }).click();
    await shortPage.getByRole('button', { name: 'Next photo' }).click();
    const checkedPhotos = [];
    for (const number of [4, 1, 2, 3]) {
      if (number !== 4) {
        await shortPage.getByRole('button', { name: 'Next photo' }).click();
        await shortPage.getByText(`${String(number).padStart(2, '0')} / 04`).waitFor();
      }
      await shortPage.getByRole('button', { name: new RegExp(`View photo ${number} of 4`) }).click();
      const bounds = await inspectLightboxImage(shortPage);
      if (number === 3 && bounds.naturalWidth / bounds.naturalHeight < 1.3) throw new Error('Third gallery photo is still portrait');
      if (number === 4) {
        if (!(await shortPage.getByRole('dialog').locator('img').getAttribute('src')).endsWith('/assets/imgPhoto3.webp')) throw new Error('Fourth card did not open its distinct full-size photo');
        await shortPage.screenshot({ path: path.join(output, 'gallery-lightbox-4-1280x720.png') });
      }
      checkedPhotos.push({ number, size: [Math.round(bounds.width), Math.round(bounds.height)] });
      await shortPage.getByRole('button', { name: 'Close image' }).click();
    }
    console.log(JSON.stringify({ shortViewportArrowBottom: Math.round(arrowBottom), fullSizePhotos: checkedPhotos }));
    await shortContext.close();
    if (process.env.VALIDATE_PHASE === 'short') {
      if (errors.length) throw new Error(`Page errors: ${errors.join('; ')}`);
      return;
    }
    const context = await browser.newContext({ viewport: { width: 1280, height: 832 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('.experience.is-ready').waitFor();
    await assertSceneImagesReady(page);
    await page.screenshot({ path: path.join(output, 'state-1-1280.png') });
    const position = () => page.evaluate(() => Number(document.querySelector('[data-layer="clouds01"]')?.style.transform.match(/translate3d\([^,]+,\s*([\d.-]+)px/)?.[1]));
    const startY = await position();
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(150);
    await assertSceneImagesReady(page);
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
    }

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
    await seek(capturePage, 8.9);
    await capturePage.locator('.gallery-stage.is-interactive').waitFor();
    const earlyArrowTop = await capturePage.getByRole('button', { name: 'Previous photo' }).evaluate(element => element.getBoundingClientRect().top);
    if (earlyArrowTop >= 832) throw new Error(`Carousel arrow is not visible when interaction starts: ${earlyArrowTop}`);
    await capturePage.getByRole('button', { name: 'Previous photo' }).click();
    await capturePage.getByText('01 / 04').waitFor();
    await capturePage.getByRole('button', { name: 'Next photo' }).click();
    await capturePage.getByText('02 / 04').waitFor();
    await seek(capturePage, 9.5);
    await capturePage.locator('.gallery-stage.is-interactive').waitFor();
    const movingCard = capturePage.locator('.gallery-card').nth(2);
    const beforeFlip = await movingCard.evaluate((element) => element.getBoundingClientRect().left);
    await capturePage.getByRole('button', { name: 'Next photo' }).click();
    await capturePage.waitForTimeout(190);
    const duringFlip = await movingCard.evaluate((element) => element.getBoundingClientRect().left);
    await capturePage.screenshot({ path: path.join(output, 'carousel-flip-mid.png') });
    await capturePage.waitForTimeout(650);
    const afterFlip = await movingCard.evaluate((element) => element.getBoundingClientRect().left);
    if (!(beforeFlip > duringFlip && duringFlip > afterFlip)) throw new Error(`Carousel did not animate through intermediate positions: ${[beforeFlip, duringFlip, afterFlip]}`);
    const rightCard = capturePage.locator('.gallery-card').nth(3);
    const beforePrevious = await rightCard.evaluate((element) => element.getBoundingClientRect().left);
    await capturePage.getByRole('button', { name: 'Previous photo' }).click();
    await capturePage.waitForTimeout(190);
    const duringPrevious = await rightCard.evaluate((element) => element.getBoundingClientRect().left);
    await capturePage.screenshot({ path: path.join(output, 'carousel-prev-mid.png') });
    await capturePage.waitForTimeout(650);
    const afterPrevious = await rightCard.evaluate((element) => element.getBoundingClientRect().left);
    if (!(beforePrevious < duringPrevious && duringPrevious < afterPrevious)) throw new Error(`Previous carousel motion crossed the wrong side: ${[beforePrevious, duringPrevious, afterPrevious]}`);
    const activeCard = capturePage.getByRole('button', { name: /View photo 2 of 4/ });
    const sourcePhotoBounds = await activeCard.evaluate(element => element.getBoundingClientRect().toJSON());
    await activeCard.click();
    const flyingPhoto = capturePage.locator('.lightbox-media');
    await capturePage.waitForTimeout(70);
    const openingBounds = await flyingPhoto.evaluate(element => element.getBoundingClientRect().toJSON());
    await capturePage.screenshot({ path: path.join(output, 'gallery-lightbox-opening.png') });
    await capturePage.waitForTimeout(420);
    const expandedBounds = await flyingPhoto.evaluate(element => element.getBoundingClientRect().toJSON());
    if (!(openingBounds.width > sourcePhotoBounds.width + 5 && openingBounds.width < expandedBounds.width - 5)) {
      throw new Error(`Gallery photo did not expand through an intermediate size: ${[sourcePhotoBounds.width, openingBounds.width, expandedBounds.width]}`);
    }
    await capturePage.getByRole('button', { name: 'Close image' }).click();
    await capturePage.waitForTimeout(100);
    const closingBounds = await flyingPhoto.evaluate(element => element.getBoundingClientRect().toJSON());
    if (!(closingBounds.width < expandedBounds.width - 10 && closingBounds.width > sourcePhotoBounds.width + 10)) {
      throw new Error(`Gallery photo did not shrink back toward its card: ${[expandedBounds.width, closingBounds.width, sourcePhotoBounds.width]}`);
    }
    await capturePage.getByRole('dialog').waitFor({ state: 'hidden' });
    console.log(JSON.stringify({ lightboxMotion: [Math.round(sourcePhotoBounds.width), Math.round(openingBounds.width), Math.round(expandedBounds.width), Math.round(closingBounds.width)] }));
    const galleryHold = await capturePage.evaluate(() => {
      const sceneEnd = document.querySelector('.journey').offsetHeight - innerHeight * 2.35;
      const revealStart = document.querySelector('.journey').offsetHeight - innerHeight * 2;
      scrollTo(0, sceneEnd + (revealStart - sceneEnd) * .75);
      dispatchEvent(new Event('scroll'));
      return { sceneEnd, revealStart };
    });
    await capturePage.waitForTimeout(120);
    const holdTop = await capturePage.locator('.destination-reveal').evaluate(element => element.getBoundingClientRect().top);
    if (holdTop <= 832) throw new Error(`White reveal appeared during the gallery hold: ${holdTop}`);
    await capturePage.evaluate(() => {
      window.partialRevealMax = 0;
      const revealStart = document.querySelector('.journey').offsetHeight - 2 * innerHeight;
      window.addEventListener('scroll', () => { window.partialRevealMax = Math.max(window.partialRevealMax, (scrollY - revealStart) / innerHeight); }, { passive: true });
      scrollTo(0, revealStart + innerHeight * .06);
      dispatchEvent(new Event('scroll'));
    });
    await capturePage.waitForFunction(() => {
      const revealStart = document.querySelector('.journey').offsetHeight - 2 * innerHeight;
      return Math.abs(scrollY - revealStart) < 3;
    }, null, { timeout: 5000 });
    await capturePage.waitForTimeout(120);
    const returnedReveal = await capturePage.evaluate(() => ({
      top: document.querySelector('.destination-reveal').getBoundingClientRect().top,
      path: document.querySelector('.destination-wave path').getAttribute('d'),
      maxProgress: window.partialRevealMax,
    }));
    await capturePage.screenshot({ path: path.join(output, 'reveal-auto-return.png') });
    if (!(returnedReveal.maxProgress >= .05 && returnedReveal.top > 800)) throw new Error(`Small white reveal did not return after scrolling stopped: ${JSON.stringify(returnedReveal)}`);
    await capturePage.evaluate(() => {
      const distance = document.querySelector('.journey').offsetHeight - 2 * innerHeight;
      scrollTo(0, distance + innerHeight * .12);
      dispatchEvent(new Event('scroll'));
    });
    await capturePage.waitForFunction(() => {
      const distance = document.querySelector('.journey').offsetHeight - innerHeight;
      return Math.abs(scrollY - distance) < 3;
    }, null, { timeout: 5000 });
    await capturePage.waitForTimeout(120);
    const completedReveal = await capturePage.evaluate(() => ({
      top: document.querySelector('.destination-reveal').getBoundingClientRect().top,
      path: document.querySelector('.destination-wave path').getAttribute('d'),
    }));
    await capturePage.screenshot({ path: path.join(output, 'reveal-auto-complete.png') });
    if (!(completedReveal.top < 3 && returnedReveal.path !== completedReveal.path)) throw new Error('Curved reveal did not auto-complete after threshold');
    await capturePage.evaluate(() => {
      const distance = document.querySelector('.journey').offsetHeight - 2 * innerHeight;
      scrollTo(0, distance + innerHeight * .88);
      dispatchEvent(new Event('scroll'));
    });
    await capturePage.waitForFunction(() => {
      const distance = document.querySelector('.journey').offsetHeight - 2 * innerHeight;
      return Math.abs(scrollY - distance) < 3;
    }, null, { timeout: 5000 });
    await capturePage.waitForTimeout(120);
    const retreatedReveal = await capturePage.evaluate(() => ({
      top: document.querySelector('.destination-reveal').getBoundingClientRect().top,
      path: document.querySelector('.destination-wave path').getAttribute('d'),
    }));
    await capturePage.screenshot({ path: path.join(output, 'reveal-auto-retreat.png') });
    if (!(retreatedReveal.top > 800 && retreatedReveal.path !== completedReveal.path)) throw new Error('Curved reveal did not auto-retreat to the gallery');
    console.log(JSON.stringify({ galleryHold: Math.round(galleryHold.revealStart - galleryHold.sceneEnd), curvedReveal: [Math.round(returnedReveal.top), Math.round(completedReveal.top), Math.round(retreatedReveal.top)], autoReturn: true, autoComplete: true, autoRetreat: true, earlyArrow: true }));
    await captureContext.close();
    if (errors.length) throw new Error(`Page errors: ${errors.join('; ')}`);
    console.log(JSON.stringify({ errors }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
