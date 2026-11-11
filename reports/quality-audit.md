# Aster Ridge quality audit — 2026-11-11

## Test coverage

The production build, `npm run validate`, and `npm run validate:site` pass. Desktop browser checks cover the previously corrected first white-curve gesture and its automatic retreat, the second gesture threshold, carousel entry and both arrow directions, card clearance, four distinct landscape photos, full-size image fit and transition, navigation alignment, Back To Top, and thumbnail-only loading before a card click. They also check cloud position during the first scroll and verify that all scene images have decoded before the scene appears. Mobile checks at 390 and 768 px verify the separate static route, optimized hero assets, four native-scroll photo cards, full-size image fit, and absence of the desktop animation bundle.

The default `validate` command now runs the first-gesture regression. It fails on page errors and broken images instead of merely logging them. The gallery seam is captured at `screenshots/transition-3-4-seam.png`, but there is no automated pixel comparison; the first-scroll cloud check verifies image readiness and movement, not every rendered frame. Those two visual regressions still need manual inspection after changes to scene layers or compositing.

## Lighthouse 13.6.0

Measured against the local Vite production preview in headless Chromium. Mobile uses Lighthouse's default emulation; desktop uses `--preset=desktop`. Scores are lab results and can vary with the machine and hosting environment. Lighthouse's [score bands](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/) mark 90–100 as good and 50–89 as needing improvement.

| Run | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile, static build (no CPU warning) | 85 | 100 | 100 | 100 | 0.8 s | 2.5 s | 498 ms | 0 |
| Desktop | 100 | 100 | 96 | 100 | 0.2 s | 0.2 s | 30 ms | 0 |

Full reports: [mobile](lighthouse-mobile.html) and [desktop](lighthouse-desktop.html). Before the mobile change, one mobile run scored 81 with 780 ms TBT. Three consecutive runs of the static route scored 85, 75, and 79; their TBT values were 498, 473, and 355 ms, for a median of 473 ms. Two of those runs warned that the host CPU was slower than Lighthouse expected. Other no-warning runs scored 87–88 with 380–430 ms TBT, while one slow run scored 67 with 860 ms TBT. The score therefore varies substantially on this host and has not reliably entered the 90-point "good" band. The static mountain image increased LCP from the old 0.8 s reading to roughly 2.5–4.0 s. Desktop Best Practices still loses four points because the transformed decorative explorer image differs slightly from its source aspect ratio.

The mobile page now loads a separate static React component and CSS, with no desktop parallax scene, white-curve controller, or scroll-frame calculations. Lighthouse network requests fell from about 2.07 MB to 0.72 MB. A 140 KB mobile mountain and 18 KB mobile sky replace the 528 KB and 107 KB desktop assets. The mountain image is preloaded from the document so the browser discovers it before React renders. A cold-load trace of the old mobile path showed a roughly 332 ms React scheduler task and other long main-thread tasks; Lighthouse measured these during navigation, before any user scrolling. The scroll animation itself was therefore not the direct source of the 780 ms initial-load TBT.

The earlier desktop cold-load browser audit measured 2,064,584 transferred bytes and 776–827 ms until its scene was ready across three runs. Two older gallery thumbnails are 177 KB and 131 KB; resizing these to the size used by the newer thumbnails remains a network reduction opportunity. The full-size gallery originals are requested only after a card click.

The separate desktop scroll audit measured 20 synthetic positions twice at 1280 × 832. Event handling was 0.2–0.3 ms at the median and 0.7–1.9 ms at the 95th percentile, with 7–8 style recalculations per pass. This measures handler work, not displayed frame rate.

## Code quality

The project passes strict TypeScript compilation. This audit replaced unnecessary non-null assertions with checked DOM references, used a stable key for gallery cards, improved lightbox semantics, corrected accessible names and brand contrast, and added a favicon and valid `robots.txt`. The mobile and desktop routes now load separate bundles.

The main maintenance risk is `src/App.tsx`: 765 lines mix scene rendering, scroll state, carousel movement, image viewer animation, and navigation. The browser validation script also relies on several hard-coded timing values. This audit added `npm run lint` with Biome 2.6.6; it passes, with 25 CSS warnings, mainly `!important` and selector ordering. The configuration excludes one rule that incorrectly treats the tested, URL-preserving smooth-scroll hash links as invalid anchors. There is still no formatting gate. A future cleanup should extract the scroll/reveal controller and gallery viewer, centralize timeline constants, and reduce CSS overrides.
