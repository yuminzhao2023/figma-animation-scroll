# Parallax Scroll Effect

Local React + TypeScript + Vite implementation of the [Figma Parallax Prototype](https://www.figma.com/design/gGNweuPX64ZSey7iOE7XkC/Parallax-Scroll-Effect--Community-?node-id=0-1). The four visual states come from nodes `0:670`, `0:692`, `0:717`, and `1:682` on the prototype page. The cover node is not used as the first scene.

## Run

```bash
npm ci
npm run dev
```

Open <http://localhost:5173/>. For a production build, run `npm run build`; `npm run preview` serves the built site. This project needs no backend or account.

## Interaction

- The opening frame starts partway through the first design transition, with EXPLORE legible and roughly 60% of the mountain visible. Scroll down or swipe up to advance continuously through the remaining scene path. Scroll up or swipe down to reverse at any point. The animation holds its exact position when scrolling stops.
- Arrow and Page keys and Space use the browser's normal page scrolling. Enter moves to the next scene; Backspace and Arrow Left scroll upward. Press `R` or use **Home** or **Replay** to return to the opening scene.
- Gallery cards open their original photo in a dismissible viewer. **Services** and **Pricing Plan** explain that those sections are absent from this design preview.
- With `prefers-reduced-motion: reduce`, scrolling selects the nearest static design state; **Continue** and **View gallery** remain available.

The page provides 3.6 viewport heights of scroll travel. Its position maps linearly to the design timeline from 1.75 to 9.5. The source design endpoints remain at 0, 3.5, 6, and 9.5, but the website opens at 1.75 to show the title and part of the mountain immediately. Each layer's position, size, and opacity still follows the original design path. The Figma reactions specify 3.5, 2.5, and 3.5 second Smart Animate transitions; their timeline values determine relative scroll distances here, not playback durations. `get_motion_context` returned no animated nodes for this prototype. The original Figma prototype was not played; the second transition's `ON_KEY_DOWN` reaction contains an empty key code list, so the website's scroll and keyboard mapping is an implementation choice rather than a verified Figma trigger.

At 1280 × 832, the scene follows the design coordinates. At 1440, 768, and phone widths, the stage scales to cover the viewport; the phone title and gallery receive layout adjustments because no mobile Figma frame was provided. The scene is clipped deliberately at narrow widths.

## Assets and validation

Layer assets are stored in [`public/assets`](public/assets) as WebP images with preserved transparency. Gallery cards use smaller WebP thumbnails; full-size photos load when opened. The SVG title and mouse icon are independent assets. Inter and Lexend are packaged locally through `@fontsource`, so the rendered site has no temporary Figma asset or web font URL dependency.

The original PNG/JPEG files are available in Git history. The production build does not include them. To measure a cold browser load, run `npm run build && npm run audit:perf`; the audit starts a local preview server, repeats the initial load three times, and checks gallery thumbnails and the full-size viewer.

For the scroll handler audit, run `npm run build`, start `npm run preview`, then run `npm run audit:scroll`. It measures 20 synthetic scroll positions twice at 1280 × 832 and reports input processing time, layout, and style recalculation. It does not measure displayed frame rate. Gallery thumbnails are prepared when the browser is idle after the opening assets load, so their download and decoding are less likely to interrupt the gallery transition.

To repeat the browser check, first run the dev server, then:

```bash
npx playwright install chromium
npm run validate
```

The script checks the customized opening plus the remaining three design states at 1280 × 832, the final state at 1440, 768, and 390 pixels, three transition midpoints and the gallery seam frame, incremental wheel progress, holding position while idle, reversal, image loading, horizontal overflow, replay, resize, touch scrolling, card viewing, and page errors. It saves screenshots to [`screenshots`](screenshots). The opening and transition screenshots use standard motion; later endpoint screenshots use reduced motion to keep the frames stable.

The manually inspected captures are [`state-1-1280.png`](screenshots/state-1-1280.png), [`state-2-1280.png`](screenshots/state-2-1280.png), [`state-3-1280.png`](screenshots/state-3-1280.png), [`state-4-1280.png`](screenshots/state-4-1280.png), and [`state-4-390.png`](screenshots/state-4-390.png). The `STATUS.md` file records the final check results and handoff paths.
