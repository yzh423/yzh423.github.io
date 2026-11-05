---
name: Zhenghao YU Academic Homepage
description: A bilingual academic homepage connecting robotics work, recorded evidence, and research context.
colors:
  paper: "#ffffff"
  surface: "#f5f4f1"
  surface-deep: "#eae7e1"
  ink: "#242420"
  muted: "#62625b"
  accent: "#b94513"
  accent-soft: "#faeee7"
  line: "#deded7"
  dark-paper: "#161715"
  dark-surface: "#20211e"
  dark-surface-deep: "#30312b"
  dark-ink: "#f1f0eb"
  dark-muted: "#b8b8ac"
  dark-accent: "#f5a373"
  dark-accent-soft: "#33291f"
  dark-line: "#3b3d35"
  video-ground: "#242d32"
typography:
  display:
    fontFamily: 'Newsreader, "Songti SC", "Noto Serif CJK SC", Georgia, serif'
    fontSize: "clamp(44px, 5vw, 66px)"
    fontWeight: 500
    lineHeight: 1.13
    letterSpacing: "-0.012em"
  headline:
    fontFamily: 'Newsreader, "Songti SC", "Noto Serif CJK SC", Georgia, serif'
    fontSize: "clamp(34px, 3.5vw, 44px)"
    fontWeight: 500
    lineHeight: 1.16
    letterSpacing: "-0.015em"
  title:
    fontFamily: 'Newsreader, "Songti SC", "Noto Serif CJK SC", Georgia, serif'
    fontSize: "27px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  detail-display:
    fontFamily: 'Newsreader, "Songti SC", "Noto Serif CJK SC", Georgia, serif'
    fontSize: "clamp(32px, 3.7vw, 46px)"
    fontWeight: 500
    lineHeight: 1.16
    letterSpacing: "-0.012em"
  body:
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.75
  body-open:
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.8
  body-base:
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.75
  caption:
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.65
  button:
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.75
  graph-branch:
    fontFamily: 'Newsreader, "Songti SC", "Noto Serif CJK SC", Georgia, serif'
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  focus: "3px"
  compact: "5px"
  media: "8px"
  banner-mobile: "12px"
  banner: "18px"
  pill: "999px"
  circle: "50%"
spacing:
  small-gap: "8px"
  particle-row-gap: "10px"
  caption-gap: "12px"
  paragraph-gap: "18px"
  row-padding: "20px"
  gutter-mobile: "22px"
  gutter-tablet: "24px"
  gutter: "32px"
  project-gap: "48px"
  section-mobile: "56px"
  section-tablet: "64px"
  section: "88px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-deep}"
    textColor: "{colors.ink}"
  utility-button:
    textColor: "{colors.ink}"
    rounded: "{rounded.circle}"
    height: "40px"
    width: "40px"
  navigation:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
  research-node:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.graph-branch}"
    rounded: "{rounded.compact}"
    padding: "6px 10px"
  research-node-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  research-note:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.media}"
    padding: "20px 24px"
  research-row:
    textColor: "{colors.muted}"
    typography: "{typography.body}"
    padding: "28px 0"
  method:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "22px 0 0"
---

# Design System: Zhenghao YU Academic Homepage

## Overview

**Creative North Star: "The connected academic homepage"**

A restrained, personal academic setting makes research, recorded experiments, and their context easy to inspect. The light world pairs white ground, charcoal text, and a warm orange accent; the dark world uses neutral charcoal surfaces with a lighter orange accent. Newsreader brings a scholarly voice to headings while Inter keeps prose and controls direct.

This records the approved, code-led implementation of the user-pinned [Zhouhu Tan reference](https://tanzhouhu.github.io/#research), as scoped in [PRODUCT.md](PRODUCT.md) and [the surface brief](docs/reference-redesign.md). Thin separators and Inter are explicit reference commitments. A real portrait, a two-line identity, bounded particle lettering, and recorded simulation give the homepage its personal character; the detail page shares the same reading system. The source of truth is the final cascade in both stylesheets, including their closing readability and particle-layout rules.

**Key Characteristics:**

- Scholarly serif headings and sustained, bilingual sans-serif prose.
- Flat reading surfaces, thin separators, and restrained orange emphasis.
- A real portrait, two-line name, particle lettering, and labeled simulation preview.
- Native controls, visible keyboard focus, and usable static fallbacks.
- Research evidence retains its captions, scope, source links, and downloads.

## Colors

One warm accent organizes a predominantly neutral reading environment. Frontmatter values are normative; dark-prefixed tokens are the explicit replacements activated by the dark theme.

### Primary

- **Research orange — accent:** Links, current navigation, graph selection, categories, selected metrics, and the brand punctuation.
- **Soft orange — accent-soft:** The background of hovered, focused, or selected research nodes.
- **Dark-theme orange:** A lighter accent and subdued accent surface preserve the same roles on dark ground.

### Neutral

- **Paper:** The page, sticky navigation, and secondary actions. In dark mode this becomes neutral charcoal.
- **Surface / surface-deep:** The motion banner, graph note, statistics band, contact area, and hover surfaces.
- **Ink / muted:** Primary reading text and subordinate prose, metadata, dates, and captions.
- **Line:** Thin section boundaries, research rows, publication rows, methods, and timeline rules.
- **Video ground:** The dark player bed. Scientific chart images keep their white image ground in both themes.

**The Reference Continuity Rule.** Keep the user-pinned thin separators and Inter body type; they are part of this approved visual world.

## Typography

**Display font:** Newsreader, with Songti SC, Noto Serif CJK SC, Georgia, and serif fallbacks.
**Body font:** Inter, with PingFang SC, Microsoft YaHei, and sans-serif fallbacks.

Newsreader regular and italic and Inter variable are self-hosted WOFF2 assets under `assets/fonts/`, with their OFL license files retained. Font display uses swap. Chinese uses the same semantic roles and the available CJK fallbacks.

The frontmatter display, headline, and title roles describe the shared base hierarchy. The hero's surname line is unbroken, with Daniel as a separate block below it. The secondary name is 0.56em on desktop and 0.64em at phone widths. Scholarly project and publication titles may wrap naturally; they are not truncated or forced into the identity's no-wrap behavior.

Sustained prose is the body role at 15px in both documents and across breakpoints: hero introduction, About, research descriptions, project descriptions and expanded scope, publication summaries, experience descriptions, news, education, contact availability, detail lede, comparison text and qualifications, method paragraphs, and scope. The closing stylesheet rules override earlier 13px/14px values. The body-open role applies to the hero introduction and project prose. The 16px body-base is the inherited desktop default, not the final size of those sustained reading passages.

Metadata and captions remain compact: dates, statuses, categories, resource links, and metric labels generally use 12px; navigation and buttons use 13px. Graph-note text is a short 13px preview, becoming 12px on phones. Supporting section introductions can remain 14px or 13px. These utility roles do not redefine the sustained prose role.

Reading widths are deliberate: About paragraphs reach 68ch; the hero introduction reaches 680px; project titles reach 35ch; detail lede reaches 75ch. The detail heading is smaller than the identity display so a full scientific title can remain intact.

**The Reading Size Rule.** Keep sustained prose at the final 15px size on phones and desktops; do not recover superseded smaller declarations as design tokens.

## Layout

The shared content maximum is 1120px. Page gutters are 32px above 850px, 24px at or below 850px, and 22px at or below 600px. The sticky top navigation has a 76px minimum row height, reducing to 68px at the tablet breakpoint. Anchor offsets add 24px to the header height. Ordinary sections use 88px vertical padding, then 64px and 56px at the tablet and phone breakpoints; hero and contact spacing have their own observed rules.

Desktop composition uses open columns: About is 1.7:1; research rows are 0.85:1; featured projects are 0.9:1.1; publications pair a 260px image with flexible text. Project spacing is 48px, reducing to 32px at 1100px. Publication media narrows to 200px at 850px. At 600px, About, research rows, projects, publications, education/skills, and contact stack in reading order; news dates move above the entry and timeline articles become blocks.

The motion banner uses a 1.15:1 grid, becoming one column at 600px. Its particle region reserves 154px for lettering, or 120px at and below 850px. The CTA and hint follow in normal column flow with a 10px gap; the hint is not absolutely positioned. The banner has its own lower space for the pause control.

The research network is 420px tall, reducing to 360px at 850px. At 600px it becomes a two-column topic-button layout, hides connecting lines, permits wrapped labels, and removes label drift. Its explanatory note follows the topics.

The detail page keeps the introduction within 900px and the main recording within 820px. Its conclusion and scope columns stack at 850px. Method and evidence grids move from two columns to one at 600px. The statistic band retains three columns. The detail title becomes 38px at 850px and 31px at 600px. The main identity becomes a 32–46px fluid size at 600px, then 30px at 360px; the portrait steps from 104px to 88px, 74px, and 64px at the corresponding widths.

## Elevation & Depth

The interface has no box-shadow vocabulary. Depth comes from neutral surface changes, thin rules, imagery, and a sticky navigation layer. The motion banner and graph note sit on a surface tone; content rows remain on the page ground. Charts keep their original white grounds so the scientific images remain legible. Hover feedback changes tone or text color, with small movement limited to interactive details.

**The Flat Reading Rule.** Preserve the flat surfaces and structural rules used by the shipped pages.

## Shapes

The real portrait is circular. Utility controls use circular bounds. Main actions use pill corners, while media and graph notes use a modest 8px radius. The motion banner has broader 18px corners that reduce to 12px on phones. Graph nodes and scientific image frames use 5px corners. Sections, research rows, and methods use straight separators, with no enclosing card border. Global focus is a 2px accent outline offset by 5px, with a 3px radius.

## Components

### Buttons and resource links

Main actions are native links with a 44px minimum height, 10px by 20px padding, and 14px internal gap. Primary actions use ink over paper and change to accent on hover. Secondary actions use paper and change to the deeper surface on hover. Pressing scales the action to 0.98; an inline arrow shifts 3px on hover. Resource links retain ordinary link semantics and accent color. Existing PDF destinations, downloads, section anchors, and full-recording links remain stable.

Utility buttons are 40px square; phone widths reduce their width to 38px while retaining 40px height. Hover adds surface tone, and pressing scales to 0.95. The shared focus outline remains visible.

### Navigation and preferences

The top bar contains the serif wordmark, section links, and language/theme controls. Active section links use `aria-current="location"` and a short orange underline; a thin reading-progress line follows scroll position. At 850px the navigation becomes a menu below the main row, with a two-column open state and overflow constrained to the available viewport height. Escape closes the menu and returns focus to its toggle; outside pointer or focus movement dismisses it. Natural tab order is preserved.

Both pages switch between English and Chinese, including document language, titles, and supported accessible labels. The chosen language persists across pages. Theme is set before paint, follows the OS until explicitly changed, and then persists. Theme switching suppresses transitional color flashes. Pointer anchor navigation may scroll smoothly; keyboard navigation moves immediately and focuses the destination.

### Identity and motion banner

The semantic heading keeps “Zhenghao YU” and “Daniel” on separate lines beside a real portrait. Canvas lettering is decorative and hidden from assistive technology; the semantic identity always remains available. The fallback name stays visible until the particle canvas is ready.

Particle assembly is bounded and settles, with mouse-pointer reaction only when motion is enabled. Rendering stops offscreen and when the document is hidden. The preview uses the existing Fold Box MuJoCo recording, native controls, a poster, and a visible simulation qualification. Only this muted preview may start automatically: it must be at least 35% visible, motion must be enabled, data saver must be off, and the user must not have manually paused it. Full evidence videos always require explicit play.

The persistent pause control stops continuous decorative motion, cancels active entrance animations, and pauses the preview. Reduced-motion preference gives an immediately assembled particle name, removes transitions and drift, and disables the motion toggle with an explanatory label. Data saver prevents automatic preview playback. Hidden documents pause videos. Full recordings retain native manual playback.

### Research map and note

Topics are native buttons with at least 44px height, `aria-controls`, and `aria-pressed`. Hover or focus previews a topic; click or tap toggles a persistent selection. The note is a polite live status region with a normal destination link. Arrow keys move between topic buttons, and Escape clears selection. The map allows normal vertical touch scrolling.

Only the text inside each button drifts, preserving stationary hit targets. The drift runs over eight seconds between minus and plus 3px and pauses for hover, focus, selection, global pause, offscreen state, hidden documents, reduced motion, and the phone layout. Selected edges and labels use the accent; selected labels also gain the soft accent surface.

### Research rows, projects, and publications

These are reading rows separated by thin rules. Project media remains beside its title, category, prose, metrics, optional native disclosure, and source links until the phone layout stacks them. Publication titles lead their status and author metadata. Long scholarly titles keep their full wording and may wrap. Real scientific images and recordings carry their captions; evidence scope is not removed to simplify a row.

### Methods and evidence

The detail method grid starts each article with its descriptive heading and paragraph. Redundant method labels are absent. Evidence figures retain numbered captions and open their original image through native links. The earlier 112-task validation remains separate from the later five-case, four-controller, three-profile numerical diagnostic; visual grouping and captions preserve that distinction.

### Static and reduced-motion reading

Content starts visible. Once-only scroll entrances use a short opacity/12px movement and never determine whether text can be read. Keyboard interaction, pause, and reduced-motion preference suppress enhanced entrances. With JavaScript disabled, English content, ordinary anchor navigation, research rows, native disclosures, PDF links, and manual video controls remain usable. The interactive graph/note and unavailable utility controls are hidden; the mobile header becomes static and navigation remains exposed.

## Do's and Don'ts

### Do:

- **Do** retain the user-pinned thin separators, Inter body text, and Newsreader headings.
- **Do** preserve the two-line name, real portrait, and full wrapping scholarly titles.
- **Do** use the final 15px sustained prose size in both languages and at every breakpoint.
- **Do** keep the particle CTA and hint in separate normal-flow rows with a 10px gap.
- **Do** preserve native buttons, links, video controls, visible focus, and static reading fallbacks.
- **Do** retain evidence captions, simulation qualifications, original PDF URLs, and the distinction between validation protocols.

### Don't:

- **Don't** reintroduce superseded 13px/14px sustained-prose defaults from earlier CSS rules.
- **Don't** add redundant method labels above the existing descriptive headings.
- **Don't** hide scholarly content until an animation completes or require motion to navigate.
- **Don't** represent recorded simulation as physical-robot execution.
