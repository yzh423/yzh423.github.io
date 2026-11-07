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

The cover plays at 1.18 speed, giving the ten-second source an approximately 8.5-second viewing duration. All timings below are media-clock seconds: the model, fallback film, name and numerical field remain synchronized. The camera arc uses longer acceleration and braking ramps, and peripheral drift eases in after the signature settles.

The cover uses an original Three.js model with 85 independently positioned rigid parts, physically lit metal surfaces and real occlusion. The parallel gripper closes at 0.70 media seconds, lifts the bushing clear by 1.45 seconds, and separates from 1.70 to 2.70 seconds. The camera follows a restrained 68-degree arc from 2.75 to 7.50 seconds, continuing through the exploded view and assembly. Every part returns on the same smooth timing curve from 6.35 to 7.30 seconds. The carrying motion begins just before assembly finishes; particles leave the two projected gripping-pad contact surfaces at 7.43 seconds and settle into the name by 9.88 seconds. The larger framing follows the base as the viewpoint changes to preserve the full silhouette. Exploded offsets increase by 40% in depth, 12% horizontally and 8% vertically. Satin grey-green housings, brushed steel, dark anodized joints and copper accents use separate roughness and reflection responses. Five procedural studio softboxes define the metal highlights; mipmapped machining grain stays attached to the surfaces. The complete arm retains 92% opacity after the name appears. A local point light and emissive gripping pads introduce the particle release; 384 contact-surface samples feed gently curved paths into the lettering. The source light fades as the two-line signature settles. The name and model then occupy separate reading areas: side by side on desktop, stacked on phones and tablets. The model moves into place continuously during the particle transfer; its opacity and metal finish are preserved.

The live transparent WebGL layer keeps the metal opaque above the simple numeric-disc background. Its geometry, camera and signature projection share the video clock, including seeking, pause and replay. A 60 fps H.264 rendering of the same scene provides a fallback when WebGL is unavailable or lost. The live framebuffer is bounded between 720 and 1440 pixels wide, and automatic rendering stops when paused, offscreen or hidden. Reduced motion shows the final model. Dark mode adjusts studio lighting while preserving the materials. Once the film settles, dragging the arm drives the actual camera directly, without a trailing spring or competing CSS parallax. Keyboard moves and reset ease to rest. The name remains readable while the model turns. Inspection framing uses the actual part bounds to keep the full arm and fixture clear of the name and controls. A low camera-side fill maintains shaded detail, while fixed studio reflections change naturally with the view. Arrow keys adjust the view, and Home, Escape or the reset control restores its original framing. On phones, horizontal drags rotate while vertical gestures and pinch zoom stay with the browser. Reduced motion still allows explicit camera input without damping. The exported per-frame bounds also keep the complete opening and exploded view inside narrow screens. Replay resets the camera and temporarily disables inspection; WebGL fallback hides the inspection controls.

The backdrop uses one softly edged disc of small numeric glyphs. It expands with the arm, changes colour and scale, then gathers at the actual gripper before the name appears. The simple silhouette keeps the surrounding paper clear; there are no layered grids or internal cutouts. Distinct silhouettes and short optical transitions alternate with longer holds. Cyan, amber, magenta and green follow the mechanical sequence. As the signature forms, background opacity falls by 67%, with further attenuation immediately behind the lettering. Only slow peripheral movement and the 24-second colour cycle continue afterward. Cached glyph screens and a small density raster keep the effect light. The field responds to the pointer and stops when paused, offscreen or under reduced motion.

Pointer movement carries nearby name particles with a coloured wake. A positional field keeps them dispersed and coloured while the pointer rests on the name; they settle back only after it moves away. Replay repeats the pickup, and reduced motion shows the finished model. Each homepage section occupies its own viewport. Read long sections by scrolling within them, then turn the page with a fresh wheel gesture, a swipe or the section controls. Rebuild the fallback film and posters with `node scripts/render-arm-3d.mjs` while the local preview server is running (Playwright, Python and imageio-ffmpeg; `RENDER_URL` and `FFMPEG_BIN` can override the defaults). `node scripts/arm-3d-qa.mjs` checks the orbit, simultaneous assembly, framing, responsive projection and WebGL fallback. `node scripts/arm-interaction-qa.mjs` checks mouse and touch rotation, keyboard/reset, camera framing, replay, reduced motion and native vertical navigation. `node scripts/banner-composition-qa.mjs` checks separation from the signature and controls at six viewport sizes and 100 camera angles, full animated framing, deterministic seeking and drag response. The project recordings have separate playback controls.
