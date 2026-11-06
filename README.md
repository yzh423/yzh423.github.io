# Zhenghao YU / Daniel

Personal academic website at [yzh423.github.io](https://yzh423.github.io/), built with static HTML, CSS and JavaScript. The main homepage and the manipulation research page share English/Chinese switching, light/dark themes and accessible navigation.

## Preview and verify

With Node.js available:

```sh
npm run dev
npm test
```

Open `http://127.0.0.1:8782/`. The preview server supports byte-range video requests. `PORT` can select another port.

Browser verification uses Playwright with Microsoft Edge:

```sh
npm install
npm run test:browser
```

An existing Playwright installation can be used instead by setting `PLAYWRIGHT_MODULE` to its absolute `index.mjs` path. `SITE_URL` overrides the local address for deployment checks. Screenshots and detailed results are written to the ignored `output/playwright/` folder.

The browser suite checks both languages, six viewport sizes, menus, keyboard and touch behavior, research-map selection, real H.264 playback, themes, reduced motion, no-JavaScript reading and resource failures. Node tests protect scientific claim scope, original PDF hashes, links and contrast tokens.

## Content and behavior

- `index.html`: profile, interactive research map, projects, papers, updates, experience, education and contact. English is readable without JavaScript; authored Chinese translations live in `data-zh` attributes.
- `projects/reliable-robotic-manipulation/`: full research narrative, figures, simulation recordings and experimental qualifications.
- `styles.css`, `project.css`: responsive typography and both themes; the home motion composition lives in `field.css`. Fonts are served locally as WOFF2 with their OFL licenses.
- `preferences.js`: applies the saved/system theme before paint. `script.js` handles navigation, translations and research selection. `field.js` renders the fused banner and linked research web.
- `assets/SOURCES.md`: original media provenance and font sources. All existing CV and paper URLs remain valid.

The original butterfly film starts after the name entrance and 30% visibility, follows a forewing as the outline opens into a field of sage lettering, then pulls back into a halftone, then holds. Replay runs it again without scrolling; returning to the banner also restarts it. A fast pointer stroke pushes nearby grains and leaves a short directional wake. Nearby grains part along the path of the pointer and spring back as soon as it passes. Rebuild the film and both posters with `python scripts/render-butterfly.py` (NumPy, SciPy, Pillow, imageio-ffmpeg). The visitor can pause animation; reduced-motion users see a still composition. On the homepage, readers expand a project recording and press Play to watch it. The particle lettering is decorative and does not represent research data.

## Design and release

The November 2026 redesign follows the academic composition and interaction patterns of [Zhouhu Tan's homepage](https://tanzhouhu.github.io/#research), with original implementation and Zhenghao's own research content and media. See `PRODUCT.md`, `DESIGN.md` and `docs/reference-redesign.md` for constraints and rationale.

GitHub Pages continues to publish the repository's existing main-branch configuration. No framework, build step or external runtime service is required. The independent `YUzhenghao-s-web` portfolio is a separate repository.
