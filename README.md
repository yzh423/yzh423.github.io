# Zhenghao YU / Daniel

Personal academic website at [yzh423.github.io](https://yzh423.github.io/), built with static HTML, CSS and JavaScript. The main homepage and the manipulation research page share English/Chinese switching, light/dark themes and accessible navigation.

## Preview and verify

With Node.js available:

```sh
npm run dev
npm test
```

Open `http://127.0.0.1:8782/`. The preview server supports byte-range video requests. `PORT` can select another port.

GitHub Pages continues to publish the repository's existing main-branch configuration. No framework, build step or external runtime service is required. The independent `YUzhenghao-s-web` portfolio is a separate repository.

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

The six-second cover print shows a parallel gripper lifting a bushing from a V-block. Copper appears at the contacts and a faint outline marks the original position. Replay restarts the film and lettering. The name responds to pointer movement, and reduced motion shows the settled print. Rebuild the film and posters with `python scripts/render-grasp.py` (NumPy, Pillow and imageio-ffmpeg). The project recordings have separate playback controls.
