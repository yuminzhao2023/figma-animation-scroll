const scrollMetrics = require('./scroll-metrics.cjs');

module.exports = async function inspectRapidReveal(browser, errors) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 832 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(process.env.VALIDATE_BASE || 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
    await page.locator('.experience.is-ready').waitFor();
    const metrics = await page.evaluate(scrollMetrics);
    const results = [];
    for (const delta of [120, 900, -120, -900]) {
      const direction = Math.sign(delta);
      const initial = direction > 0 ? metrics.revealStart : metrics.revealEnd;
      const target = direction > 0 ? metrics.revealEnd : metrics.revealStart;
      await page.evaluate(top => scrollTo(0, top), initial);
      await page.waitForTimeout(180);
      await page.evaluate(() => {
        const surface = document.querySelector('.destination-surface');
        window.rapidRevealSamples = [];
        const sample = () => {
          window.rapidRevealSamples.push({ y: scrollY, top: surface.getBoundingClientRect().top });
          window.rapidRevealFrame = requestAnimationFrame(sample);
        };
        window.rapidRevealFrame = requestAnimationFrame(sample);
      });
      for (let index = 0; index < (Math.abs(delta) === 120 ? 8 : 4); index++) {
        await page.mouse.wheel(0, delta);
        await page.waitForTimeout(20);
      }
      await page.waitForFunction(({ target, direction }) => direction > 0 ? scrollY >= target - 3 : scrollY <= target + 3, { target, direction }, { timeout: 5000 });
      await page.waitForTimeout(180);
      const result = await page.evaluate(direction => {
        cancelAnimationFrame(window.rapidRevealFrame);
        const values = window.rapidRevealSamples;
        const backwardSteps = values.slice(1).map((value, index) => (value.top - values[index].top) * direction).filter(value => value > 2);
        return { samples: values.length, reverseSteps: backwardSteps.length, largestReverseStep: Math.max(0, ...backwardSteps) };
      }, direction);
      if (result.reverseSteps) throw new Error(`White surface reversed during rapid ${delta > 0 ? 'downward' : 'upward'} scrolling: ${JSON.stringify(result)}`);
      results.push({ delta, ...result });
    }
    console.log(JSON.stringify({ rapidReveal: results }));
  } finally {
    await context.close();
  }
};
