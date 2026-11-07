# Zhenghao YU academic homepage
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Prospective faculty supervisors and research collaborators reviewing Zhenghao YU (Daniel)'s robotics work, publications, experience and CV.

## Purpose and source of truth
The main website at https://yzh423.github.io/. Preserve the published content and downloads from commit 8220242, including the three projects, three publications, six experiences, education, skills and news. No new research results or publication statuses are inferred. The separate YUzhenghao-s-web portfolio is outside this redesign.

## Stack
Static HTML, CSS and JavaScript deployed with the existing GitHub Pages branch configuration. Local fonts, images, recorded simulation videos and PDFs. No framework or external runtime service. The current banner uses locally rendered 2D engraving footage and Canvas 2D particles; it loads no Three.js or WebGL runtime.

## User commitments
On 6 November 2026 the user chose Zhouhu Tan’s academic homepage as the reference and requested English/Chinese switching, light and dark themes, and interactive motion. On the homepage, retain the real portrait, “Zhenghao YU” on one line and italic “Daniel” below. A single banner layers an authored robot arm and interactive particle lettering. The latest direction restores the 2D mechanical engraving: grasp, lift, near-linear separation and overlapping assembly, with one shared speed profile. The last assembly step, carrying motion and engraved marks flowing into the name overlap continuously. Keep the signature separate from the complete arm, with stacked framing on smaller screens. Retain the white paper and brisk shared pace. The latest motion refinement derives its numeric shapes from the arm itself: enlarged details, offset impressions, a brief negative print and a continuous gripper-to-name handoff. Remove camera-rotation controls from the homepage. The research map keeps its connections and topic links at phone and desktop widths. The top navigation serves About, Research, Work, Publications, News, Experience, Education and Contact. [Design reference](https://tanzhouhu.github.io/#research)

## Evidence and scope
On the homepage, present the existing MATLAB/Simulink path-tracking recording and the MuJoCo Fold Box replay in disclosures under their respective projects. Each recording has a still image, an explicit play action and a simulation caption. The robot arm film is artwork. Keep the earlier 112-task held-out validation separate from the five-case/four-controller/three-profile diagnostic. Keep full captions and links to original recordings and reports. Preserve every existing section anchor and every PDF URL.

## Accessibility
Readable without JavaScript, native links and video controls, keyboard-operable menus and research nodes, visible focus, Escape dismissal and focus return. Reduced motion and the persistent pause preference give the banner and research map a settled state. Data saver suppresses automatic banner playback. Recorded experiments are manually playable in all modes.

## Preservation and delivery
The original dirty checkout remains untouched. Published state and the working copy were backed up under E:/YZH123123/website-backups/2026-11-06-before-academic-redesign. Implement in an isolated worktree, test both languages/themes and responsive layouts in Playwright, then push a normal commit and verify Pages. Figma was declined earlier; use local browser tools.
