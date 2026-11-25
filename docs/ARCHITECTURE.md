# Architecture

BytesNation Studio is the VDO.Ninja engine, unmodified, under a new presentation layer. The layer has two parts, a CSS theme and a small React shell. Both load beside the engine and change nothing about how it behaves.

```
index.html (upstream markup, plus 4 marked lines)
├── main.css           upstream styles
├── bn/theme.css       BytesNation theme: tokens + restyle of engine DOM   (plain CSS)
├── bn/boot.js         theme boot: &classicui, saved theme, dark-class mirror (ES5)
├── webrtc.js          engine: signaling, WebRTC, codecs                   (untouched)
├── lib.js, main.js    engine: UI logic, URL parameters                    (untouched)
└── bn/shell.js        BytesNation shell: React portals into engine hosts  (module)
```

## Why this design

The engine owns its DOM, and the DOM is its API. `lib.js` creates 471 elements imperatively and looks up about 400 element ids. Its remote control API, MIDI mappings and hotkeys find their targets by id, by `data-*` attributes and by the child order of `#guestFeeds`. `getById()` does not throw for a missing id, so any markup change that drops or renames an element breaks a feature without an error. Details are in [FEATURE-INVENTORY.md](FEATURE-INVENTORY.md).

That ruled out three other designs:

- **A React rewrite of the UI.** It would have to reimplement what `lib.js` does, which means rewriting the engine. It fails the requirement to keep the engine, and upstream fixes could no longer be merged.
- **A React app that embeds the engine in an iframe and drives it through the IFRAME API.** The API covers a fraction of the director and settings controls, so features would be lost.
- **Editing upstream markup and CSS in place.** Every upstream release would conflict across `index.html` and `main.css`.

What remains is the design used here. The theme restyles the engine's own elements without moving them. The shell adds new surfaces, such as the brand, theme switch, About view and credit, by mounting React portals into containers the engine already shows and hides. When the shell offers a control, it calls the engine's own handler.

## The parts

### `bn/theme.css` (source: `bn-shell/src/theme/`)

- `tokens.css` defines the BytesNation tokens and remaps upstream's CSS variables (`--discord-grey-*`, `--lighttheme-*`, `--background-color`, link and accent variables) onto them. Much of the engine restyles from this file alone.
- `engine/*.css` restyles each view group (`base`, `header`, `landing`, `controls`, `publish`, `director`, `panels`, `video`). Selectors mirror upstream's selectors, so stylesheets users pass with `&css` still override them.
- Plain CSS only: custom properties, but no `color-mix`, `@layer`, nesting or `:has()`. It has to render in OBS's embedded Chromium and in the oldest browsers the engine supports.
- Dark is the default, set through `--color-mode: dark`, which `main.js` reads at boot. `&darkmode`, `&lightmode`, `&whitemode` and OBS detection keep their upstream precedence.
- Tokens switch on `html.bn-dark`, not `body.darktheme`. The engine implements `&transparent`, `&chroma` and OBS transparency with inline custom properties on `<html>`. Tokens defined on `<body>` would shadow those for every descendant.

Rules for writing theme CSS are in [DESIGN.md](DESIGN.md#rules-for-styling-the-engine).

### `bn/boot.js` (source: `bn-shell/public/boot.js`)

A classic ES5 script loaded in `<head>` right after the theme. It:

1. Turns the whole layer off for `&classicui` (alias `&bnclassic`) by disabling `bn/theme.css` and marking `<html>` so the shell does not mount. The result is upstream's presentation, pixel for pixel. This is the escape hatch for any custom CSS or workflow the redesign disturbs.
2. Applies a saved theme choice (`localStorage["bn-color-mode"]`) to `--color-mode` before `main.js` reads it.
3. Mirrors `body.darktheme` onto `html.bn-dark` with a `MutationObserver`.

### `bn/shell.js` (source: `bn-shell/src/`)

React 19, Radix primitives and shadcn/ui-pattern components, styled with Tailwind 3 under a `tw-` prefix with preflight disabled. The engine already uses class names like `.hidden`, `.red`, `.float` and `.column`; unprefixed utilities would collide with them, and preflight would reset engine elements.

- It mounts on `window.load`, after the engine has booted. It does not mount in OBS, with `&cleanoutput`, or with `&classicui`.
- Every app-bar and launcher surface is a portal into an engine host: the brand and tools go into `#header`, the credit into `#mainmenu`. When the engine hides a host (scenes, view links, clean output, in-call layouts), the shell surface hides with it.
- All engine access goes through `src/lib/engine*.ts`: `engine.ts` reads session state, `engine-controls.ts` discovers and presses the engine's controls, `engine-events.ts` observes state changes. When upstream changes something the shell depends on, it breaks in one of three files.
- A mount failure is caught and logged. The engine never depends on the shell.

#### Floating layers: command palette, notifications, recording readout

Three additions sit above the engine: a command palette ([cmdk](https://cmdk.paco.me)), notifications ([Sonner](https://sonner.emilkowal.ski)) and a `REC` readout, animated with [Motion](https://motion.dev). Design rules are in [DESIGN.md](DESIGN.md#floating-layers).

- **Operator surfaces only.** `isOperatorSurface()` mirrors the engine's own mode branches in `main.js`: a scene inside a room, or a view-only link with nothing published, is an output. On outputs, in OBS, with clean output, with `&hideheader`, and inside an iframe, none of these layers mount and Ctrl+K does nothing. A window capture of a view link can never show a palette or a notification.
- **The palette is a remote control.** `engine-controls.ts` lists the controls the engine is rendering (`getClientRects`), reads their translated `aria-label` or text, and runs a command with `element.click()` on the engine's element. No parameter logic is repeated: whatever hides a button hides its command. Launcher tiles behind "More options" are offered only if that button would reveal them, so work-in-progress tiles the engine hides inline stay hidden. Hang up, guest hangup and transfer are excluded.
- **A command runs after the palette is gone.** The engine's handler fires on `AnimatePresence`'s exit-complete, once the dialog and its focus trap have unmounted, so the engine owns focus (a chat field, a password prompt). Escape is stopped at the palette, so it never also closes an engine modal behind it.
- **The hotkey yields.** Ctrl+K or Cmd+K is unused by the engine. The shell skips it when the link carries `&disablehotkeys` or when the engine already handled the key (`event.defaultPrevented`, for a custom push-to-talk combo).
- **Notifications read state; they never write it.** The engine posts its events only to a parent page, so at the top level `engine-events.ts` observes what the engine already maintains: `#guestFeeds` children, `#chatBody` rows, the `#head6` to `#head8` director notices, the `#qos` signaling color and each video element's `recording` flag. Chat rows are read as text content.
- **One exception to "the shell never touches engine elements".** `launcher-motion.ts` staggers in the tiles that "More options" reveals. It is limited to `opacity` and `translate` (the tile lightbox animates `width`, `height`, `top` and `left`), uses Web Animations (which fire no `animationend`), and restores each tile's inline styles to exactly what the engine had when it ends. A parity test compares every tile's `style` attribute with upstream's afterwards.

The shell bundle is about 167 KB gzipped (React accounts for about a third, Motion for another). It loads as a module after the engine has booted and is never needed for the engine to work.

### Compatibility

The build targets Chromium 75, the engine's parse floor for startup scripts. `scripts/check-compat.mjs` fails the build if `bn/` contains syntax that floor cannot parse, such as optional chaining or nullish coalescing. The theme and boot script avoid newer CSS and JavaScript features entirely. The shell is progressive enhancement: in a browser that cannot run it, the engine and the theme still work.

### Assets

Inter Tight and Geist Mono (SIL OFL 1.1) are bundled from `@fontsource` into `bn/assets/`. The BytesNation mark and favicons come from bytesnation.com and live in `bn/brand/`. Nothing loads from a CDN, matching upstream's rule.

## Upstream touchpoints

These are the only upstream files BytesNation Studio changes:

| File | Change | Why |
|---|---|---|
| `index.html` | `<title>`, `metaTitle`, `og:site_name` and `theme-color` say BytesNation Studio | Product branding |
| `index.html` | The three favicon `<link>`s point at `bn/brand/`, keeping their ids; one apple-touch-icon link added | Branding; `&favicon` and engine favicon updates still work by id |
| `index.html` | A marked block after `main.css` links `bn/theme.css` and `bn/boot.js` | Theme layer |
| `index.html` | A marked line after `main.js` loads `bn/shell.js` | Shell |
| `.gitignore` | A marked block re-includes `/docs/`, `bn-shell/package.json`, its lock file and `bn-shell/tests/` | Upstream's release `.gitignore` excludes those paths |

`webrtc.js`, `main.js`, `lib.js`, `main.css` and every other upstream file are byte-identical to upstream. `bn-shell/scripts/check-upstream-footprint.mjs` enforces this, and the parity suite runs it.

Signaling, handshake, STUN and TURN configuration stay exactly as upstream ships them. Upstream's terms allow self-hosted frontends to use Steve Seguin's hosted infrastructure only through official, unmodified `webrtc.js`, and BytesNation Studio never modifies it.

## Pulling upstream fixes

Upstream is `steveseguin/vdo.ninja`, default branch `develop`. In this clone the `upstream` remote is fetch-only; its push URL is `DISABLED_NEVER_PUSH_UPSTREAM`.

1. Branch from `develop`: `git switch -c chore/upstream-sync-YYYYMMDD develop`.
2. Fetch and merge: `git fetch upstream && git merge upstream/develop`.
3. Resolve conflicts. Expect them only in the `index.html` lines listed above. Take upstream's version of each line, then reapply the BytesNation change. Never resolve a conflict in an engine file in BytesNation's favor; there should be none.
4. Update `bn-shell/engine-lock.json` to the merged upstream commit.
5. Regenerate the inventory: `node bn-shell/scripts/render-param-inventory.mjs`. Review the `params.json` diff for new, removed or renamed parameters. Describe any new undocumented ones in `param-descriptions.json`. If the run fails with "read(s) are not covered", upstream added or changed a way of reading parameters: teach `inventory-params.mjs` the new reader in the tables at its top, and look at any new surface it belongs to in both themes.
6. Check the views inventory against upstream's diff for new or renamed element ids, and style anything new.
7. Rebuild the layer: `cd bn-shell && npm ci && npm run build`.
8. Run the parity suite (`npm run test:parity`) and the footprint check. Then capture the views (`node scripts/capture-views.mjs`) and compare them against the previous release.
9. Open a PR into `develop` on `BytesNation/BytesNation-Studio`.

## Building

```
cd bn-shell
npm ci
npm run build        # typecheck, build into ../bn/, compatibility check
npm run test:parity  # parity suite: footprint, DOM contract, parameter differential, live room
```

`bn/` is committed so the repository stays servable with no build step, like upstream. Rebuild and commit `bn/` with any change under `bn-shell/src/`.
