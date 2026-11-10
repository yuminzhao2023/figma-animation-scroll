const { chromium } = require('playwright');

const url = process.env.SCROLL_AUDIT_URL || 'http://127.0.0.1:4173/';
const cpuThrottle = Number(process.env.SCROLL_AUDIT_CPU || 1);

function value(metrics, name) {
  return metrics.find((metric) => metric.name === name)?.value ?? 0;
}

function percentile(values, percent) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * percent) - 1];
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 832 } });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.locator('.experience.is-ready').waitFor();
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.locator('.gallery-card img').first().waitFor();
    await page.locator('.gallery-card img').evaluateAll((images) => Promise.all(images.map((image) => image.decode())));

    const client = await context.newCDPSession(page);
    await client.send('Performance.enable');
    if (cpuThrottle > 1) await client.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle });
    const passes = [];
    for (let pass = 0; pass < 2; pass += 1) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(300);
      const before = (await client.send('Performance.getMetrics')).metrics;
      const eventMs = [];
      for (let step = 0; step < 20; step += 1) {
        eventMs.push(await page.evaluate((position) => {
          const start = performance.now();
          scrollTo(0, position);
          dispatchEvent(new Event('scroll'));
          document.querySelector('.scene-stage').getBoundingClientRect();
          return performance.now() - start;
        }, (step + 1) * 160));
        await page.waitForTimeout(16);
      }
      await page.waitForTimeout(600);
      const after = (await client.send('Performance.getMetrics')).metrics;
      const scrollY = await page.evaluate(() => window.scrollY);
      passes.push({
        pass: pass + 1,
        scrollY,
        eventMsP50: +percentile(eventMs, 0.5).toFixed(1),
        eventMsP95: +percentile(eventMs, 0.95).toFixed(1),
        eventMsMax: +Math.max(...eventMs).toFixed(1),
        scriptMs: +((value(after, 'ScriptDuration') - value(before, 'ScriptDuration')) * 1000).toFixed(1),
        taskMs: +((value(after, 'TaskDuration') - value(before, 'TaskDuration')) * 1000).toFixed(1),
        layoutCount: value(after, 'LayoutCount') - value(before, 'LayoutCount'),
        styleRecalcCount: value(after, 'RecalcStyleCount') - value(before, 'RecalcStyleCount'),
      });
    }
    console.log(JSON.stringify({ cpuThrottle, viewport: [1280, 832], passes }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
