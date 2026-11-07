# Main-site academic redesign

## Direction

The homepage introduces Zhenghao YU (Daniel) to prospective supervisors and collaborators. The portrait, two-line name and contact links lead into the cover illustration, with the research introduction below. An original three-dimensional robot model shows pale metal housings, dark joints and copper details during pickup, an exploded orbit and simultaneous assembly. Independent particle lettering stays in front. Newsreader headings, Inter body text, thin rules, and an orange accent connect the introduction to the research and publications below. [Design reference](https://tanzhouhu.github.io/#research)

## Navigation and reading

The desktop header and mobile menu expose the same eight destinations, in reading order.

| Navigation | Anchor |
| --- | --- |
| About | `#about` |
| Research | `#research` |
| Work | `#projects` |
| Publications | `#publications` |
| News | `#news` |
| Experience | `#experience` |
| Education | `#cv` |
| Contact | `#contact` |

The wordmark returns to Home. The active section has an orange underline. Pointer-initiated anchor navigation can scroll smoothly, and keyboard activation focuses the destination immediately. At 850px and below, the menu opens beneath the header. Escape closes it and returns focus to the toggle. It also closes when focus or a pointer press moves outside the header. Direct entry and homepage reloads start in English with the light theme. Manual choices carry into the study through its internal link.

## Robot arm banner

The cover plays at 1.18 speed, giving the ten-second source an approximately 8.5-second viewing duration. All timings below are media-clock seconds: the model, fallback film, name and numerical field remain synchronized. The camera arc uses longer acceleration and braking ramps, and peripheral drift eases in after the signature settles.

The cover uses an original Three.js model with 85 independently positioned rigid parts, physically lit metal surfaces and real occlusion. The parallel gripper closes at 0.70 media seconds, lifts the bushing clear by 1.45 seconds, and separates from 1.70 to 2.70 seconds. The camera follows a restrained 68-degree arc from 2.75 to 7.50 seconds, continuing through the exploded view and assembly. Every part returns on the same smooth timing curve from 6.35 to 7.30 seconds. The carrying motion begins just before assembly finishes; particles leave the actual projected tool surfaces at 7.43 seconds and settle into the name by 9.88 seconds. The larger framing follows the base as the viewpoint changes to preserve the full silhouette. Exploded offsets increase by 40% in depth, 12% horizontally and 8% vertically. Satin grey-green housings, brushed steel, dark anodized joints and copper accents have separate roughness and coating responses; mipmapped machining grain stays attached to the surfaces.

The live transparent WebGL layer keeps the metal opaque above the simple numeric-disc background. Its geometry, camera and signature projection share the video clock, including seeking, pause and replay. A 60 fps H.264 rendering of the same scene provides a fallback when WebGL is unavailable or lost. The live framebuffer is bounded between 720 and 1440 pixels wide, and rendering stops when paused, offscreen or hidden. Reduced motion shows the final model. Dark mode adjusts studio lighting while preserving the materials. Small changing numeric glyphs form one softly edged disc, elliptical in perspective. The simple shape expands into a closer view and contracts toward the actual gripper; there are no internal grids, cavities or layered shapes. Its illumination stays inside the disc, leaving the surrounding paper clear. Short faster passages alternate with slower holds. The background fades as the name forms, leaving extra white space behind the signature. Cyan, amber, magenta and green exposures follow the film. Soft RGB offsets and refraction accompany the transitions; detached line segments, bands and registration rings are removed. After the name settles, slow peripheral movement and a subdued 24-second colour cycle continue; large camera moves and separations do not repeat. After the film finishes, the final model holds while a separate canvas continues the digital shape and colour movement. The surface responds to pointer position and stops with the motion control, reduced motion or an offscreen cover. A Replay button appears to start the film and type entrance again. Scrolling below 30% and returning starts a new pass. Pointer or touch input gently shifts the film and carries nearby grains in the direction of the stroke. The wider pointer field stays displaced and coloured during a stationary hover. The grains slowly return without overshoot after the pointer moves away, and the light fades with their movement. “Explore research” sits at the lower left on desktop and bottom center on phones, and the motion control sits at bottom right.

The pause control and reduced-motion preference provide a settled composition. Backgrounding the page pauses playback, and data saver suppresses automatic film playback. The still poster and fallback name are readable before enhancement.

## Research network

Four branches connect the central research label to eight topics. Solid lines join each parent and child, while three dashed lines show related branches and topics. The same SVG connections track the moving labels on desktop and in the taller phone layout. Topic links keep fixed hit areas. A visitor can scroll or pinch zoom over the map.

Each topic is a native link to the associated project, research row, paper or study section. Hover or focus previews the topic and highlights its path to the central junction. The entire note opens the same destination; one tap or Enter on the topic is enough. Arrow keys move between topics, and Escape dismisses the note. With JavaScript disabled, the topics form a readable grid of links.

## Research rows and scrolling

The four indexed rows have original line drawings of a robot arm, a highway merge, a mobile robot and an in-cabin interface. Hover or keyboard focus reveals a margin rule and sketch. Clicking or tapping anywhere on a research row follows its title link. Project and publication titles and lead images also open their resources directly. Each new reading unit fades in once as it enters the viewport. Motion preferences, keyboard navigation, print and script-free reading keep the content available.

## Project recordings

Still figures introduce all three homepage projects. Under the manipulation study and the motion-evaluation project, closed native disclosures hold the path-tracking simulation and the Fold Box trajectory replay. Opening a disclosure exposes the player and caption. The reader presses Play to start the recording, and closing its disclosure pauses it. The separate manipulation study page leads with its given-path player and offers the matched endpoint-only recording on demand. Captions distinguish simulation from hardware and identify the protocol behind each result.

## Verification

Check both pages in English and Chinese, in both themes, at 320, 390, 768, 1024 and 1440px and on a short desktop. Check all eight homepage anchors, mobile keyboard navigation and Escape, single playback and re-entry at 30%, project disclosure playback, visible mobile graph edges and near-topic note placement. Verify reduced motion, data saver, no-JavaScript reading and the original PDF URLs.

## Reference and authorship

Zhouhu Tan’s public homepage supplied the academic layout and interaction reference. The robot arm film, poster and interactive code were created for this site. Scientific images and recordings retain their evidence captions and provenance. Newsreader and Inter are self-hosted with their OFL licenses.
