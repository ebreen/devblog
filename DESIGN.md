---
name: Eirik Breen
description: A working operator's site, set late at night in Oslo.
colors:
  ink: "#090909"
  surface: "#111111"
  paper: "#efece3"
  paper-dim: "#cbc6bb"
  stone: "#98938a"
  ash: "#7d7971"
  rule: "#292929"
  brass: "#d6b45f"
  ultramarine: "#072da7"
  fjord-glass: "#8ea6d6"
  status-live: "#7ad18a"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', Times, serif"
    fontSize: "clamp(2.6rem, 6.4vw, 4.1rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Georgia, 'Times New Roman', Times, serif"
    fontSize: "clamp(1.45rem, 3.4vw, 1.8rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Georgia, 'Times New Roman', Times, serif"
    fontSize: "1.35rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "'Avenir Next', Avenir, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 400
    lineHeight: 1.75
  voice:
    fontFamily: "SFMono-Regular, Consolas, 'Liberation Mono', monospace"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "SFMono-Regular, Consolas, 'Liberation Mono', monospace"
    fontSize: "0.68rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.05em"
rounded:
  hairline: "0.2rem"
  panel: "0.25rem"
  shot: "0.35rem"
spacing:
  tight: "0.45rem"
  group: "1.1rem"
  block: "1.75rem"
  section: "clamp(2.75rem, 6vw, 3.5rem)"
  head: "clamp(3.5rem, 9vw, 5.5rem)"
  page: "42rem"
  page-wide: "62rem"
components:
  button-primary:
    backgroundColor: "rgba(214, 180, 95, 0.1)"
    textColor: "{colors.brass}"
    rounded: "{rounded.hairline}"
    padding: "0.5rem 1.15rem"
    height: "2.9rem"
  button-primary-hover:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.ink}"
  link-text:
    textColor: "{colors.brass}"
  link-heading:
    textColor: "{colors.paper}"
  nav-link:
    textColor: "{colors.paper-dim}"
    typography: "{typography.title}"
  nav-link-active:
    textColor: "{colors.brass}"
  keycap:
    backgroundColor: "rgba(9, 9, 9, 0.6)"
    textColor: "{colors.paper}"
    rounded: "{rounded.hairline}"
    padding: "0.08em 0.38em"
  glass-panel:
    backgroundColor: "rgba(10, 10, 11, 0.74)"
    textColor: "{colors.paper-dim}"
    rounded: "{rounded.panel}"
    padding: "clamp(1.4rem, 2.4vw, 2rem)"
  status-soon:
    textColor: "{colors.brass}"
    typography: "{typography.label}"
---

# Design System: Eirik Breen

## Overview

**Creative North Star: "The Night Desk"**

The site reads like a desk lamp left on after the last ticket closed: a near-black field, one warm brass light, paper-white serif headlines, and the small monospace handwriting of someone who keeps notes. It is a working operator's site, not a template portfolio. Every page is quiet and typographic; the two places that get colour are the home page (a painted mountain under an ultramarine sky) and the room (a lamp-lit flat above a snowing Bjørvika). Both are scenes, and the interface sits on top of them in the same near-black glass.

Density is low and the rhythm is editorial: one column, hairline rules between entries, generous space above headings. Personality comes from voice and detail (lowercase mono asides, dry jokes, keycaps) rather than decoration. The room is the one surface allowed to be lavish, and it earns that by doubling as real navigation.

**Key Characteristics:**
- Near-black ground, a single brass accent, warm paper text.
- Georgia for every heading; Avenir for prose; mono for labels, data, keys, and the lowercase voice.
- Hairline rules and underlines instead of boxes and fills.
- Title first, then a meta line: no labels above headings.
- Scenes (mountain, room) carry colour; chrome stays near-black glass.

## Colors

One warm light in a dark room: neutrals do the work, brass marks what you can act on.

### Primary
- **Desk-Lamp Brass** (brass): links, the primary action, the active nav item, "coming soon" status, keycaps you should press, plan stations. Used sparingly enough that it always means "this".

### Secondary
- **Bjørvika Ultramarine** (ultramarine): the home page sky and theme colour; echoed by the room's wool rug. Scene colour only, never interface.
- **Fjord Glass** (fjord-glass): the window wall and "fjorden" orientation on the room's floor plan.

### Neutral
- **Ink** (ink): page ground everywhere except the scenes.
- **Desk Surface** (surface): inline code and quiet fills.
- **Paper** (paper): headings, heading links, primary text on glass.
- **Dim Paper** (paper-dim): body copy and nav links.
- **Stone** (stone): meta lines, captions, secondary notes (6.5:1 on ink).
- **Ash** (ash): tech lists, tag text, the faintest readable meta (4.6:1 on ink; never smaller than 0.62rem).
- **Hairline** (rule): every divider, list rule, and header/footer border.
- **Live Green** (status-live): the dot for live projects and healthy services, nothing else.

### Named Rules
**The One Lamp Rule.** Brass is the only interface accent. If something brass cannot be clicked, pressed, or is not a status you should notice, it should not be brass.

**The Scene Owns Colour Rule.** Saturated colour (ultramarine, the rug, neon, city light) lives inside scenes. Chrome laid over a scene stays ink glass with hairlines.

## Typography

**Display Font:** Georgia (with Times New Roman)
**Body Font:** Avenir Next (with Avenir, Segoe UI, Helvetica)
**Label/Mono Font:** SFMono-Regular (with Consolas, Liberation Mono)

**Character:** A bookish serif for anything that names a thing, a clean humanist sans for reading, and monospace as the voice of notes, timestamps, and keys. The mono is lowercase and slightly tracked.

### Hierarchy
- **Display** (400, clamp 2.6–4.1rem, line-height 1, -0.04em): page titles. The home and room titles run larger (to 4.4rem) because they sit on scenes.
- **Headline** (400, clamp 1.45–1.8rem, 1.2): section titles, project names, post titles in lists (up to 2.05rem).
- **Title** (400, 1.35rem): listing entries, placard titles, nav links (0.98rem).
- **Body** (400, 0.98rem, 1.75): prose, capped near 36–40rem measure.
- **Voice** (mono 0.8rem, 1.7): the lowercase asides on the home page, the room, and placard lines.
- **Label** (mono 0.64–0.7rem, 0.05em, lowercase): meta lines, dates, tags, statuses, keycaps.

### Named Rules
**The Title-Then-Meta Rule.** A heading speaks first; its context (dates, role, status, counts) follows on a mono meta line below it. Nothing sits above a heading.

**The Lowercase Voice Rule.** Mono text is lowercase. Proper nouns inside it stay lowercase too ("bjørvika", "baton") when it is the voice; data such as times and counts uses tabular numerals.

## Layout

Single centred column. Page content sits at 42rem (`page`); the site header and footer at 48rem. A featured block may break out to 62rem (`page-wide`) asymmetrically: its text stays on the page column and its image hangs into the right margin. Page heads get `head` spacing below them; sections get `section` spacing above; list entries are 1.1–1.9rem tall bands separated by hairlines. Under 48rem breakouts collapse to the column and images move above their text.

Scenes are full bleed. The home page pins its painting behind a narrow 34rem column. The room is a 100svh stage with the site header floating over it, overlays inset by a `clamp(1rem, 3vw, 2.5rem)` gutter, and its plain-HTML listing below the fold back on the page column.

## Elevation & Depth

Pages are flat: depth comes from tonal steps (ink, surface) and hairlines, not shadows. Shadows appear only where something floats over a scene: glass panels (prospectus card, placards, plan) and the made-page screenshot. Those shadows are long, soft, and offset downward, never a hard block.

### Shadow Vocabulary
- **Scene float** (`box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45)`): glass panels over the room.
- **Screenshot lift** (`box-shadow: 0 24px 60px -18px rgba(0, 0, 0, 0.75), 0 2px 6px rgba(0, 0, 0, 0.4)`): product captures on the page.

### Named Rules
**The Flat Page Rule.** If it is not floating over a scene or a photograph, it has no shadow.

## Shapes

Mostly square. Radii are small and functional: 0.2rem for buttons and keycaps, 0.25rem for glass panels, 0.35rem for screenshots (to sit with macOS window corners). Circles appear only for status dots, plan stations, and the touch joystick. Borders are 1px hairlines at `rule` on pages and `rgba(239, 236, 227, 0.14)` on glass.

## Components

### Buttons
- **Shape:** gently squared (0.2rem).
- **Primary:** brass outline with a 10% brass wash, Georgia 1.15rem label, mono arrow; 2.9rem tall.
- **Hover / Focus:** fills solid brass with ink text, arrow nudges 0.2rem; focus is a 2px brass outline offset 4px.
- **Text buttons:** most actions are underlined links (brass, 1px underline at 0.28em offset), not buttons.

### Links
- **In prose and actions:** brass with a 45%-brass underline; hover turns paper.
- **Headings as links:** paper with an ash underline; hover turns brass.

### Navigation
- **Style:** Georgia 0.98rem, paper-dim, underlined, separated by ash slashes ("about / made / cv / wrote / room / email").
- **Active:** brass with a brass underline. Mobile wraps under the name.

### Keycaps
- Mono at 0.92em in a 1px translucent border with an inset bottom highlight; brass border and text when it is the key to press now. Used for controls, station numbers, and shortcuts. Hidden on touch.

### Glass Panel
- Ink at 74% with `backdrop-filter: blur(14px)`, 1px light hairline, 0.25rem radius, scene-float shadow. Only over scenes, never on plain pages.

### Status
- Mono label with a 0.4rem dot: brass (soon, with a soft ring), live green (live), stone (in progress), ash (other).

### Project Screenshot
- Real product captures only, framed by a 1px light hairline, 0.35rem radius, screenshot lift, with a mono caption below.
- **Provenance:** `public/made/baton-inbox.webp` is a real capture from Baton's repository (`docs/images/04-inbox-question.png`), cropped to 1040×1000 and encoded as WebP (quality 82). It is not generated. The room's laptop screen reuses the same file.

### The Room (signature)
A first-person three.js flat staged as an open-house viewing: prospectus card, floor plan with numbered stations (keys 1–0 travel), floating tags, placards with real links, and a plain-HTML listing under the fold that mirrors every placard. Controls: click to lock the pointer, mouse to look, WASD to walk, E to open, Esc to let go, M for sound.

## Do's and Don'ts

### Do:
- **Do** put context on a mono meta line under the heading (`page-title` then `page-meta`).
- **Do** keep brass for actions, keys, and "soon"; everything else is paper, stone, or ash.
- **Do** separate list entries with 1px hairlines and generous vertical padding instead of cards.
- **Do** keep scenes full bleed and lay chrome over them as ink glass with hairlines.
- **Do** mirror anything reachable only in 3D as plain HTML on the same page.

### Don't:
- **Don't** put labels or eyebrows above headings.
- **Don't** use section numbers unless they map to something the reader uses (the room's station keys do).
- **Don't** add shadows or fills to plain page content.
- **Don't** introduce a second accent colour in interface chrome.
- **Don't** ship generated imagery as product screenshots; captures must be real and carry provenance.
