# Feature inventory

This is everything the VDO.Ninja engine does that BytesNation Studio has to keep: every page and view, every URL parameter, every keyboard shortcut, button and toggle, and every API and integration hook. It was taken from upstream commit `8e363be` (VDO.Ninja 31.5) on 2026-11-24, before any redesign work. [PARITY-CHECKLIST.md](PARITY-CHECKLIST.md) is built from it.

The full tables are in `docs/inventory/`:

| Appendix | What it covers | Size |
|---|---|---|
| [url-parameters.md](inventory/url-parameters.md) | Every URL parameter the main page reads, with aliases, role, behavior and source line | 745 parameters, 1,281 names with aliases |
| [views-and-controls.md](inventory/views-and-controls.md) | Every view of the main app, the switches between views, and every control in each view: DOM id, label, handler, and the parameter that shows or hides it. Podcast Studio is listed by screen, not control by control | 29 views, 647 controls plus the three add-on surfaces |
| [shortcuts-and-apis.md](inventory/shortcuts-and-apis.md) | Keyboard shortcuts, IFRAME API (inbound and outbound), remote control API, MIDI, and other hooks | 70 shortcuts, 88 inbound and 145 outbound IFRAME messages, 95 remote API actions, 48 MIDI mappings, 50 other hooks |
| [pages.md](inventory/pages.md) | Every HTML page besides `index.html`: purpose, category, branding, own parameters | 155 pages |
| [params.json](inventory/params.json) | Machine-readable parameter inventory; the parity tests and the upstream-merge diff read it | 745 records |

## How it was built

- **URL parameters** come straight from the code. `bn-shell/scripts/inventory-params.mjs` reads every script that touches the main page's URL: `main.js`, `lib.js`, `webrtc.js`, `auth-client.js`, `callin.js`, Podcast Studio (`podcast/`) and the inline scripts in `index.html`. It covers the four ways the engine reads a parameter: a literal name at the call site, a helper that takes the name or a list of aliases, a list of names checked in a loop, and a name built at run time. A read that fits none of these fails the run with its file and line, so a new kind of reader upstream cannot drop parameters without anyone noticing. Names checked together in every chain, or declared as aliases in upstream's docs, are grouped as aliases. Descriptions come from upstream's `rawdoc.md` where a parameter is documented, and from the code (`param-descriptions.json`) where it is not.
- **Views, controls, shortcuts and APIs** were traced through `index.html`, `main.js` and `lib.js`, with a file and line for every entry.
- **Pages** were read one by one.

After every upstream merge, rerun `node bn-shell/scripts/render-param-inventory.mjs` from the repo root. The git diff of `params.json` lists what upstream added, removed or renamed; a new parameter without a description shows under "Needs description".

## Views

| View | How it is reached | Inventory section |
|---|---|---|
| Launcher | No parameters | Landing / main menu tiles |
| Create room | Launcher tile, or `&director` with no room | Create room panel |
| Camera publish and guest join | Launcher tile, `&push`, `&room` | Camera publish and guest join flow |
| Guest in a room | `&room` after joining | Guest in-room state |
| Director control room | `&director=ROOM` | Director view, per-guest control box, own control box, room settings, other panels |
| Scene output | `&scene` with `&room` | Scene output and view-only output |
| View-only output | `&view`, `&whep`, `&whip` | Scene output and view-only output |
| OBS browser source | Any link loaded in OBS or MELD | OBS / browser-source behavior |
| Screen share | Launcher tile, control bar, `&screenshare` | Screen share |
| Settings and device pickers | Control bar gear | Settings drawer and device pickers |
| Chat | Control bar | Chat |
| File share and media streaming | Control bar, `&fileshare`, launcher tile | File share and media streaming |
| Recording | Control bar, director per-guest controls, `&record` | Recording |
| Context menus | Right-click on video, links, clock | Context menus |
| Popups and modals | Engine prompts | Popups and modals |
| Help, info, language, calendar | Launcher footer and corner buttons | Help / info footer, language, calendar |
| Mobile | Any view on iOS or Android | Mobile, iOS and Android behavior |
| Podcast Studio | `&podcast` (`podcast/index.html` redirects there) | Add-on surfaces |
| Phone call-in panel | `&callin` | Add-on surfaces |
| Icecast publishing panel | `&icecastpush`, `&icecastview`, `&icecast` | Add-on surfaces |

The main app's view state lives in `body` classes and `session` flags that `main.js` sets from URL parameters. Nothing in this list depends on page markup beyond the element ids, classes and child order the engine reads.

## What the redesign must not break

These findings decide how the redesign works. See [ARCHITECTURE.md](ARCHITECTURE.md).

1. **Element ids are an API.** `getById()` (`webrtc.js:281`) never throws; a missing id returns a detached `<span>`, so a renamed element breaks its feature without an error. The remote control API, MIDI and several hotkeys locate targets by id, by `data-action-type`, `data-sid` and `data--u-u-i-d` attributes, and by the child order of `#guestFeeds`.
2. **Launcher tiles run on CSS animation events.** `lib.js` advances the tile open and close flow on `animationend` for the `inlightbox` and `outlightbox` keyframes.
3. **Transparency runs on inline styles.** `&transparent`, `&chroma` and OBS sources clear backgrounds by setting inline styles and custom properties on `<html>` and `#main`.
4. **User stylesheets come last.** `&css`, `&base64css`, `&b64css`, `&cssbase64` and `&cssb64` append stylesheets after the page's own, and existing OBS setups depend on them overriding the defaults.
5. **Same-origin pages reach into the engine.** `mixer.html`, `qr.html`, `studio/app.js` and `podcast/studio.js` call engine globals and `contentWindow.session` directly, not only through `postMessage`.
6. **Hosted-service terms.** Upstream's `AGENTS.md` allows self-hosted frontends to use Steve Seguin's signaling, STUN and TURN only through official, unmodified `webrtc.js`.

## Upstream behavior recorded, not changed

The inventory turned up upstream behavior that looks wrong or risky. BytesNation Studio keeps all of it, because the rule is parity, and changing it would change the engine. Each item is a candidate for an upstream report, which only George can decide to file.

| Finding | Where |
|---|---|
| The IFRAME API accepts `function: "eval"` and `function: "changeHTML"` from any embedding parent, which lets the parent page run arbitrary code | `main.js:8732`, `main.js:8956` |
| MIDI mode 1, note E4 calls `raisehand()` twice, so the hand toggles up and straight back down | `lib.js:74935` |
| `&midiremote` passes notes to `midiHotkeysNote`, which checks `session.midiHotkeys`; remote notes may do nothing without `&midi` | `lib.js` MIDI section |
| `&disablehotkeys` does not gate Shift+Alt+C, the Ctrl-release flush or Escape, and Ctrl+M fires while typing in a text field | `main.js:10827` and the keyup listener |
| Keys handled in code but missing from `examples/iframeapi.md`: `getSnapshotByStreamID`, `reservedSlots`, `targetHeight`, `hangup`, target-only `settings`, `add`, `remove` and `replace`, plus the functions `getGuestMediaDevices`, `setGuestMediaDevice`, `activateQueuedGuest` and `commands` | IFRAME inbound handler |
| `&experimental`, `&socialstream` and `&locksize` set session fields that nothing reads; `&whipoutkeyframenewviewer` sets one that appears only in comments | `main.js` |
| `#helpbutton`, `#reportbutton` and `#legal` are never shown; every show call is commented out | `index.html`, `main.js` |
| Duplicate ids: `#settingstoggle`, `#hiddenElements`, and `#title` inside the audio picker | `index.html` |
| `svg.html` loads `svg2stl.html`, which is not in the repository | `svg.html` |

## Decisions that belong to George

These came up during the inventory. Nothing has been changed for them.

- **Hardcoded upstream hosts.** `comms.html`, `examples/p2p.html`, `examples/obsremote.html`, `examples/obs_remote/interface.html` and `examples/labelonly.html` load `https://vdo.ninja/` in their iframes, so on a BytesNation host those pages run on upstream. The OBS docks default their base URL to `https://vdo.ninja`.
- **Legal links.** The launcher footer's Terms of Service and Privacy Policy links point at the hosted VDO.Ninja service's policies on `docs.vdo.ninja`.
- **Upstream support and community links.** The "Show Your Support", "Source Code", Discord, Reddit and documentation links point at upstream. They are kept as attribution.
- **`stats.html`** redirects to `https://versus.cam`, an external service.
- **Canonical and identity metadata.** `index.html` and most pages declare `rel=canonical` and `rel=me` as `vdo.ninja`. That is a deployment-time choice and stays unchanged until a BytesNation host exists.
