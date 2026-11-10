# Parallax Scroll Effect

Local React + TypeScript + Vite implementation of the [Figma Parallax Prototype](https://www.figma.com/design/gGNweuPX64ZSey7iOE7XkC/Parallax-Scroll-Effect--Community-?node-id=0-1). The four visual states come from nodes `0:670`, `0:692`, `0:717`, and `1:682` on the prototype page. The cover node is not used as the first scene.

## Run

```bash
npm ci
npm run dev
```

Open <http://localhost:5173/>. For a production build, run `npm run build`; `npm run preview` serves the built site. This project needs no backend or account.

## Interaction

- Once the opening images have loaded, scene 1 automatically moves to scene 2 in 3.5 seconds.
- From scene 2, scroll down, swipe up, or press Arrow Down, Page Down, Space, or Enter to enter scene 3 in 2.5 seconds. Scene 3 automatically moves to the gallery in 3.5 seconds.
- Scroll up, swipe down, or press Arrow Up, Page Up, Arrow Left, or Backspace to return to the prior scene. Press `R` or use **Home** or **Replay** to restart.
- Gallery cards open their original photo in a dismissible viewer. **Services** and **Pricing Plan** explain that those sections are absent from this design preview.
- With `prefers-reduced-motion: reduce`, transitions become immediate, scene 3 waits for **View gallery**, and scene 1 offers **Continue**.

The Figma reactions specify Smart Animate with Ease In And Out for the first two transitions and Ease Out for the last. The durations above are the actual transition durations; they are not mapped to scroll distance. `get_motion_context` returned no animated nodes for this prototype, so the site interpolates each named layer's position, size, and opacity between the four design states. The original Figma prototype was not played; the second transition's `ON_KEY_DOWN` reaction contains an empty key code list, so wheel, touch, and standard navigation keys are a website interaction mapping rather than verified Figma triggers.

At 1280 × 832, the scene follows the design coordinates. At 1440, 768, and phone widths, the stage scales to cover the viewport; the phone title and gallery receive layout adjustments because no mobile Figma frame was provided. The scene is clipped deliberately at narrow widths.

## Assets and validation

Layer assets are stored in [`public/assets`](public/assets) as WebP images with preserved transparency. Gallery cards use smaller WebP thumbnails; full-size photos load when opened. The SVG title and mouse icon are independent assets. Inter and Lexend are packaged locally through `@fontsource`, so the rendered site has no temporary Figma asset or web font URL dependency.

The original PNG/JPEG files are available in Git history. The production build does not include them. To measure a cold browser load, run `npm run build && npm run audit:perf`; the audit starts a local preview server, repeats the initial load three times, and checks gallery thumbnails and the full-size viewer.

To repeat the browser check, first run the dev server, then:

```bash
npx playwright install chromium
npm run validate
```

The script checks all four states at 1280 × 832, the final state at 1440, 768, and 390 pixels, three transition midpoints, image loading, document overflow, reverse and replay, a resize while viewing the gallery, touch navigation, card viewing, and page errors. It saves screenshots to [`screenshots`](screenshots). Endpoint screenshots use reduced motion to keep the frames stable; the transition screenshots use standard motion.

The manually inspected captures are [`state-1-1280.png`](screenshots/state-1-1280.png), [`state-2-1280.png`](screenshots/state-2-1280.png), [`state-3-1280.png`](screenshots/state-3-1280.png), [`state-4-1280.png`](screenshots/state-4-1280.png), and [`state-4-390.png`](screenshots/state-4-390.png). The `STATUS.md` file records the final check results and handoff paths.
