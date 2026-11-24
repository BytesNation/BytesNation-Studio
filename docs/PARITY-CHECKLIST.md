# Parity checklist

Built from [FEATURE-INVENTORY.md](FEATURE-INVENTORY.md). The redesign is done when every row is checked. Rows 1 to 8 are generated from the parity suite (`cd bn-shell && npm run test:parity && node scripts/render-parity-checklist.mjs`); the manual checks are recorded by hand.

Last run: 2026-11-24T21:35:18.849Z, 2026-11-24T22:07:36.364Z. 1578 automated checks ran across 5 engines; 0 failed.

Engines: Chrome, Firefox and Safari's WebKit run as desktop browsers; Android Chrome is a Pixel 7 profile and iOS Safari an iPhone 14 profile, both emulated. Where a headless engine has no fake camera (WebKit, and Firefox for more than one capture), the live room feeds a synthetic camera and microphone, and the notes say so. Real-device and real-picker runs are in the manual checks.

## 1. Engine unchanged

WebRTC, signaling, handshake, codec and URL-parameter behavior live in engine files that must stay byte-identical to upstream (`bn-shell/engine-lock.json`). Browser-independent; runs once.

| | Check | Chrome | Firefox | Safari (WebKit) | Android Chrome | iOS Safari |
|---|---|---|---|---|---|---|
| [x] | engine files are identical to upstream; only documented touchpoints changed | pass | n/a | n/a | n/a | n/a |

## 2. Views keep every engine element

Each view loads in upstream and BytesNation side by side. Every element id upstream renders must exist with the same tag, the engine must reach the same state, and BytesNation must raise no page error upstream does not.

| | Check | Chrome | Firefox | Safari (WebKit) | Android Chrome | iOS Safari |
|---|---|---|---|---|---|---|
| [x] | DOM contract: launcher | pass | pass | pass | pass | pass |
| [x] | DOM contract: director | pass | pass | pass | pass | pass |
| [x] | DOM contract: guest join | pass | pass | pass | pass | pass |
| [x] | DOM contract: publish | pass | pass | pass | pass | pass |
| [x] | DOM contract: publish webcam autostart | pass | pass | pass | pass | pass |
| [x] | DOM contract: view | pass | pass | pass | pass | pass |
| [x] | DOM contract: scene | pass | pass | pass | pass | pass |
| [x] | DOM contract: clean output | pass | pass | pass | pass | pass |

## 3. Live room: director, two guests, scene, screen share, chat, mute, per-guest recording

Real peers through the unmodified engine and its default signaling. Five sessions per run: director, two camera guests, a screen-share guest and a scene output.

| | Check | Chrome | Firefox | Safari (WebKit) | Android Chrome | iOS Safari |
|---|---|---|---|---|---|---|
| [x] | @live room on BytesNation: director, guests, scene, screen share, chat, mute, recording | pass | pass | pass | pass | pass |

Notes from the runs:

- Chrome: downloaded Alex_1795556141735.webm
- Firefox: camera and microphone supplied by the test's synthetic media (canvas + oscillator)
- Firefox: screen capture supplied by the test's synthetic getDisplayMedia; the real OS picker is on the manual checklist
- Firefox: downloaded Alex_1795556756797.webm
- Safari (WebKit): camera and microphone supplied by the test's synthetic media (canvas + oscillator)
- Safari (WebKit): screen capture supplied by the test's synthetic getDisplayMedia; the real OS picker is on the manual checklist
- Safari (WebKit): downloaded Alex_1795556995701.webm
- Android Chrome: mobile browsers do not offer screen capture to web pages; mobile-chrome skips this step as upstream does
- Android Chrome: downloaded Alex_1795558071512.webm
- iOS Safari: camera and microphone supplied by the test's synthetic media (canvas + oscillator)
- iOS Safari: mobile browsers do not offer screen capture to web pages; mobile-safari skips this step as upstream does
- iOS Safari: downloaded Alex_1795558250661.webm

## 4. URL parameters

All 678 parameters in the inventory. Full table: [parity/url-parameters.md](parity/url-parameters.md).

| Engine | Parameters run | Matched upstream |
|---|---|---|
| Chrome | 678 | 678 |
| Firefox | 196 | 196 |
| Safari (WebKit) | 196 | 196 |
| Android Chrome | 196 | 196 |
| iOS Safari | 196 | 196 |

## 5. Keyboard shortcuts

Same keys pressed in upstream and BytesNation on a live local publish; engine state must match afterwards.

| | Check | Chrome | Firefox | Safari (WebKit) | Android Chrome | iOS Safari |
|---|---|---|---|---|---|---|
| [x] | shortcut: Ctrl+M toggles the microphone | pass | pass | pass | n/a | n/a |
| [x] | shortcut: Ctrl+B toggles the camera | pass | pass | pass | n/a | n/a |
| [x] | shortcut: Alt+A toggles the speaker | pass | pass | pass | n/a | n/a |
| [x] | shortcut: Shift+Alt+C toggles the control bar | pass | pass | pass | n/a | n/a |
| [x] | shortcut: Ctrl+M twice restores the microphone | pass | pass | pass | n/a | n/a |
| [x] | shortcut: Escape closes the topmost modal | pass | pass | pass | n/a | n/a |

## 6. IFRAME API

A host page sends the same messages to both; replies and events must match.

| | Check | Chrome | Firefox | Safari (WebKit) | Android Chrome | iOS Safari |
|---|---|---|---|---|---|---|
| [x] | IFRAME API replies and events match upstream | pass | pass | pass | n/a | n/a |

## 7. Theme, branding and output guarantees

| | Check | Chrome | Firefox | Safari (WebKit) | Android Chrome | iOS Safari |
|---|---|---|---|---|---|---|
| [x] | dark is the default even when the OS prefers light | pass | pass | pass | pass | pass |
| [x] | &lightmode gives the light theme | pass | pass | pass | pass | pass |
| [x] | credit is visible in the launcher footer and the About view | pass | pass | pass | pass | pass |
| [x] | theme switch flips the engine theme and is remembered | pass | pass | pass | n/a | n/a |
| [x] | &classicui restores upstream presentation exactly | pass | pass | pass | pass | pass |
| [x] | &transparent keeps every layer transparent | pass | pass | pass | pass | pass |
| [x] | in OBS the shell stays out and the engine behaves as upstream | pass | pass | pass | pass | pass |

## 8. WCAG AA contrast

axe-core `color-contrast` across the main views in both themes. Text over live video is excluded because axe cannot read a video frame; those labels sit on an opaque scrim.

| | Check | Chrome | Firefox | Safari (WebKit) | Android Chrome | iOS Safari |
|---|---|---|---|---|---|---|
| [x] | contrast AA: launcher, dark | pass | n/a | pass | n/a | n/a |
| [x] | contrast AA: director, dark | pass | n/a | pass | n/a | n/a |
| [x] | contrast AA: guest join, dark | pass | n/a | pass | n/a | n/a |
| [x] | contrast AA: publish, dark | pass | n/a | pass | n/a | n/a |
| [x] | contrast AA: launcher, light | pass | n/a | pass | n/a | n/a |
| [x] | contrast AA: director, light | pass | n/a | pass | n/a | n/a |
| [x] | contrast AA: guest join, light | pass | n/a | pass | n/a | n/a |
| [x] | contrast AA: publish, light | pass | n/a | pass | n/a | n/a |

## Manual checks

These need real hardware or a real host application, so the suite cannot prove them. Record each result in `docs/parity/manual-results.json` and rerun the generator.

| | Check | Result | Who, when |
|---|---|---|---|
| [ ] | Real Safari on macOS with a real camera and microphone: join a room as a guest, publish, hear and see the director | not done |  |
| [ ] | Real iPhone (iOS Safari): guest join, camera flip, mute, chat, hang up | not done |  |
| [ ] | Android Chrome on a Pixel 9 (Android 16) emulator with its emulated camera, and on a real Android phone: guest join, publish, director receives, mute, chat, hang up | partial | Claude, 2026-11-24: emulator guest published to a desktop director, director received 120x213 preview video, in-call UI and header verified; real phone not done |
| [ ] | Real OS screen-share picker in Chrome, Firefox and Safari: share a window and a full screen into a room | not done |  |
| [ ] | OBS Studio browser source: an existing &scene link and an &view link render transparent, with audio, exactly as on upstream | not done |  |
| [ ] | OBS Studio custom CSS and &css / &b64css links from an existing production still override the theme | not done |  |
| [ ] | Per-guest recording file: the downloaded recording plays back with audio and video | not done |  |
| [ ] | 3+ participant room across mixed real browsers (director in Chrome, guests in Safari and Firefox), 10 minutes, no drops | not done |  |
| [ ] | iOS Simulator Safari: launcher, guest join, director (simulator service did not respond on 2026-11-24; not run) | not done |  |
