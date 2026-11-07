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

The cover plays at 0.9 speed, giving the ten-second source an approximately 11.1-second viewing duration. All timings below are media-clock seconds: the film, name and numerical field remain synchronized, and the ambient field retains the same slower tempo after playback ends. The viewpoint change spans 0.64 media seconds (about 0.71 seconds on screen), and peripheral drift eases in after the signature settles.

The ten-second cover print shows a parallel gripper lifting a bushing from a V-block. Its 46 visible components separate and return along curved paths with depth and rotation. The gripper closes at 0.70 seconds, lifts the workpiece 45 drawing units clear of the fixture by 1.45 seconds, and holds before separation begins at 1.70 seconds. Separation takes 1.6 seconds, with a constant-speed middle and short endpoint ramps. Reassembly proceeds from the base plate and pedestal through the shoulder, upper arm, elbow, forearm, wrist and gripper. Neighbouring groups overlap by 0.20 media seconds: the next starts while the previous is almost seated. Cables return with their corresponding arm section. Assembly finishes by 7.30 media seconds; the camera stays wide until the final stage. The assembled arm keeps lifting while its engraved cuts flow into the name, with each particle completing its journey in 1.7 seconds. Supersampled outlines keep the moving engraving stable.

The backdrop uses small numeric glyphs shaped by a continuously evolving gyroid cross-section. Curved cavities curl and merge into a fluid field, which expands into a tracked macro view, changes viewpoint, then gathers at the actual gripper before the name appears. Distinct silhouettes and short optical transitions alternate with longer holds. Cyan, amber, magenta and green follow the mechanical sequence. As the signature forms, background opacity falls by 67%, with further attenuation immediately behind the lettering. Only slow peripheral movement and the 24-second colour cycle continue afterward. Cached glyph screens and a small density raster keep the effect light. The field responds to the pointer and stops when paused, offscreen or under reduced motion.

Pointer movement carries nearby name particles with a coloured wake. A positional field keeps them dispersed and coloured while the pointer rests on the name; they settle back only after it moves away. Replay repeats the pickup, and reduced motion shows the finished print. Each homepage section occupies its own viewport. Read long sections by scrolling within them, then turn the page with a fresh wheel gesture, a swipe or the section controls. Rebuild the film and posters with `python scripts/render-grasp.py` (NumPy, Pillow and imageio-ffmpeg). The project recordings have separate playback controls.
