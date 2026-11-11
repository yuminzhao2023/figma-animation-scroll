const { chromium } = require('playwright');
const path = require('path');

const base = process.env.VALIDATE_BASE || 'http://127.0.0.1:5173/';
const originals = new Set(['imgPhoto1.webp', 'imgPhoto.webp', 'imgPhoto2.webp', 'imgPhoto3.webp']);
const screenshots = path.resolve(__dirname, '../screenshots');

async function checkPage(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const requested = [];
  const errors = [];
  page.on('request', (request) => requested.push(new URL(request.url()).pathname.split('/').pop()));
  page.on('pageerror', (error) => errors.push(error.message));

  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator(width <= 800 ? '.mobile-page' : '.experience.is-ready').waitFor();
    if (await page.locator('main').count() !== 1) throw new Error('Expected one main landmark');
    if (await page.locator('#top').count() !== 1) throw new Error('Expected one top navigation target');
    if (await page.getByRole('link', { name: 'Explore the trails' }).count()) throw new Error('Removed header action is still visible');
    if (requested.some((name) => originals.has(name))) throw new Error('Original gallery photo loaded before interaction');
    if (width <= 800) {
      if (!requested.includes('imgMountains-mobile.webp') || !requested.includes('imgBgSky-mobile.webp')) throw new Error('Mobile hero did not load its optimized assets');
      if (requested.some(name => /^App-|^img(?:Mountains|BgSky|Cave|Clouds\d+)\.webp$/.test(name))) throw new Error('Mobile loaded the desktop animation bundle or imagery');
    } else if (requested.some(name => name?.endsWith('-mobile.webp'))) {
      throw new Error('Desktop requested mobile-only hero assets');
    }

    for (const id of ['discover', 'experiences', 'plan', 'questions']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      const visible = await page.locator(`#${id}`).evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight;
      });
      if (!visible) throw new Error(`${id} section did not enter viewport`);
      if (['discover', 'experiences'].includes(id)) {
        await page.locator(`#${id} img`).evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
      }
    }
    await page.locator('.destination-story').scrollIntoViewIfNeeded();
    await page.locator('.destination-story img').evaluate((image) => image.decode());
    await page.locator('#questions details').first().locator('summary').click();
    if (!(await page.locator('#questions details').first().evaluate((element) => element.open))) throw new Error('FAQ did not open');
    if (requested.some((name) => originals.has(name))) throw new Error('Original gallery photo loaded while browsing the page');

    await page.locator('.destination-nav a[href="#experiences"]').click();
    await page.waitForFunction(() => location.hash === '#experiences');
    const widthCheck = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    if (widthCheck.scrollWidth > widthCheck.viewport) throw new Error(`Horizontal overflow: ${JSON.stringify(widthCheck)}`);
    const showSectionStart = async (id) => {
      await page.locator(id).evaluate((element) => {
        const rect = element.getBoundingClientRect();
        window.scrollTo(0, window.scrollY + rect.top - 75);
      });
      await page.waitForTimeout(120);
    };
    await showSectionStart('#discover');
    await page.screenshot({ path: path.join(screenshots, `destination-intro-${width}.png`) });
    await showSectionStart('#experiences');
    await page.screenshot({ path: path.join(screenshots, `destination-experiences-${width}.png`) });
    await showSectionStart('#plan');
    await page.screenshot({ path: path.join(screenshots, `destination-plan-${width}.png`) });

    const footer = page.locator('.destination-footer');
    if (await footer.locator('nav').count()) throw new Error('Footer navigation was not removed');
    if (await footer.locator('.destination-share-action').count() !== 3) throw new Error('Footer sharing actions are incomplete');
    await footer.screenshot({ path: path.join(screenshots, `destination-footer-${width}.png`) });
    if (width === 1280) {
      await page.getByRole('button', { name: 'Copy link to Aster Ridge' }).click();
      await page.locator('.destination-share-status').getByText('Link copied to clipboard.').waitFor();
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'share', { configurable: true, value: async (data) => { window.sharedDestination = data; } });
      });
      await page.getByRole('button', { name: 'Share Aster Ridge' }).click();
      const shared = await page.evaluate(() => window.sharedDestination);
      if (shared?.title !== 'Aster Ridge' || shared?.url !== `${new URL(base).origin}/`) throw new Error(`Native share data is wrong: ${JSON.stringify(shared)}`);
      const email = await page.getByRole('link', { name: 'Email Aster Ridge link' }).getAttribute('href');
      if (!email?.startsWith('mailto:') || !email.includes('Aster%20Ridge')) throw new Error(`Footer email link is wrong: ${email}`);
    }

    if (width === 1280) {
      await page.evaluate(() => scrollTo(0, document.querySelector('.journey').offsetHeight - 2 * innerHeight));
      await page.getByText('Scene 4 of 4').waitFor();
      await page.locator('.gallery-card.main.left').click();
      await page.locator('.lightbox img').evaluate((image) => image.decode());
      if (!requested.includes('imgPhoto1.webp')) throw new Error('Original photo was not requested after gallery click');
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
    }
    if (width <= 800) {
      if (await page.locator('.scene-stage, .journey, .destination-wave').count()) throw new Error('Mobile still renders the animated desktop journey');
      await page.locator('.mobile-gallery').scrollIntoViewIfNeeded();
      const cards = page.locator('.mobile-gallery-card');
      if (await cards.count() !== 4) throw new Error('Static mobile gallery is incomplete');
      for (const card of await cards.all()) {
        await card.scrollIntoViewIfNeeded();
        await card.locator('img').evaluate(image => image.decode());
      }
      await cards.first().scrollIntoViewIfNeeded();
      await cards.first().click();
      const image = page.getByRole('dialog').locator('img');
      await image.evaluate(element => element.decode());
      const fit = await image.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: innerWidth, height: innerHeight };
      });
      if (fit.left < 0 || fit.top < 0 || fit.right > fit.width || fit.bottom > fit.height) throw new Error(`Mobile original photo is clipped: ${JSON.stringify(fit)}`);
      if (!requested.includes('imgPhoto1.webp')) throw new Error('Mobile original photo was not requested after gallery click');
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
    }
    if (errors.length) throw new Error(`Page errors: ${errors.join('; ')}`);

    const imageSizes = await page.locator('.destination-experience-image img').evaluateAll((images) => images.map((image) => [image.naturalWidth, image.naturalHeight]));
    console.log(JSON.stringify({ width, sections: 4, faq: 'passed', galleryThumbs: [...new Set(requested.filter((name) => name?.includes('-thumb.webp')))], originalsBeforeClick: 0, originalsAfterClick: width === 1280 ? ['imgPhoto1.webp'] : [], imageSizes, horizontalOverflow: 0, errors }));
  } finally {
    await context.close();
  }
}

async function checkAnimatedNavigation(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 832 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.locator('.experience.is-ready').waitFor();
    await page.evaluate(() => {
      window.navigationScrollCalls = [];
      const originalScrollTo = window.scrollTo.bind(window);
      window.scrollTo = (...args) => {
        window.navigationScrollCalls.push(args);
        return originalScrollTo(...args);
      };
    });
    for (const [id, selector] of [
      ['experiences', '.navigation a[href="#experiences"]'],
      ['plan', '.destination-nav a[href="#plan"]'],
      ['top', '.destination-final a[href="#top"]'],
    ]) {
      await page.locator(selector).click();
      try {
        await page.waitForFunction((sectionId) => sectionId === 'top' ? scrollY < 1 : Math.abs(document.getElementById(sectionId).getBoundingClientRect().top) < 1, id, { timeout: id === 'top' ? 15000 : 7000 });
      } catch (error) {
        console.log(JSON.stringify({ failedNavigation: id, state: await page.evaluate(() => ({ scrollY, hash: location.hash, scrollCalls: window.navigationScrollCalls.length })) }));
        throw error;
      }
      const result = await page.evaluate((sectionId) => ({
        sectionTop: document.getElementById(sectionId).getBoundingClientRect().top,
        headerBottom: document.querySelector('.destination-header').getBoundingClientRect().bottom,
        hash: location.hash,
        scrollY,
        calls: window.navigationScrollCalls,
      }), id);
      if (result.hash !== `#${id}` || (id === 'top' ? result.scrollY > 1 : result.sectionTop > result.headerBottom - 40)) throw new Error(`Navigation target or border alignment is wrong: ${JSON.stringify(result)}`);
      if (id === 'top') {
        if (!result.calls.some(([options]) => options?.behavior === 'instant' && options.top > 0)) throw new Error('Back To Top did not animate through intermediate scroll positions');
      } else if (!result.calls.some(([options]) => options?.behavior === 'smooth')) throw new Error(`${id} did not request smooth scrolling`);
      if (id === 'experiences') await page.locator('#experiences img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.screenshot({ path: path.join(screenshots, `navigation-${id}-1280.png`) });
      console.log(JSON.stringify({ animatedNavigation: id, sectionTop: Math.round(result.sectionTop), scrollY: Math.round(result.scrollY), animated: true }));
      await page.evaluate(() => { window.navigationScrollCalls = []; });
    }
    if (errors.length) throw new Error(`Page errors: ${errors.join('; ')}`);
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    if (process.env.VALIDATE_PHASE !== 'navigation') {
      await checkPage(browser, 1280, 832);
      await checkPage(browser, 390, 844);
      await checkPage(browser, 768, 1024);
    }
    await checkAnimatedNavigation(browser);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });
