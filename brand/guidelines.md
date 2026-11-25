# BytesNation brand guidelines

Version 2.0.0. Matches bytesnation.com as deployed on 2026-11-25.

The site is the brand. These guidelines describe what is live, in enough detail to apply it somewhere else. Every value in a table here also exists in a generated file under `tokens/`. If the two ever disagree, the generated file is right, because it is read from the site's code.

To see everything on this page rendered, open [`brand-book.html`](brand-book.html).

1. [What BytesNation is](#1-what-bytesnation-is)
2. [Names](#2-names)
3. [Logo](#3-logo)
4. [Color](#4-color)
5. [Typography](#5-typography)
6. [Layout and shape](#6-layout-and-shape)
7. [Components](#7-components)
8. [Motion](#8-motion)
9. [Imagery](#9-imagery)
10. [Voice](#10-voice)
11. [Accessibility](#11-accessibility)
12. [Never](#12-never)
13. [Component sourcing](#13-component-sourcing)
14. [Done checklist](#14-done-checklist)
15. [Known gaps](#15-known-gaps)
16. [What this kit decided](#16-what-this-kit-decided)

## 1. What BytesNation is

BytesNation is a one-person tech lab that publishes what it builds: field notes, an IT dictionary, lessons, and the lab's products.

In the site's own words:

| | |
|---|---|
| Tagline | A one-person tech lab where hardware meets software meets infrastructure. |
| Description | BytesNation.com publishes field notes, an IT dictionary, and lessons on hardware, software, and infrastructure for everyone from newcomers to senior engineers. |
| Headline | Hardware. Software. Infrastructure. One operator. |

Everything visual follows from one idea: **the site reads as a technical publication, not a product landing page.**

| It is | It is not |
|---|---|
| A lab notebook: dated, specific, reproducible | A magazine of moods |
| Ruled like a ledger | Assembled from floating cards |
| Quiet, with one orange signal | Colorful |
| Complete with scripts off | A demo that needs JavaScript to show its text |

## 2. Names

| Name | Written | Notes |
|---|---|---|
| The brand | **BytesNation** | One word. Capital B and capital N. "Bytes" is plural. |
| The domain | bytesnation.com | Lowercase. |
| The builder | **MokeyBytes** | One word, capital M and capital B. The handle is @MokeyBytes on GitHub, YouTube and X. |
| The articles | Field Notes | Capitalized as the section. One article is a field note. |
| The dictionary | IT Dictionary | |
| The learning center | BNLC | Short for BytesNation Learning Center. Spell it out on first use. |
| Products | Capstan, Yipadoo and the rest | Each keeps its own name and its own mark. Capstan is "a BytesNation product". |

Not: Bytes Nation, ByteNation, Bytesnation, Mokey Bytes. Do not type the name in capitals. A mono label may uppercase it through styling, as the share cards do with the domain.

The website's repository is named `ByteNation-Web`, without the s. That is a repository name. The brand always has the s.

## 3. Logo

Three nodes on a spine, two links, one live node. The live node is the only color in the mark.

### Files

All in [`logo/`](logo). The SVG files are the masters.

| File | What it is | Use it |
|---|---|---|
| `lockup-on-dark.svg`, `.png` | Mark and wordmark, light ink | On the dark canvas and other dark grounds |
| `lockup-on-light.svg`, `.png` | Mark and wordmark, dark ink | On the light canvas and on paper |
| `mark-on-dark.svg`, `.png` | The mark alone, light ink | Where the name is already nearby |
| `mark-on-light.svg`, `.png` | The mark alone, dark ink | |
| `icon.svg`, `icon-512.png` | The small mark on a dark rounded tile | Favicons and app icons |
| `avatar.svg`, `avatar-1024.png` | The mark on a dark square | Social profile pictures |

The lockup PNGs are 1320 by 256 with transparent grounds. The mark PNGs are 1024 square. The site serves its own copies at `/brand/mark.svg`, `/brand/lockup-dark.png`, `/brand/lockup-light.png` and `/brand/avatar-youtube.png`.

### Construction

The mark is drawn on a 64-unit grid.

| Part | Position | Size |
|---|---|---|
| Top node | 16, 14 | Radius 6 |
| Middle node | 16, 32 | Radius 3.4 |
| Bottom node | 16, 50 | Radius 6 |
| Live node | 47, 32 | Radius 8, in the accent |
| Spine and two links | Node to node | Stroke 3.2, round caps |
| Stub | 16, 32 to 31, 32 | Stroke 3.2 at 55% opacity |

The **icon tile** carries a simpler mark on a 32-unit grid: two nodes, the spine and the live node. The middle node and its stub drop out so the shape reads at 16px. The tile has a corner radius of 7 units.

The **wordmark** is the name in Inter Tight, weight 500, tracked at -0.04em. In the site header, where it sits at 17px beside a 26px mark, it is weight 600 and tracked at -0.03em.

### Color

| Ground | Ink | Live node |
|---|---|---|
| Dark | `#EDEBE6` | `#FF6A13` |
| Light | `#15171A` | `#E8590C` |

The ink is the text color and the node is the accent, in whichever theme the logo sits on. The tile and the avatar are always dark, because dark is the default ground.

### Clear space and size

One unit is the diameter of the live node: a quarter of the mark's height. Keep one unit clear on every side. The gap between the mark and the wordmark is the same unit.

| | Minimum |
|---|---|
| Mark | 24px |
| Icon tile | 16px |
| Lockup | Mark 20px tall |

Below 24px, use the icon tile, not the full mark.

### Do not

- Add a glow, halo, shadow or gradient to any part.
- Recolor the live node, or color any other node.
- Set the wordmark in the accent, in two colors, or in another typeface.
- Stretch, rotate, outline or redraw the mark.
- Place it on a photograph or a busy ground.
- Put it inside a pill, a badge or a rounded card.
- Write the name as two words, or without the s.

## 4. Color

Dark is the default theme. Light is the same system on paper.

### Proportion

60% canvas, 30% surfaces and hairlines, 10% accent. In practice the accent is far less than 10% of any screen: one button, one marker, one dot.

### Core

Seven tokens carry the palette.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#F3F1ED` | `#0A0B0D` | Page canvas |
| `--surface` | `#F9F8F5` | `#101215` | Wells: code, readouts, figures |
| `--surface-elevated` | `#FFFFFF` | `#16181C` | Menus and tooltips |
| `--border` | `#DEDAD2` | `#22252B` | Hairlines |
| `--text` | `#15171A` | `#EDEBE6` | Headlines, body copy, the focus ring |
| `--text-muted` | `#565A61` | `#9EA3AB` | Secondary text and labels |
| `--accent` | `#E8590C` | `#FF6A13` | The fill: see below |

### Supporting

Derived from the seven. A mixed value is given as the color it resolves to.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--text-faint` | `#666A71` | `#80868F` | Tertiary text. Still AA on the canvas |
| `--prose` | `#343638` | `#CDCCC8` | Long-form body text: 86% text, 14% canvas |
| `--border-strong` | `#AAA7A2` | `#4F5154` | Link underlines, diagram lines and strong rules |
| `--control-border` | `#8A8885` | `#67686B` | The outline of a button or an input |
| `--surface-2` | `#EEEDEA` | `#1B1D1F` | Hover wash |
| `--surface-3` | `#E4E4E1` | `#242628` | Inline code and pressed wash |
| `--accent-hover` | `#EB702E` | `#FF7F34` | The primary button under the pointer |
| `--accent-ink` | `#1A0D04` | `#1A0D04` | Text on an accent fill |

### The accent rule

The accent is a **fill** for three things:

1. **The primary action.** One per section.
2. **The active marker.** The bar that shows where you are: nav, tabs, table of contents, filters, the current step.
3. **The live dot.** Something is running now.

It is never text, a border, an outline, a focus ring, a glow or a gradient. The live node in the mark is the same idea, drawn once.

### State

Color carries state and nothing else. Categories, difficulty, domains, tags and tiers are neutral.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--warning` | `#7A5800` | `#F5C842` | Warning callouts, and nothing else |
| `--ok` | `#116A3B` | `#5BE49B` | Success: a passed check, an added line |
| `--error` | `#B42318` | `#FF8D7A` | Failure and danger: a failed check, a removed line |

### Data

For values in code, lines in diagrams and series in charts. Never for interface chrome.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--ice` | `#0C6388` | `#7FD4FF` | Values in code, flow lines in diagrams, first chart series |
| `--diagram-flare` | `#A83D08` | `#FF7A3D` | The second line color in a diagram |
| `--accent-text` | `#A83D08` | `#FF9A63` | Second chart series. Not for interface text |

Chart series, in order: `--ice`, `--accent-text`, `--ok`, `--text-muted`, `--text-faint`.

### Code

Three inks and one data color. Names are `--text`. Structure (keywords, punctuation) is `--text-muted`. Comments are `--text-faint`. Values (strings, numbers, constants) are `--ice`. The block sits on `--surface`. Nothing in a code block is orange. Added and removed lines in a diff take `--ok` and `--error`, because those are states.

### Contrast

Measured from the palette each time the kit is built. Text aims for 4.5:1, a shape that carries meaning for 3:1.

| Pair | Light | Dark |
|---|---|---|
| Text on canvas | 15.92 | 16.53 |
| Long-form text on canvas | 10.76 | 12.25 |
| Muted text on canvas | 6.14 | 7.76 |
| Faint text on canvas | 4.82 | 5.37 |
| Ink on the accent fill | 5.32 | 6.64 |
| Warning on canvas | 5.78 | 12.40 |
| Values in code on a surface | 6.27 | 11.40 |
| Accent on canvas (marker, dot) | 3.17 | 6.87 |
| Control outline on canvas | 3.13 | 3.53 |

Every pair clears its aim in both themes, and the kit will not build if one falls short. The full table is in `tokens/tokens.json` and in the brand book.

### Themes

`:root` holds light. `html[data-theme="dark"]` holds dark. On the site a script in the head sets dark before the first paint, unless the visitor chose light. A new project should put `data-theme="dark"` on the `html` element in its markup.

Components read tokens. A hex value belongs in the palette and nowhere else.

## 5. Typography

**Inter Tight speaks. Geist Mono annotates.**

| Face | Used for | Weights |
|---|---|---|
| Inter Tight | Headlines, interface, reading | 500 for headings and buttons, 400 for text. 600 only for the header wordmark |
| Geist Mono | Labels, dates, tags, code, readouts | 400 |

Both are free under the SIL Open Font License, and both are on Google Fonts. The site self-hosts them. Images (share cards and lab art) set headlines in Inter Tight 300; the interface does not use 300.

### Scale

| Style | Class | Size | Weight | Tracking | Leading |
|---|---|---|---|---|---|
| Display | `.bn-display` | `clamp(2.75rem, 1.2rem + 6.4vw, 6rem)` | 500 | -0.05em | 0.94 |
| Heading 1 | `.bn-h1` | `clamp(2.5rem, 1.6rem + 4.4vw, 4.75rem)` | 500 | -0.045em | 0.98 |
| Heading 2 | `.bn-h2` | `clamp(1.75rem, 1.3rem + 2vw, 2.75rem)` | 500 | -0.038em | 1.04 |
| Heading 3 | `.bn-h3` | `clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem)` | 500 | -0.025em | 1.2 |
| Heading 4 | `.bn-h4` | 1.0625rem | 500 | -0.015em | 1.3 |
| Lede | `.bn-lede` | `clamp(1.0625rem, 1rem + 0.3vw, 1.1875rem)` | 400 | 0 | 1.55 |
| Body | `.bn-body` | 1rem | 400 | 0 | 1.6 |
| Label | `.bn-label` | 0.6875rem mono, uppercase | 400 | 0.09em | 1.3 |
| Meta | `.bn-meta` | 0.75rem mono | 400 | 0.01em | 1.4 |
| Long-form | `.prose-bn` | 1.0625rem, 1.1875rem from 720px | 400 | 0 | 1.7 |

### Rules

- Headings are weight 500 and one color. They wrap balanced; paragraphs wrap pretty.
- The larger the type, the tighter the tracking and the leading.
- Numbers, dates and prices use tabular figures.
- Body text is 16px or larger. Secondary text is 13px or larger. The 11px uppercase mono label is the one exception, and it is never body copy.
- Mono never carries a paragraph. Sans never carries a date, a tag or a reading.
- Labels are uppercase mono. Everything else is set as written.

## 6. Layout and shape

**Rules, not cards.** Structure is a one-pixel line and a grid column.

| Token | Phone | From 640px | From 1000px | Holds |
|---|---|---|---|---|
| `--wrap` | 82rem | | | The page container |
| `--gutter` | 1.25rem | 2rem | 3.5rem | Space between the container and the screen edge |
| `--grid-gap` | 1.25rem | 1.5rem | 2rem | Space between the twelve columns |
| `--header-h` | 3.5rem | | 3.75rem | Height of the site header |
| `--space-section` | `clamp(4.5rem, 3rem + 6vw, 8rem)` | | | Vertical rhythm between sections |
| `--measure` | 42.5rem | | | One line of long-form text |

- **Grid.** Twelve columns. Content sits on column edges, and a narrow label column beside a wide content column is the most common split.
- **Hairlines.** `1px solid var(--border)`. A section starts on one. A list is rows divided by them.
- **A section header** is a label and a title on the left and one action on the right, standing on a hairline.
- **Measure.** Long-form text holds to 42.5rem. Code, tables and figures may run wider. Text does not.
- **Radius.** Three steps, all small: `--r-1` 2px (tags, inline code, the focus ring), `--r-2` 4px (buttons, inputs), `--r-3` 6px (media, code frames, wells). A circle is for a dot and nothing else.
- **Surfaces.** A surface holds something technical: code, a readout, a figure. Depth comes from the hairline and the fill. Nothing floats, so there are no drop shadows and no stacked cards.
- **The header** is a solid bar with a hairline under it. No blur. The active link is marked by a 2px accent bar on the header's top edge. On an article the bottom hairline is the reading-progress track.

## 7. Components

Every page is built from the `bn-*` primitives in [`css/bytesnation.css`](css/bytesnation.css).

| Class | What it is |
|---|---|
| `.bn-wrap`, `.bn-grid`, `.bn-section`, `.bn-rule` | Container, twelve-column grid, section rhythm, hairline |
| `.bn-head` | Section header: label and title, one action, on a hairline |
| `.bn-page-head` | The header of a sub page: label, title, lede |
| `.bn-display`, `.bn-h1` to `.bn-h4`, `.bn-lede`, `.bn-body`, `.bn-label`, `.bn-meta` | The type styles |
| `.bn-btn` | Secondary button, outlined. `--primary` is the accent fill, `--ghost` has no outline, `--sm` is small |
| `.bn-icon-btn` | Square icon button, 40px |
| `.bn-link` | Inline link: a neutral underline that darkens on hover |
| `.bn-arrow` | Text link with an arrow that steps 3px on hover |
| `.bn-tag` | Rectangular mono tag. Never a pill, never tinted |
| `.bn-dot` | The live dot, 6px, accent. `--live` makes it breathe |
| `.bn-pip` | A neutral state marker. `data-on` fills it |
| `.bn-well` | A surface for something technical |
| `.bn-frame` | Media frame for lab art and thumbnails |
| `.bn-input` | Text input, 44px tall |
| `.bn-tabs`, `.bn-tabs-bar`, `.bn-panels` | Text tabs with one sliding accent bar |
| `.bn-readout` | Label and value pairs in a ruled row |
| `.bn-meta-row` | Mono metadata separated by drawn slashes |
| `.bn-crumbs` | Breadcrumbs |

### Rules

- **Buttons** come in three tiers: primary (accent fill, one per section), secondary (outline), ghost. They are 44px tall, 36px when small.
- **Control outlines** are `--control-border`, which clears 3:1 on the canvas and on every surface. An input's outline is the only thing that marks its edge. `--border-strong` is lighter and is for underlines and rules, never for a control.
- **Every interactive element** has a hover state, a one-pixel press, and a focus ring: 2px in the text color, offset 3px.
- **Links** are underlined in a neutral line. The accent is never a link color.
- **Tags and badges** are rectangular, neutral and mono. Difficulty is a three-step meter of pips, not a color.
- **Callouts** in a field note are a mono label over a ruled box. A warning takes the warning gold, a danger takes the error color, a note and a tip stay neutral.
- **Selection** inverts: canvas-colored text on a text-colored ground.
- **Icons** are drawn inline on a 16-unit grid with a stroke of about 1.4 and round caps, in the current text color.

## 8. Motion

Springs from the [Motion](https://motion.dev) library, named by the job they do.

| Spring | Looks finished in | Bounce | Use |
|---|---|---|---|
| `press` | 160 ms | 0 | Hover, press, toggles |
| `snap` | 260 ms | 0.14 | Markers that slide: nav, tabs, table of contents |
| `settle` | 420 ms | 0.24 | Things that land: the menu, the mesh after a drag, shared elements |
| `layout` | 380 ms | 0.1 | List items changing place when a filter changes |
| `reveal` | 550 ms | 0 | Scroll reveals. No overshoot, so text never wobbles |
| `entrance` | 720 ms | 0 | The first-paint entrance of a page header |

CSS reads the same springs as `linear()` easings: `transition: transform var(--spring-snap-d) var(--spring-snap)`. They are in `tokens/tokens.css`.

| Token | Value | Use |
|---|---|---|
| Stagger | 35, 60, 90 ms | Between siblings: tight, base, loose |
| Rise | 14px, 8px | How far content travels as it enters |
| Fades | 120, 200, 320 ms | Quick fade out, opacity fade, the theme crossfade |

### Rules

- Animate `transform` and `opacity`. Never a layout property.
- The page title never animates. It is the largest paint and arrives with the first frame.
- First-paint entrances are CSS, staggered, and need no script.
- A group of tabs or links shares one accent bar, and the bar slides.
- Lists reflow on the `layout` spring when a filter changes.
- Between pages, a field note's art and title travel from its row to its header.
- The theme changes as one crossfade of the whole page.
- Every page is complete with reduced motion on and with JavaScript off. Motion is added to a finished page; it never holds content back.

## 9. Imagery

### Signal Mesh

The brand's one illustration: a sphere of network nodes and links. On the homepage it rotates slowly, takes a drag, and unfolds into a rack as the page scrolls. Stills are in [`graphics/`](graphics).

- Monochrome. Nodes in the text color, links in muted text, the ring in the hairline color.
- Exactly one accent node at a time.
- No glow, bloom, gradient or heads-up-display dressing.
- The same seed draws the same object everywhere: 88 nodes on a desktop, 64 on a tablet, 44 on a phone.
- Any readout beside it is illustrative, and says so.

### Share cards

Generated at build time, 1200 by 630, always on the dark canvas.

- Top left: the icon mark and the name.
- A mono uppercase kicker in muted text.
- The title in Inter Tight 300, tracked tight, in the text color.
- A one-line summary in muted text.
- One orange element: a short bar under the title. The title is one color.

### Lab art

The hand-made image for a field note. It shows the note's finding as a diagram or a small chart.

- The dark canvas, always.
- Top left: a mono label with a small square, such as FIELD NOTES / AUTHELIA + CADDY.
- A headline in Inter Tight 300, in one color.
- Panels with a hairline border on the surface color.
- Flow and data in `--ice`.
- **Orange is a shape:** the short bar under the headline, and at most one highlight in the drawing, which marks the path, the bar or the node the note is about.
- The lockup in a bottom corner.

Orange never sets type, in an image or on the site, and a headline is never two colors. Most of the lab art on the site was drawn before this rule: see [Known gaps](#15-known-gaps).

### Diagrams, charts and icons

Diagrams and charts use the data colors. Product marks appear in a neutral frame and keep their own colors. There is no stock photography and no decorative illustration.

## 10. Voice

One builder writing down what happened.

> Everything here is built by hand, broken on purpose, documented in the open, and shared so the next person does not start from zero.

> No sponsors. No editorial calendar. No content for content's sake.

> Build it. Break it. Rebuild it. Then write down what actually worked and why the first three attempts did not.

> Plain English first. The technical detail is there when you want it.

> This page is not in the lab.

### How it is written

- **I for the builder, we for the lab.** Field notes and the About page are first person singular. Product, privacy and sign-up copy speaks for the lab.
- **Short sentences.** Periods do the work. A headline can be two of them: "Your CPU Says 100%. It Might Be Waiting on RAM the Whole Time".
- **Plain English first.** The technical detail follows for the reader who wants it. The dictionary gives every term both.
- **The failure is part of the note.** What broke and why goes in beside the fix.
- **Numbers over adjectives.** A count, a version, a CVE id, a measured time.
- **The reader is addressed directly.** "Your Homelab Has a Brain Now. Here Is How to Wire It."
- **No em dashes.** Commas, colons, semicolons and parentheses. There is not one on the site.
- **Nothing is oversold.** A schematic is labelled as a schematic. Illustrative data says it is illustrative.

### Case

| Where | Case |
|---|---|
| Field note titles, page titles | Title Case |
| Section titles | Sentence case, often a whole sentence with its full stop: "AI and agents, same lab." |
| The display headline, the 404 line, ledes | Sentence case, with a full stop |
| Labels | Uppercase, through styling |
| Buttons and links | Sentence case, no full stop |

## 11. Accessibility

- WCAG AA contrast in both themes for all text.
- A visible focus ring on every interactive element, in the text color.
- Outlines of buttons and inputs at 3:1 or better against what is behind them.
- Touch targets of 44px for buttons and inputs, 40px for icon buttons.
- `prefers-reduced-motion` removes entrances and reveals, zeroes transitions, and keeps the Signal Mesh on its still.
- With JavaScript off, every page shows all of its content: the menu is a native `<details>`, the filters work through CSS, and nothing is hidden waiting for a script.
- A skip link is the first focusable element.
- Decorative drawings are hidden from assistive technology. Separators are drawn, not typed, so they are not read aloud.

## 12. Never

None of these, anywhere the brand appears:

- Glows
- Gradients
- Pill badges
- Two-color headlines
- Floating sticker cards
- Purple
- Glass or backdrop blur
- Sparkles and beams
- Animated borders
- Drop shadows for depth
- The accent as text, a border or an outline
- Tinted category or status badges
- A hard-coded color in a component

## 13. Component sourcing

Private repositories may start a section from a Shadcnblocks block and restyle it to these guidelines. Public repositories never contain Shadcnblocks code, config or anything ported from it: they build from this kit. An open-source project, or a fork of one, is public tier whatever its visibility.

The full policy, the method for public repositories and the guard script are in [`component-sourcing.md`](component-sourcing.md).

## 14. Done checklist

For any interface change, in any repository:

- [ ] Checked in light and in dark.
- [ ] Checked at phone width and at desktop width.
- [ ] No console errors.
- [ ] No hard-coded colors.
- [ ] The accent appears only as a primary action, an active marker or a live dot.
- [ ] Reads correctly with reduced motion on and with JavaScript off.
- [ ] Lighthouse accessibility is 95 or higher.
- [ ] The component-sourcing guard passes for the repository's tier.

## 15. Known gaps

Places where the live site and these rules differ today. The kit records them as they are. None was changed to make the kit look tidy.

| Gap | Where | Detail |
|---|---|---|
| Orange type in lab art | 34 of the 36 field note images | 31 set a phrase of the headline in orange. 3 set a word, a label or a number elsewhere in orange. The rule in section 9 forbids both. New art follows the rule. The existing images are hand-made outside this repository and wait for a redraw. The two that already comply are `authelia-caddy-homelab-sso-bypass` and `cpu-waiting-on-ram-memory-latency`. |
| Dark needs a script | Every page | Dark is applied by a script in the head. With JavaScript off the site renders in the light theme. |
| Older widgets | Interactive widgets inside some earlier field notes | They set text in `--accent-text`, and one uses a raw red. They predate version 2. |
| Wordmark weight | Header against lockup | 600 in the header at 17px, 500 in the lockup files. Recorded in section 3 as intended at each size, though nothing wrote that down before this kit. |
| A legacy logo file | `/bn_logo.png` | An earlier cyan monogram is still served. No page links to it. |

## 16. What this kit decided

The site showed most of the brand but not all of it. These points are new with this kit, chosen to fit what is live. Change them here if they are wrong.

- **Clear space** is one live-node diameter, which is the gap the existing lockup already used.
- **Minimum sizes**: mark 24px, icon tile 16px, lockup with a 20px mark.
- **The logo's do-not list.**
- **The logo is flat everywhere.** The earlier kit file `mark.svg` had a soft halo behind the live node, and the hand-made avatar had a halo and a lighter orange. Both are now drawn flat from the same code as the header mark and the favicon.
- **The avatar** is the mark at half the tile's width.
- **Orange never sets type, in images as on the site.** The homepage share card set "One operator." in orange; it is now one color, with the same orange bar as every other card. Lab art follows the rule from here on.
- **Control outlines reach 3:1.** Buttons and inputs take a new token, `--control-border`. They used `--border-strong`, which measured 2.13:1 in light and 2.47:1 in dark. `--border-strong` itself is unchanged, so underlines and diagrams look as they did.
- **New projects clamp every radius** to the three steps through `tokens/tailwind.css`.
- **The two-tier component-sourcing policy** and its guard.
