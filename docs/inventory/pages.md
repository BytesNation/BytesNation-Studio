# Page inventory: every page except index.html

Scope: 155 pages. That is every `*.html` at the repo root and under subdirectories, minus `index.html`, `thirdparty/`, `lineawesome/`, `translations/` and `.github/`. The scan was read-only and done on 2026-11-24.

Counts by category: app-view: 9, docs/info: 7, integration: 76, redirect/legacy: 11, tool: 52.

## Findings that shape the redesign

1. **A shared theme on `main.css` reaches almost none of these pages.** Only `devices.html`, `supports.html` and `midi.html` load the local `main.css`. Three examples (`examples/midi.html`, `examples/obs_remote/index.html`, `examples/obs_remote/interface.html`) hotlink `https://vdo.ninja/main.css`, which pulls upstream styling no matter what this fork ships. Every other page styles itself inline or with its own stylesheet (`check.css`, `speedtest.css`, `studio/styles.css`, `tabletop/styles.css`, `iframe.css`, `camera-sync.css`, jQuery UI CSS on meet/comms/mixer/remotemidi). A shared theme has to be added to each page, or injected by a small shared include.
2. **No page loads `lib.js`, `webrtc.js` or `main.js` directly.** Pages that need the engine embed the main app in an iframe (`./index.html?...` or `../index.html`). The main app's theme therefore shows up inside those iframes, while the page chrome around them stays separate. The `lib.js` hit in `mixer.html` and the `main.js`/`webrtc.js` hits in `misc/mobile-uplink-packet-flow.html`, `meet.html`, `comms.html` and `browser.html` are comments or prose.
3. **Some pages hardcode the upstream host.** `comms.html` builds its iframe from `https://vdo.ninja/?...`, so a self-hosted BytesNation deploy would run Comms on upstream VDO.Ninja. `examples/p2p.html` (`https://vdo.ninja/beta/`), `examples/obsremote.html`, `examples/obs_remote/interface.html` and `examples/labelonly.html` do the same. `obs/index.html` and `obs/simple.html` default their base URL setting to `https://vdo.ninja`. Many examples use `https://vdo.ninja/` as a default input value, and most pages carry og/canonical meta pointing at `vdo.ninja/<page>` and `vdo.ninja/media/vdoNinja_logo_full.png`. None of that meta is visible, but it is still branding.
4. **"Powered by VDO.Ninja" footers** that open `https://vdo.ninja` are in `meet.html`, `comms.html`, `mixer.html` and `remotemidi.html`.
5. **Branding column method.** "title" means the `<title>` names VDO.Ninja/VDON. "body xN" counts visible-text mentions after head, script and style are stripped. "logo img" means a logo `<img>` in the body. "JS-rendered strings" means the name appears only in script-built UI text (alerts, innerHTML). Meta-only mentions are not counted.
6. **Broken reference:** `svg.html` loads `svg2stl.html` into an iframe, and that file does not exist in the repo.
7. `stats.html` is a hard redirect to the external site `https://versus.cam`.

## Table

"Own params" lists the query keys the page reads with its own parser (`URLSearchParams` or similar), including its companion script where noted. "None" means it reads no query keys of its own. Pages with an iframe usually also hand the user's link or query on to `index.html`, whose parameters are covered by the index.html inventory.

| Path | Purpose | Category | Loads main.css | Loads engine | VDO.Ninja branding | Own params |
|---|---|---|---|---|---|---|
| `360.html` | Redirect stub to examples/360.html (keeps query/hash) | redirect/legacy | No (inline) | n/a (redirect) | Yes: title | passes query+hash through |
| `base64.html` | Converts custom CSS to base64 for the &b64css param | tool | No (inline) | No | Yes: title, body x1 | None |
| `browser.html` | Device/browser/hardware capability detector | tool | No (inline) | No | No | None |
| `browsercheck.html` | WebRTC and privacy capability analyzer | tool | No (inline) | No | Yes: title | None |
| `changepassword.html` | Room password hash generator (for &hash) | tool | No (inline) | No | Yes: title, body x6 | None |
| `check.html` | Guided camera/mic/network stream test, posts to results | tool | No (own check.css) +LineAwesome | iframe of local index.html | Yes: title | buffer, id, location, push, region, screen, screenshare, screentest, session, sid, ss, turn |
| `clipboard.html` | Shared clipboard over a P2P data channel | tool | No (inline) | No | Yes: title, body x3 | None |
| `cloud.html` | Google Drive / Dropbox cloud recording upload setup | tool | No (inline) | No | Yes: title, body x1 | None |
| `cloudflare.html` | Cloudflare TURN/Calls token helper and validator | tool | No (inline) | No | Yes: title, body x3 | None |
| `codeccomparison.html` | H.264 encoder performance comparison chart | tool | No (inline) | No | No | None |
| `codecs.html` | Video/audio codec support detector | tool | No (inline) | No | Yes: title, body x6 | results |
| `comms.html` | Comms app: multi-group intercom audio chat wrapper | app-view | No (inline) | iframe, HARDCODED https://vdo.ninja/ | Yes: body x1, 'Powered by' footer | api, dir, director, group, groups, groupview, gv, hidechat, l, label, mobile, osc, p, pass, password, push, pw, r, room, sid, video |
| `confirm.html` | Interstitial confirm before loading an external URL | tool | No (inline) | No | Yes: JS-rendered strings | clean, url |
| `control.html` | Camera operator console for remote cameras (bitrate, view switching) | app-view | No (inline) | iframe | Yes: title, body x1 | backgroundbitrate, bitrate, railbitrate, remote, v, videobitrate, view |
| `devices.html` | Lists audio/video input and output devices | tool | Yes (local) | No | No | None |
| `devices.json.html` | Dumps enumerateDevices() as raw JSON | tool | No (inline) | No | No | None |
| `director-messenger.html` | Send messages to a room director via the remote API | integration | No (inline) | No | Yes: body x1 | api, apiserver, id, wid |
| `dock.html` | Legacy OBS dock guest invite-link generator | integration | No (inline) | No | No | None |
| `docs.html` | In-app Markdown documentation viewer | docs/info | No (inline) | iframe | Yes: title, body x1, logo img | file, v |
| `drop.html` | VDO.Ninja Drop: P2P file sharing | app-view | No (inline) | iframe | Yes: title, body x3 | share, view, password |
| `dropbox-auth.html` | Dropbox OAuth callback page | integration | No (inline) | No | Yes: title | code, error, state |
| `electron.html` | Electron Capture landing/launcher page | integration | No (inline) +LineAwesome | No | Yes: body x1 | name, ver, version |
| `electroncapture.html` | Electron Capture deep link generator | integration | No (inline) | No | No | builds params only (no reads) |
| `examples/360.html` | 360-degree video viewer (A-Frame) | integration | No (inline) | iframe | Yes: title, body x1 | (360.js) v/view, p/pw/password |
| `examples/addtoscene.html` | IFRAME API demo: add guests to scene | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title, body x1 | None |
| `examples/bigmutebutton.html` | IFRAME API demo: big remote mute button | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title | None |
| `examples/buffer3.html` | Buffer3 audio sync comparison demo | integration | No (inline) | iframe | No | None |
| `examples/camera-sync.html` | Multi-camera clap-sync alignment tool | integration | No (own camera-sync.css) | No | Yes: title, body x1 | (camera-sync.js) v/view/V, pull, streamid |
| `examples/changepass.html` | Password hasher example | integration | No (inline) | No | Yes: title, body x1 | None |
| `examples/chat.html` | Chat shout overlay for OBS | integration | No (inline) | iframe | Yes: title | password, room, view |
| `examples/chatoverlay.html` | Clean chat overlay configurator for OBS | integration | No (inline) | iframe | Yes: title | password, room, view |
| `examples/chunked-buffer-iframe-api.html` | Chunked buffer control via IFRAME API | integration | No (inline) | iframe | Yes: title, body x1 | room, viewer, publisher |
| `examples/control.html` | Legacy layout console example | integration | No (inline) | No | Yes: title | room |
| `examples/custom_labels.html` | Custom name-label overlay | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title, body x1 | view |
| `examples/custom_overlay.html` | Dynamic overlay frame example | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title, body x1 | None |
| `examples/custom_video_switcher.html` | Custom video switcher example | integration | No (inline) | iframe | Yes: title | None |
| `examples/datachannel-pubsub.html` | SDK data channel pub/sub demo | integration | No (inline) | No | Yes: title, body x3 | None |
| `examples/degradation-preference.html` | Degradation preference test (view/push pair) | integration | No (inline) | No | Yes: title | None |
| `examples/draggable.html` | Draggable multi-view layout | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title | None |
| `examples/dual.html` | Dual-room side-by-side view | integration | No (inline) | iframe | Yes: title | None |
| `examples/dynamic-viewer.html` | SDK dynamic viewer demo | integration | No (inline) | No | Yes: title, body x3 | None |
| `examples/esports.html` | Esports POV toggler | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title | None |
| `examples/fileshare-preview.html` | File-share preview modes demo | integration | No (inline) | No | No | None |
| `examples/gamecontroller.html` | Gamepad input visualizer over data channel | integration | No (inline) | No | Yes: title | None |
| `examples/googleai.html` | Gemini Live vision/voice chat demo | integration | No (inline) | No | No | None |
| `examples/grid.html` | Grid builder of iframe URLs | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title | None |
| `examples/gtamap.html` | GTA-style mini-map overlay from sensor GPS | integration | No (inline) | iframe | Yes: title | demo, rotate, smooth, unit, zoom |
| `examples/guest-styler.html` | Guest video styler / CSS preset builder | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title, body x3 | None |
| `examples/iframe.inbound-stats.html` | IFRAME API inbound stats demo | integration | No (inline) | iframe | Yes: title, body x1 | None |
| `examples/index.html` | Examples gallery index | docs/info | No (inline) | No | Yes: title, body x13 | None |
| `examples/irl.html` | IRL camera + Twitch/Kick/YouTube chat combo | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title, body x4 | None |
| `examples/kick.html` | Kick chat + video combo | integration | No (inline) | iframe | Yes: title, body x4 | None |
| `examples/labelonly.html` | Label-only overlay for OBS | integration | No (inline) | iframe, HARDCODED https://vdo.ninja/ | Yes: title | password, room, view |
| `examples/midi.html` | MIDI controller example (hotlinks vdo.ninja main.css) | integration | Hotlinks https://vdo.ninja/main.css | No | Yes: title, body x2 | None |
| `examples/mixer-guest-controls.html` | Mixer guest-controls link builder demo | integration | No (inline) | No | No | None |
| `examples/mixer-recording.html` | Mixed-scene recording demo | integration | No (inline) | No | No | None |
| `examples/mixer.html` | Mixer sandbox example | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title | None |
| `examples/multi.html` | Multi-room monitor | integration | No (inline) | iframe | Yes: title | p, password, passwords, pw, r, room, rooms |
| `examples/music-sync-buffer-demo.html` | Delayed video for external music sync | integration | No (inline) | iframe | Yes: title, body x3 | room, viewer, publisher |
| `examples/muteguestiframe.html` | IFRAME API demo: mute guest | integration | No (inline) | iframe | Yes: title | None |
| `examples/noisegate.html` | Noise gate settings converter | integration | No (inline) | No | Yes: title | None |
| `examples/obs_remote/index.html` | OBS remote dashboard (server side) | integration | Hotlinks https://vdo.ninja/main.css | iframe | Yes: title | password, room |
| `examples/obs_remote/interface.html` | OBS remote controller (client side) | integration | Hotlinks https://vdo.ninja/main.css | iframe, HARDCODED https://vdo.ninja/ | Yes: title | password, room |
| `examples/obsremote.html` | OBS remote mini over data channel | integration | No (inline) | iframe, HARDCODED https://vdo.ninja/ | Yes: title, body x1 | id, push, session, streamid |
| `examples/overlay.html` | Overlay helper | integration | No (inline) | iframe | Yes: title, body x1 | None |
| `examples/p2p.html` | P2P data tunnel demo | integration | No (inline) | iframe, HARDCODED https://vdo.ninja/beta | Yes: title, body x1 | None |
| `examples/powerpoint.html` | PowerPoint remote control | integration | No (inline) | iframe | Yes: title, body x2 | r, room |
| `examples/ptz.html` | PTZ remote control example | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title, body x1 | v, view |
| `examples/remoteapi.html` | Remote API playground | integration | No (own nes.min.css) | No | Yes: title | ID, api, id, osc, wid |
| `examples/rip.html` | Canvas relay demo | integration | No (inline) | iframe | Yes: title | None |
| `examples/room-data.html` | Data-only room demo | integration | No (inline) | iframe | Yes: title | password, room |
| `examples/rotated.html` | Rotated scene output | integration | No (inline) | iframe | Yes: title | link, rotate |
| `examples/roundrobin.html` | Round-robin room viewer | integration | No (inline) | iframe | Yes: title | audio, interval, room, seconds, showstatus |
| `examples/sandbox.html` | Developer API sandbox | integration | No (inline) | No | Yes: title, body x16 | ID, api, id, osc, wid |
| `examples/sensoroverlay.html` | Sensor data overlay | integration | No (inline) | iframe | Yes: title | forwards whole query to `../` iframe |
| `examples/sensors.html` | Sensors dashboard | integration | No (inline) | iframe | Yes: title, body x1 | None |
| `examples/simple-iframe-replacement.html` | SDK data channel replacement demo | integration | No (inline) | No | Yes: title, body x3 | None |
| `examples/simplelink.html` | Simple push/view link generator with device pickers | integration | No (inline) | No | Yes: title | None |
| `examples/slidingzoom.html` | Sliding remote zoom controller | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title, body x1 | v, view |
| `examples/socal.html` | Social Stream Ninja integration hub | integration | No (inline) | iframe | Yes: title, body x1 | None |
| `examples/status.html` | Status ticker overlay | integration | No (inline) | iframe | Yes: title | password, room, view |
| `examples/switchmics.html` | Switch between two mic sources | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title | a, b, la, lb |
| `examples/teleprompt.html` | Teleprompter controller | integration | No (inline) | No | Yes: title | None |
| `examples/teleprompter.html` | Teleprompter display | integration | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title | flip, hide, hidebar, hidemenu, link, rotate, twitch, youtube |
| `examples/test_overlay.html` | Static VDO.Ninja logo overlay (test asset) | integration | No (inline) | No | Yes: logo img | None |
| `examples/testsdp.html` | SDP compression tool | tool | No (inline) | No | No | None |
| `examples/turn-only-example.html` | SDK TURN-only example | integration | No (inline) | No | Yes: title, body x3 | None |
| `examples/twitch.html` | Redirect stub to examples/irl.html | redirect/legacy | No (inline) | n/a (redirect) | Yes: title | passes query+hash through |
| `examples/waitingroom.html` | Waiting room overlay | integration | No (inline) | iframe | Yes: title | forwards whole query to `../` iframe |
| `examples/webhid.html` | WebHID / Stream Deck demo | integration | No (inline) | No | Yes: title | None |
| `examples/webxr-ar-receiver.html` | WebXR AR receiver | integration | No (inline) | iframe | Yes: title | id, streamid, view |
| `examples/webxr-ar-sender.html` | WebXR AR 6DoF sender | integration | No (inline) | iframe | Yes: title, body x1 | None |
| `examples/wireless.html` | Wireless relay lab | integration | No (inline) | iframe | Yes: title | room |
| `examples/youtube.html` | YouTube chat + video combo | integration | No (inline) | iframe | Yes: title | None |
| `examples/zoom.html` | Zoom capture helper | integration | No (inline) | No | Yes: title | None |
| `fonts.html` | Installed font detector and &font preview | tool | No (inline) | No | Yes: body x1 | font |
| `h265.html` | H.265/HEVC WebRTC support checker | tool | No (inline) | No | Yes: body x2 | None |
| `hash.html` | Redirect stub to changepassword.html | redirect/legacy | No (inline) | n/a (redirect) | No | None |
| `icecast.html` | Icecast/AzuraCast audio publish link generator | tool | No (inline) | No | Yes: title, body x5 | p, pull, push, streamid, v, view |
| `iframe.html` | IFRAME API interactive developer console | docs/info | No (own iframe.css) | iframe demos (iframe-examples.js) | Yes: title, body x5 | None |
| `ip.html` | IP address decoder | tool | No (inline) | No | No | None |
| `ipcam.html` | Publish an MJPEG IP camera feed | tool | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: body x1 | camera, source, url |
| `meet.html` | Meet app: simple chat-room wrapper around index.html | app-view | No (inline) | iframe of local index.html | Yes: body x1, 'Powered by' footer | api, dir, director, group, groups, hidechat, l, label, mobile, osc, p, pass, password, push, pw, r, room, sid |
| `micsettings.html` | Audio device constraint inspector | tool | No (inline) | No | No | None |
| `mictest.html` | Microphone loudness visualizer | tool | No (inline) | No | No | None |
| `midi.html` | MIDI controller test app | tool | Yes (local) | No | Yes: title, body x4 | None |
| `midiconfig.html` | MIDI mode configuration sender | tool | No (inline) | No | Yes: title, body x2 | None |
| `misc/mobile-uplink-packet-flow.html` | Mobile uplink packet-flow explainer lab | docs/info | No (inline) | No | Yes: title, body x11 | None |
| `misc/recording-segments.html` | Recording-in-segments demo | docs/info | No (inline) | No | Yes: title | None |
| `misc/timer.html` | Countdown timer overlay (OBS browser source) | tool | No (inline) | No | No | None |
| `misc/unstable-connection-builder.html` | Builds links tuned for unstable connections | tool | No (inline) | iframe | Yes: title, body x2 | None |
| `mixer.html` | Mixer app: director layout/scene mixer | app-view | No (inline) | iframe of local index.html | Yes: body x4, 'Powered by' footer | api, dir, director, hidedirector, ltb, mixercontrols, osc, p, pass, password, pw, r, room, transparent, updateonslotchange |
| `monitor.html` | Remote stream monitor (bitrate, loss, retransmits) | tool | No (inline) | iframe of local index.html | Yes: title, body x1 | password, remote, room, sid, view |
| `multi.html` | iFrame mixer: combine several URLs in one layout | tool | No (inline) | iframe | No | None |
| `notifications/index.html` | Push-notification subscriptions for rooms/streams | tool | No (inline) | No | Yes: title, body x12 | (app.js) r/room/roomid, dir/director, password, hash, id, permaid, push, pull, v/view, streamid, scene/scn, subscribe, topic, url, poke |
| `obfuscate.html` | Encrypts URL params into ?i= (prompt-based) | tool | No (inline) | No | Yes: JS-rendered strings | None |
| `obs/index.html` | OBS control dock (OBS WebSocket + VDO.Ninja) | integration | No (inline) | iframe; base URL setting defaults to https://vdo.ninja | Yes: title, body x3 | None |
| `obs/simple.html` | Simplified OBS control dock | integration | No (inline) | iframe; base URL setting defaults to https://vdo.ninja | Yes: title, body x2 | None |
| `password.html` | Redirect stub to changepassword.html | redirect/legacy | No (inline) | n/a (redirect) | No | None |
| `plugin.html` | OBS plugin landing page (direct publish) | docs/info | No (inline) | No | Yes: title, body x13, logo img | None |
| `podcast/cloud.html` | Cloud upload setup (podcast copy of cloud.html) | tool | No (inline) | No | Yes: title, body x1 | None |
| `podcast/index.html` | Redirect to ../?podcast (Podcast Studio lives in index.html) | redirect/legacy | No (inline) | n/a (redirect) | No | appends query to `../?podcast` |
| `popout.html` | Chat pop-out window | app-view | No (inline) | iframe of local index.html | Yes: title, body x1 | data, id, label, password, room, view |
| `portscan.html` | Port/TURN reachability test | tool | No (inline) | No | Yes: title | autorun, concurrency, host, http, https, maxports, timeout, turn, turnhost, turnpass, turntcp, turnudp, turnuser, wspath, wss |
| `portscan/index.html` | Redirect stub to /portscan.html | redirect/legacy | No (inline) | n/a (redirect) | No | passes query+hash through |
| `ptz.html` | PTZ controller with preview and talkback | tool | No (inline) | iframe | Yes: title | autoplay, clean, cleanoutput, invertpan/paninvert, inverttilt/tiltinvert, mirrorpreview, mode, noaudio, novideo, overlayautohide, overlayopacity, overlaytransparent, previewpad, remote, rotatepreview, stage, talkback, target, url, v/view |
| `qr.html` | Serverless Connect: QR-code signalling | app-view | No (inline) | Own engine (qrconnect.js); iframe | Yes: title, body x1 | apiTransport, c, camera, code, facing, parentOrigin, scan |
| `recorder/index.html` | Local media recorder and playback test | tool | No (inline) | No | No | denoise, noautogain |
| `recorder/midi.html` | MIDI event recorder | tool | No (inline) | No | No | None |
| `recorder/monitor.html` | Self-monitor audio input devices | tool | No (inline) | No | No | None |
| `remotemidi.html` | Remote MIDI controller app (room-based) | tool | No (inline) | iframe of local index.html | Yes: body x2, 'Powered by' footer | dir, director, password, room |
| `resolution.html` | Camera resolution mode tester | tool | No (inline) | No | Yes: title, body x1 | None |
| `resolutionchecker.html` | Resolution and FPS checker | tool | No (inline) | No | Yes: title | autorun, codecs, duration, tests |
| `results.html` | Speed/stream test results viewer | tool | No (inline) +LineAwesome | No | Yes: title | id |
| `room.html` | Redirect to index.html (keeps query/hash) | redirect/legacy | No (inline) | n/a (redirect) | Yes: title, body x1 | passes query+hash through |
| `speedtest.html` | Video streaming quality / speed test | tool | No (own speedtest.css) +LineAwesome | iframe of local index.html | Yes: title, body x1 | buffer, record, screen, screenshare, screentest, sid, ss, turn |
| `stats.html` | Redirect to external versus.cam | redirect/legacy | No (inline) | n/a (redirect) | No | None |
| `streamdeck.html` | Stream Deck + Mixer setup guide | docs/info | No (inline) | No | Yes: title, body x50 | None |
| `studio/index.html` | Live Studio: producer scenes and guests UI | app-view | No (own styles.css) +LineAwesome | iframe of local index.html | Yes: title | (app.js) r/room, dir/director, pw/pass/password, bc/broadcast |
| `stun.html` | ICE candidate viewer | tool | No (inline) | No | No | None |
| `supports.html` | Browser and camera supported-constraints viewer | tool | Yes (local) | No | No | None |
| `svg.html` | SVG import/edit/export tweak tool | tool | No (inline) | iframe | Yes: body x1 | None |
| `tabletop/index.html` | Tabletop: game-room UI with scenes | app-view | No (own styles.css) +LineAwesome | iframe of local index.html | Yes: title | (app.js) r/room, pw/pass/password, gm, name, label, novideo, novideoroom, tabletopnovideo |
| `teleprompt.html` | Redirect stub to teleprompter.html | redirect/legacy | No (inline) | n/a (redirect) | No | None |
| `teleprompter.html` | Teleprompter display (root copy) | tool | No (inline) | iframe (refs https://vdo.ninja/ default) | Yes: title | flip, hide, hidebar, hidemenu, link, rotate, twitch, youtube, zoom |
| `timecode.html` | MIDI timecode generator | tool | No (inline) | No | No | None |
| `translate.html` | Live translation account setup | tool | No (inline) | No | Yes: title, body x1, logo img | return |
| `tts.html` | Lists available speech-synthesis voices | tool | No (inline) | No | No | None |
| `ttstest.html` | TTS audio stream test | tool | No (inline) | No | No | None |
| `urlencode.html` | URL encoder for nested links | tool | No (inline) | No | Yes: title, body x9 | None |
| `whep.html` | Redirect stub to whip.html | redirect/legacy | No (inline) | n/a (redirect) | No | None |
| `whip.html` | WHIP/WHEP client and link builder | tool | No (inline) +LineAwesome | No | Yes: body x27 | builds `urlParams` but reads no named keys; tab state in `#hash` |
| `whip/index.html` | Redirect stub to ../whip.html | redirect/legacy | No (inline) | n/a (redirect) | No | None |
| `whiteboard.html` | Collaborative whiteboard for streams | tool | No (inline) | iframe | Yes: body x1 | audio, framegrabaudio |
| `zoom.html` | Local camera picker with full-window view (Zoom capture) | tool | No (inline) | No | No | None |

## Most important pages for the redesign

1. **`studio/index.html`** (+ `studio/app.js`, `studio/styles.css`): the producer surface and the most likely flagship of "BytesNation Studio". It has its own stylesheet and a director iframe of `../index.html`, so it needs both its own reskin and a themed main app.
2. **`mixer.html`**: the 247 KB director/scene mixer, the largest non-index surface. It uses jQuery UI CSS, has a "Powered by VDO.Ninja" footer and 39 VDO.Ninja mentions in its source, and Stream Deck and Companion flows point at it (`streamdeck.html`).
3. **`meet.html` and `comms.html`**: the user-facing room wrappers. Comms needs its hardcoded `https://vdo.ninja/` iframe base fixed before any visual work, or it will keep running on upstream.
4. **`tabletop/index.html`**: a full app surface with its own stylesheet and a `../index.html` iframe.
5. **`obs/index.html` and `obs/simple.html`**: the OBS control docks. They have the most VDO.Ninja mentions in their source of any page (278 and 185, counting code), use "VDO.Ninja" in their headings and default to the upstream base URL. Streamers see them all the time inside OBS.
6. **`check.html`, `speedtest.html`, `results.html`**: the guest-facing pre-flight test flow. These are the first pages a guest sees, they show the VDO.Ninja logo and name, and they post results to `vdo.ninja/results`.
7. **`qr.html`** (Serverless Connect, own `qrconnect.js` engine) and **`drop.html`** (P2P file sharing): standalone products with heavy branding and no shared CSS.
8. **`popout.html`, `control.html`, `ptz.html`, `whip.html`**: operator-facing tools reached from the main app. `whip.html` has 27 visible brand mentions.
9. **`examples/index.html`** and **`docs.html`**: the public front doors to the integration catalog and the docs, both heavily branded. The ~70 example pages are mostly developer demos that can be rebranded in bulk (title suffix "- VDO.Ninja", og meta, hotlinked CSS and logo) rather than redesigned one by one.
10. **Redirect stubs** (`room.html`, `podcast/index.html`, `360.html`, `hash.html`, `password.html`, `teleprompt.html`, `whep.html`, `whip/index.html`, `portscan/index.html`, `examples/twitch.html`, `stats.html`): no UI to restyle, but they must keep working for parity. `podcast/index.html` shows that Podcast Studio lives inside `index.html` (`?podcast`), so it falls to the index.html inventory.
