# Status

Implementation complete. Local preview: <http://localhost:5173/> after `npm run dev`.

## Scroll performance update — 2026-11-10

- Cached the scroll distance, skipped unchanged visual styles and repeated gallery state changes, and now applies the latest scroll position at most once per animation frame. A timeout covers browsers that pause animation frames. The scroll position still controls the scene directly.
- Gallery thumbnails now mount during idle time after the opening assets are ready. This moves their download and decode away from the gallery transition. In three local cold-load runs, total transfer after network idle was 2.06 MB and scene readiness was 623–656 ms.
- In the 1280 × 832 headless Chromium 20-position audit, scroll event time fell from roughly 1.1–1.2 ms median to 0.2–0.3 ms median; style recalculations fell from 28–40 to 8–9 per pass. The final two passes had 0.9–1.8 ms 95th percentile event time. These figures measure input handling, not displayed frame rate; the container's virtual GPU did not provide a reliable frame-rate measurement.
- `npm run build`, `npm run audit:scroll`, and `node scripts/audit-performance.cjs` passed. Desktop browser validation passed with no page errors, broken images, or regression in reverse scrolling and gallery transitions.

## Gallery transition seam fix — 2026-11-10

- Extended the rising black panel slightly above its original edge during the transition, covering the brief horizontal strip of mountain image visible as the gallery heading enters. The extra overlap reaches zero at the final state.
- Captured `screenshots/transition-3-4-seam.png` at design time 7 to inspect the previously visible seam. `npm run build` and desktop browser validation passed; page errors: 0.

## Opening composition update — 2026-11-10

- The page now opens at design timeline position 1.75, where EXPLORE is readable and roughly 60% of the mountain is visible. Scroll progress maps from 1.75 to 9.5; the underlying Figma layer path and later endpoints remain unchanged.
- The opening screenshot and first transition midpoint have been updated. `npm run build` and desktop browser validation at 1280 × 832 passed; the browser reported no page errors or broken images, and wheel progress, idle hold, reversal, and replay passed.

## Scroll interaction update — 2026-11-10

- Replaced wheel direction triggers and timed scene playback with native page scrolling. The 3.6 viewport heights of scroll travel map to the active portion of the design timeline, so wheel, touch, and reverse scrolling control every intermediate frame. There is no automatic scene advance.
- Cached layer and control elements once at startup, moved the panel, scroll cue, gallery text, and cards with transforms instead of changing layout positions each frame, and removed forced `will-change` on large image layers.
- `npm run build` and `npm run validate` passed. Browser checks covered the four stable states, three transition midpoints, 1280/1440/768/390 widths, wheel increments, idle hold, reversal, replay, resize, phone touch, and gallery lightbox. Page errors: 0; broken images: 0; horizontal overflow: 0. Updated screenshots are in `screenshots/`.
- These checks verify behavior and rendering. No frame rate improvement is claimed because frame timing was not benchmarked.

## Deliverables

- Source: `src/App.tsx`, `src/scene.ts`, `src/styles.css`, Vite and TypeScript config, `package-lock.json`
- Optimized local assets: `public/assets/` (WebP and SVG)
- Browser check: `scripts/validate.cjs`
- Scroll work audit: `scripts/audit-scroll.cjs`
- Captures: `screenshots/state-{1,2,3,4}-1280.png`, `screenshots/state-4-{1440,768,390}.png`, `screenshots/transition-*-mid.png`, `screenshots/transition-3-4-seam.png`

## Checks

- `npm run build` — passed.
- `npm run audit:perf` — passed. Cold initial transfer fell from 20.09 MB to 1.67 MB; local headless Chromium median ready time fell from 828 ms to 668 ms. Gallery thumbnails and the full-size viewer decoded successfully.
- Chromium at 1280 × 832, 1440 × 900, 768 × 1024, and 390 × 844 — customized opening, three later 1280 states, and final responsive states rendered; image failures: 0; page errors: 0; horizontal overflow: 0.
- Reverse to scene 3, replay to scene 1, resize while on gallery, phone touch scrolling, and phone card viewer — passed.
- Original Figma prototype playback was not available. Prototype reactions were read through Figma Plugin API; scene 2's key code list is empty. The website's wheel, touch, and keyboard mapping is documented in README.

## Handoff

Run `npm ci && npm run dev`, then open <http://localhost:5173/>. The four stable desktop screenshots and three animated midpoints are in `screenshots/`; `npm run validate` regenerates them with Playwright.
