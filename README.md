# Aster Ridge — Alpine Destination Concept

Local React + TypeScript + Vite destination website. The opening scroll sequence is based on the [Figma Parallax Prototype](https://www.figma.com/design/gGNweuPX64ZSey7iOE7XkC/Parallax-Scroll-Effect--Community-?node-id=0-1). The four visual states come from nodes `0:670`, `0:692`, `0:717`, and `1:682` on the prototype page. The cover node is not used as the first scene. Aster Ridge, its route names, and its destination copy are fictional; the photography is illustrative.

## Run

```bash
npm ci
npm run dev
```

Open <http://localhost:5173/>. For a production build, run `npm run build`; `npm run preview` serves the built site. This project needs no backend or account.

## Interaction

- On desktop, the opening frame starts partway through the first design transition, with EXPLORE legible and roughly 60% of the mountain visible. Scroll down to advance continuously through the remaining scene path; scroll up to reverse. The animation holds its exact position when scrolling stops.
- On desktop, Arrow and Page keys and Space use the browser's normal page scrolling. Enter moves to the next scene; Backspace and Arrow Left scroll upward. Press `R` or use **Home** to return to the opening scene.
- The desktop gallery is a looping animated carousel inspired by the [GSAP Flip Carousel demo](https://demos.gsap.com/demo/flip-carousel/). Use the arrow buttons, mouse drag, horizontal trackpad gesture, or keyboard arrows. Clicking a card expands its thumbnail into a full-viewport photo viewer, then loads the original image; closing it reverses the movement. Reduced motion opens the viewer without the movement.
- On screens up to 800 px wide, the page loads a separate static hero and a native horizontally scrolling photo gallery. There is no scroll-driven scene, white-curve reveal, or gallery transition animation. Tapping a card opens its full-size photo without movement. The destination sections follow by normal page scrolling.
- The light footer ends the story with a short invitation to share Aster Ridge. Its icon actions open the device's share options when available, copy the current page link, or compose an email. The share action copies the link when native sharing is unavailable. The footer contains no destination navigation buttons or fictional social account links.
- On desktop, the opening and sticky destination navigation smoothly scroll to **Experiences** and **Plan your visit**. Section starts align behind the sticky header. Mobile uses native anchor navigation without animation.
- On desktop, the orange closing section's **Back To Top** button animates through the page. Reduced motion and mobile return instantly.
- On desktop with `prefers-reduced-motion: reduce`, scrolling selects the nearest static design state; **Continue** and **View gallery** remain available.

The desktop opening scene provides 3.6 viewport heights of scroll travel. Its position maps linearly to the design timeline from 1.75 to 9.5. The completed gallery remains in view for another 0.35 viewport heights before the white reveal begins. During the first downward gesture from the top, the white curve rises with the scroll and then automatically retreats to the complete gallery when input stops, even if it crossed the normal completion threshold. The next gesture follows the normal reveal rules: below about 10% it retreats, and after that threshold it completes the transition. One more viewport height of scroll draws the destination site over the gallery. The curved SVG leading edge is inspired by the [GSAP curve swipe demo](https://demos.gsap.com/demo/curve-swipe/). Scrolling upward through about 10% of the reveal travel smoothly returns to the full carousel.

The source design endpoints remain at 0, 3.5, 6, and 9.5, but the website opens at 1.75 to show the title and part of the mountain immediately. Each layer's position, size, and opacity still follows the original design path. The Figma reactions specify 3.5, 2.5, and 3.5 second Smart Animate transitions; their timeline values determine relative scroll distances here, not playback durations. `get_motion_context` returned no animated nodes for this prototype. The original Figma prototype was not played; the second transition's `ON_KEY_DOWN` reaction contains an empty key code list, so the website's scroll and keyboard mapping is an implementation choice rather than a verified Figma trigger.

At 1280 × 832, the desktop scene follows the design coordinates; at 1440 it scales to cover the viewport. Mobile uses a static composition of the same sky, mountain, and EXPLORE assets because no mobile Figma frame was provided.

## Assets and validation

Layer assets are stored in [`public/assets`](public/assets) as WebP images with preserved transparency. The static mobile hero uses a 140 KB mountain image and an 18 KB sky image derived from the desktop assets; only the mobile bundle and these smaller hero images are loaded on narrow screens. The four gallery cards use distinct landscape WebP thumbnails, totaling 388 KB on disk compared with 1.43 MB for the four originals. Destination sections reuse thumbnails and load them lazily; full-size photos are requested only when a gallery card is opened. Inter and Lexend are packaged locally through `@fontsource`.

The original PNG/JPEG files are available in Git history. The production build does not include them. To measure a cold browser load, run `npm run build && npm run audit:perf`; the audit starts a local preview server, repeats the initial load three times, and checks gallery thumbnails and the full-size viewer.

For the scroll handler audit, run `npm run build`, start `npm run preview`, then run `npm run audit:scroll`. It measures 20 synthetic scroll positions twice at 1280 × 832 and reports input processing time, layout, and style recalculation. It does not measure displayed frame rate. Gallery thumbnails are prepared when the browser is idle after the opening assets load, so their download and decoding are less likely to interrupt the gallery transition.

To repeat the browser check, first run the dev server, then:

```bash
npx playwright install chromium
npm run validate
npm run validate:site
npm run lint
```

The default `npm run validate` includes the first-gesture white-curve check. Run `env VALIDATE_PHASE=arrival npm run validate` to repeat only that focused desktop check.

`validate` checks the desktop opening, later design states at 1280 and 1440 pixels, arrow clearance at 1280 × 720, transition midpoints and the gallery seam frame, carousel direction and controls, four distinct landscape photos, the first and second white-curve gestures, image readiness, reverse scrolling, and page errors. `validate:site` checks the destination sections at desktop, 390 px, and 768 px widths; mobile's static hero, native gallery and full-size viewer; FAQ interaction; desktop smooth navigation and Back To Top; footer sharing; image decoding; and thumbnail-only network behavior before a card click. Both save screenshots to [`screenshots`](screenshots).

The manually inspected captures are [`state-1-1280.png`](screenshots/state-1-1280.png), [`state-2-1280.png`](screenshots/state-2-1280.png), [`state-3-1280.png`](screenshots/state-3-1280.png), [`state-4-1280.png`](screenshots/state-4-1280.png), [`state-4-1280x720.png`](screenshots/state-4-1280x720.png), [`carousel-flip-mid.png`](screenshots/carousel-flip-mid.png), [`reveal-auto-return.png`](screenshots/reveal-auto-return.png), [`reveal-auto-complete.png`](screenshots/reveal-auto-complete.png), [`reveal-auto-retreat.png`](screenshots/reveal-auto-retreat.png), and [`destination-intro-1280.png`](screenshots/destination-intro-1280.png), [`destination-experiences-1280.png`](screenshots/destination-experiences-1280.png), [`destination-plan-1280.png`](screenshots/destination-plan-1280.png), [`navigation-top-1280.png`](screenshots/navigation-top-1280.png), [`destination-footer-1280.png`](screenshots/destination-footer-1280.png), [`destination-footer-390.png`](screenshots/destination-footer-390.png). The `STATUS.md` file records the final check results and handoff paths.

The left-arrow transition midpoint is captured in [`carousel-prev-mid.png`](screenshots/carousel-prev-mid.png).

The latest test coverage, Lighthouse scores, scroll audit, and code review are documented in [`reports/quality-audit.md`](reports/quality-audit.md). The full Lighthouse reports are in [`reports/lighthouse-mobile.html`](reports/lighthouse-mobile.html) and [`reports/lighthouse-desktop.html`](reports/lighthouse-desktop.html).
