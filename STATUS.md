# Status

Implementation complete. Local preview: <http://localhost:5173/> after `npm run dev`.

## Centered button ripple — 2026-11-11

- Replaced the instant hover fill on gallery arrows, the closing Back To Top link, and footer share icons with a center-expanding fill and a brief ripple ring. Keyboard focus gets the same effect; reduced-motion settings skip the animated ring.
- `npm run build` passed. A 390 px browser check confirmed the fill grows from its center on the closing link, reaches its final state on the share icon, and produces no page errors.
- On pointer exit, the fill, ring, and highlight colors now clear immediately instead of shrinking or fading out.

## Static mobile journey and performance — 2026-11-11

- Screens up to 800 px now load a separate static hero with the EXPLORE title, a native horizontal photo gallery, and the destination content. Mobile no longer initializes the desktop parallax layers, white-curve controller, or scroll-frame animation. The full-size viewer still opens every original photo, and mobile navigation uses native anchors.
- Added mobile-specific WebP assets: mountain 140 KB (desktop 528 KB) and sky 18 KB (desktop 107 KB). The mountain is preloaded from HTML. Lighthouse mobile network requests fell from about 2.07 MB to 0.72 MB.
- Three consecutive Lighthouse runs of the static route scored 85, 75, and 79, with median TBT 473 ms; two runs reported a slow host CPU. The prior mobile run scored 81 with 780 ms TBT. The static hero's larger painted image raised LCP to about 2.5–4.0 s, so the overall mobile score has not reliably improved. Desktop Lighthouse performance remained 100. Full details are in [`reports/quality-audit.md`](reports/quality-audit.md).
- Browser validation now checks the desktop animation separately from the mobile static page at 390 and 768 px, including four photo cards, full-size image fit, network behavior, and no page errors.

## Quality audit before the static mobile route — 2026-11-11

- Production build and browser regression checks pass. The default `validate` command now includes the first white-curve gesture, and fails on broken images or page script errors. Scene-image readiness is checked before the first scroll.
- Lighthouse 13.6.0 on the original mobile route: mobile performance 81, desktop performance 100. Accessibility and SEO scored 100, Best Practices 96. Mobile total blocking time was 780 ms; desktop was 30 ms. This baseline led to the static mobile route described above. Full findings and current report links are in [`reports/quality-audit.md`](reports/quality-audit.md).
- The code passes strict TypeScript compilation. A Biome lint command is now available and passes, with 25 existing CSS warnings. Remaining maintenance work is concentrated in the large `App.tsx` animation controller and CSS specificity overrides.

## Landscape gallery photo and first-reveal preview — 2026-11-11

- Replaced the portrait third gallery photo with a distinct 3:2 golden-hour alpine scene. The new original is 1536 × 1024 WebP at 288 KB; its separate 640 × 427 thumbnail is 34 KB. The same thumbnail appears in the destination sections, and the original remains requested only after a gallery card is opened.
- The first downward wheel or page-scroll trip from the top now raises the white curve with scroll, then automatically returns it to the complete gallery after input stops regardless of the normal completion threshold. The second gesture uses the original threshold: a small rise returns, and crossing 10% completes the white reveal. Returning to the top resets the first-gesture preview; section navigation still works.
- `npm run build`, the 1280 × 832 arrival check, the desktop gallery validation, the 1280 × 720 four-photo viewer check, and `npm run validate:site` passed. The arrival check raised the curve past the threshold, returned it to scrollY 3286 with the white content edge at 832 px, confirmed the second gesture completed the reveal, and verified the top reset and section navigation. Page errors: 0.

## Gallery image transition — 2026-11-11

- Opening a gallery card now carries its thumbnail into the viewport viewer over 420 ms while the backdrop darkens. The full original replaces the thumbnail after decoding; closing the viewer shrinks the image back toward its source card over 280 ms. The source card is hidden during the transition so it does not appear twice.
- The viewer keeps its focus on the close button, restores focus to the card on exit, locks background scrolling while open, and skips the movement for reduced motion or narrow viewports.
- `npm run build`, desktop motion validation, and `npm run validate:site` passed. The motion check measured an intermediate image width between the 470 px card and the 1056 px viewer during opening, then another intermediate width on close. The four original photos still fit within the 1280 × 720 viewport, including the portrait photo. Page errors: 0.

## Full-size gallery viewer — 2026-11-11

- Moved the gallery image viewer to a viewport-level portal so the destination reveal cannot cover it. The viewer now uses a flex layout and caps image size against the viewport while preserving the original aspect ratio.
- `npm run build` and `npm run validate:site` passed. The 1280 × 720 browser check opened all four originals, including the portrait image, and confirmed that every image fits entirely within the viewport without distortion. See [`screenshots/gallery-lightbox-4-1280x720.png`](screenshots/gallery-lightbox-4-1280x720.png).

## First-scroll cloud stability — 2026-11-11

- The opening scene now waits for its actual DOM images to decode before it becomes visible. Previously, readiness was based on separate preload image objects, which did not guarantee that the displayed cloud elements were decoded.
- Cloud layers request their transform and opacity composition from the initial frame, avoiding layer setup during the first downward scroll. The scene's scroll mapping and cloud positions are unchanged.
- `npm run build` and the 1280 × 832 browser validation passed. The browser found no broken images or page errors, confirmed that the cloud position advances continuously with wheel input, and passed the gallery and curved reveal checks.

## Gallery entry and white reveal — 2026-11-11

- Removed the top-right **Replay** button. The carousel arrows become active as soon as they enter the visible gallery frame.
- Added 0.35 viewport heights of scroll room after the gallery reaches its final position and before the white curve begins rising. If scrolling stops with the curve below its 10% completion threshold, it smoothly returns to the gallery. Crossing that threshold still pulls the destination content up; scrolling back reverses it.
- `npm run build`, desktop browser validation, and `npm run validate:site` passed. The 1280 × 832 browser check measured 291 px of gallery hold, clicked an arrow on entry, and verified automatic return, completion, and retreat. The site check passed desktop and phone content, navigation, and Back To Top with zero page errors.

## Carousel motion direction — 2026-11-11

- Fixed the looping position calculation that sent an outgoing card across the carousel when the left arrow was clicked. The hidden incoming card now starts on the correct side; the three visible cards travel in one consistent direction through the transition.
- Mouse dragging uses the same directional positions, so releasing a drag continues from its current visual position. `npm run build` and desktop browser validation passed, including monotonic left-arrow motion, right-arrow motion, drag, horizontal wheel input, looping controls, and the curved reveal. Page errors: 0.

## Closing button returns to the opening scene — 2026-11-11

- Changed the orange closing section button to **Back To Top** with an upward arrow. It scrolls through the page with an eased animation and finishes at the opening mountain scene.
- Kept the white reveal's snap from intercepting the long return trip. Wheel, touch, and keyboard input can interrupt the return animation. Desktop browser validation confirmed intermediate scroll positions and a final scroll position of 0.

## Footer redesign and sharing — 2026-11-10

- Removed the four destination navigation links from the lower-right footer. The light footer now has an editorial closing line on the left and three compact share actions on the right: native share with copy fallback, copy link, and email. The brand and concept disclosure remain in a quieter bottom row.
- Desktop and phone browser captures show the new layout. `npm run build` and `npm run validate:site` passed; the browser check verified that footer navigation is gone, all three actions exist, copying reports success, native sharing receives the page URL, and the email link is formed correctly.

## Header navigation and section alignment — 2026-11-10

- Removed the top **Explore the trails** action from the destination header.
- The opening and sticky header links to **Experiences** and **Plan your visit** now request smooth scrolling. Navigation across the curved reveal avoids its automatic snap, and the final position corrects small layout shifts.
- Removed the 84 px section scroll margin, which left the Experiences border 8 px below the sticky header border. Browser captures now place both section starts at 0 px behind the 76 px header, with one clean dividing line. `npm run build`, `npm run validate:site`, and the curved reveal capture check passed with zero page errors.

## Gallery spacing, distinct image, and two-way reveal — 2026-11-10

- Increased the vertical gap between the gallery copy and carousel while shortening the cards so their controls still clear the bottom edge at shorter desktop heights.
- Replaced the repeated fourth gallery photo with a generated alpine lake and footbridge image. It is saved as a 46 KB WebP thumbnail and a 268 KB WebP original; the original is loaded only when opened.
- The curved reveal now automatically completes after the white arc reaches the gallery's bottom prompt, roughly 10% into its desktop travel. A short upward scroll from the destination content also automatically returns to the carousel. Desktop browser checks cover both directions.
- `npm run build` passed. The 1280 × 832 browser capture confirmed the reveal moves from 774 px to the top and then retreats to 832 px, with zero page errors. The 1280 × 720 check found the arrow bottom at 676 px and decoded the new full-size fourth image. `npm run validate:site` passed at desktop and phone widths, with four unique gallery thumbnails, no original photo request before opening a card, no horizontal overflow, and zero page errors.

## Flip carousel and reveal snap — 2026-11-10

- Raised and shortened the four-card carousel, leaving more space below the card bottoms and around the navigation arrows. The active card moves forward while the neighboring cards tilt and shift in a looping layout; the carousel still supports button, pointer, horizontal wheel, keyboard, and touch input.
- The curved white reveal follows scroll progress until 42% of its desktop travel, then smoothly completes the rest so the sticky destination header and content arrive together. Upward scrolling remains reversible. The transition is inspired by the user-supplied GSAP demos and implemented with CSS transforms plus the existing SVG curve, with no additional network dependency.
- `npm run build`, `npm run validate`, and `npm run validate:site` passed. Validation captured a real intermediate carousel frame, checked the 1280 × 720 arrow clearance, verified looping controls and lightbox clicks, and confirmed the curved reveal auto-completes. Page errors: 0; image failures: 0. A separate scroll audit passed; its second 1280 × 832 pass measured 0.2 ms median and 0.9 ms 95th percentile input handling time, which is not a displayed frame rate measurement.

## Gallery carousel and curved reveal — 2026-11-10

- Rebuilt the four-photo gallery as a horizontal carousel with a fully visible card bottom, previous/next controls, mouse drag, horizontal trackpad input, and native touch swiping. The card images still use thumbnails and open originals only on click.
- Added one viewport height of desktop scroll after the gallery. As the user keeps scrolling, the destination page rises over the black gallery while its SVG leading edge forms a curve and then flattens, following scroll progress directly. The white header and page content move together; the header remains sticky once it reaches the top. This shape is inspired by the GSAP curve swipe demo and is implemented without a GSAP runtime dependency.
- `npm run build`, `npm run validate`, `npm run validate:site`, and `npm run audit:scroll` passed. At 1280 × 832, the gallery card bottom stayed inside the viewport; two captured reveal positions moved from 541 px to 208 px and had distinct SVG curves. The scroll audit recorded 0.3–0.4 ms median event time and 1.8–2.1 ms 95th percentile across two passes. These are input handling measurements, not displayed frame rate.

## Destination site completion — 2026-11-10

- Extended the parallax landing sequence into a fictional alpine destination site called Aster Ridge. It now has a destination introduction, three experience concepts, a scenic story, trip preparation, FAQs, a final invitation, and footer navigation. The previous placeholder navigation and lorem ipsum have been replaced with working section links and destination copy.
- Confirmed that the four gallery cards use three unique thumbnails (394 KB combined) and request an original photo only after a card click. The new lower sections reuse those thumbnails, with lazy loading, so they do not trigger gallery original requests.
- `npm run build`, `npm run validate:site`, desktop `npm run validate`, and `npm run audit:perf` passed. The destination check covered desktop and phone widths, section navigation, FAQ interaction, image decoding, no horizontal overflow, zero page errors, and original image requests only after opening the viewer. Three cold-load audit runs transferred 2.06 MB each after idle, matching the prior optimized hero/gallery load; no extra full-size destination photo was loaded initially.

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
