# Views and controls inventory (index.html engine)

Scope: `index.html` (static markup), `main.js` (boot, URL params), `lib.js` (imperative UI), `webrtc.js` (session defaults), `auth-client.js`, `translation/controller.js`, plus `room.html` and `meet.html`. Line numbers are from the working tree as read on 2026-11-24. `index.html:N` is the markup line of the element; handler lines point at the function definition.

Conventions used in the tables:

- "Shown/hidden by" names the URL param (`&param`) or session flag and the line that flips visibility. `session.X` flags are set from URL params in `main.js`; the param is given where one exists.
- `hidden` means the CSS class `hidden`; `display:none` means inline style. Many elements use both, so a restyle must keep both mechanisms working.
- Handlers in `lib.js` that are defined inside an IIFE or as object methods are cited at the enclosing definition.
- `getById(id)` (webrtc.js:281) never throws: a missing id falls back to the PiP window, then to a detached `<span>` (webrtc.js:292-295). Renaming or dropping any id in this file breaks its feature silently, with only a `log()` line. Treat every id here as API.
- `enterPressedClick(event,this)` (lib.js:48160) is wired on almost every control-bar `div` and tile for keyboard activation; it is not repeated per row.

## Top-level view containers and view switches

### Containers

| Container | Selector | Role |
|---|---|---|
| Page root | `body#main.main` | Starts `class="main hidden"`; un-hidden at boot (main.js:686, main.js:3164-3203 when `&css` loads). Receives view-state classes listed below. |
| Header bar | `#header` | Logo, quick join, invite links, director room header (`#head1`..`#head9`). |
| Landing menu | `#mainmenu.row` | Tile grid (`#container-N`, `.column.card`). Emptied and reused as the "waiting for stream" canvas in view/scene mode (main.js:8381-8441). |
| Info blurb | `#info.fullcolumn` | Landing "What is VDO.Ninja" text. |
| Footer credits | `#credits.footer` | ToS / privacy links; replaced by version string on bare landing (main.js:7369). |
| Director layout | `#directorlayout.directorsgrid` | Director control room: `#roomHeader`, `#directorLinks1/2`, `#customizeLinks`, `#guestFeeds`. Shown by `createRoomCallback` (lib.js:31540). |
| Grid / mixer | `#gridlayout` | All rendered video for guests, scenes, view-only, self preview after publish. Built by `updateMixerRun` (lib.js:7843). |
| Control bar | `#controlButtons > #subControlButtons` | Floating in-call buttons. Draggable on desktop (`makeDraggableElement`, main.js:1377). |
| Settings drawer | `#popupSelector` | Device pickers, effects, user/audio/video advanced tabs. |
| Chat | `#chatModule` | Chat panel. |
| Hidden templates | `#hiddenElements` (two instances, index.html:1940 and 1951), `#controls_blank`, `#controls_directors_blank`, `#transferSettingsTemplate`, `#hangupTemplate`, meter templates (index.html:3338-3376) | Cloned by lib.js; must keep ids. |
| Mini task bar | `#miniTaskBar` | Bottom-right: user list toggle, `#legal`, bug/help/language/calendar buttons. |

### What switches views

| Switch | Mechanism | Where |
|---|---|---|
| Landing (no params) | Nothing set: `#mainmenu`, `#info`, `#credits`, `#header` visible; tiles 1,2,3,4 + `#dropButton` visible, others `hidden` until `#dropButton` | index.html defaults; `dropDownButtonAction` lib.js:48690 |
| Tile expand / collapse | Clicking any `.column` adds `in-animation`, then on `animationend` adds `skip-animation`, shows `.container-inner` and `.close`, adds `hidden2` to `#header, #credits, .columnfade` siblings. `.close` reverses it and calls `cleanupMediaTracks()` | lib.js:75913 (click), lib.js:76037 (animationend), lib.js:75972 (close) |
| Auto-expanded tile | Tile gets `skip-animation` and loses `pointer` up front | e.g. `&director` landing main.js:1992, `&webcam` main.js:7761, `&fileshare` main.js:2024, `&website` main.js:2037, `&screenshare` main.js:2444 |
| Director view | `session.director` (`&director`/`&dir`, main.js:627). Room given: `createRoom()` (lib.js:30738) then `createRoomCallback()` (lib.js:31533) un-hides `#directorlayout`, hides `#gridlayout` unless `&previewmode`, hides `#head1/#head2`, shows `#head4`, `#roomHeader`, control bar. No room: `directorLanding` shows `#container-1` only (main.js:1991) | main.js:8214-8264 |
| Director preview mode | `session.switchMode` (`&previewmode`, main.js:597) or `#togglePreviewMode` swaps `#directorlayout` and `#gridlayout` | `switchModes` lib.js:7582 |
| Room guest | `session.roomid` (`&room`/`&roomid`/`&r`, main.js:7323). Hides non-join tiles, retitles `#add_camera`/`#add_screen` (main.js:8053-8145) | main.js:8053 |
| Push (publish without room) | `session.permaid` (`&push`/`&id`/`&permaid`, main.js:7238). Hides `#container-1`, `#container-4`, `#dropButton` | main.js:7238-7316 |
| Scene output | `session.scene` (`&scene`/`&scn`, main.js:2723). Hides `#header`, `#info`, `#mainmenu`, `#translateButton`; `joinRoom()`; `window.onresize = updateMixer` | main.js:8167-8199 |
| View-only output | `session.view` (`&view`/`&v`/`&streamid`/`&pull`, main.js:4097), or `session.whepInput` (`&whep`), `session.whipView` (`&whip`). Sets `#main.className="main"`, hides `#credits`, clears `#mainmenu` into wait canvas, calls `play()` | main.js:8265-8298, 8342-8471 |
| Clean output | `session.cleanOutput` (`&clean`/`&cleanoutput`/`&cleanish`, main.js:565). Hides header, control bar, credits, help/report/calendar/translate; transparent video background | main.js:6230-6254 |
| OBS / studio host | `window.obsstudio` or MELD sets `session.studioSoftware` (main.js:591); hides `#header` (main.js:6270), `#saveRoom`, `#miniTaskBar` (main.js:4558) | main.js:591, 4554 |
| Hang up | `hangup()` replaces `#main.innerHTML` with `#hangupTemplate` contents | lib.js:23115 |
| Auth gate | `&auth`/`&requireauth`/`&universaltoken`/`&authtoken` add `hidden2` to `#mainmenu` and `#header` until auth resolves | main.js:451-456, 7364 |
| Password mismatch | Shows `#request_info_prompt`, hides `#mainmenu`, `#head1` | main.js:3442-3456 |

### Classes on `#main` / `body` that encode state

| Class | Set by | Meaning |
|---|---|---|
| `hidden` (body) | index.html:82; removed main.js:686, 3164-3203 | Pre-boot hide |
| `darktheme` / `whitetheme` (body) | main.js:4772-4790 (`&darkmode`, `&lightmode`, `&whitemode`) | Theme |
| `appmode` | main.js:2430 (`&app`) | App-launcher header layout |
| `fullscreenOBSControl` | main.js:2700 (`&obscontrols=full`) | OBS remote-control-only page |
| `mirror` | main.js:6516 (`&mirror`) | Mirror local preview |
| `forcecontrols` | main.js:664 (`&controls`), lib.js:58020 (context menu Controls) | Force native video controls |
| `onair` / `ondeck` / `recording` | `applySceneState` lib.js:4988 (lib.js:5045-5092) | OBS tally state |
| `makeSmallerDirectorRoom` | `#roomSettings` pin button (index.html:2976) | Room settings pinned to side |
| `hidden2` (on `#header`, `#credits`, `.columnfade`) | lib.js:76037, main.js:451 | Tile-expanded / auth pending |
| `permahide` (various) | `hideHomeCheck` lib.js:7512 (`&hidehome`) | Strip landing chrome |

## Header bar (#header)

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Logo / home link | `#logoname` (contains `#qos` "V") | `logo-header` "VDO.Ninja" | `href="./"` | Hidden `&app` (main.js:2428), rtc.ninja/custom host blanks it (main.js:491, 543); `permahide` with `&hidehome` |
| Connection-quality glyph | `#qos` | "V" | none (text color driven by stats) | Replaced with plug icon on self-hosted domains (main.js:542) |
| Quick-join room name | `#joinroomID` | placeholder "Join by Room Name here" | `onkeyup` `jumptoroom(event)` lib.js:11826 | `#head1` hidden in room/director/scene/view modes (main.js:8173, 31652) |
| Quick-join GO | `#jumptoroomButton` | "GO" ("Join Room" in `&app`, main.js:2431) | `jumptoroom()` lib.js:11826 | Same as `#head1` |
| Load URL input | `#joinbyURL` | placeholder "Load a website URL" | none (read by `jumptoURL`) | `#head1a` shown only with `&app` (main.js:2429) |
| Load URL button | `#head1a > button` | "Load URL" | `jumptoURL(event)` lib.js:11862 | `&app` |
| Spare slot | `#head5` | none | none | Always `hidden` (no references found) |
| OBS copy hint | `#head3 #copythisurl` | `copy-this-url` | none | Hidden by default; hidden in room/push/view (main.js:7757, 8142, 8391); shown only when `session.permaid===null && roomid==""` path (main.js:8202, commented) |
| Reshare link | `#reshare.task.grabLinks` `data-menu="context-menu"` | (URL text) | `copyFunction(this,event)` lib.js:57078 | `#head3a`; removed from DOM for directors (lib.js:31719) |
| Copy reshare | `#head3a i.la-paperclip` | title "Copy link to clipboard" | `copyFunction(getById('reshare'))` lib.js:57078 | `#head3a` |
| Save session | `#head3a span` "💾" | title "Save and ask to reload..." | `saveRoom(this)` lib.js:648 | `#head3a` |
| Invite label | `#head9 #copythisurl2` | `invite-others-to-room` | none | `#head9` hidden by default; shown by lib.js after guest publish |
| Invite link | `#inviteLinkURL.task.grabLinks` `data-menu="context-menu"` | (URL) | `copyFunction` lib.js:57078 | `#head9` |
| Copy invite | `#head9 i.la-paperclip` | title "Copy link to clipboard" | `copyFunction(getById('inviteLinkURL'))` | `#head9` |
| Invite QR | `#head9 span` (title says "Save...", actually QR) | none | `showInviteQR()` lib.js:11240 | `#head9` |
| Director room label | `#head4` with `#dirroomid` | `you-are-in-the-control-center` "Control center for room:" | none | `#head4` className cleared in `createRoomCallback` (lib.js:31654) |
| Save room | `#saveRoom` "💾" | title "Will remember the room..." | `saveRoom(this)` lib.js:648 | Hidden in OBS/MELD (main.js:593), lib.js:713/722 |
| Toggle preview mode | `#togglePreviewMode` "🪟" | title "Toggle between the director control-room view and a scene preview-mode" | `switchModes()` lib.js:7582 | Director header |
| Mesh debug | `#meshDebugBtn.las.la-project-diagram` | aria "Open mesh network debug" | `openMeshVisualization()` lib.js:37635 | Director header |
| Guest room label | `#head2` with `#roomid` | `joining-room` "You are in room" | none | Shown with `&showheader` (main.js:6268); hidden in director (lib.js:31653) and scene/view |
| Director-only-hears notice | `#head6` | `only-director-can-hear-you` | none | Toggled by director solo-talk messages (lib.js) |
| Director muted you | `#head7` | `director-muted-you` | none | Remote mute message |
| Director disabled camera | `#head8` | `director-video-muted-you` | none | Remote video mute message |
| OBS state badge | `#obsState` "ACTIVE" | none | none | OBS visibility tracking; `noheader` class with `&hideheader` (main.js:6261) |
| Hide header | n/a | n/a | n/a | `&hideheader`/`&noheader`/`&hh` (main.js:6257), `&hidemenu`/`&hm` (main.js:6332); force with `&showheader` (main.js:6262) |

## Landing / main menu tiles (#mainmenu)

Tile click behavior for tiles without an `onclick` is the generic expand in lib.js:75913. Each expanded tile has a `.outer.close` "Back" (`data-translate="back"`), handled by lib.js:75972.

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Create a Room tile | `#container-1` | `add-group-chat` "Create a Room" | expand lib.js:75913 | Visible on landing; hidden in room/push (main.js:8078, 7283); `permahide` `&hidehome`; auto-expanded `&director` with no room (main.js:1992) |
| Camera tile | `#container-3` (h2 `#add_camera`) | `add-your-camera` "Add your Camera to OBS"; retitled `join-room`, `join-room-with-mic`, `join-room-with-camera`, `join-room-with-video`, `share-your-mic`, `share-your-camera`, `click-start-to-join` (main.js:8117-8140, 7287, 4896) | `previewWebcam()` lib.js:56919 | Hidden by `&screenshare` (main.js:2441); auto-expanded `&webcam`/`&wc` (main.js:7761) |
| Microphone-only tile | `#container-3a` (h2 `#add_microphone`) | `add-your-microphone`; `join-room-with-mic-only` | `previewWebcam(true)` lib.js:56919 | `hidden` unless `&miconlyoption`/`&moo` in a room (main.js:8129) |
| Screen share tile | `#container-2` (h2 `#add_screen`) | `remote-screenshare-obs`; retitled `share-screen-with-room`, `share-your-screen` | expand lib.js:75913 | Hidden `&app` (main.js:2427), `&webcam` (main.js:7756), mic+video disabled (main.js:4898), rtc.ninja (main.js:500) |
| Reusable invite tile | `#container-4` | `create-reusable-invite` | `loadQR()` lib.js:11224 | Hidden in room/push/rtc.ninja (main.js:8079, 7284, 498); `permahide` `&hidehome` |
| View Only tile | `#container-22` | `view-only` | inline: sets `&solo=1`, reloads | `hidden` + `display:none` unless `&room` + single `&view` and no other mode (main.js:8147-8165); excluded from expand (lib.js:75914) |
| More options chevron | `#dropButton` | title "More Options" | `dropDownButtonAction()` lib.js:48690 (removes itself, un-hides every `div.column.card`) | Hidden on mobile (main.js:4912), in push/room, rtc.ninja, `&hidehome` |
| Stream media file tile | `#container-5` | `share-local-video-file` | expand | `hidden`; shown by `#dropButton` or `&fileshare`/`&fs` (main.js:2024) |
| Share website tile | `#container-6` | `share-website-iframe` | expand | `hidden`; `&website`/`&iframe` (main.js:2037, 2086), `&framegrab` (main.js:2046) |
| WHIP join tile | `#container-18` | `whip-in` "Join Room via WHIP" | expand | `hidden`+`display:none`; `&whipme` (main.js:1188) |
| Speed test | `#container-7` | `run-a-speed-test` | `window.location='./speedtest.html'` | `#dropButton`; hidden in room (main.js:8081) |
| Mixer | `#container-8` | `try-the-mixer-out` | `./mixer.html` | same |
| Live Studio | `#container-23` | `try-the-live-studio` | `./studio/` | same |
| Invite Cam | `#container-26` | `try-invite-cam` | `https://app.invite.cam/` | same |
| Versus.cam | `#container-14` | `try-out-versus-cam` | `https://versus.cam` | same |
| Podcast Studio | `#container-21` | `try-the-podcast-studio` | `./?podcast` | same |
| Group Voice Comms | `#container-15` | `voice-comms-app` | `./comms.html` | same |
| Whiteboard | `#container-20` | `try-the-whiteboard` | `./whiteboard.html` | same |
| Guides | `#container-9` | `read-the-guides` | `https://guides.vdo.ninja` | same |
| Link generator | `#container-13` | `wizard-link-generator` | `https://linkgen.vdo.ninja` | same |
| Docs | `#container-10` | `get-full-documentation` | `https://docs.vdo.ninja` | same |
| Native apps | `#container-11` | `get-the-native-app` | docs URL | same |
| OBS plugin | `#container-24` | `try-the-obs-plugin` | github.io URL | same |
| Game capture | `#container-25` | `try-game-capture` | `https://vdo.ninja/gamecapture` | same |
| VST plugin | `#container-28` | `try-the-vst-plugin` | github.io URL | same |
| Browser extension | `#container-29` | `try-browser-capture` | `https://extension.vdo.ninja/` | same |
| Stream Deck | `#container-30` | `try-stream-deck` | github.io URL | same |
| Electron Capture | `#container-31` | `try-electron-capture` | `https://electroncapture.app/` | same |
| More tools | `#container-32` | `more-production-tools` | docs URL | same |
| Source code | `#container-19` | `get-the-source-code` | `https://github.vdo.ninja` | same |
| Sponsor | `#container-12` | `show-your-support` | docs URL | same |
| Meshcast | `#container-27` | `try-meshcast` | `https://app.meshcast.io/` | same |
| Publish via WHIP | `#container-17` | `publish-via-whip` | `./whip` | same |
| Share via WHEP tile | `#container-16` | `share-whepsrc` | expand | `#dropButton` |
| Previous session banner | `#lastSavedRoom` with `#lastSavedRoomName` | "A previous session was found using room:" | none | Shown when storage `directorOtherSettings.roomid` exists (main.js:8489-8495) |
| Load previous session | `#goToLastSavedRoom` | "Load the previous session" | assigned `createRoom(false,true)` main.js:8492 (lib.js:30738) | with `#lastSavedRoom` |
| Wrong-link warning | `#unexpectedPushLink` | "If this page is unexpected, double check your links." | none | Shown in OBS when a push link is opened (main.js:7320, 8211) |
| Remember stream ID (mobile) | `#rememberStreamID`, `#rememberStreamIDcheck` | title "Remember and reuse the provided stream ID on each visit" | read in `publishWebcam` lib.js:27505 | `session.mobile && !push && !room` (main.js:7374) |

## Create room panel (#container-1 expanded)

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Room name | `#videoname1` | `room-name`; placeholder "Enter a room name here" | `checkStrengthRoom(event,'securityLevelRoom')` lib.js:3130; Enter: `enterPressed(event,createRoom)` lib.js:48176 | Prefilled with room id in room mode (main.js:8075) |
| Random room name | `button.randomRoomName` | title "Generate a random room name" | inline `session.generateRandomString()` webrtc.js:870 | always |
| Strength meter | `#securityLevelRoom` | none | `checkStrengthRoom` lib.js:3130 | `display:none` until typing |
| Password | `#passwordRoom` | `password-input-field` | `checkStrengthRoom`; Enter `createRoom` | Disabled for SSO rooms (`#passwordRoomSSONote`) |
| SSO password note | `#passwordRoomSSONote` | "SSO rooms use a managed room secret..." | none | `toggleSSOOptions` auth-client.js:1411 |
| Guests see only director | `#broadcastFlag` | `guests-only-see-director` | read in `createRoomCallback` lib.js:31545 | always |
| Director performs | `#showdirectorFlag` | `scenes-can-see-director` | read lib.js:31593 | always |
| Preferred codec | `#codecGroupFlag` (select) | `default-codec-select` | read lib.js:31610 | always |
| Use SSO | `#ssoRoomOptionRow #useSSOForRoom` | "Use SSO for this room" | `toggleSSOOptions(this.checked)` auth-client.js:1411 | Row hidden until `auth-client.js` loads and `vdoAuth.isSupported()` (main.js:436-448) |
| SSO guest access | `#ssoOptions input[type=radio]` (public/authenticated/allowlist) | "Guest access: ..." | inline toggles `#preAllowlistRow` | `#useSSOForRoom` checked |
| Pre-allowlist | `#preAllowlistCSV` | "Allowed list (comma-separated; ...)" | read at create | `allowlist` radio |
| Require approval | `#requireApprovalForRoom` | title "Require the director to approve guests..." | read in `createRoom` lib.js:30889 | always |
| Enter control center | `button.gobutton.gowebcam` | `enter-the-rooms-control` | `createRoom()` lib.js:30738 | always |
| Tips toggle | `button.roomnotes-toggle` | `show-tips` | `toggle(getById('roomnotes'),this)` | always |
| Tips list | `#roomnotes` | `added-notes` | none | via tips toggle |
| Join as participant | `button.gobutton` | `join-the-room-basic`; lead-in `looking-to-just-chat-and-not-direct` | `jumptoroom2()` lib.js:11798 | always |

## Camera publish and guest join flow (#container-3 expanded)

Flow: tile click → `previewWebcam()` lib.js:56919 → `setupWebcamSelection()` lib.js:56273 → `gotDevices()` lib.js:34791 fills pickers → `#gowebcam` becomes "Start" → `publishWebcam(btn)` lib.js:27467 → `session.publishStream` lib.js:45113 + `session.postPublish` lib.js:45527, reveals control bar (lib.js:27634-27715). With `&autostart`/`&aj`, `previewWebcam` auto-publishes (lib.js:57020). Display name: `&label`/`&l` with no value prompts via `promptAlt("enter-display-name")` (main.js:3501; lib.js:1875); `&defaultlabel`/`&ls` prompts with suggestion (main.js:3528).

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Local preview video | `video#previewWebcam.previewWebcam.task` `data-menu="context-menu-video"` | title "Right-click this video for additional options" | `oncanplay` `updateStats()` lib.js:20703; context menu lib.js:57750 | `.miconly` class when `&vd=0` (main.js:4894) |
| Ask for permissions | `#getPermissions` | `ask-for-permissions` | `requestBasicPermissions()` lib.js:55701 | `display:none`; shown when permission state needs a prompt, hidden on autostart (lib.js:57024) |
| Start / Join | `#gowebcam.gowebcam` | `waiting-for-camera`, then `start`, `waiting-for-mic-to-load`, `waiting-for-camera-to-load` | `publishWebcam(this)` lib.js:27467; Alt+S (main.js:10974) | disabled until `dataset.ready`/`audioready` (lib.js:56301-56426) |
| Consent warning | `#consentWarning` | `privacy-disabled` | none | `&consent` (main.js:4928) |
| Guest tips | `#guestTips` with `li.guest-tip-item` | `for-the-best-possible-experience-make-sure`, `your-device-is-powered`, `your-connection-is-hardwired-instead-of-wifi`, `you-are-using-headphones-earphones`, `close-other-video-apps`, `use-quiet-room`, `face-good-lighting` | none | `&tips` |
| Camera picker | `#videoSourceSelect` (in `#videoMenu`) | `video-source` | `videoSelect.onchange` lib.js:56313 | `#videoMenu` hidden by `&vd=0`/`&miconly` (main.js:2006, 4832) |
| Resolution gear | `#gear_webcam` | none | `toggle(getById('videoSettings'))` | always with `#videoMenu` |
| Resolution radios | `#webcamquality` form: `#4kquality` (-2), `#maxres` (-1), `#fullhd` (0), `#halfhd` (1), `#nothd` (2) | `up-to-4k`, `highest-resolution`, `max-resolution`, `balanced`, `smooth-cool` | `getById("webcamquality").onchange` lib.js:56394 | `#videoSettings` |
| Camera tip | `#cameraTip1`, `#cameraTipContext1` | dynamic | none | lib.js |
| Preview stats | `#webcamstats` | none | `updateStats` lib.js:20703 | always |
| Mono toggle | `#micStereoMonoInput` | "Mono" | `toggleMonoStereoMic(this)` lib.js:65342 | `#audioMenu` |
| Audio source dropdown | `#multiselect-trigger` (`#chevarrow1`, meters `#meter1`, `#meter2`) | `select-audio-source` | `addEventToAll("#multiselect-trigger", ...)` lib.js:76158 | `#audioMenu` hidden by `&ad=0` style params (main.js:4876) |
| Audio source list | `#audioSource` (`ul.multiselect-contents`); `#multiselect1` "No Audio" plus device checkboxes built by `gotDevices` | `no-audio` | `option.onchange` lib.js:34838, 35179; list events lib.js:76088 | with `#audioMenu` |
| Audio tips | `#audioTip1`/`#audioTipContext1`, `#headphoneTip1`/`#headphoneTipContext1` (`headphones-tip`), `#audioTipSR`/`#audioTipContextSR` | dynamic | `previewWebcam` lib.js:56977 | echo-cancel / AGC / NS state |
| Speaker output picker | `#outputSource` in `#headphonesDiv` | `select-output-source` | `outputSelect.onchange` lib.js:56370 | `#headphonesDiv` `hidden`; shown in rooms when no device forced (main.js:8068), `&od` (main.js:4103) |
| Test tone | `#headphonesDiv button.testtonebutton` | "Test" | `playtone()` lib.js:38760 | with `#headphonesDiv` |
| Speaker-muted hint | `#speakerMutedOutputHint` | "Speaker output is muted in the main control bar." | `updateSpeakerMutedOutputHints` lib.js:20999 | speaker muted |
| Avatar picker | `#avatarDiv` with `#defaultAvatar1`, `#noAvatarSelected`, upload `input[type=file]` | `select-avatar-image` | `changeAvatarImage(event,this)` lib.js:11904 | `hidden`; `&avatar` (main.js:3255) |
| Effects select | `#effectSelector` in `#effectsDiv` | `select-digital-effect`; options `no-effects-applied`, `blurred-background`, `blurred-background-2`, `digital-greenscreen`, `virtual-background`, `face-mesh`, `auto-face-crop`, `digital-zoom`, `overlay-image`, `anonymous-mask`, `dog-face`, `face-tracker` | `effectsDynamicallyUpdate(event,this)` lib.js:66079 | `#effectsDiv` shown/hidden by `&effects` state (main.js:7700-7729) |
| Effect tips | `#effectsDiv span[title]` x2 | title "Improve performance and quality with this tip" | `smdInfo()` lib.js:67868; `warnUser('Use a Chromium Based Browser')` | `display:none` until relevant |
| Background image picker | `#selectImageContent` (filled from `#selectImage_contents`) | `select-local-image` | `changeEffectsImage` lib.js:67724; images `loadContentEffectsImages` lib.js:66269 | effect 5 |
| Overlay image picker | `#selectImageOverlay` (from `#selectImageOverlay_contents`) | `select-local-image`, `clear-local-image` | `changeOverlayImage` lib.js:66314; `loadOverlayImages` lib.js:66338 | effect `overlay` |
| Effect amount | `#selectEffectAmountInput` in `#selectEffectAmount` | "Effect Amount" | `changeEffectAmount(event,this)` lib.js:67820 | shown main.js:8550-8578 |
| Zoom position | `#zoomPositionX1`, `#zoomPositionY1` in `#zoomPositionControls` | "Horizontal Position:", "Vertical Position:" | `changeZoomPosition(event,this)` lib.js:16619 | effect 7 (main.js:8595) |
| Push password | `#passwordBasicInput` in `#addPasswordBasic` | `add-a-password` | read on publish | hidden in rooms (main.js:8071), with `&password` (main.js:3405), `&view` (main.js:4105) |
| Safari warning | `#SafariWarning` | `use-chrome-instead` | none | desktop Safari (main.js:1381) |
| Old iOS warning | `#oldiOSWarning` | `update-your-device` | none | iOS Safari < 17 (main.js:1323) |
| Room test-name confirm | `confirm()` | `room-test-not-good` | main.js:8058 | `&room=test` with default password |

## Guest in-room state (after joining)

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Self video | `video#videosource` in `div#container.vidcon` | none | created `session.publishStream` lib.js:45113 (id lib.js:45171) | `&nopreview`/`&np`, `&minipreview`, `&largepreview` (main.js:4288-4320) |
| Remote guest tiles | see "Scene and view-only output" | | `updateMixerRun` lib.js:7843 | `&broadcast` (only director), `&directoronly` |
| Raise hand | `#raisehandbutton` | aria "Raise hand" | `raisehand()` lib.js:23240 | `&hands`/`&hand` (main.js:2450), shown lib.js:27648 |
| Welcome overlay | `img.welcomeOverlay` / `div.welcomeOverlay` | `&welcome` text / `&welcomehtml` | `session.postPublish` lib.js:45538, 45560 | `&entrymsg`/`&welcome`/`&welcomeb64`, `&welcomehtml` |
| Auto-end countdown | `#autoEndCountdown` (`#autoEndTime`) | "--:--" | `session.postPublish` lib.js:45633 | auto-end param |
| Sticky director message | `#stickyMsgs` + `button.overlayCloseBtn` | none | `stickyMessage` lib.js:45492 | director overlay message |
| Overlay messages | `#overlayMsgs` | none | click clears (inline) | director "Message" overlay mode |
| Countdown / clocks | `#overlayClockContainer` (`#overlayClock`), `#overlayClockContainer2` (`#overlayClock2`), `#overlayPlaybackTimerContainer` | none | context menu `pip-clock` → `popOutClock` lib.js:58921 | director timer / clock messages |
| Big play button | `#bigPlayButton` | none | click clears | autoplay blocked |
| Hand-raise / queue state | `#queuebutton` (director side) | see control bar | | `&queue` |

## Control bar (#controlButtons)

Common to all: `onmousedown` swallows focus; visibility is mostly set by `publishWebcam` (lib.js:27634-27715), `publishScreen` (lib.js:27090-27160), `createRoomCallback` (lib.js:31792-31847), `session.publishIFrame` (lib.js:28483-28608), `session.hostFile` (lib.js:46738-46749), `session.publishFile` (lib.js:47661-47668), `press2talk` (lib.js:44670-44732). `&cleanish` re-shows a reduced bar (lib.js:27689, 27123). `&nocontrolbar` removes it (main.js:6320). Auto-fade: `showControl` lib.js:11205 (`fadeout` desktop, `partialFadeout` mobile) wired at main.js:8629.

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Hear yourself | `#unmuteSelf` (`#unmuteSelftoggle`) | aria "Hear Yourself" | `toggleDirectFeedback()` lib.js:21829 | `&feedbackbutton`/`&fb` (main.js:633) |
| Stream media file | `#mediafileshare` (`#mediafilesharetoggle`, hidden `#fileselector3`) | aria "Stream a media file" | click `#fileselector3`; `session.changePublishFile(this,event)` lib.js:47328 | After `hostFile`/`publishFile` (lib.js:46742, 47663), `&fileshare` (main.js:2029) |
| Blind all guests | `#blindAllGuests` | aria "Blind all guests in room" | `blindAllGuests(this,event)` lib.js:25087 | `&blindall` (main.js:2297-2300) |
| Mute all guests | `#muteAllGuests` | aria "Mute all guests in room" | `muteAllGuests(this,event)` lib.js:25155 | `&muteall`/`&muteallguests`/`&muteguests` (main.js:2303) |
| Drive record all | `#gdriveAllGuests` | aria "Start or stop Google Drive recording for all guests" | `remoteGlobalGdriveRecordToggle()` lib.js:50377 | `&gdriveall`/`&gdriverecordall` (main.js:2309) |
| Next in queue | `#queuebutton` (`#queuetoggle`, `#queueNotification`) | aria "Load next guest in queue" | `nextQueue()` lib.js:6071; badge `updateQueue` lib.js:6110 | Director with `&queue` (lib.js:31794) |
| File transfer | `#sharefilebutton` (`#filesharetoggle`, `#transferNotification`) | aria "Select file to transfer" | `toggleFileshare()` lib.js:21451; Ctrl+Alt+F | Shown on publish/room; hidden by `&nofileshare`/`&nodownloads`/`&nofiles`, mobile, no room, scene, clean (main.js:8300-8318) |
| Chat | `#chatbutton` (`#chattoggle`, `#chatNotification`) | aria "Text chat" | `toggleChat()` lib.js:21809 | Shown on publish/director; `&chatbutton`/`&chat`/`&cb` forces on, `=false` forces off (main.js:2353) |
| Speaker mute | `#mutespeakerbutton` (`#mutespeakertoggle`) | aria "Mute Speaker output" (ALT+A) | `toggleSpeakerMute()` lib.js:21011; mousedown `handleSpeakerButtonMouseDown` lib.js:21336 | Shown on publish; red with `&speakermute`/`&sm` (main.js:2339); hidden in view-only publish paths (lib.js:45254 etc.) |
| Speaker volume pop-out | `#speakerVolumePanel`, `#speakerVolumeSlider`, `#speakerVolumeValue` | aria "Playback volume" | `handleSpeakerVolumeSliderInput` lib.js:21247 (listeners lib.js:21413-21421) | Long-press / hold on speaker button |
| Mic mute | `#mutebutton` (`#mutetoggle`) | aria "Mute Microphone" (CTRL/⌘+M) | `toggleMute(false,event)` lib.js:20839 (mousedown/touchstart) | Shown on publish, `press2talk` (lib.js:44700) |
| Mute in scenes | `#scenemutebutton` | `mute-scene` "Mute in scenes" | `toggleSceneMute()` lib.js:20789 | `display:none` unless `&scenemutebutton` (main.js:917) |
| Camera mute | `#mutevideobutton` (`#mutevideotoggle`) | aria "Mute Camera" (CTRL/⌘+B) | `toggleVideoMute()` lib.js:22070 | Shown when video track present (lib.js:27642, 43156); hidden without video (lib.js:42429) |
| Screen share (type 1) | `#screensharebutton` (`#screensharetoggle`) `data-menu="context-menu-screen-share"` | aria "Share a screen" | `screenshareTypeDecider(1)` lib.js:56707 → `toggleScreenShare` lib.js:40162 | `session.screenshareType` from `&sstype` (main.js:2098); default type 1 (lib.js:27662-27682); off with `&nosettings`, `&webcam`, clean, mobile; on with `&ssb`/`&screensharebutton` (main.js:6252) |
| Screen share (type 2, popup) | `#screenshare2button` | aria "Share a screen" | `screenshareTypeDecider(2)` → `createIframePopup` lib.js:56871 | `&sstype=2` |
| Screen share (type 3, second stream) | `#screenshare3button` | aria "Share a screen" | `screenshareTypeDecider(3)` → `createSecondStream` lib.js:76588 | `&sstype=3` |
| Share website | `#websitesharebutton` (`#websitesharetoggle`) | aria "Share a website" | `shareWebsite(false,event)` lib.js:56524 | Shown on publish/director (lib.js:27641, 31801) |
| Stop sharing website | `#websitesharebutton2.float2.orange.shake` | "Stop Sharing Website" | `shareWebsite(false,event)` lib.js:56524 | While sharing (lib.js:28415, 56527) |
| Full-screen page | `#fullscreenPage` (`#fullscreenPageToggle`) | aria "Full screen" | `fullscreenPageToggle()` lib.js:57308 | `&fullscreenbutton`/`&fsb` and not iOS (main.js:1843); settings toggle `#toggleFullscreenButton` |
| Picture-in-Picture | `#PictureInPicturePage` (`#PictureInPicturePageToggle`) | aria "Picture-in-Picture" | `PictureInPicturePageToggle()` lib.js:57338 | `&pip2`/`&pipall` with Document PiP API (main.js:1853); settings toggle `#togglePIPButton` |
| Cycle cameras | `#flipcamerabutton` (inner `#settingstoggle` id collides with settings button icon) | aria "Cycle Cameras" | `cycleCameras()` lib.js:34378; Ctrl+Alt+C | `session.mobile` and audio not disabled (main.js:4918); hidden if one camera (lib.js:35912) |
| Black-out mode | `#blackoutmode` (`#blackouttoggle`) | aria "Black out mode" | `blackoutMode()` lib.js:34344 (creates `#blackoutOverlay`) | `&blackout`/`&blackoutmode`/`&bo`/`&bom` (main.js:4936) |
| OBS remote | `#obscontrolbutton` (`#obscontroltoggle`) | aria "Remote OBS control menu" | `toggleOBSControls()` lib.js:4404 | `&obscontrols`/`&remoteobs`/`&obs`/`&controlobs` (main.js:2682, 6314), `manageSceneState` (lib.js:4642) |
| Room settings | `#roomsettingsbutton` (`#roomsettingstoggle`) | aria "Room settings menu" | `toggleRoomSettings()` lib.js:41755 | Director when `session.totalRoomBitrate` truthy (default on; `&trb=0` hides) (lib.js:31804, main.js:5965) |
| Settings | `#settingsbutton` (`#settingstoggle`) | aria "Settings menu" | `toggleSettings()` lib.js:22155 | Shown on publish when `session.showSettings` (lib.js:27645); hidden `&nosettings`/`&ns` (main.js:2665, 907) |
| Hang up | `#hangupbutton` | aria "Hang up" | `hangup()` lib.js:23115 | Shown on publish; `&nohangupbutton`/`&nohub` hides (main.js:1869); `&hangupbutton`/`&hub` forces in scene/view (main.js:8194, 8293) |
| Raise hand | `#raisehandbutton` | aria "Raise hand" | `raisehand()` lib.js:23240 | `&hands`/`&hand` |
| Slide back | `#pptbackbutton` | aria "Back a slide" | `gobackSlide()` lib.js:23221 | `&pptcontrols`/`&slides`/`&ppt`/`&powerpoint` (main.js:4503) |
| Slide next | `#pptnextbutton` | aria "Next slide" | `nextSlide()` lib.js:23230 | same |
| Record local | `#recordLocalbutton` | aria "Record your stream to disk" | `recordLocalVideoToggle()` lib.js:61810 | `&record` (session.recordLocal) (lib.js:27654); `&record=false` forces hidden (main.js:2561) |
| Session marker | `#sessionMarkerButton` | aria "Drop a session marker" | `dropSessionMarker()` lib.js:61741 | `&sessionlog`/`&slog`/`&sessionmarkers` (main.js:3084) |
| Stop screen record | `#recordLocalScreenbutton` | "Stop Screen Record" | `recordLocalScreenStopRecord()` lib.js:77029 | While screen-recording; `&record=false` hides |
| Director mic/cam enable | `#press2talk` (inside `#miniPerformer`) | `push-to-talk-enable` / `push-to-talk-enable-2` | `press2talk(true)` lib.js:44670 | Injected by `createRoomCallback` lib.js:31808-31820 |
| Director cancel cam | `#hangupbutton2` | aria "stop publishing audio and video" | `hangup2()` lib.js:23156 | After `press2talk` (lib.js:44702) |
| Arm transfer rooms | `#rooms` with `button#roomselect_<room>.btnArmTransferRoom` | "Arm Transfer:" | `handleRoomSelect(room)` lib.js:31927 | `&rooms=a,b,c` (main.js:1668, lib.js:31826) |
| Groups bar | `#groups` with generated `.float` group buttons | group name | `changeGroupDirectorAPI` lib.js:65077 creates; button onclick inline | Group API; removed when director has own box (lib.js:32487) |
| Join request panel | `#joinRequestPanel`, `#joinRequestList`, Close button | "Pending Join Requests" | `toggleJoinRequestPanel(false)` lib.js:6005; rows `approveJoinRequest` lib.js:6051, `denyJoinRequest` lib.js:6061 | Approval mode with pending requests (lib.js:5978-5992) |

## Settings drawer and device pickers (#popupSelector)

Opened by `toggleSettings()` lib.js:22155 → `showSettings()` lib.js:22182 (enumerates via `gotDevices2` lib.js:35663, slides in, `loadContentEffectsImages`). Closed by `hideSettings()` lib.js:22236, outside click, or Escape (inline `onkeydown`). Posts `settings-menu-state` to the iframe API via `pokeIframeAPI` lib.js:11752.

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Camera picker | `#videoSource3` in `#videoMenu3` | `video-source` | `videoSelect.onchange` lib.js:36012 | `#videoMenu3` hidden with `&vd=0` (main.js:4836) |
| Activate/reload camera | `#refreshVideoButton` | title "Activate or Reload this video device." | assigned lib.js:36124 | with `#videoMenu3` |
| Resolution gear | `#gear_webcam3` | none | `toggleQualityGear3()` lib.js:25311 | `display:none` until camera active |
| Resolution radios | `#webcamquality3`: `#4kquality3`, `#maxres3`, `#fullhd3`, `#halfhd3`, `#nothd3` (`name=resolution`) | `up-to-4k`, `highest-resolution`, `max-resolution`, `balanced`, `smooth-cool` | `getById("webcamquality3").onchange` lib.js:45197 | `#videoSettings3` (hidden on close lib.js:22253) |
| Settings stats | `#webcamstats3` | none | `updateStats` | always |
| Mono toggle | `#micStereoMonoInput3` | "Mono" | `toggleMonoStereoMic(this)` lib.js:65342 | `#audioMenu2` |
| Audio source dropdown | `#multiselect-trigger3` (`#chevarrow2`, `#meter3`, `#meter4`) | `select-audio-source` | lib.js:76225 | `#audioMenu2` |
| Audio source list | `#audioSource3` with generated `input#multiselecta<N>`, `#audioSourceNoAudio2`, screen-audio and ASIO entries | device labels, "No Audio" | `option.onchange` lib.js:35814, 35952, 36058; `addScreenDevices` lib.js:35586; `appendAsioDevices` lib.js:40651; list events lib.js:76120 | always |
| Speaker picker | `#outputSource3` in `#headphonesDiv3` | `select-output-source` | `audioOutputSelect.onchange` lib.js:36167 | `#headphonesDiv3` hidden when `&od` forced (main.js:6143) |
| Test tone | `#headphonesDiv3 .testtonebutton` | "Test" | `playtone()` lib.js:38760 | with speaker picker |
| Speaker muted hint | `#speakerMutedOutputHint3` | "Speaker output is muted in the main control bar." | lib.js:20999 | speaker muted |
| Avatar picker | `#avatarDiv3`, `#defaultAvatar2`, `#noAvatarSelected3`, upload input | `select-avatar-image` | `changeAvatarImage` lib.js:11904 | `hidden`; shown for directors (main.js:629, lib.js:31853) and `&avatar` (main.js:3254) |
| Effects | `#effectSelector3` in `#effectsDiv3` | same keys as `#effectSelector`, plus `remove-green` | `effectsDynamicallyUpdate` lib.js:66079 | `display:none` unless effects allowed (main.js:7706; lib.js:48710) |
| Effect amount | `#selectEffectAmountInput3` (`#effectAmountLabel`) in `#selectEffectAmount3` | "Effect amount:" | `changeEffectAmount` lib.js:67820 | main.js:8551-8578 |
| Background images | `#selectImageContent3` | `select-local-image` | `changeEffectsImage` lib.js:67724 | effect 5 |
| Overlay images | `#selectImageOverlay3` | `select-local-image` | `changeOverlayImage` lib.js:66314 | effect overlay |
| Zoom position | `#zoomPositionX`, `#zoomPositionY` (`#zoomPosXLabel`, `#zoomPosYLabel`) in `#zoomPositionControls3` | "Horizontal Position:", "Vertical Position:" | `changeZoomPosition` lib.js:16619 | effect 7 (main.js:8596) |
| Share screen (settings) | `#shareScreenGear` | "Share Screen" | `grabScreen()` lib.js:41220 | Hidden on mobile (main.js:4911) |
| PiP preview | `#pIpStartButton` | "Preview PiP VIdeo" | listener lib.js:48738 | `display:none` until supported |
| Director solo link | `#grabDirectorSoloLinkParent`, `a#grabDirectorSoloLink` `data-menu="context-menu"` | "Director's solo link:" | `copyFunction` lib.js:57078 | Director without `&showdirector` (lib.js:31815-31818) |
| Close settings | `button.toggleSettings` | `close-settings` | `toggleSettings()` lib.js:22155 | always |
| Audio tab | `#advancedOptionsAudio` | "Audio" | `toggleAudioUser(this)` lib.js:55643 → fills `#popupSelector_constraints_audio` via `listAudioSettings` lib.js:53126 | always |
| Video tab | `#advancedOptionsCamera` | "Video" | `toggleVideoUser(this)` lib.js:55666 → `#popupSelector_constraints_video` via `listCameraSettings` lib.js:54137 | always |
| User tab | `#advancedOptionsGeneral` | `user` | `toggleUserUser(this)` lib.js:55689 → `#popupSelector_user_settings` | Hidden `&hideusermenu`/`&nousermenu`/`&hum` (main.js:8339) |
| SSO sign-out | `#ssoSignOutBtn` | "Sign Out" | `ssoSignOut()` auth-client.js:364 | `display:none`; shown by auth-client.js:411/451 when signed in |
| Loading spinner | `#popupSelector_constraints_loading` | none | none | while constraints load |

### User tab (#popupSelector_user_settings)

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Push-to-talk hotkey | `#pptHotKey` | `hold-to-talk` | `onkeydown` `setHotKey()` lib.js:59679 | always; `&ptt` sets automatically (main.js:1984) |
| Clear hotkey | button `data-translate="clear"` | `clear` | `setHotKey(false)` lib.js:59679 | always |
| Draw on screen | `#startDrawScreen` | `enable` | `drawOnScreen()` lib.js:12221; Ctrl+Alt+D | always |
| Draw clear / stop / colors | `button.drawActive` (x7), `#drawScreenColor` | `clear`, `stop`, "✏️" | `drawOnScreenObject.erase/stop/color` (object built in `drawOnScreen` lib.js:12221, assigned lib.js:12373) | `.drawActive` un-hidden while drawing |
| Fullscreen-button pref | `#toggleFullscreenButton` in `#fullscreenToggleContainer` | `show-fullscreen-button`, `enable` | `toggleFullscreenButtonSetting()` lib.js:22258 | Container hidden on iOS (lib.js:22323) |
| PiP-button pref | `#togglePIPButton` in `#pipToggleContainer` | `show-pip-button`, `enable` | `togglePIPButtonSetting()` lib.js:22293 | Hidden without Document PiP (lib.js:22328) |
| Audio visual style | `#toggleWaveformButton.generalButton` | `cycle-between-audio-visualizations` | `cycleStyleOptions()` lib.js:64535 | always (show code commented, main.js:6848) |
| Translation language | `#translationLanguageSelect` in `#translationSettingsContainer` | "Preferred spoken language" | `setTranslationLanguage(value)` translation/controller.js:956 | `hidden`; controller.js:163 shows it after `loadScript("./translation/controller.js")` (main.js:4227) |
| Translation configure | `#translationConfigureButton` | "Configure" | `openTranslationSetup()` translation/controller.js:962 | same |
| Translation stop | `#translationStopButton` | "Stop" | `stopTranslation()` translation/controller.js:968 | same |
| Translation status | `#translationStatus` | none | controller.js | same |
| Clear local storage | `button.generalButton` | `cleaer-sites-local-storage` (sic) | `clearStorage()` lib.js:5725 | always |

### Audio / Video advanced tabs (local, lib.js-generated)

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Audio constraint sliders | `input#constraints_<key>` + `input.manualInput#label_<key>` (gain, pan "Mic Pan:", "Low Cut:", "Low EQ:", "Mid EQ:", "High EQ:") | runtime text | `listAudioSettings` lib.js:53126 (sites lib.js:53192-54003) | Audio tab |
| Audio constraint selects | `select#constraints_<key>_<n>.constraintCameraInput` (echo cancel, AGC, NS, etc.) | runtime text | lib.js:53673, 53937 | Audio tab |
| Per-track gain | `#constraints_<key>_<trackid>`, `#manualInput_<key>_<trackid>` | "Gain:" | lib.js:53979-54003 | Multi-mic |
| Compressor / EQ gear | `button#audioCompressorExpand_<suffix>`, `button#audioProcessingExpand_<proc>_local` | `audio-compressor-settings`, `audio-<proc>-settings` | `appendAudioCompressorControls` lib.js:50729, `appendAudioProcessingButton` lib.js:50875 → `openAudioProcessing` lib.js:51073 | `&comp`, `&eq` |
| Compressor modal | `#audioCompressorModal.promptModal` | runtime text | `openAudioProcessing` lib.js:51073 | gear click |
| Camera constraint sliders | `input#constraints_<key>`, `input#manual_<key>` ("Auto:" checkbox), `input.manualInput#label_<key>` (zoom, focus, exposure, white balance...) | runtime text | `listCameraSettings` lib.js:54137 (sites lib.js:54147-54623) | Video tab |
| Aspect presets | `button.preSelectButton` "16:9", "9:16" | text | lib.js:54459, 54470 | Video tab |
| Reset video settings | generated button | "Reset video settings to default" | lib.js:54665 | Video tab |

## Director view: room header and links (#directorlayout)

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Room header | `#roomHeader` | none | none | `display:none`; shown unless `&cleandirector`/`&cdv` or clean (lib.js:31779-31780) |
| Hide links toggle | `#directorLinksButton` | `hide-the-links` "LINKS (GUEST INVITES & SCENES)" | `hideDirectorinvites(this)` lib.js:31277 | `#roomHeader` |
| Help toggle | `#help_directors_room` | `click-here-for-help` | `toggle(getById('roomnotes2'),this,false)` | `#roomHeader` |
| Help text | `#roomnotes2` | `welcome-to-control-room` | none | via help toggle |
| Guest invite block | `#directorLinks1` | `invite-a-guest`, `invite-users-to-join` | none | `display:none` → `inline-block` (lib.js:31782) |
| Guest invite link | `a#director_block_1.task.grabLinks` `data-menu="context-menu"` | (URL) | `copyFunction` lib.js:57078; href set lib.js:31763 | with block |
| Guests hear others | checkbox in `#directorLinks1` | `guests-hear-others` | `updateLinkInverse(1,this); saveDirectorSettings()` lib.js:57246, 25767 | always |
| Copy guest link | `button.pull-right` | `copy-link` | `copyFunction(getById("director_block_1"))` | always |
| Customize guest link | `#showCustomizerButton1` | `customize` | `showCustomizer(1,this)` lib.js:59528 (shows `#customizeLinks` + `#customizeLinks1`) | always |
| Scene capture block | `#directorLinks2` | `capture-a-group-scene`, `this-is-obs-browser-source-link` | none | same as block 1; greyed (opacity 0.2, no pointer) with `&queue` (lib.js:31588-31590) |
| Scene link | `a#director_block_3.task.grabLinks.publish` `data-menu="context-menu"` | (URL `?scene=0&room=`) | `copyFunction`; href lib.js:31775 | with block |
| Auto-add guests | checkbox in `#directorLinks2` | `auto-add-guests` | `updateLinkScene(3,this); saveDirectorSettings()` lib.js:57282 | always |
| Copy scene link | `button.pull-right` | `copy-link` | `copyFunction(getById("director_block_3"))` | always |
| Customize scene link | `#showCustomizerButton3` | `customize` | `showCustomizer(3,this)` lib.js:59528 (shows `#customizeLinks3`) | always |
| Guest feeds container | `#guestFeeds` (placeholder `#deleteme` with `#fakeguest1..4`) | `guest-1`..`guest-4` | `createControlBox` removes `#deleteme` (lib.js:33574) | `display:""` in `createRoomCallback` (lib.js:31790) |

### Guest-link customizer (#customizeLinks1)

Every toggle: `input[type=checkbox][data-param]` → `updateLink(1,this)` lib.js:57160 (rewrites `#director_block_1`). Container `#customizeLinks1` is `display:none` until `showCustomizer(1)`.

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Pro-audio mode | `[data-param="&s"]` | `pro-audio-mode` | `updateLink` lib.js:57160 | customizer open |
| Hide audio-only sources | `[data-param="&st"]` | `hide-audio-only-sources` | same | same |
| Remote monitoring | `[data-param="&remote"]` | `remote-monitoring` | same | same |
| Invite saved to cookie | `[data-param="&sticky"]` | `invite-saved-to-cookie` | same | same |
| Ask for display name | `[data-param="&l"]` | `ask-for-display-name` | same | same |
| Show display names | `[data-param="&sl"]` | `show-display-names` | same | same |
| Show active speakers | `[data-param="&sas"]` | `show-active-speaker` | same | same |
| Show welcome message | `[data-param="&welcome"]` | `show-welcome-message` | `updateLinkWelcome(1,this)` lib.js:57125 | same |
| Show fullscreen button | `[data-param="&fsb"]` | `show-fullscreen-button` | `updateLink` | same |
| Hide file sharing | `[data-param="&nofileshare"]` | `hide-file-sharing` | same | same |
| 1080p60 if available | `[data-param="&q"]` | `1080p60-if-available` | same | same |
| Auto-select mic | `[data-param="&ad"]` | `auto-select-microphone` | same | same |
| Auto-select camera | `#vd1toggle [data-param="&vd"]` (mutually exclusive with `#vd0toggle`) | `auto-select-camera` | inline + `updateLink` | same |
| Compatibility mode | `[data-param="&safemode"]` | `compatibility-mode` | same | same |
| Hide settings button | `[data-param="&ns"]` | `hide-setting-buttons` | same | same |
| Virtual backgrounds | `[data-param="&effects"]` | `virtual-backgrounds` | same | same |
| Disable animations | `[data-param="&animate=0"]` | `disable-animated-mixing` | same | same |
| P2P chunked mode | `[data-param="&chunked=500"]` | `chunked-mode` | same | same |
| Hide local share | `[data-param="&hidescreenshare"]` | `hide-local-share` | same | same |
| Sharper screen share | `[data-param="&sharperscreen"]` | `sharper-screen-share` | same | same |
| Screen share bitrate | `[data-param="&screensharebitrate=3500"]` | `screen-share-bitrate` | same | same |
| Guests see HD video | `[data-param="&trb=2000"]` | `guests-see-HD-video`, warning `powerful-computers-only` | same | same |
| Disable self-preview | `[data-param="&np"]` | `no-self-preview` | same | same |
| Raise-hand button | `[data-param="&hand"]` | `raise-hand-button` | same | same |
| Audio compressor | `[data-param="&comp"]` | `enable-compressor` | same | same |
| Equalizer | `[data-param="&eq"]` | `enable-equalizer` | same | same |
| Guest tips | `[data-param="&tips"]` | `show-guest-tips` | same | same |
| Prefix screenshare IDs | `[data-param="&ssid"]` | `prefix-screenshare` | same | same |
| Avatar selection | `[data-param="&avatar"]` | `avatar-selection` | same | same |
| 30 FPS screen share | `[data-param="&screensharefps=30"]` | `screen-share-30fps` | same | same |
| Screen share only | `[data-param="&screensharevideoonly"]` | `screen-share-only` | same | same |
| Stream via server | `[data-param="&meshcast"]` | `meshcast-mode` | same | same |
| Mini self-preview | `[data-param="&mini"]` | `mini-self-preview` | same | same |
| Rule-of-thirds grid | `[data-param="&grid"]` | `rule-of-thirds` | same | same |
| Only see director | `#broadcastSlider [data-param="&broadcast"]` | `only-see-director-feed` | same; synced from `#broadcastFlag` (lib.js:31559) | same |
| Muted, guest can unmute | `[data-param="&m"]` | `mute-microphone-by-default` | same | same |
| Muted, director unmutes | `[data-param="&g=0"]` | `unmute-by-director-only` | same | same |
| No camera on join | `#vd0toggle [data-param="&vd=0"]` | `guest-joins-with-no-camera` | inline + `updateLink` | same |
| Obfuscate with Invite.cam | `#obfuscate_director_1` (empty data-param) | `obfuscate-link` | `updateLink` | same |
| Director-only guests | `[data-param="&directoronly"]` | `director-only-guests` | same | same |
| Mic-only option | `[data-param="&miconlyoption"]` | `mic-only-option` | same | same |
| Camera muted on join | `[data-param="&videomute"]` | `camera-muted-on-join` | same | same |

### Scene-link customizer (#customizeLinks3)

Every toggle: `updateLink(3,this,true)` lib.js:57160 (rewrites `#director_block_3`), except `&sas`, `&animate`, `&margin` which call `updateLink(3,this)`.

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Hide audio-only | `[data-param="&st"]` | `hide-audio-only-sources` | `updateLink` | `showCustomizer(3)` |
| Hide local share | `[data-param="&hidescreenshare"]` | `hide-local-share` | same | same |
| 8-channel output | `[data-param="&channels"]` | `enable-8-channel-audio` | same | same |
| Pro-audio | `[data-param="&s"]` | `pro-audio-mode` | same | same |
| H264 codec | `#codech264toggle [data-param="&codec=h264"]` | `use-h264-codec`, tip `this-can-reduce-packet-loss` | same; disabled/checked by `#codecGroupFlag` (lib.js:31618-31627) | same |
| Clean OBS output | `[data-param="&cleanoutput"]` | `clean-obs-output` | same | same |
| Hide video controls | `[data-param="&nocontrols"]` | `hide-video-controls` | same | same |
| Show muted status | `[data-param="&mutestatus"]` | `show-muted-status` | same | same |
| Active speakers | `[data-param="&sas"]` | `show-active-speakers` | same | same |
| Green background | `[data-param="&chroma"]` | `green-background` | same | same |
| Fade-in | `[data-param="&fadein"]` | `fade-videos-in` | same | same |
| Animate mixing | `[data-param="&animate"]` | `animate-mixing` | same | same |
| Square corners | `[data-param="&rounded=0"]` | `square-corners` | same | same |
| Speaker outline | `[data-param="&meterstyle=2"]` | `show-speaker-outline` | same | same |
| Video only | `[data-param="&noaudio"]` | `video-only` | same | same |
| Audio only | `[data-param="&novideo"]` | `audio-only` | same | same |
| Display names | `[data-param="&sl"]` | `show-display-names` | same | same |
| Sort by name | `[data-param="&orderby=label"]` | `sort-by-name` | same | same |
| Margin | `[data-param="&margin"]` | `add-margin` | same | same |
| 20 Mbps | `[data-param="&vb=20000"]` | `unlock-video-bitrate` | same | same |
| Increase sharpness | `[data-param="&scale=100"]` | `disable-downscaling` | same | same |
| Exclude director audio | `[data-param="&nodirectoraudio"]` | `exclude-director-audio` | same | same |
| Exclude director video | `[data-param="&nodirectorvideo"]` | `exclude-director-video` | same | same |
| Randomize order | `[data-param="&randomize"]` | `randomize-tile-order` | same | same |
| Force mono | `[data-param="&mono"]` | `force-mono-audio` | same | same |
| Include director | `[data-param="&showdirector"]` | `show-director` | same | same |
| Hide tally | `[data-param="&tallyoff"]` | `hide-tally` | same | same |
| Crop to fit | `[data-param="&cover"]` | `fill-video-space` | same | same |
| Vertical mode | `[data-param="&916"]` | `vertical-aspect-ratio` | same | same |
| Jitter buffer | `[data-param="&buffer=500"]` | `add-jitter-buffer` | same | same |
| 4:3 | `[data-param="&43"]` | `four-three-scene-mode` | same | same |
| Square | `[data-param="&square"]` | `square-scene-mode` | same | same |
| Params docs | text | `learn-more-about-params` | link | same |

## Director: per-guest control box (#controls_blank clone)

Built by `createControlBox(UUID, soloLink, streamID)` lib.js:33573 (screenshare variant `createControlBoxScreenshare` lib.js:33967, which adds `.notmain` so `.mainonly` buttons hide via main.css:2855). Wrapper: `div#container_<UUID>.vidcon.directorMargins` (`data-UUID`, `data-sid`), `div.controlVideoBox > #videoContainer_<UUID>`, `#controls_<UUID>`. All template buttons get `dataset.UUID`/`dataset.sid` (lib.js:33703). `.advanced` buttons get `.hide` with `&novice` (main.js:920) or iframe API `advancedMode:false` (main.js:10086). Cluster toggles use `toggleByDataset` lib.js:34492.

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Layout slot | `.slotsbar > button[data-action-type="setslot"]` | "slot: N" / "unset" | `changeSlot(event,this)` lib.js:33018; drag `dragSlot` lib.js:32911, `dropSlot` lib.js:32939 | `&slotmode`/`&slotsmode` (main.js:5144) |
| Shift left / right | `.shift i.la-angle-left/right` | title "Does not impact scene order." | `shiftPC(this,-1/1)` lib.js:32793 | always |
| Lock position | `span#position_<UUID>` | lock icon | `lockPosition(this)` lib.js:32864 | always |
| Stream ID copy | `.streamID i.la-copy` | title "Copy this Stream ID to the clipboard" | `copyFunction(this.dataset.sid)` | always |
| Minimize box | `.streamID i.la-window-minimize` | title "Minimize this control box" | `minimizeMe(this)` lib.js:34303 | always |
| Edit label | `span#label_<UUID>.addALabel` | title "Click here to edit the label..." | `setupGuestLabelControl(UUID)` lib.js:64818 | always |
| Signal meter | `#signalMeter_<UUID>` (clone of `#signalMeterTemplate`) | `signal-meter` | click → `statsMenuCreator` lib.js:45056 + `printViewStats` lib.js:18770 | `&signalmeter` (default on for directors, main.js:1619) |
| Battery meter | `#batteryMeter_<UUID>` (clone of `#batteryMeterTemplate`) | none | `batteryMeterInfoUpdate` | `&batterymeter` (default on for directors) |
| Meshcast status icon | `i.broadcast-status[data-action-type="meshcast-status"]` | none | `updateMeshcastDirector` lib.js:36404 | Meshcast in use |
| Viewer count | `#remoteConnections_<UUID>.rem-con-count` | `viewer-count` | `createConnectionDetailsEle` lib.js:18594 | `&showconnections` (main.js:3413) |
| Voice meter | `#voiceMeter_<UUID>` (from `#voiceMeterTemplate` or `#voiceMeterTemplate2`) | none | `updateLevels` lib.js:65925 | `&meterstyle` |
| Mute / video-mute / hand badges | clones of `#muteStateTemplate`, `#videoMuteStateTemplate`, `#raisedHandTemplate`, `#sceneMuteStateTemplate` (`guest-muted-scenes`) | none | `updateRemoteSceneMuteState` lib.js:20794 | guest state |
| iframe details | `#iframeDetails_<UUID>.iframeDetails` | none | none | guest sharing a website |
| Solo view link | `.soloButton > a.soloLink.advanced.task` `data-menu="context-menu"` `draggable` | (URL) | `copyFunction(this,event)` | Hidden with `&hidesolo`/`&hs` (main.js:2182) |
| Copy solo link | `.soloButton > button.pull-right.controlsGrid` | `copy-solo-view-link` | `copyFunction(this.previousElementSibling)` | same |
| Lower raised hand | `button#hands_<UUID>.lowerRaisedHand[data-action-type="hand-raised"]` | `user-raised-hand` "Lower Raised Hand" | `remoteLowerhands(UUID)` lib.js:25217 | `hidden` until guest raises hand |
| Activate queued guest | `button.removeFromQueue[data-action-type="remove-queue"]` | `remove-from-queue` "Activate Guest" | `remoteRemoveQueue(this)` lib.js:34292 | `hidden` until guest is in queue |
| Volume | `input[data-action-type="volume"]` (0-200) | title "Remotely change the volume of this guest..." | `remoteVolumeUI(this)` lib.js:25605 (input), `remoteVolume(this)` lib.js:25618 (change), dblclick reset | always |
| Mute | `button[data-action-type="mute-guest"]` | `mute` | `remoteMute(this,event)` lib.js:25241 | always |
| Preview off / low / high | `button[data-action-type="change-quality1/2/3"]` | titles "Disable Video Preview", "Low-Quality Preview", "High-Quality Preview" | `toggleQualityDirector(0/50/1200,UUID,this)` lib.js:58767 | always |
| Message | `button.mainonly[data-action-type="direct-chat"]` | `send-direct-chat` | `directorSendMessage(this)` lib.js:21974 | not on screenshare boxes |
| Message box | `span.director-message-box[data-action-type="messaging-box"]`, `textarea[data-action-type="messaging-box-text"]`, overlay toggle `[data-action-type="messaging-box-toggle"]`, `button.message-close`, `button.message-send` | `close`, `send-message` | wired inside `directorSendMessage` lib.js:21974 (input keydown lib.js:22004) | after Message click |
| Transfer | `button.mainonly.advanced[data-action-type="forward"]` | `forward-to-room` | `directMigrate(this,event)` lib.js:23298 | always (co-director needs transfer right) |
| Hang up guest | `button.mainonly[data-action-type="hangup"]` | `disconnect-guest` | `directHangup(this,event)` lib.js:23397 | always |
| Solo talk | `button.mainonly.advanced[data-action-type="solo-chat"]` | `voice-chat` | `session.toggleSoloChat(UUID,event)` lib.js:43527 | always |
| Highlight | `button.advanced[data-action-type="solo-video"]` | `solo-video` | `requestInfocus(this,event)` lib.js:32120 | always |
| Video off | `button.advanced[data-action-type="mute-video-guest"]` | `mute-video-guest` | `remoteMuteVideo(this,event)` lib.js:25383 | always |
| Deafen | `button.mainonly.advanced[data-action-type="toggle-remote-speaker"]` | `toggle-remote-speaker` | `remoteSpeakerMute(this,event)` lib.js:25021 | always |
| Hide | `button.advanced[data-action-type="hide-guest"]` | `hide-guest` | `remoteHideVideo(this,event)` lib.js:25329 | always |
| Blind | `button.mainonly.advanced[data-action-type="toggle-remote-display"]` | `toggle-remote-display` | `remoteDisplayMute(this,event)` lib.js:25188 | always |
| Reconnect mic | `button.advanced[data-action-type="refresh-mic"]` | `refresh-microphone` | `directRefreshMicrophone(this)` lib.js:38568 | always |
| Add to scene 1 | `button.advanced[data-action-type="addToScene"][data-scene="1"]` | `add-to-scene` | `directEnable(this,event)` lib.js:23673 | always |
| Scene options toggle | `button.hideDropMenu.advanced` (`#chevarrow3`) | `scene-options` | `toggleByDataset('1')` lib.js:34492 | always |
| Add to scene 2 | `[data-action-type="addToScene"][data-scene="2"]` | `add-to-scene2` | `directEnable` lib.js:23673 | cluster 1 |
| Mute in scenes | `[data-action-type="mute-scene"]` | `mute-scene` | `directMute(this,event)` lib.js:24947 | cluster 1 |
| Scenes 3-8 | `[data-action-type="addToScene"][data-scene="3..8"]` `.btn-HL-peach` | "S3".."S8" | `directEnable` lib.js:23673 | cluster 1 |
| Named scenes | `.customScene > button[data-action-type="addToScene"]` | scene name | `initSceneList` lib.js:57544, `updateSceneList` lib.js:57569 → `directEnable` | named scenes in use |
| Scene audio channel 1-8 | `[data-action-type="sceneAudioChannel"][data-channel="1..8"]` `.btn-HL-paleblue` | "C1".."C8" | `directAudioChannel(this,event)` lib.js:23587 | `#channelGroup1`/`#channelGroup2` shown when `session.audioEffects` (main.js:8326) |
| Scene stats | `[data-action-type="stats-remote"]` | `stats-remote` | `toggleSceneStats(this)` lib.js:17041 | cluster 1 |
| Stats graphs | `[data-action-type="stats-graphs-bitrate"]`, `[data-action-type="stats-graphs-details"]`, `[data-action-type="stats-graphs-details-container"]` | "No scenes active", "scene bitrate (kbps) resolution video codec" | lib.js:17078-17473 | after Scene Stats |
| Additional controls toggle | `button.hideDropMenu.advanced` (`#chevarrow4`) | `additional-controls` | `toggleByDataset('2')` | always |
| Mix order down / up / value | `[data-action-type="order-down"]`, `[data-action-type="order-up"]`, `p[data-action-type="order-value"]` | `order-down`, "Mix Order" | `changeOrder(-1/1,UUID)` lib.js:50497 | cluster 2 |
| Create timer | `.mainonly.advanced[data-action-type="create-timer"]` | `create-timer` | `directTimer(this,event)` lib.js:24614 | cluster 2 |
| Record local | `[data-action-type="recorder-local"]` | `record-local` | `recordVideo(this,event)` lib.js:61114 | cluster 2 |
| Record remote | `[data-action-type="recorder-remote"]` | `record-remote` | `requestVideoRecord(this)` lib.js:50444 | cluster 2 |
| Restart WHIP | `[data-action-type="restart-whip"]` | `restart-whip` | `restartWhipDirector(this)` lib.js:36650 | `hidden`; `updateWhepDirectorControls` lib.js:33531 |
| Use Meshcast | `.mainonly[data-action-type="meshcast-toggle"]` | `use-meshcast` | `toggleMeshcastDirector(this)` lib.js:36420 | `hidden` until Meshcast available |
| Google Drive record | `[data-action-type="recorder-google-drive-remote"]` | `google-drive-record` | `requestGoogleDriveRecord(this,null,null,event)` lib.js:50120 | cluster 2 |
| URL params | `.mainonly[data-action-type="change-params"]` | `change-params` | `promptUser('transferSettingsTemplate',UUID)` lib.js:1750 | `display:none` (feature off) |
| Change URL | `.mainonly.advanced[data-action-type="change-url"]` | `change-url` | `directPageReload(this,event)` lib.js:24551 | cluster 2; co-director needs changeurl right |
| Request file | `.mainonly.advanced[data-action-type="open-file-share"]` | `request-upload` | `requestFileUpload(this)` lib.js:24997 | cluster 2 |
| Keyframe fix | `.mainonly.advanced[data-action-type="force-keyframe"]` | `force-keyframe` "Rainbow Puke Fix" | `requestKeyframeScene(this)` lib.js:11732 | cluster 2 |
| Mirror guest | `.mainonly.advanced[data-action-type="mirror-guest"]` | `mirror-guest` | `requestMirrorGuest(this)` lib.js:11701 | cluster 2 |
| Rotate guest | `.mainonly.advanced[data-action-type="rotate-guest"]` | `rotate-guest` | `requestRotateGuest(this)` lib.js:11678 | cluster 2 |
| Groups 1-7 | `[data-action-type="toggle-group"][data-group="1..7"]` `.btn-HL-green` | "Group 1", "G2".."G7" | `changeGroup(this)` lib.js:65261; extra groups `syncGroup` lib.js:24310 into `.customGroup` | cluster 2 |
| MIDI toggles | `[data-action-type="midi-button"]` peach C1 D1 E1 F1 G1 A0, purple C3..A3 | "C1".."A3" | `buttonMIDI(this)` lib.js:75566 | `&midi` modes |
| Listen left / right | `[data-action-type="add-channel"]` | "Your Left", "Your Right" | `changeChannelOffset(UUID,0/1)` lib.js:65315 | `#channelGroup` |
| Guest hears ch 1 / 2 | `[data-action-type="isolate-channel"][data-channel="1/2"]` | "Ch 1", "Ch 2" | `directIsolateChannel(UUID,1/2)` lib.js:12018 | same |
| Custom mix | `[data-action-type="custom-mix"]` | "Mix ▾" | `toggleMixDropdown(UUID,this,event)` lib.js:49258; rows `toggleMixSource` lib.js:49464 | same |
| Audio settings | `[data-action-type="advanced-audio-settings"]` | `advanced-audio-settings` | `requestAudioSettings(this)` lib.js:32210 → `.advancedAudioSettings` | always |
| Video settings | `.mainonly[data-action-type="advanced-camera-settings"]` | `advanced-camera-settings` | `requestVideoSettings(this)` lib.js:32251 → `.advancedVideoSettings` | always |

### Remote guest settings panels (lib.js-generated into `.advancedAudioSettings` / `.advancedVideoSettings`)

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Remote camera picker | `select#remoteVideoSelect_<UUID>` + `button#requestVideoDevice_<UUID>` | "refresh" | `gotDevicesRemote` lib.js:38590 | Video settings opened |
| Remote mic picker | `select#remoteAudioSelect_<UUID>` + `button#requestAudioDevice_<UUID>` | "refresh" | lib.js:38638-38652 | Audio settings |
| Remote speaker picker | `select#remoteAudioOutputSelect_<UUID>` + `button#requestAudioOutputDevice_<UUID>` | "refresh" | lib.js:38677-38690 | Audio settings |
| Remote audio constraints | `#remoteAudioLabel_<UUID>`, `input#constraints_<key>_<UUID>`, `input.manualInput#constraints_manual_<key>_<UUID>`, selects `#constraints_<key>_<n>_<UUID>` | runtime labels, "Mic Pan:" | `updateDirectorsAudio` lib.js:51858 | Audio settings |
| Remote compressor / EQ | `#audioCompressorExpand_<UUID>`, `#audioProcessingExpand_<proc>_<UUID>` | `audio-compressor-settings` | lib.js:50729, 50875, 50900 | Audio settings |
| Remote video constraints | `#remoteVideoLabel_<UUID>`, `input#constraints_<key>_<UUID>`, `input#manual_<key>_<UUID>` ("Auto:"), presets "16:9"/"9:16" | runtime labels | `updateDirectorsVideo` lib.js:52733 | Video settings |
| Remote effects | `select#remoteVideoEffect_<UUID>`, `#remoteVideoEffectAmount_<UUID>`, `#remoteVideoEffectAmountValue_<UUID>` | "Effects:", "Effect amount:" | `appendDirectorVideoEffectControls` lib.js:52649 | Video settings |
| Remote PTZ in video tile | `.video-ptz-controls` with `.video-zoom-slider`, `.video-pan-slider`, `.video-tilt-slider`, `.video-zoom-slider0` | "Zoom", "Pan", "Tilt" | `setupIncomingVideoTracking` lib.js:6758 (sites lib.js:7004-7115) | `&remote` + PTZ-capable guest |

## Director: own control box (#controls_directors_blank clone)

Built by `createDirectorOnlyBox()` lib.js:32367 (`#container_director`) and `createDirectorScreenshareOnlyBox()` lib.js:32597 (`#container_screen_director`) once the director enables camera via `press2talk`. Header adds `changeSlot`, `shiftPC(..,true)`, `minimizeMe`, `span#label_director` (`add-a-label`, rename via `promptAlt("enter-new-display-name")` lib.js:32565), solo link with copy button.

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Record self | `[data-action-type="recorder-local"]` | `record-director-local` "Record" | `recordLocalVideoToggle()` lib.js:61810 | always |
| Mute in scenes | `[data-action-type="mute-scene"]` | `mute-scene` | `directMute(this,event)` lib.js:24947 | always |
| Highlight self | `[data-action-type="solo-video"]` | `solo-video-director` | `requestInfocus(this,event)` lib.js:32120 | always |
| Add to scene 1 | `[data-action-type="addToScene"][data-scene="1"]` | `add-to-scene` | `directEnable(this,event,true)` lib.js:23673 | always |
| Scenes 2-7 | `[data-scene="2..7"]` | "S2".."S7" | `directEnable` | always |
| Named scenes | `.customScene` buttons | scene name | lib.js:32524, `updateSceneList` lib.js:57569 | named scenes |
| Scene stats | `[data-action-type="stats-remote"]` | `stats-remote` | `toggleSceneStats(this)` lib.js:17041 | always |
| Scene audio channel | `[data-action-type="sceneAudioChannel"][data-channel="1..8"]` | "C1".."C8" | `directAudioChannel(this,event,true)` lib.js:23587 | audio effects |
| Groups 1-6 | `[data-action-type="toggle-group"]` | "G1".."G6" | `changeGroupDirector(this)` lib.js:65023 | always |
| Mix order | `[data-action-type="order-down/up"]`, `p[data-action-type="order-value-director"]` | "Mix Order" | `changeOrderDirector(-1/1)` lib.js:50478 | always |
| Audio settings | `[data-action-type="advanced-audio-settings"]` | `advanced-audio-settings` | `toggleAudioUser()` lib.js:55643 | always |
| Video settings | `[data-action-type="advanced-camera-settings"]` | `advanced-camera-settings` | `toggleVideoUser()` lib.js:55666 | always |

## Director: room settings modal (#roomSettings)

Toggle: `toggleRoomSettings()` lib.js:41755 (also shows `#authAccessControl` when `session.authMode`, lib.js:41782). Escape closes (inline).

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Close | `span.modalClose` "×" | none | `toggleRoomSettings()` | always |
| Pin to side | `span.modalClose` "📌" | none | inline toggles `.pinToSide`, `#main.makeSmallerDirectorRoom` | always |
| Room video quality | `#trbSettingInput` (range), `#trbSettingInputManual`, `#trbSettingInputFeedback` | `change-room-video-quality` | `changeTRB(parseInt(value))` lib.js:41810 | always |
| Your max upload | `#ltbSettingInput`, `#ltbSettingInputManual`, `#ltbSettingInputFeedback` in `#limittotalbitrate_director` | `limit-total-bitrate-quality` | `changeLTB(this)` lib.js:41789 | `hidden` unless `&limittotalbitrate`/`&ltb` (main.js:6002) |
| Highlight director | `#highlightDirector` in `#highlightDirectorSpan` | `highlight-director-only-video-guests-will-see` | `requestInfocus(this,event)` lib.js:32120 | Removed with `&showdirector` (lib.js:31885) |
| Highlight mute-follow | `#highlightMuteFollow` in `#highlightMuteFollowSpan` | title "When enabled, Highlight will unmute..." | `toggleHighlightMuteFollow(this)` lib.js:32080 | `&highlightmute`/`&mfh` presets (main.js:4532) |
| Global countdown | `#globalTimerDirectorToggle` | `create-global-timer` | `directRoomTimer(this,event)` lib.js:24789 | always |
| Room clock | button | `create-clock-timer` | `directRoomClock(this,event)` lib.js:24762 | always |
| Allow co-directors | `#coDirectorEnable` in `#coDirectorEnableSpan` | `allow-for-remote-co-directors` | `toggleCoDirector(this)` lib.js:31401 | Pre-checked and hidden with `&codirector`/`&dirpass` (lib.js:31681-31683) |
| Co-director settings | `#codirectorSettings` | none | none | `display:block` when enabled (lib.js:31700) |
| Co-dir transfer | `#codirectorSettings_transfer` | `allow-co-directors-to-transfer-guests` | `toggleCoDirector_transfer(this)` lib.js:31307 | with settings |
| Co-dir approve | `#codirectorSettings_approve` in `#codirectorSettings_approve_container` | label in markup | `toggleCoDirector_approve(this)` lib.js:31386 | approval mode |
| Approval popup | `#codirectorSettings_approvepopup` | label in markup | `toggleApprovalPopup(this)` lib.js:31394 | approval mode |
| No-claim | `#codirectorSettings_noclaim` | label in markup | `toggleCoDirector_noClaim(this)` lib.js:31368 | with settings |
| Co-dir change URL | `#codirectorSettings_changeurl` | `allow-co-directors-to-change-a-guests-url` | `toggleCoDirector_changeurl(this)` lib.js:31303 | with settings |
| Co-dir invite link | `#codirectorSettings_invite` | `basic-co-director-invite-link` | read-only | with settings |
| Sidebar widget | `#widgetURCheck`, `#widgetURL` | placeholder "Enter a URL for the sidebar page" | `toggleWidgetURL(this)` lib.js:31456 (creates `iframe#widget`) | `&widget` (main.js:6743) |
| Local record all start/stop | buttons `[data-action-type="local-global-record"]` | `local-global-record-start`, `local-global-record-stop` | `localGlobalRecordStart()` lib.js:63069, `localGlobalRecordStop()` lib.js:63085 | always |
| Remote record all start/stop | buttons `[data-action-type="remote-global-record"]` | `remote-global-record-start`, `remote-global-record` | `remoteGlobalRecordStart()` lib.js:63103, `remoteGlobalRecordStop()` lib.js:63113 | always |
| Access mode | `input[name=roomAccessMode]` (public/authenticated/allowlist) in `#authAccessControl` | "Room Access Control" | `updateRoomAccessMode(value)` lib.js:77263 | SSO director (lib.js:41782) |
| Allowlist add | `#allowlistInput` + Add button in `#allowlistSection` | placeholder "@johndoe, email:*@company.com" | `addToAllowlist()` lib.js:77281 | allowlist mode |
| Allowlist entries | `#allowlistDisplay` rows with Remove | "Remove" | `displayAllowlist` lib.js:77316 → `removeFromAllowlist` lib.js:77338 | entries exist |
| Access requests | `#accessRequestsSection`, `#accessRequestsList` rows Approve/Deny | "Approve", "Deny" | `displayAccessRequests` lib.js:77368 → `handleAccessRequest` lib.js:77448 | pending requests |

## Director: other panels

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Guest list panel | `#connectUsers`, `#userList` rows (label click, `.volume-control-userlist`, `i.la-volume-up`, `.video-mute-state-userlist`) | `invisible-guests` "Not Visible" | `updateUserList` lib.js:14218 | `&showlist` (main.js:1450); auto `display` lib.js:14366-14368 |
| Hide guest list | `#hideusers` | title "Hide this window" | inline: hide `#connectUsers`, show `#closedList_connectUsers` (lib.js:1464 also) | with list |
| Re-open guest list | `#closedList_connectUsers` (theater-masks icon) | none | inline reverse | after hide |
| Change guest settings | `#transferSettingsTemplate` (checkbox `data-param` novideo, noaudio, broadcast, minipreview, raisehands (`#testD`), showlabels, changeroom, changepassword; text roomid/password) | `apply-new-guest-settings`, `cancel` | Apply: `changeGuestSettings(this.parentNode)` (commented-out at lib.js:720, see unresolved); Cancel `closeModal()` lib.js:3030 | Opened only by hidden "URL Params" button |
| Slot picker | `#slotPicker` with `div[data-slot="0..10"]` | "Assign to slot:", "Unset", "Slot N" | `populateSlotPicker` lib.js:421; `changeSlot` lib.js:33018 (reservation `input` lib.js:33069) | `&slotmode` |
| Remote OBS controls | `#remoteOBSControl.customModelPopup`, `#remoteOBSControlContents`, `#obsControlHelp`, `#obsControlButtons`, `#obsSceneNames`, `#obsRemotePassword`, `#debugRemoteOBSControl` | `remote-control-obs-menu` | `toggleOBSControls()` lib.js:4404; lock `toggleOBSControlsLock(this)` lib.js:4418 | `#obscontrolbutton` |
| OBS start/stop stream/record/virtualcam | generated `button` in `#obsControlButtons` | "📡 start streaming", "📽 start recording", "💻 start virtualcam" | `manageSceneState` lib.js:4537 (sites lib.js:4708, 4750, 4792) | OBS peer with permissions |
| OBS scene switcher | generated `button` per scene in `#obsSceneNames` | scene name | lib.js:4866 | same |
| Mesh visualization | `#meshModal`, `.meshToolbar` (`#meshRefreshBtn`, `#meshLayoutBtn`, auto-patch/unpatch, `#meshFilterProblems`, close), `#meshSvgContainer`, `#meshDetailPanel`, `.meshStatusBar` | runtime text | `openMeshVisualization` lib.js:37635; `requestMeshData` lib.js:36955; `cycleMeshLayout` lib.js:37782; `closeMeshVisualization` lib.js:37711; `renderMeshStatusBar` lib.js:37797; detail actions lib.js:38316-38497 | `#meshDebugBtn` |
| Queue next | `#queuebutton` | see control bar | `nextQueue` lib.js:6071 | `&queue` |
| Join approvals | `#joinRequestPanel` | see control bar | lib.js:5978-6061 | `&requireapproval`, `#requireApprovalForRoom` |
| Meshcast region | `#meshcastMenu`, `#edgelist` | "Meshcast publishing region:" | `selectMeshcast(this)` webrtc.js:25120 | Meshcast region choice |
| Meshcast publish error | `#meshcastPublishError` with retry `button.gobutton.green` | `meshcast-publish-retry` | `setMeshcastStudioPublishStatus` lib.js:68841 | Meshcast failure |
| Icecast panel | `#vdo-icecast-panel` | runtime | `vdoIcecastEnsurePanel` lib.js:78785 | Icecast output |

## Scene output (&scene) and view-only output (&view)

Both render into `#gridlayout` via `updateMixer()` lib.js:7660 → `updateMixerRun()` lib.js:7843. Scene joins the room with `joinRoom(session.roomid)` lib.js:30549; view calls `play()` lib.js:5783. Director "add to scene" buttons drive which guests a scene shows.

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Video holder | `div.holder` / `div.container_holder_video` (`.is-screenshare` / `.is-not-screenshare`) | none | `updateMixerRun` lib.js:9908, 10049 | per active stream |
| Remote video | `video` with `data-UUID`, `data-menu="context-menu-video"` | none | `createRichVideoElement` lib.js:7408, `setupIncomingVideoTracking` lib.js:6758 | per stream |
| Labels | `div.video-label-container > div.video-label.<labelstyle>` / `span.video-label` | stream label | lib.js:10461, 10553-10561 | `&showlabels`/`&sl` (main.js:3477), `&labelstyle` |
| Meta images | `div.video-image-container > img.meta-image` | none | lib.js:10583-10603 | label templates |
| Text overlay | `div.textOverlay` | none | lib.js:9848 | overlay text API |
| Foreground media | `img.foregroundMedia` | none | lib.js:10107 | overlay image |
| Paused play button | `span#paused_<UUID>.playButton` | none | inline onclick lib.js:10147 | paused stream |
| Full-window toggle | `div#button_<videoId>` / `#button_videosource` (`.fullwindowButton`, sd.svg/hd.svg) | titles "Show all active videos togethers", "Enlarge video..." | lib.js:10766, 10887 | non-clean, multiple videos |
| Preview eye toggle | `div.togglePreview` | eye icons | lib.js:9457 | mini self-preview |
| Widget iframe | `iframe#widget.left` | none | lib.js:7869, 7916 | `&widget` |
| Waiting image | `img#retryimage` | none | main.js:8406 | `&waitimage`, `&nosignal`/`&nosignalpattern` (main.js:8364-8378) |
| Waiting spinner | `div#retrySpinner.retry-spinner` | `waiting-for-the-stream` | onclick adds `&cleanoutput` and reloads (main.js:8418) | not clean, no wait image |
| Waiting message | `div#retrymessage` | `&waitmessage` text | none | `&waitmessage` |
| Slideshow image | appended to `#gridlayout` | none | lib.js:12113 | slideshow mode |
| Tip overlay | `div.tipIconOverlay` (`.tipHeart`, `.tipLabel`, `.tipQR`) | "Send a Tip" | `addTipIconToVideo` lib.js:25924 → `openTipModal` lib.js:26504 | `&tipsid` / `&showtips` (main.js:2413) |
| Tip banner | `div.tipBanner` | "<amount> tip from <label>" | `showTipBanner` lib.js:26329 | tip received |
| Closed captions | `#overlayMsgs` spans `<UUID>_<counter>` | transcript | `updateClosedCaptions` lib.js:59348 | `&cc` style params |
| Grid on resize | `window.onresize = updateMixer` | n/a | main.js:8180, 8278 | scene / view |
| View-only tile | `#container-22` | `view-only` | sets `&solo=1` | see landing |
| Page title | `document.title` "View=<id>" / "Room=<id>" | n/a | main.js:8345-8353, 8472-8482 | unless `&label` |

## OBS / browser-source behavior

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Studio detection | `window.obsstudio` / MELD | n/a | sets `session.studioSoftware` main.js:591 | automatic |
| Hide header in OBS | `#header` | n/a | main.js:6270 | studio software unless `&showheader` |
| Hide mini task bar | `#miniTaskBar` | n/a | main.js:4558 | `window.obsstudio` |
| Hide save-room | `#saveRoom` | n/a | main.js:593 | studio software |
| Push link warning | `#unexpectedPushLink` | see landing | main.js:7320, 8211 | push or guest link in OBS |
| Auto scene in OBS | n/a | n/a | `updateURL("scene",...)`, `session.scene=0` main.js:8206-8207 | OBS + `&room` + `&view` |
| Transparent page | `:root --background-color: #0000` | n/a | main.js:3669-3672 | `&transparent`/`&transparency` |
| Chroma / transparent video bg | `:root --background-color`, `--myvideo-background` | n/a | main.js:4658-4663 (`&chroma`), main.js:6245 (clean) | `&chroma`, `&clean` |
| Clean output | header, control bar, credits, help, report, calendar, translate | n/a | main.js:6230-6254 | `&clean`/`&cleanoutput`/`&cleanish` |
| Clean-ish | reduced control bar + record button | n/a | lib.js:27689-27707, 27123-27142; main.js:6313 | `&cleanish` |
| Clean viewer | suppresses control bar on view pages | n/a | `session.cleanViewer` main.js:574; lib.js:27090 | `&cleanviewer`/`&cv` |
| Clean director | hides `#roomHeader`/links | n/a | lib.js:31779 | `&cleandirector`/`&cdv` |
| Tally classes | `#main.onair/.ondeck/.recording` | n/a | `applySceneState` lib.js:4988 | OBS visibility events; `&tallyoff` |
| OBS state badge | `#obsState` | "ACTIVE" | lib.js | OBS visibility |
| Native controls | `video.controls` | n/a | `session.publishStream` lib.js:45165 | `&controls`, mobile defaults true |
| Light theme in OBS | body class | n/a | main.js:4775 | studio software forces `darkmode=false` |

## Screen share (tile, control, and context menu)

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Select screen | `button.mainScreenShareButton` in `#container-2` | `select-screen-to-share` | `publishScreen()` lib.js:26897 | Tile expanded or `&screenshare`/`&ss` |
| Capture resolution gear | `#gear_screen` | title "Change the capture resolution..." | `toggle(getById('videoSettings2'))` | tile |
| Screen resolution radios | `#webcamquality2`: `#maxres2`, `#fullhd2`, `#halfhd2`, `#nothd2` | `highest-resolution`, `1080p-resolution`, `720p-balanced`, `360p-smooth-cool` | read by `publishScreen` | `#videoSettings2` |
| Screen stats | `#webcamstats2` | none | none | tile |
| Consent warning | `#consentWarning2` | `privacy-disabled` | none | `&consent` (main.js:4929) |
| Add mic sources | `#showAudioDevices.audio-select-btn` | "Add Microphone Sources" | `requestAudioStream()` lib.js:34627 (builds `.audio-device-item` checkboxes in `#audioDeviceList`) | `#audioScreenShare1` hidden by `&ad=0` (main.js:4877), lib.js |
| Audio error | `#audioSelectError` | runtime | `requestAudioStream` | on error |
| Screen-share speaker | `#outputSourceScreenshare` in `#headphonesDiv2` | `select-output-source` | onclick `requestOutputAudioStream()` lib.js:34566 | `#headphonesDiv2` shown in rooms (main.js:8068), `&od` (main.js:4102) |
| Screen-share test tone | `#headphonesDiv2 .testtonebutton` | "Test" | `playtone(true)` lib.js:38760 | same |
| Audio docs links | `#audioScreenCaptureDocs`, `#audioScreenCaptureDocs2` | `application-audio-capture`, `1080p-screen-capture-guide` | links | `permahide` `&hidehome` |
| In-call share button | `#screensharebutton` / `#screenshare2button` / `#screenshare3button` | see control bar | `screenshareTypeDecider` lib.js:56707 | `&sstype` |
| Shared screen element | `video#screensharesource` / `iframe#screensharesource` | none | `toggleScreenShare` lib.js:40162 (id lib.js:76855), `createIframePopup` lib.js:56898 | while sharing |
| Screen-share box (publisher) | `div#container_screen.vidcon` | none | `publishScreen2` lib.js:45761 | `&screenshare` publish |
| Mobile refusal | `warnUser` | `ios-no-screen-share`, `mobile-no-screen-share`, `no-screen-share-supported-firefox`, `no-screen-share-supported` | `grabScreen` lib.js:41220 (lib.js:41224-41230) | iOS / mobile / old Firefox |
| Context: share from new tab | `nav#context-menu-screen-share a[data-action="SSNewTab"]` | `open-ss-in-new-tab` | `menuItemListener` lib.js:57898 (lib.js:58127) | right-click on share button |
| Context: mode 1/2/3 | `a[data-action="ss1"]`, `"ss2"`, `"ss3"` | `ss-mode-1`, `ss-mode-2`, `ss-mode-3` | none found (see unresolved) | `li.hidden` |

## Context menus (nav#context-menu*)

Engine: IIFE `rightclickmenuthing` at lib.js:57701. `contextmenu` listener finds the nearest element with `data-menu` and opens `getById(data-menu)` (lib.js:57750-57773); `toggleMenuOn` adds `.context-menu--active` (lib.js:57816); `menuItemSyncState` hides/shows items per target (lib.js:58164); `menuItemListener` dispatches on `data-action` (lib.js:57898).

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Link: open in new tab | `#context-menu a[data-action="Open"]` | `open-in-new-tab` | `window.open` lib.js:57900 | right-click on `data-menu="context-menu"` links |
| Link: copy | `[data-action="Copy"]` | `copy-to-clipboard` | `copyFunction` lib.js:57902 | same |
| Link: edit URL | `[data-action="Edit"]` | `edit-url` | prompt + rewrite lib.js:58038 | same |
| Link: publish via WHIP | `[data-action="Publish"]` | `publish-url` | opens publish window lib.js:58133 | `li.hidden`; shown when target has `.publish` (scene link) (lib.js:58328) |
| Link: record as window | `[data-action="RecordWindow"]` | `record-window` | opens `&autorecordlocal` window lib.js:58139 | `.publish` target (lib.js:58334) |
| Link: QR code | `[data-action="QRCode"]` | `show-qr-code` | `loadQR` lib.js:58046 | always |
| Clock: pop-out | `#context-menu-clock a[data-action="pip-clock"]` | `detach-clock2-pip` | `popOutClock` lib.js:58921 | right-click `#overlayClockContainer*` |
| Video: mirror | `#context-menu-video a[data-action="Mirror"]` | `mirror-video` | lib.js:57904 (`applyMirror` lib.js:39199 for self) | right-click any `data-menu="context-menu-video"` video |
| Video: rotate | `[data-action="Rotate"]` | `rotate-video` | lib.js:57927 | same |
| Video: show / hide controls | `[data-action="Controls"]`, `[data-action="HideControls"]` | `show-controls-video`, `hide-controls-video` | lib.js:58017, 58030 (`checkVideoControlBar` lib.js:58355) | toggled by current `controls` state |
| Video: PiP | `[data-action="PiP"]` | `picture-in-picture` | lib.js:57973 | always |
| Video: PiP all | `[data-action="PiP2"]` | `picture-in-picture-all` | lib.js:57975 | Document PiP available (lib.js:58247) |
| Video: full / shrink window | `[data-action="FullWindow"]`, `[data-action="ShrinkWindow"]` | `full-window`, `shrink-window` | lib.js:57959, 57966 | by `session.infocus` |
| Video: pause / resume | `[data-action="Pause"]`, `[data-action="UnPause"]` | `pause-stream`, `resume-stream` | lib.js:57969-57971 | remote streams only |
| Video: record / stop | `[data-action="Record"]`, `[data-action="StopRecording"]` | `record-to-disk`, `stop-record-to-disk` | lib.js:57977-57995 | by recording state |
| Video: snapshot to clipboard | `[data-action="CopyFrameAsImage"]` | `copy-to-clipboard-frame` | `copyVideoFrameToClipboard` lib.js:30989 | has video track |
| Video: save frame | `[data-action="SaveFrameToDisk"]` | `save-current-frame` | lib.js:57998 | has video track |
| Video: draw | `[data-action="DrawOnVideo"]` | `draw-on-video` | `drawOnThis` lib.js:12505 (toolbar `.buttonContainer`, ping button `drawing-ping-help`, color input) | always |
| Video: stats | `[data-action="ShowStats"]` | `show-video-stats` | `statsMenuCreator` lib.js:45056 → `#menuStatsBox` | `&stats` not false (main.js:6193) |
| Video: audio destination | `[data-action="OutputAudio"]` + `input` | `custom-audio-output` | `gotDevices3` lib.js:58371 builds `select` | always |
| Video: remote controls submenu | `li#RemoteControlsSubmenu` (`[data-action="RemoteControlsParent"]`) | `remote-controls` | lib.js:58125 | `&remote` peer (lib.js:58270-58280) |
| Video: PTZ controls | `li#PTZControlsContextOption [data-action="PTZControls"]` | `ptz-controls` | `togglePTZControls` lib.js:41675 | submenu |
| Video: reset autofocus | `li#ResetAutofocusContextOption [data-action="ResetAutofocus"]` | `reset-autofocus` | lib.js:58120 | submenu |
| Video: remote hang-up | `li#RemoteHangupContextOption [data-action="RemoteHangup"]` | `remote-hangup-connection` | lib.js:58092 | submenu |
| Video: remote reload | `li#RemoteReloadContextOption [data-action="RemoteReload"]` | `remote-reload-connection` | lib.js:58104 | `li.hidden`; remote peer |
| Video: change buffer | `[data-action="ChangeBuffer"]` | `change-playout-buffer` | `toggleBufferSettings` lib.js:41602 | not self preview (lib.js:58280) |
| Video: send tip | `li#SendTipContextOption [data-action="SendTip"]` | `send-tip` | `openTipModal` lib.js:26504 | peer accepts tips, not Electron (lib.js:58294-58328) |
| Video: tip footer | `span.context-menu__tip [data-action="TipRightClick"]` | `hold-ctrl` | none | hidden in Electron (lib.js:58289) |

## Chat (#chatModule)

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Toggle chat | `#chatbutton` | aria "Text chat" | `toggleChat()` lib.js:21809 (first open `setupAdjustableChat` lib.js:21858) | see control bar |
| Chat panel | `#chatModule` | "Chat" | `toggleChat` | `hidden` by default |
| Pop out chat | `#popOutChat` | none | `createPopoutChat()` lib.js:58957 | always |
| Close chat | `#closeChat` "x" | none | `toggleChat()` | always |
| Message list | `#chatBody.resizable-div` with `div.inMessage` / `div.outMessage`, file rows `#transfer_<idx>.transfer.file-transfer` | none | `updateMessages` lib.js:59428 | cleared on rtc.ninja / custom hosts (main.js:510, 541) |
| Input | `#chatInput` | placeholder "Enter chat message to send" | `EnterButtonChat(event)` lib.js:59517 | always |
| Send | `button.chatBarInputButton` | "Send" | `sendChatMessage()` lib.js:58510 | always |
| Attach file | `#chatModule button` (file icon) | none | `toggleFileshare()` lib.js:21451 | always |
| Incoming handler | n/a | n/a | `getChatMessage` lib.js:59099 (overlay `.persistent-overlay` into `#overlayMsgs`) | `&chat` overlay modes |
| Unread badge | `#chatNotification.notification.red`, `#chattoggle.pulsate` | none | lib.js:59224 | new message while closed |
| Active shares | `#activeShares` | none | lib.js | file/website shares in progress |

## File share and media streaming

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Media file picker | `#fileselector` in `#container-5` | `select-the-video-files-to-share` | `session.publishFile(this,event)` lib.js:47439 (creates `#container` + `video#videosource`) | `&fileshare`/`&fs` |
| Chrome warning | `#chrome_warning_fileshare` | "Keep this tab visible..." | none | `&fileshare` non-Safari non-Firefox (main.js:2034) |
| Safari warning | `#safari_warning_fileshare` | "Safari does not support this feature" | none | `&fileshare` Safari (main.js:2032) |
| Host file for transfer | `#fileselector2` | title "Transfer any file" | `session.hostFile(this,event)` lib.js:46691 (`#container_host`) | `#container-5` |
| Change streamed file | `#fileselector3` via `#mediafileshare` | see control bar | `session.changePublishFile` lib.js:47328 | after publishFile/hostFile |
| File manager | `div.file-manager` (`.file-manager-header`, `.header-controls`, `input#fileInput`, `.file-list`, `.file-item`, `.transfer-item`) | "File Sharing", "No files being shared" | `updateFileShare` lib.js:21525; minimize `toggleFileManagerSize` lib.js:21521; cancel `cancelFileTransfer` lib.js:21652; add `session.shareFile` lib.js:46631 | `toggleFileshare` lib.js:21451 |
| Director per-guest file picker | `input#fileselector4` | none | `session.shareFile(this,UUID,event)` lib.js:46631 | `toggleFileshare(UUID)` lib.js:21456-21461 |
| Download offer in chat | buttons `requestFile`, `clearDownloadFile`, `cancelFile` | none | lib.js:46423, 46438, 46414 (markup lib.js:46588-46592) | incoming file offer |
| Drawing permission prompt | Allow / Deny buttons | none | `resolveDrawingPermissionRequest` (markup lib.js:46558) | remote draw request |
| Share website (iframe) | `#iframeURL`, Preview, Share in `#container-6` | `enter-the-website-URL-you-wish-to-share` | `previewIframe(url)` lib.js:48342; `session.publishIFrame(url)` lib.js:28413 (`#container_iframe`, `iframe#iframe_source`) | `&website`/`&iframe` |
| Website preview | `#previewIframe` | none | `previewIframe` | `#container-6` |
| WHIP join | `#container-18` Refresh / JOIN | `whip-in` | `previewIframe`, `session.publishIFrame` (copy of website panel) | `&whipme` |
| WHEP share URL | `#whepURL` | `enter-the-whep-URL-you-wish-to-share` | `handleWhepUrlInputChange(event)` main.js:300 | `#container-16` |
| WHEP test preview | `#whepPreviewToggle` | "Start Test Preview" | `toggleWhepTestPreview(event)` main.js:311 | same |
| WHEP start | `#whepShareStart` | "Start Sharing" | `startWhepSharingFromInput(event)` main.js:349 | same |
| WHEP help / state | `#whepURLHelp`, `#whepPreviewState` | text | main.js | same |

## Recording

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Local self record | `#recordLocalbutton` | aria "Record your stream to disk" | `recordLocalVideoToggle()` lib.js:61810 → `recordLocalVideo` lib.js:62177 | `&record`; `&autorecord`/`&autorecordlocal` auto-start (main.js:2582-2593); iOS splits 5-min segments (main.js:2538, 2620) |
| Screen record stop | `#recordLocalScreenbutton` | "Stop Screen Record" | `recordLocalScreenStopRecord()` lib.js:77029 | during screen record |
| Session marker | `#sessionMarkerButton` | aria "Drop a session marker" | `dropSessionMarker()` lib.js:61741 | `&sessionlog` |
| Per-guest local record | `[data-action-type="recorder-local"]` in guest box | `record-local` | `recordVideo(this,event)` lib.js:61114 | director |
| Per-guest remote record | `[data-action-type="recorder-remote"]` | `record-remote` | `requestVideoRecord(this)` lib.js:50444 | director |
| Per-guest Google Drive | `[data-action-type="recorder-google-drive-remote"]` | `google-drive-record` | `requestGoogleDriveRecord` lib.js:50120 (OAuth buttons lib.js:66548-66554) | director |
| Drive record all | `#gdriveAllGuests` | see control bar | `remoteGlobalGdriveRecordToggle` lib.js:50377 | `&gdriveall` |
| Room local record all | `#roomSettings` buttons | `local-global-record-start/stop` | lib.js:63069, 63085 | room settings |
| Room remote record all | `#roomSettings` buttons | `remote-global-record-start`, `remote-global-record` | lib.js:63103, 63113 | room settings |
| Director self record | director box `recorder-local` | `record-director-local` | `recordLocalVideoToggle()` lib.js:61810 | director with camera |
| Context record | `#context-menu-video` Record / Stop | `record-to-disk` / `stop-record-to-disk` | lib.js:57977 | right-click video |
| Record as window | `#context-menu` RecordWindow | `record-window` | lib.js:58139 | scene link |
| Record window page | `#publishSettings` `#startRecordingButton` | "🔴 Select window and start recording" | `startRecording()` lib.js:67954 | `&recordwindow`/`&rw` (main.js:2144, 2675) |
| Scene tab record / Go Live | `button#recordWindowButton`, `small#recordWindowHelp`, `button#goLiveButton` | "● Start Recording", "📡 Go Live" | inline in main.js:2794-2830 | record-window / go-live params |
| Recording indicator | `#main.recording` | n/a | `applySceneState` lib.js:5046 | OBS recording |

## Popups and modals

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Alert modal | `#alertModal`, `#alertModalMessage`, `#modalBackdrop` | runtime text | `warnUser` lib.js:2977; `closeModal` lib.js:3030 | any warning |
| Prompt modal | `#promptModal`, `#promptModalMessage`, `input_<promptID>` | runtime text | `promptAlt` lib.js:1875; `promptUser` lib.js:1750 | label / password / hotkey prompts |
| Confirm modal | `confirmAlt` dialog | runtime | `confirmAlt` lib.js:2835 | e.g. load previous session (main.js:688) |
| Password / info prompt | `#request_info_prompt` | `password-incorrect` | main.js:3448 | wrong password hash |
| Screen popup | `#screenPopup.popup-screen` | "See the documentation for more options and info." / "Close Window" | inline hides | screen share guidance |
| Message popup | `#messagePopup.popup-message` | runtime | `popupMessage` | copy feedback |
| Buffer settings | `#bufferSettings` (number + range `[data-buffer-value]`) | `buffer-settings`, `buffer-ms-label` | `toggleBufferSettings()` lib.js:41602 | context ChangeBuffer |
| PTZ modal | `#ptzControlsModal`: `#ptzPanSlider`/`#ptzPanValue`, `#ptzTiltSlider`, `#ptzZoomSlider`, `#ptzFocusSlider`, `#ptzResetAutofocusBtn` | `ptz-controls`, `pan`, `tilt`, `zoom`, `focus`, `reset-autofocus`, `keyboard-shortcuts` | `togglePTZControls()` lib.js:41675; sliders lib.js:41713-41749 | context PTZControls |
| Publish settings (WHIP out) | `#publishSettings`, `#publishOutURL` input, `#publishOutToken`/`#changeText1a`, selects `#whipoutaudiobitrate`, `#whipoutvbrcbr`, `#whipoutdenoise`, `#whipoutautogain`, `#whipoutstereo`, `#whipoutbitrateGroupFlag`, `#whipoutcodecGroupFlag` | `publish-settings` | `startPublishing()` lib.js:67872 via `#startPublishingButton` | `&publish` (main.js:2670-2677); URL/token rows main.js:1209-1228; selects hidden per param (main.js:3794-6063) |
| Stats panel | `#menuStatsBox.debugStats.remotestats` (`.debugStatsHeader` `statistics`, `button.statsCopyBtn`, `button.close`, `.debugStatsBody`) | `statistics`, "Copy" | `statsMenuCreator` lib.js:45056; Escape lib.js:45107 | signal meter click, context ShowStats |
| Auto-PiP prompt | `#pipPrompt` with "Open PiP" / "Not now" | "Click to enable picture-in-picture" | `showAutoPiPPrompt` lib.js:50639 | auto-PiP params |
| Audio processing modal | `#audioCompressorModal.promptModal` | runtime | `openAudioProcessing` lib.js:51073 | compressor/EQ gear |
| Label signal backdrop | `div.modalBackdrop` | none | `labelSignal` lib.js:51159 | label signal |
| Black-out overlay | `#blackoutOverlay` | "Click to exit black-out mode" | `blackoutMode` lib.js:34344 | `#blackoutmode` |
| Tip onboarding / tip modal | `#tipOnboardingBackdrop`, `#tipCustomInput_<id>`, `#tipConfirmBtn_<id>` | runtime | `applyTipUsername` lib.js:26275, `selectTipAmount` lib.js:26702, `confirmTip` lib.js:26784, `closeTipModal` lib.js:26873 | tipping enabled |
| QR invite | `loadQR` canvas in alert modal | runtime | `loadQR` lib.js:11224, `generateQRPage` lib.js:57112, `showInviteQR` lib.js:11240 | invite tile / QR actions |
| Reusable invite panel | `#gencontent` (`#videoname4`, generate button, `#invite_bitrate`, `#invite_vp9`, `#invite_stereo`, `#invite_quality`, `#invite_effects`, `#invite_automic`, `#invite_hidescreen`, `#invite_obfuscate`, `#invite_password`, `#invite_hostlink`, `#invite_joinroom`, `#invitegroupchat`/`#invite_group_chat_type`), result `#gencontent2` | `here-you-can-pre-generate`, `generate-invite-link`, `quality-paramaters`, `unlock-video-bitrate`, `force-vp9-video-codec`, `enable-stereo-and-pro`, `video-resolution`, `general-paramaters`, `allow-effects-invite`, `hide-mic-selection`, `hide-screen-share`, `obfuscate_url`, `add-a-password-to-stream`, `interview-paramaters`, `generate-host-link`, `add-the-guest-to-a-room`, `invite-group-chat-type`, `can-see-and-hear`, `can-hear-only`, `cant-see-or-hear` | `generateQRPage()` lib.js:57112; result links `copyFunction` lib.js:57496-57510; `resetGen()` lib.js:57379 | `#container-4` |
| Hang-up screen | `#hangupTemplate` → `#hangupContainer` "👋" + Refresh | `reload-page` | inline reload | `hangup()` lib.js:23115 |
| Progress bar | `#progressContainer`, `#progressBar` | none | lib.js | uploads/transfers |

## Help / info footer, language, calendar

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Info blurb | `#info .infoblob` | `info-blob` | links only | Landing; cleared in room (main.js:8073), hidden scene/view (main.js:8174, 8389), rtc.ninja (main.js:508), `&hidehome` |
| Credits footer | `#credits.footer` | ToS / Privacy links; version string on bare landing | none | Hidden in view (main.js:8344), clean (main.js:6233); `hidden2` when a tile expands |
| Legal footer | `#legal.footer.hidden` | ToS / Privacy / Report Abuse | links | Never un-hidden (all show calls commented out, e.g. main.js:6234, 8178) |
| Report bug | `#reportbutton` | title "Submit any error logs" | `submitDebugLog()` lib.js:771 | `hidden` + `display:none`; no code un-hides it |
| Help | `#helpbutton` | title "Show help contact info" | `warnUser(...)` lib.js:2977 | `display:none`; no code un-hides it |
| Language button | `#translateButton` | aria "language options" | `toggle(getById('languages'))` | Hidden `&hidetranslate` (main.js:6227), clean, scene, view, rtc.ninja; `permahide` `&hidehome` |
| Language list | `#languages`, `#languagesList a` (en, de, fr, it, es, pl, pt, pt-br, nl, tr, ja, ar (RTL), cn, cs, ru, uk, eu, kr, pig, hi) + "Add More Here!" | `available-languages`, `add-more-here` | `changeLg(code,rtl,true)` lib.js:11084 | via language button |
| Calendar button | `#calendarButton` | title "Add to Calendar" | `toggle(getById('calendar'))` | Shown inline-block for directors (lib.js:31784); hidden clean (main.js:6241), iframe (main.js:5733), `&hidehome` |
| Calendar menu | `#calendar` with Google / Outlook / Yahoo links | `add-to-calendar`, `add-to-google-calendar`, `add-to-outlook-calendar`, `add-to-yahoo-calendar` | `addToGoogleCalendar()` lib.js:34432, `addToOutlookCalendar()` lib.js:34445, `addToYahooCalendar()` lib.js:34458 | via calendar button |
| Translation keys source | `[data-translate]` | `translations/<lang>.json` | `changeLg` lib.js:11084; `miniTranslate` | always |

## Mobile, iOS and Android behavior

Detection: `&notmobile` / `&mobile` override; else iOS/iPad, or UA `/Android|Pixel|webOS|BlackBerry|IEMobile|Opera Mini/` sets `session.mobile=true` (main.js:1315-1375). Desktop-only path makes the control bar draggable and shows the Safari warning (main.js:1376-1383).

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Old iOS warning | `#oldiOSWarning` | `update-your-device` | none | iOS Safari < 17 (main.js:1322) |
| Chrome-on-iOS warning | `warnUser` | inline text | main.js:1361-1369 | `CriOS` without getUserMedia |
| iOS viewport fix | `html` height 100vh/100% on resize | n/a | main.js:1328-1358 | iOS/iPad |
| No screen share on mobile | `#shareScreenGear`, `#dropButton` hidden; `session.screensharebutton=false` | n/a | main.js:4910-4915 | `session.mobile` |
| Flip camera | `#flipcamerabutton` | aria "Cycle Cameras" | `cycleCameras` lib.js:34378 | mobile with audio (main.js:4918); prefers "front" camera ordering (lib.js:35071) |
| No file share on mobile | `#sharefilebutton` | n/a | main.js:8307 | mobile |
| Remember stream ID | `#rememberStreamID` | see landing | lib.js:27505 | mobile push without room |
| Control bar fade | `#controlButtons.partialFadeout` vs `.fadeout` | n/a | `showControl` lib.js:11205 | mobile vs desktop |
| Fullscreen button | `#fullscreenPage`, `#fullscreenToggleContainer` | n/a | main.js:1843; lib.js:22323 | hidden on iOS/iPad |
| Orientation lock exits fullscreen | `#fullscreenPageToggle` icons | n/a | main.js:1823-1828 | `&forcelandscape`/`&forceportrait` on mobile |
| Volume control | per-video volume | n/a | `session.volumeControl` main.js:2165 | disabled on iOS |
| Native video controls | `video.controls=true` | n/a | lib.js:45165 | mobile default |
| Animated moves off | n/a | n/a | main.js:6789 | mobile |
| Mixer debounce | n/a | n/a | lib.js:7706, 7724 | mobile 200 ms / 500 ms |
| Audio output sink | speaker picker ignored | n/a | lib.js:56472 | iOS / mobile (no setSinkId) |
| Camera timeout messages | `warnUser` | inline | lib.js:56505-56512 | iOS / mobile |
| Rotate mirror quirk | context Rotate | n/a | lib.js:57933 | Firefox mobile |
| Recording segments | `#recordLocalbutton` | iOS notice | main.js:2538, 2620-2623 | iOS / Safari |
| Audio bitrate | n/a | n/a | main.js:4084 | iOS disables custom audio bitrate |
| Android fixes | n/a | n/a | `session.AndroidFix` main.js:4923; hardware codec main.js:5669 | `&androidfix`, Android |
| Audio effects default off | n/a | n/a | main.js:1319, 1326, 1374 | mobile |

## Keyboard shortcuts (global, main.js:10827)

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Mic mute | CTRL/⌘ + M | `#mutebutton` title | `toggleMute()` lib.js:20839 | always |
| Camera mute | CTRL/⌘ + B | `#mutevideobutton` title | `toggleVideoMute()` lib.js:22070 | always |
| File share | CTRL + ALT + F | none | `toggleFileshare()` lib.js:21451 | always |
| Cycle camera | CTRL + ALT + C | none | `cycleCameras()` lib.js:34378 | always |
| Screen share | CTRL + ALT + S | none | `toggleScreenShare()` lib.js:40162 | always |
| Draw on screen | CTRL + ALT + D | `#startDrawScreen` title | `drawOnScreen()` lib.js:12221 / `drawOnScreenObject.stop()` | always |
| PiP self | CTRL + ALT + P | none | `togglePictureInPicture(session.videoElement)` | always |
| Speaker mute | ALT + A | `#mutespeakerbutton` title | `toggleSpeakerMute()` lib.js:21011 | always |
| Start streaming | ALT + S | `#gowebcam` title | `publishWebcam(gowebcam)` lib.js:27467 | `#gowebcam.dataset.ready` |
| Push-to-talk | user hotkey | `#pptHotKey` | `toggleMute(true)` main.js:10865-10883 | hotkey set |
| Exit fullscreen | Escape | n/a | main.js:10844 | fullscreen |

## Add-on surfaces (each loaded by its own parameter)

Three surfaces live on `index.html` but are built at run time by code outside the static markup, each with a stylesheet of its own that it injects after the page's styles. The first inventory pass missed them, because the parameter scan read only literal `urlParams.has("name")` calls and these read their parameters through helper functions. They are listed in [url-parameters.md](url-parameters.md) now.

| Surface | Parameter | Selector | Built by (file:line) | Controls | Redesign status |
|---|---|---|---|---|---|
| Icecast publishing panel | `&icecastpush`, `&icecastview`, `&icecast` (plus the `&icecast...` settings) | `#vdo-icecast-panel`, fixed bottom right | `vdoIcecastEnsurePanel` lib.js:78785, wired in `setupVDOIcecast` lib.js:78938 | Source URL `#vdo-icecast-target`, username `#vdo-icecast-username`, password `#vdo-icecast-password`, format `#vdo-icecast-format`, Start `#vdo-icecast-start` (`vdoIcecastControllerStart` lib.js:78897), Settings `#vdo-icecast-settings` (shows or hides `#vdo-icecast-form`), Stop `#vdo-icecast-stop`, status `#vdo-icecast-status` with `data-state` idle, ready, live or error | Themed (`addons.css`) |
| Phone call-in panel | `&callin` (plus the `&sip...`, `&callin...`, `&twilio...` and `&signalwire...` settings) | `#vdo-callin-panel`, fixed right, draggable, can minimize | `setupCallIn` callin.js:583, loaded by main.js:1547 | Provider select (SIP / PBX, Twilio, SignalWire), SIP WebSocket URL, SIP URI, auth username, password, display name, dial target, three checkboxes (register, auto-answer, remember password), Save profile, Forget, Connect (`connectSip` callin.js:1950), Dial (`dialSip` callin.js:2101), Hang up, ringtone menu (bell icon), minimize (chevron icon), incoming-call card with Answer and Reject, status `#vdo-callin-status`, setup guide link | Themed (`addons.css`) |
| Podcast Studio | `&podcast` | `#podcast-root`, `#podcast-room-gate`, `.podcast-preflight-backdrop`, `.remote-overlay`, `.help-overlay`; `body.podcast-studio-mode` hides every other body child, the app bar and the launcher included | inline loader index.html:3647, `podcast/bootstrap.js`, `PodcastStudioApp` podcast/studio.js:1623, styles `podcast/studio.css` (2,484 lines, fixed colors, no custom properties) | Room gate (podcast/studio.js:1036): room name, password, Enter Studio, Back to classic. Setup check (podcast/studio.js:1280): mic, camera and disk tests, Enter Control Room, Skip preflight. Control room (podcast/studio.js:3655 on): header, host panel, guest panels, invite panel, session tools (recording, recording settings), timeline with waveform and spectrogram, chat panel, help guide (podcast/studio.js:6442) | **Not redesigned.** It keeps upstream's own look: gradients, blur, pill buttons, dark only. BytesNation adds three things: the credit bar `#bn-podcast-credit`, the dark tokens on every `&podcast` link, and a setup check that scrolls on small screens. The command palette and notifications stay off here |

Engine strings in these surfaces still say "VDO.Ninja": the Icecast panel's description, the default Icecast stream name ("VDO.Ninja Live"), and the default SIP display name ("VDO.Ninja"). They are defaults inside `lib.js` and `callin.js`, which BytesNation does not modify; `&icecastname` and `&sipdisplay` override the two names per link.

## Other entry points

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| room.html redirect | `a#redirectLink` | "Redirecting to VDO.Ninja." | inline `window.location.replace` to `index.html` with same query/hash (room.html:9-14, 22-28) | always; no UI of its own |
| meet.html chat toggle | `#chatModuleButton` "💬", `.xbutton` | title "Show the chat window" | `toggleChat()` meet.html:971 | `hidden` until joined |
| meet.html chat | `#chatModule`, `#chatBody`, `#chatInput`, `#sendChat` | `welcome-to-vdo-ninja-chat` | `EnterButtonChat` meet.html:1173, `sendChatMessage` meet.html:1184, `updateMessages` meet.html:1227 | joined |
| meet.html room name | `#roomname`, random button | placeholder "Room Name" | `randomRoomName()` meet.html:1081 | `#welcomeWindow` |
| meet.html password | `#roompassword` | placeholder "Room Password (optional)" | read by `startRoom` | `#welcomeWindow` |
| meet.html join | button "Join Room!" | "Join Room!" | `startRoom()` meet.html:1090 → `loadIframe()` meet.html:1735 | `#welcomeWindow` |
| meet.html restore | `#lastSavedRoom` (`#savedroomname`, `#savedroompassword`), "Restore last room" | "Restore last room" | `startLastRoom()` meet.html:1084 | saved session in storage |
| meet.html tiles | `#iframeContainer` (drag/drop tiles, z-order, aspect) | none | `drag`/`drop` meet.html:1341/1368, `pullUp`/`pushDown` meet.html:1941/1951, `remoteActivate` meet.html:1967, `deleteElement` meet.html:1988, `changeAspectRatio` meet.html:2021, `saveSession`/`exportSession` meet.html:1993/1554 | joined |
| meet.html powered-by | `div` "Powered by VDO.Ninja" | text | `window.open('https://vdo.ninja')` | always |

Note: meet.html is a standalone jQuery page that embeds VDO.Ninja through iframes; it does not load lib.js or main.js, so the redesign shell does not inherit its DOM.

## Unresolved or dead controls

| Control | Selector | Label / translate key | Handler (file:line) | Shown/hidden by |
|---|---|---|---|---|
| Apply guest settings | `#transferSettingsTemplate button[data-translate="apply-new-guest-settings"]` | `apply-new-guest-settings` | `changeGuestSettings` exists only as commented-out code at lib.js:720; clicking would throw | Only reachable via the "URL Params" button, which is `display:none` |
| Link customizer ghosts | `#showCustomizerButton2`, `#showCustomizerButton4` | n/a | `showCustomizer` lib.js:59528 styles these ids, which do not exist in index.html; `getById` returns a throwaway span | harmless today; do not add elements with these ids by accident |
| Screen-share modes | `a[data-action="ss1"/"ss2"/"ss3"]` | `ss-mode-1..3` | no branch in `menuItemListener` lib.js:57898 | `li.hidden` always |
| Help button | `#helpbutton` | title "Show help contact info" | `warnUser` lib.js:2977 | never un-hidden |
| Report button | `#reportbutton` | title "Submit any error logs" | `submitDebugLog` lib.js:771 | never un-hidden |
| Legal footer | `#legal` | ToS links | links | never un-hidden |
| Spare header slot | `#head5` | none | none | no references |
| WHIP-in tile buttons | `#container-18` Refresh / JOIN | "Refresh", "JOIN" | call website-share functions with `#iframeURL` (copy-paste from `#container-6`) | `&whipme` (WIP) |
| Duplicate ids | `#settingstoggle` (flip-camera icon and settings icon), `#hiddenElements` (x2), `#title` inside `#multiselect-trigger3` | n/a | n/a | restyle must not rely on `getElementById` for these |
| Intro on clean | `session.introOnClean` branches (main.js:7766-7774) | n/a | never set true outside webrtc.js:1728 default false (likely iframe API only) | n/a |
| Translation setup | `#translationSettingsContainer` | n/a | handlers live in translation/controller.js, loaded on demand (main.js:4227) | only when translation params present |
