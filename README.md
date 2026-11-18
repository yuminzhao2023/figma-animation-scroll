# Aster Ridge — Alpine Destination Concept

Live demo: [figma-animation-scroll.vercel.app](https://figma-animation-scroll.vercel.app/)

A React + TypeScript + Vite website that turns a layered alpine scene into a scroll-driven journey, followed by a photo gallery and destination content. It runs locally without a backend or account. Aster Ridge and its travel copy are fictional; the photography is illustrative.

The opening scene is based on this [Figma prototype](https://www.figma.com/design/gGNweuPX64ZSey7iOE7XkC/Parallax-Scroll-Effect--Community-?node-id=0-1). The carousel and curved reveal take inspiration from the GSAP [Flip Carousel](https://demos.gsap.com/demo/flip-carousel/) and [curve swipe](https://demos.gsap.com/demo/curve-swipe/) demos. The implementation uses CSS and browser animation APIs, with no GSAP dependency.

## Run locally

Use Node.js 22.12 or later and npm.

```bash
npm ci
npm run dev
```

Open the URL printed by Vite, normally <http://localhost:5173/>. To preview a production build, run `npm run build`, then `npm run preview` (normally <http://localhost:4173/>).

## Explore the page

**Desktop, above 800 px:** scroll through the mountain, cave, and gallery scenes; scroll upward to reverse. The opening already shows the EXPLORE title and part of the mountain. Scene layers hold their position when scrolling stops.

The gallery loops through four landscape photos. Use its arrows, drag a card, or swipe horizontally on a trackpad. Clicking a photo expands it into a viewport viewer; closing it returns to the card. Original images load only after opening a photo.

Continuing downward brings the white destination page over the gallery:

- While the white page is entering or retreating, 100 px of scrolling moves its edge about 40 px in either direction.
- Revealing or retreating by 10% triggers a smooth automatic completion. Smaller gestures settle back to the starting side.
- Full coverage restores normal page scrolling. Reversing direction can interrupt automatic completion.

Navigation scrolls to the destination sections, and **Back To Top** returns to the opening. Footer actions share or copy the page link, or compose an email; sharing falls back to copying when native sharing is unavailable.

**Mobile, 800 px and below:** a separate static hero and horizontally scrolling gallery replace the desktop animations. The same destination content and full-size photos remain available, with native anchor navigation.

**Reduced motion:** desktop scenes use static states, with **Continue** and **View gallery** controls. The white reveal follows normal scrolling without automatic completion, and photo viewers open without the expansion animation.

Keyboard shortcuts: within the opening scene, `Enter` advances and `R` restarts. With a gallery card focused, `←` / `→` select photos. `Escape` closes the photo viewer. Standard page-scrolling keys remain available outside those controls.

## Find the implementation

| Location | Purpose |
| --- | --- |
| [src/App.tsx](src/App.tsx) | Desktop scenes, carousel, white reveal, and photo viewer |
| [src/scene.ts](src/scene.ts) | Layer coordinates and interpolation between design states |
| [src/MobileApp.tsx](src/MobileApp.tsx) | Static mobile experience |
| [src/DestinationContent.tsx](src/DestinationContent.tsx) | Shared destination sections, FAQ, and sharing |
| [public/assets](public/assets) | Local images and SVG assets |
| [scripts](scripts) | Browser validation and performance audits |

Images use WebP where appropriate; mobile loads smaller hero assets. Destination sections reuse gallery thumbnails. Inter and Lexend are bundled locally through `@fontsource`.

The desktop reference is four 1280 × 832 Figma states. Continuous scrolling maps their relative transition lengths to scroll distances rather than playing timed transitions. Prototype playback was not verified, and one keyboard trigger was unspecified; the website's input mapping and mobile layout are implementation choices. See [requirement.md](requirement.md) for the original design brief and node references.

## Verify changes

With the dev server running in another terminal:

```bash
npx playwright install chromium
npm run build
npm run lint
npm run validate
npm run validate:site
```

The browser scripts require Playwright's Chromium. `validate` covers desktop scenes, gallery controls, photo viewing, reveal thresholds and resistance, rapid scrolling, and page/image errors. `validate:site` covers desktop and mobile content, navigation, FAQ, sharing, and image loading. Screenshots are saved to [screenshots](screenshots).

For focused checks:

| Command | What it checks |
| --- | --- |
| `VALIDATE_PHASE=arrival npm run validate` | White reveal, reversal, resistance, and rapid scrolling |
| `npm run audit:perf` | Three cold desktop loads and photo loading; build first; starts its own preview server |
| `npm run audit:scroll` | Scroll-handler timing; build first and keep the preview server running on port 4173 |

The scroll audit measures handler work, not displayed frame rate. Browser checks use port 5173 by default; set `VALIDATE_BASE` if Vite selects another port. For the scroll audit, the equivalent override is `SCROLL_AUDIT_URL`.

[STATUS.md](STATUS.md) records recent changes and verification results. The [quality audit](reports/quality-audit.md) is a historical baseline from **2026-11-11**, not a measurement of the latest build.
