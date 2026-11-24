# BytesNation Studio design system

BytesNation Studio should feel like a broadcast tool: restrained, precise, quiet until something needs attention. It shares its visual language with [bytesnation.com](https://bytesnation.com).

Tokens live in [`bn-shell/src/theme/tokens.css`](../bn-shell/src/theme/tokens.css). Every color, type size, radius and duration in the theme and the shell comes from there.

## Color

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bn-bg` | `#0A0B0D` | `#F3F1ED` | Page ground |
| `--bn-surface` | `#101215` | `#F9F8F5` | Panels, cards, app bar |
| `--bn-surface-2` | `#16181C` | `#FFFFFF` | Inputs, raised controls, popovers |
| `--bn-surface-3` | `#1C1F24` | `#EBE8E2` | Hover |
| `--bn-border` | `#22252B` | `#DEDAD2` | Hairlines, panel edges |
| `--bn-border-strong` | `#34383F` | `#C4BFB4` | Hover edges, underlines |
| `--bn-control-border` | `#646A73` | `#8A857B` | Input and select boundaries (3:1 on every surface, WCAG 1.4.11) |
| `--bn-text` | `#EDEBE6` | `#15171A` | Primary text |
| `--bn-text-muted` | `#9EA3AB` | `#565A61` | Secondary text, idle icons |
| `--bn-text-faint` | `#80868F` | `#666A71` | Tertiary text, footers (AA on every surface) |
| `--bn-accent` | `#FF6A13` | `#E8590C` | Fill only, see below |
| `--bn-accent-ink` | `#1A0D04` | `#1A0D04` | Text and icons on an accent fill |
| `--bn-ok` / `--bn-warn` / `--bn-error` | `#5BE49B` / `#F5C842` / `#FF8D7A` | `#116A3B` / `#7A5800` / `#B42318` | State and data only |
| `--bn-*-ink` | dark ink | white | Text on a status fill |
| `--bn-on-video` | `#EDEBE6` | `#EDEBE6` | Text over live video, both themes |
| `--bn-video-scrim` | 82% near-black | 82% near-black | Ground behind text over video; holds AA over a white frame |

### The accent rule

The accent is a fill, used for three things only:

1. The primary call to action in a view (`.gobutton`, chat Send, the file picker). Hover lightens the fill (`--bn-accent-hover`) so the ink keeps AA.
2. The active indicator: a toggled-on control (`.pressed`, `.blue`), and the marker on the selected command-palette row.
3. The live or recording dot (the `REC` readout in the app bar).

Never use the accent for text, borders, outlines, focus rings, glows or gradients. Focus rings use `--bn-text`.

### Status colors

`ok`, `warn` and `error` mark state or data: muted, offline, recording, a director notice, a bitrate readout. They never decorate. Pair a status color with a text label or an icon; color alone never carries meaning. The engine's state classes map like this:

| Engine class | Meaning | BN fill |
|---|---|---|
| `.red` | muted, off, alert | `--bn-error` |
| `.green` | on, ready | `--bn-ok` |
| `.orange` | caution | `--bn-warn` |
| `.blue`, `.pressed` | toggled on, selected | `--bn-accent` |

## Type

- **Inter Tight** for all UI text. Base size 14px; 13px for dense controls; 16px tile titles; 20px dialog titles; 28px expanded-panel titles. Weights 400, 500 and 600, plus 700 for the rare display line.
- **Geist Mono** for labels, timecodes, room and stream IDs, links, bitrates and other technical readouts. Labels are uppercase, 11px, tracked `0.08em`.
- Headlines are one color. No two-tone headlines.

## Shape and space

- Radii: 4px for controls, 6px for buttons in bars, 8px for panels and cards. No pills: nothing has full-radius ends, except dots and avatar circles.
- One-pixel borders in `--bn-border`. Panels separate by surface step and hairline, not by shadow. The one shadow (`--bn-shadow`) is reserved for floating layers: the control bar, popovers, dialogs.
- 4px spacing grid (`--bn-space-1` through `--bn-space-6`).
- Controls are 32px tall; bar buttons 44px (40px on phones) for touch.

## Motion

Movement is short and stops hard, like equipment. One curve, `cubic-bezier(0.16, 1, 0.3, 1)`, and three durations: 120ms, 160ms and 240ms. Tweens only: nothing springs, bounces or overshoots. The shell animates with [Motion](https://motion.dev); its tokens are in `bn-shell/src/lib/motion.ts` and mirror the CSS tokens.

| Pattern | Motion |
|---|---|
| Floating layer (dialog, command palette) | Scrim fades; panel rises 8px with a 1.5% scale-in over 160ms, and leaves in 120ms |
| Active marker in the palette | One 2px accent bar glides to the selected row in 120ms |
| Icon swap (theme switch) | Old icon rotates out, new one rotates in, 120ms each |
| Inline status (signaling offline, REC) | Slides in 6px from the left over 160ms |
| Recording dot | Tally-lamp blink: full, then dim, with hard edges. No fade, no glow |
| Launcher "More options" | Revealed tiles rise 6px in a 16ms stagger over 240ms |

`prefers-reduced-motion` is honored everywhere: transforms and the blink stop; opacity changes stay.

Do not touch engine animations that carry logic: the launcher's `inlightbox` and `outlightbox` keyframes drive `animationend` handlers in `lib.js`.

## Floating layers

The shell adds three layers above the engine. They exist only where a person operates the studio (launcher, director room, guest or publisher). They never render on a scene, a view link, an OBS source, clean output or inside an iframe, because those are captured or owned by another page.

**Command palette** ([cmdk](https://cmdk.paco.me)), opened with Ctrl+K or Cmd+K or from the app bar:

- It lists only controls the engine is rendering right now, with the engine's own translated labels, and runs one by pressing the engine's button. Hide a button with a URL parameter and its command is gone too.
- Controls that end a session (hang up, guest hangup, transfer) are never listed. A fuzzy match plus Enter must not drop a live call.
- The selected row takes a surface step. The gliding 2px accent marker is the active indicator, one of the three accent uses.
- State shows as a dot and a mono label (`ON`, `OFF`, `RECORDING`), never as color alone.
- With `&disablehotkeys` the shortcut is off and the button remains.

**Notifications** ([Sonner](https://sonner.emilkowal.ski)):

- A notification reports something the operator did not just do: signaling lost or restored, a guest joined or left, a chat message arrived while chat was closed, the director muted them, a recording stopped. The result of the operator's own action already shows on the control they pressed, so it gets no notification.
- One neutral card style. Status color is only the small state dot beside a mono source label (`SIGNAL`, `GUEST`, `CHAT`, `DIRECTOR`, `RECORDING`).
- Three visible at most, under the app bar, clear of the control bar and chat. Chat and signaling notifications replace their previous one in place.
- Chat text is rendered as plain text. The visitor can turn notifications off from the palette.

**Recording readout**: an accent dot, `REC` and a timecode in the app bar while the page records any stream. This is the recording dot the accent rule reserves.

## Banned

Glows; gradients; pill badges; two-color headlines; floating sticker cards; anything purple; glassmorphism (`backdrop-filter`); decorative status colors; accent text or accent borders; template-SaaS hero sections. If it looks generated, it is wrong.

## Rules for styling the engine

The engine (`main.js`, `lib.js`, `webrtc.js`) owns the DOM. The theme restyles it and never changes behavior.

1. **Never rename, remove, reorder or re-parent an engine element.** `getById()` returns a detached `<span>` for a missing ID instead of throwing, so the feature dies silently. The remote API, MIDI and hotkeys locate targets by ID, `data-*` attributes and the child order of `#guestFeeds`.
2. **Never use `display: … !important` on an engine element.** The engine shows and hides elements with inline `style.display`. Its `.hidden` and `.permahide` classes use `!important` and must keep winning.
3. **Override upstream values, not mechanisms.** Prefer remapping upstream CSS variables in `tokens.css`. When a selector override is needed, mirror upstream's selector at the same specificity. Stylesheets users pass with `&css` and `&b64css` load after ours and must still win, as they did upstream.
4. **Keep transparency paths intact.** `&transparent`, `&chroma` and OBS browser sources clear the background through inline styles on `<html>` and `#main`. Never paint the page background with a selector that beats them, and never set a background on video containers in scene or view outputs.
5. **White text over video is correct.** Labels, timers and overlays that sit on video keep a light color with a dark scrim behind them, in both themes.
6. **`&classicui` must restore upstream exactly.** All theme CSS lives in `bn/theme.css`, which `boot.js` disables for that parameter.
7. **Plain CSS only in the theme.** Custom properties, yes; `color-mix`, `@layer`, nesting, `:has()` and `oklch`, no. OBS and older Chromium builds must render it.

## Contrast

Every text and background pairing above meets WCAG AA (4.5:1 for body text, 3:1 for large text and UI glyphs) in both themes. Verify a new pairing before adding it.
