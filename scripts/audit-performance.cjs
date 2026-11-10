const { chromium } = require('playwright');

(async () => {
  const { preview } = await import('vite');
  const server = await preview({ preview: { host: '127.0.0.1', port: 4173 } });
  const port = server.httpServer.address().port;
  const url = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const runs = [];
  let largestInitialResources = [];
  try {
    for (let index = 0; index < 3; index += 1) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 832 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.locator('.experience.is-ready').waitFor();
      const readyMs = await page.evaluate(() => Math.round(performance.now()));
      await page.waitForLoadState('networkidle');
      const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => ({
        name: new URL(entry.name).pathname,
        bytes: entry.encodedBodySize,
        durationMs: Math.round(entry.duration),
      })).sort((a, b) => b.bytes - a.bytes));
      if (index === 0) largestInitialResources = resources.slice(0, 5);
      runs.push({ readyMs, initialBytes: resources.reduce((sum, item) => sum + item.bytes, 0) });
      if (index === 0) {
        for (const [scene, time] of [[2, 3.5], [3, 6], [4, 9.5]]) {
          await page.evaluate((value) => {
            const distance = document.querySelector('.journey').offsetHeight - innerHeight;
            scrollTo(0, distance * (value - 1.75) / (9.5 - 1.75));
            dispatchEvent(new Event('scroll'));
          }, time);
          await page.getByText(`Scene ${scene} of 4`).waitFor();
          await page.waitForTimeout(300);
        }
        const galleryImages = await page.locator('.gallery-card img').evaluateAll((images) => Promise.all(images.map(async (image) => {
          try { await image.decode(); return { src: image.currentSrc, width: image.naturalWidth }; }
          catch (error) { return { src: image.currentSrc, error: String(error) }; }
        })));
        if (galleryImages.some((item) => item.error)) throw new Error(JSON.stringify(galleryImages));
        await page.locator('.gallery-card.main.left').click();
        await page.getByRole('dialog').locator('img').evaluate((image) => image.decode());
        await page.keyboard.press('Escape');
        const laterImages = await page.evaluate(() => performance.getEntriesByType('resource')
          .filter((entry) => /imgPhoto.*\.webp$/.test(entry.name))
          .map((entry) => ({ name: new URL(entry.name).pathname, bytes: entry.encodedBodySize })));
        runs[0].laterImages = laterImages;
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
  }
  console.log(JSON.stringify({
    runs,
    largestInitialResources,
  }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
