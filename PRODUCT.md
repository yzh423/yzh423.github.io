# Zhenghao YU academic homepage
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Prospective faculty supervisors and research collaborators reviewing Zhenghao YU (Daniel)'s robotics work, publications, experience and CV.

## Purpose and source of truth
The main website at https://yzh423.github.io/. Preserve the published content and downloads from commit 8220242, including the three projects, three publications, six experiences, education, skills and news. No new research results or publication statuses are inferred. The separate YUzhenghao-s-web portfolio is outside this redesign.

## Stack
Static HTML, CSS and JavaScript deployed with the existing GitHub Pages branch configuration. Local fonts, images, recorded simulation videos and PDFs. No framework or third-party runtime.

## User commitments
On 6 November 2026 the user requested a redesign similar to https://tanzhouhu.github.io/#research, including video, animation and matching interaction logic, and explicitly chose English/Chinese language switching. Use the reference's restrained academic composition, top navigation, light/dark controls, particle banner, interactive research map and scroll transitions. Keep the name Zhenghao YU and Daniel on separate lines. Keep a real portrait. The earlier side-navigation direction is superseded for this main-site redesign by the named reference; the separate portfolio remains unchanged.

## Evidence and scope
Use the existing recorded MATLAB/Simulink and MuJoCo videos. Do not present simulation as hardware execution. Keep the earlier 112-task held-out validation separate from the five-case/four-controller/three-profile diagnostic. Keep full captions and links to original recordings and reports. Preserve every existing section anchor and every PDF URL.

## Accessibility
Readable without JavaScript, native links and video controls, keyboard-operable menus and research nodes, visible focus, Escape dismissal and focus return. Reduced-motion and data-saver users receive static visual states and manually playable videos. User pause controls stop continuous decorative motion.

## Preservation and delivery
The original dirty checkout remains untouched. Published state and the working copy were backed up under E:/YZH123123/website-backups/2026-11-06-before-academic-redesign. Implement in an isolated worktree, test both languages/themes and responsive layouts in Playwright, then push a normal commit and verify Pages. Figma was declined earlier; use local browser tools.
