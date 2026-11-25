# BytesNation brand kit

Version 2.0.0. The brand as it stands on [bytesnation.com](https://bytesnation.com).

The website is the source of truth. The token files, the stylesheet, the logo files and the brand book in this folder are generated from the site's own code, so they match what is live. The guidelines and the sourcing policy are written by hand.

## Start here

| You want | Open |
|---|---|
| To see the brand | [`brand-book.html`](brand-book.html), in a browser. One file, works offline, has a theme switch |
| The rules in words | [`guidelines.md`](guidelines.md) |
| To know whether a project may use Shadcnblocks | [`component-sourcing.md`](component-sourcing.md) |
| The logo | [`logo/`](logo) |
| Colors, type, spacing and motion as data | [`tokens/`](tokens) |
| A stylesheet to build with | [`css/bytesnation.css`](css/bytesnation.css) |

## The brand in ten lines

1. **BytesNation**, one word. The builder is **MokeyBytes**, one word.
2. It reads as a technical publication: hairline rules and a twelve-column grid, not cards.
3. Dark is the default: canvas `#0A0B0D`, text `#EDEBE6`. Light is `#F3F1ED` and `#15171A`.
4. One accent, `#FF6A13` on dark and `#E8590C` on light. It is a fill for three things: the primary action, the active marker and the live dot. It is never text, a border, an outline, a glow or a gradient.
5. Color carries state only. Warning gold is for warning callouts. Tags, categories and tiers are neutral.
6. Inter Tight speaks. Geist Mono annotates.
7. Corners are 2, 4 or 6px. Circles are for dots.
8. Motion is springs on `transform` and `opacity`, and every page is complete with motion off and with JavaScript off.
9. One illustration, the Signal Mesh, with one accent node.
10. Shadcnblocks is for private repositories only. Public repositories build from this kit.

## What is in the kit

```
brand/
  README.md                    This file
  guidelines.md                The brand in words: names, logo, color, type, layout,
                               components, motion, imagery, voice, known gaps
  component-sourcing.md        Shadcnblocks in private repositories, the method for
                               public ones, open-source software, the licence reasons
  LICENSE.md                   What a copy of this kit carries
  brand-book.html              The brand shown in itself                [generated]
  logo/
    lockup-on-dark.svg .png    Mark and wordmark for dark grounds       [generated]
    lockup-on-light.svg .png   Mark and wordmark for light grounds      [generated]
    mark-on-dark.svg .png      The mark alone                           [generated]
    mark-on-light.svg .png                                              [generated]
    icon.svg, icon-512.png     Favicon and app icon tile                [generated]
    avatar.svg, avatar-1024.png  Social profile picture                 [generated]
  graphics/
    signal-mesh-on-dark.svg    The Signal Mesh still                    [generated]
    signal-mesh-on-light.svg                                            [generated]
  tokens/
    tokens.css                 Every token as CSS custom properties     [generated]
    tokens.json                The same as design-token JSON, with
                               resolved hex values and contrast ratios  [generated]
    tailwind.css               Bridge for Tailwind CSS v4 and shadcn/ui
  css/
    bytesnation.css            Tokens, base styles and the bn-* primitives
                               in one plain stylesheet                  [generated]
  tools/
    check-sourcing.mjs     The component-sourcing guard
    brand-guard.workflow.yml   The guard as a GitHub Actions workflow
```

## Use it

### Any page, no build step

```html
<html lang="en" data-theme="dark">
  <head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400&family=Inter+Tight:wght@400;500;600&display=swap"
    />
    <link rel="stylesheet" href="brand/css/bytesnation.css" />
  </head>
  <body>
    <main class="bn-wrap">
      <p class="bn-label">Field notes</p>
      <h1 class="bn-h1">A title</h1>
      <p class="bn-lede">A paragraph under it.</p>
      <a class="bn-btn bn-btn--primary" href="/start/">One primary action</a>
    </main>
  </body>
</html>
```

Self-host the two fonts where you can; the website does. The stylesheet includes metric-matched fallback faces, so text does not jump when the fonts arrive.

### Tailwind CSS v4, with or without shadcn/ui

```css
@import "tailwindcss";
@import "./brand/css/bytesnation.css";
@import "./brand/tokens/tailwind.css";
```

`bg-primary` is the orange. `bg-accent` is shadcn/ui's neutral hover wash. The bridge points the focus ring at the text color and clamps every radius to the brand's three steps.

### Tokens only

`tokens/tokens.css` holds the custom properties without the base styles or primitives. `tokens/tokens.json` holds the same values for design tools and for code that is not CSS, with each mixed color resolved to a hex.

### Motion

The springs are in `tokens/tokens.css` as CSS easings:

```css
transition: transform var(--spring-snap-d) var(--spring-snap);
```

For scripted animation, use the [Motion](https://motion.dev) library and read each spring's `visualDuration` and `bounce` from `tokens/tokens.json`.

## Take it to another repository

1. Copy this whole folder. It holds no Shadcnblocks code, so it may go into a public repository.
2. Add a file named `.brand-tier` at the repository root containing `public` or `private`.
3. Follow [`component-sourcing.md`](component-sourcing.md) for that tier.

A copy is a snapshot. To update it, copy the folder again from the website repository and note the version in the commit.

[`LICENSE.md`](LICENSE.md) says what a copy carries: the kit's code follows the licence of the repository it sits in, and the BytesNation name and mark stay BytesNation's under any licence.

## Keep it in sync

The generated files are rebuilt from the website's source:

```
cd apps/web
npm run brand:kit      rebuild the kit
npm run brand:check    fail if the kit no longer matches the site
```

Both need Node 24 or newer. Run `brand:kit` and commit the result after any change to:

| Changed | In |
|---|---|
| A color | `apps/web/src/index.css` (the palette block), `apps/web/src/styles/shadcn.css` (warning gold) |
| A layout token, a radius, a base style | `apps/web/src/styles/base.css` |
| A primitive or a type style | `apps/web/src/styles/primitives.css` |
| A spring or a timing | `apps/web/src/lib/motion.ts` |
| The mark, the lockup, the icon | `apps/web/scripts/lib/brand-drawing.mjs` |
| The Signal Mesh | `apps/web/src/lib/signal-mesh/` |
| The words or layout of the brand book | `apps/web/scripts/brand-kit/book.template.html`, `book.css`, `manifest.mjs` |

The build stops if any color pair in the contrast table falls below its aim, or if the brand book quotes a line the site no longer carries.

`guidelines.md` and `component-sourcing.md` are not generated. When a value changes, update the table that quotes it. When the brand itself changes, raise `KIT_VERSION` in `apps/web/scripts/brand-kit/manifest.mjs` and the version line at the top of each document.
