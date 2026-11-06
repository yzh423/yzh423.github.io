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
  line: "#deded7"
  dark-paper: "#161715"
  dark-surface: "#20211e"
  dark-surface-deep: "#30312b"
  dark-ink: "#f1f0eb"
  dark-muted: "#b8b8ac"
  dark-accent: "#f5a373"
  dark-line: "#3b3d35"
  flight-paper: "#ebe8e1"
  dark-flight-paper: "#222520"
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
    fontSize: "clamp(16px, 1.65vw, 22px)"
    fontWeight: 580
    lineHeight: 1.18
rounded:
  focus: "3px"
  compact: "5px"
  media: "8px"
  banner-mobile: "12px"
  banner: "17px"
  note: "7px"
  pill: "999px"
  circle: "50%"
spacing:
  small-gap: "8px"
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
  flight-banner:
    backgroundColor: "{colors.flight-paper}"
    rounded: "{rounded.banner}"
    height: "clamp(290px, 33vw, 474px)"
  research-node:
    textColor: "{colors.ink}"
    typography: "{typography.graph-branch}"
    padding: "0"
  research-node-selected:
    textColor: "{colors.accent}"
  research-note:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.note}"
    padding: "14px 17px"
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

A real portrait and a two-line name introduce the researcher. Beneath them, an ink drawing of a robot arm moves behind the same name drawn in particles. Newsreader headings and a muted orange accent carry into the research network, and captions and plain links accompany the evidence.

The homepage and the manipulation study share neutral paper, thin section rules and Inter reading text in English and Chinese. On the homepage, the robot arm film and diagram respond to the pointer. Scientific recordings belong with the projects they document. [Product context](PRODUCT.md) · [Homepage brief](docs/reference-redesign.md)

**Key Characteristics:**

- Scholarly serif headings and sustained, bilingual sans-serif prose.
- Flat reading surfaces, thin separators, and restrained orange emphasis.
- One gripper-and-particle banner and a research network with visible connections on phones and desktops.
- Native controls, visible keyboard focus, and usable static fallbacks.
- Research evidence retains its captions, scope, source links, and downloads.

## Colors

One warm accent organizes a predominantly neutral reading environment. Frontmatter values are normative; dark-prefixed tokens are the explicit replacements activated by the dark theme.

### Primary

- **Research orange — accent:** Links, current navigation, graph selection, categories, selected metrics, and the brand punctuation.
- **Dark-theme orange:** A lighter orange marks the same links, active edges and selected topics on charcoal.

### Neutral

- **Paper:** The page, sticky navigation, and secondary actions. In dark mode this becomes neutral charcoal.
- **Surface / surface-deep:** Statistics, contact, and hovered controls.
- **Flight paper:** White in light mode and charcoal in dark mode. Colour appears in the travelling particles. The graph note uses ordinary page paper with a fine border.
- **Ink / muted:** Primary reading text and subordinate prose, metadata, dates, and captions.
- **Line:** Thin section boundaries, research rows, publication rows, methods, and timeline rules.
- **Video ground:** The dark player bed. Scientific chart images keep their white image ground in both themes.

**The Reference Continuity Rule.** Use Inter body text and thin section rules throughout the academic pages.

## Typography

**Display font:** Newsreader, with Songti SC, Noto Serif CJK SC, Georgia, and serif fallbacks.
**Body font:** Inter, with PingFang SC, Microsoft YaHei, and sans-serif fallbacks.

Newsreader regular and italic and Inter variable are self-hosted WOFF2 assets under `assets/fonts/`, with their OFL license files retained. Font display uses swap. Chinese uses the same semantic roles and the available CJK fallbacks.

The frontmatter display, headline, and title roles describe the shared base hierarchy. The hero's surname line is unbroken, with Daniel in italic as a separate block below it. The secondary name is 0.56em on desktop and 0.64em at phone widths. Scholarly project and publication titles may wrap naturally; they are not truncated or forced into the identity's no-wrap behavior.

Sustained prose is the body role at 15px in both documents and across breakpoints: hero introduction, About, research descriptions, project descriptions and expanded scope, publication summaries, experience descriptions, news, education, contact availability, detail lede, comparison text and qualifications, method paragraphs, and scope. The closing stylesheet rules override earlier 13px/14px values. The body-open role applies to the hero introduction and project prose. The 16px body-base is the inherited desktop default, not the final size of those sustained reading passages.

Metadata and captions remain compact: dates, statuses, categories, resource links, and metric labels generally use 12px; navigation and buttons use 13px. The graph note uses a 17px serif topic title and 13px sans-serif explanation at every width. Supporting section introductions can remain 14px or 13px. These utility roles do not redefine the sustained prose role.

Reading widths are deliberate: About paragraphs reach 68ch; the hero introduction reaches 56ch; project titles reach 35ch; detail lede reaches 75ch. The detail heading is smaller than the identity display so a full scientific title can remain intact.

**The Reading Size Rule.** Keep sustained prose at 15px on phones and desktops.

## Layout

The shared content maximum is 1120px. Page gutters are 32px above 850px, 24px at or below 850px, and 22px at or below 600px. The sticky top navigation has a 76px minimum row height, reducing to 68px at the tablet breakpoint. Anchor offsets add 24px to the header height. Ordinary sections use 88px vertical padding, then 64px and 56px at the tablet and phone breakpoints; hero and contact spacing have their own observed rules.

Desktop composition uses open columns: About is 1.7:1; research rows use a 76px illustrated margin beside a title and description; featured projects are 0.9:1.1; publications pair a 260px image with flexible text. Project spacing is 48px, reducing to 32px at 1100px. Publication media narrows to 200px at 850px. At 600px, About, projects, publications, education/skills, and contact stack in reading order; news dates move above the entry and timeline articles become blocks.

The cover brings the portrait, signature, contact links and research introduction onto the same paper as the mechanical engraving. The artwork fits the available desktop viewport. On narrow screens the research link sits at the bottom centre.

The research network uses a wide arrangement between 320px and 416px tall. At 620px and below it switches to a 432px-tall arrangement with wrapped labels around the same central hub. Its connecting lines and cross-links stay visible in both arrangements. A compact note opens beside the active topic.

The detail page keeps the introduction within 900px and the main recording within 820px. Its conclusion and scope columns stack at 850px. Method and evidence grids move from two columns to one at 600px. The statistic band retains three columns. The detail title becomes 38px at 850px and 31px at 600px. The main identity becomes a 32–46px fluid size at 600px, then 30px at 360px; the portrait steps from 104px to 88px, 74px, and 64px at the corresponding widths.

## Elevation & Depth

The sticky navigation and graph note use opaque page paper and thin borders. The banner layers lettering over a six-second graphite engraving with copper contact marks and a fine outline left at the original seat. Research rows sit directly on the page, and scientific charts retain their white grounds in both themes.

**The Flat Reading Rule.** Preserve the flat surfaces and structural rules used by the shipped pages.

## Shapes

Circular utility controls echo the portrait. Main actions use pill corners. Media use 8px corners, scientific image frames 5px and graph notes 7px. The banner uses 17px corners on wide screens and 12px at 620px and below. Research labels have a small paper backing behind the letters so connecting lines remain distinct. A 2px accent outline offset by 5px marks keyboard focus.

## Components

### Buttons and resource links

Main actions are native links with a 44px minimum height, 10px by 20px padding, and 14px internal gap. Primary actions use ink over paper and change to accent on hover. Secondary actions use paper and change to the deeper surface on hover. Pressing scales the action to 0.98; an inline arrow shifts 3px on hover. Resource links retain ordinary link semantics and accent color. Existing PDF destinations, downloads, section anchors, and full-recording links remain stable.

Utility buttons are 40px square; phone widths reduce their width to 38px while retaining 40px height. Hover adds surface tone, and pressing scales to 0.95. The shared focus outline remains visible.

### Navigation and preferences

The homepage top bar offers About, Research, Work, Publications, News, Experience, Education and Contact, in that order. The wordmark links to Home, and the language and theme controls sit at the far end. The study page uses its own section links. Active section links use `aria-current="location"` and a short orange underline; a thin reading-progress line follows scroll position. At 850px the navigation becomes a menu below the main row, with a two-column open state and overflow constrained to the available viewport height. Escape closes the menu and returns focus to its toggle; outside pointer or focus movement dismisses it. Natural tab order is preserved.

Both pages switch between English and Chinese, including document language, titles, and supported accessible labels. Direct visits and homepage reloads open in English on light paper. Internal navigation carries the reader’s manual language and theme choices through the visit. The entry script sets the appearance before paint. Theme changes crossfade the paper, ink and film. Switching language gently fades the old text while preserving the paragraph being read. Keyboard chapter navigation focuses its destination immediately.

### Identity and motion banner

The semantic heading keeps “Zhenghao YU” and “Daniel” on separate lines beside a real portrait. Canvas lettering is decorative and hidden from assistive technology; the semantic identity always remains available. The fallback name stays visible until the particle canvas is ready.

The six-second pickup starts when the banner comes into view. At 1.93 seconds the gripper closes. A field of microtype expands from the contact point, leaving the moving arm in relief. The screen resolves into halftone as engraved marks from the jaws and bushing form the name. Colour returns under the pointer and fades as the grains settle. Replay repeats the sequence. Each homepage section occupies a separate viewport. A fresh wheel gesture or swipe at the reading edge turns one chapter. The next sheet rises along a curved edge engraved with green and copper contours. The lines spread over the moving join and settle as the new sheet comes to rest. All chapters share this motion, which retraces the same edge when the reader reverses direction. Wheel input can accelerate or reverse a turn. A separate three-image campus gallery follows horizontal gestures. Reduced motion shows the finished name and turns chapters immediately.

The persistent pause control stops the film, assembles the letters and stills the network. Reduced motion shows the settled composition and labels the disabled control. Data saver suppresses automatic film playback. The poster supplies the arm before playback or if the film is unavailable. Hidden documents pause playback and rendering.

### Research map and note

The central label connects to four research branches, each with two leaves. Twelve solid SVG lines show these relationships and three faint dashed lines cross between branches. Each topic is a native link at least 44px high. Hover or keyboard focus previews the topic. A click, tap or Enter opens the destination directly. Arrow keys and Tab move between topics.

On narrow screens each research row keeps its index and sketch beside the stacked text. In the map, four spokes meet at a single SVG junction directly behind the transparent central label. Branch hubs, lettering and all incident edges share one sampled position per frame. The labels drift and respond to the pointer while the link hit areas stay fixed. Previewing underlines the label, and the path from the active topic to the central label turns orange. The note names the topic, explains its connection and opens the same work when clicked anywhere. It opens just below the link when space permits, otherwise above, and stays inside the field horizontally. Escape and outside presses dismiss it. The connected geometry remains available when motion is paused.

### Research rows, projects, and publications

Thin rules separate the reading rows. Hover or keyboard focus extends a slim orange mark beside the index, reveals the topic’s original ink sketch, and accents its linked title. A single tap anywhere in the row opens its project or paper. Project and publication titles and lead images link directly to the resource. The path-tracking simulation and the Fold Box trajectory replay each sit in a closed native disclosure under their project image. Opening a disclosure reveals a captioned player with native controls. The reader starts playback explicitly, and closing the disclosure pauses it. Study scope and dataset descriptions have separate disclosures. Publication titles, status, author metadata and resource links wrap in reading order.

### Methods and evidence

The detail method grid starts each article with its descriptive heading and paragraph. Redundant method labels are absent. The study page presents its main given-path recording directly and puts the matched endpoint-only recording in a disclosure. Both use manual playback. Evidence figures retain numbered captions and open their original image through native links. The earlier 112-task validation remains separate from the later five-case, four-controller, three-profile numerical diagnostic; visual grouping and captions preserve that distinction.

### Static and reduced-motion reading

The HTML is readable by default. With motion enabled, observed reading units fade in once, moving up 16px over 760ms. Simultaneous arrivals stagger by at most 135ms. Keyboard interaction, pause, and reduced-motion preference suppress enhanced entrances. With JavaScript disabled, English content, ordinary anchor navigation, research rows, native disclosures, PDF links, and manual video controls remain usable. The graph becomes a static grid of topic links and unavailable utility controls are hidden; the mobile header becomes static and navigation remains exposed.

## Do's and Don'ts

### Do:

- **Do** retain the user-pinned thin separators, Inter body text, and Newsreader headings.
- **Do** preserve the two-line name, real portrait, and full wrapping scholarly titles.
- **Do** use the final 15px sustained prose size in both languages and at every breakpoint.
- **Do** keep the robot arm and particle lettering together and the research recordings inside their homepage project disclosures.
- **Do** keep connected edges and a reachable near-topic note on narrow screens.
- **Do** preserve native buttons, links, video controls, visible focus, and static reading fallbacks.
- **Do** retain evidence captions, simulation qualifications, original PDF URLs, and the distinction between validation protocols.

### Don't:

- **Don't** reintroduce superseded 13px/14px sustained-prose defaults from earlier CSS rules.
- **Don't** add redundant method labels above the existing descriptive headings.
- **Don't** hide scholarly content until an animation completes or require motion to navigate.
- **Don't** represent recorded simulation as physical-robot execution.
