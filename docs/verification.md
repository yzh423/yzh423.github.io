# Academic redesign verification

Target: the main `yzh423/yzh423.github.io` site. Baseline: `8220242`. Worktree: `redesign/reference-academic`. Checks dated 6 November 2026.

## Content preservation

- Seven PDFs compared with the published Git objects using SHA-256; all unchanged. Both existing CV paths remain available. Hashes are recorded in `tests/downloads.json`.
- Three projects, three papers, six experiences and the existing education/skills/news/contact content remain. All original section anchors are preserved; `#hero` and `#education` also resolve.
- The 112-task held-out result, three selected tracking cases and latest 60-run numerical diagnostic remain separate in both languages. Simulation and hardware-readiness limits are retained.
- Existing images and recordings are unchanged. No reference-site media, personal content or implementation code is shipped.
- The original dirty checkout was not changed. Published history and the original working copy were backed up under `E:/YZH123123/website-backups/2026-11-06-before-academic-redesign`.

## Automated and rendered checks

`node --test tests/*.test.mjs`: 10 passing checks for original claim scope, publication metadata, all PDF hashes, anchors, local assets, native H.264 sources, bilingual content and light/dark contrast.

`node scripts/browser-qa.mjs`: 13 passing groups in Edge/Playwright. Both routes and both languages checked at 320×740, 390×844, 768×1024, 1024×680, 1440×1000 and 1440×620. No horizontal overflow or first-name-line wrap. Tests exercise mobile menu/Escape/focus return/outside dismissal, graph pointer and keyboard selection, real touch input and vertical scrolling, theme/language persistence across documents, scroll navigation, disclosures, actual video playback, preview visibility and pause controls, reduced motion and no-JavaScript reading. No page/console errors or failed local resources were recorded.

Screenshots and machine-readable results are in ignored `output/playwright/`. Full-page captures explicitly load lazy images and use the real pause control; entry animations have settled. The original capture round caught and corrected a theme-transition contrast flash, moving map hit targets and a 320px name wrap.

## Design-tool interpretation

Impeccable detector ran once. Its tiny-text findings prompted larger captions and controls. Native video fallback contrast was made explicit. Some remaining reported padding/contrast flags concern native `<video>` fallback content or section separators rather than rendered body copy. Inter is deliberately retained because it is part of the explicitly requested reference vocabulary.

Taste source/render checks also ran. Thin separators and Inter are reference commitments, not accidental defaults. Full scholarly titles are retained even when more than two lines on a phone. The eyebrow heuristic misidentified preceding video resource links, figure captions and a news date. The row heuristic identified ordinary research/publication/experience lists as card rows. The near-neutral secondary field is `#f5f4f1`, not a saturated cream theme. Typography findings and the mobile particle-hint collision were passed to an independent finish reviewer for material judgment; the review outcome is recorded below after correction.

## Independent finish review

The fresh-context reviewer requested three changes: reserve layout space between the particle action and its instruction, increase sustained research prose to 15px on desktop and phone, and remove the four redundant method labels. All were implemented together. The same desktop/mobile evidence was recaptured and the reviewer scored all three **resolved**, with disposition **ship** at the scope of those fixes. No regression from that batch was observed. Additional 320/390px English/Chinese measurements show a 10px action-to-instruction gap; neither line obscures the other.

The final source preserves 12px dates/credits/compact metadata, while substantial home and detail reading text is 15px. This takes the reviewer's contextual reading-comfort judgment over the generic Taste 16px house floor. Research and paper titles keep their exact wording; their phone line counts are a factual-title exception, not headline copy to shorten.

## Deployment

Existing Pages configuration confirmed: legacy build, `main` branch, repository root. No deployment configuration change is needed. Final release verification checks the deployed commit, main and detail documents, theme/language behavior, and served PDF/media/font hashes.
