# Parity inventory: shortcuts, IFRAME API, remote control, MIDI, hooks

Scope: engine files `main.js`, `lib.js`, `webrtc.js` plus the inline handlers in `index.html` that the engine page ships with. Wrapper pages that embed or reach into the engine (`mixer.html`, `comms.html`, `meet.html`, `control.html`, `studio/app.js`, `podcast/studio.js`, `qr.html`, `popout.html`) are listed where they depend on an engine surface, marked "outside engine".

Global facts that gate most rows:
- `isIFrame` is true when `window.location !== window.parent.location` (lib.js:594-596). The main IFRAME API listener is only attached when framed: `window.onmessage = session.remoteInterfaceAPI` (main.js:10307-10310).
- Outbound IFRAME events go through `pokeIframeAPI(action, value, UUID, SID, CID)` (lib.js:11754) which posts `{action, value, UUID, streamID, cib}` to `parent` with target origin `session.iframetarget`. Default `"*"` (webrtc.js:1493); `&iframetarget=<origin>` sets it, empty `&iframetarget` means own origin (main.js:6936-6943).
- Keyboard shortcuts in the engine page run in every mode (guest, `&director`, `&scene`, `&view`, `&push`); the only global kill switch is `&disablehotkeys` (main.js:1865-1867, checked main.js:10858). Escape is processed before that check, so it always works.
- Remote-control (`targetGuest`) and MIDI guest actions locate controls by DOM selectors (`[data-action-type=...]`, `[data-sid]`, `[data--u-u-i-d]`, `#guestFeeds` child order). A redesign that renames these attributes or IDs breaks the API and MIDI. See the "DOM coupling" rows in `## Other hooks`.

## Keyboard shortcuts

| Name / key | Action | Source (file:line) | Gated by |
|---|---|---|---|
| `document keydown` master listener | Calls `keyDownEvent`; tracks `CtrlPressed` (ctrl or meta) and `AltPressed` globals | main.js:10827-10843 | Always attached |
| `Escape` | If page is fullscreen, `document.exitFullscreen()`; otherwise closes the topmost `.alertModal` / `.promptModal` | main.js:10844-10856 | Always (runs before `&disablehotkeys` check) |
| Custom push-to-talk hotkey (any combo of Ctrl/Alt/Meta + key) | While held: unmutes mic (`session.muted=false`, `toggleMute(true)`), adds `PPTActive` class to `#mutebutton`; any other key or keyup re-mutes | main.js:10862-10889 (keydown), main.js:10990-11000 (keyup) | Only when `PPTHotkey` set; skipped if focus is in an `INPUT`; off with `&disablehotkeys` |
| PTT hotkey definition: `&ptt=<combo>` | `setHotKeyAuto()` parses e.g. `ctrl+alt+m`, `alt+space`; empty `&ptt` opens a "Select a hotkey" prompt | main.js:1983-1988, lib.js:59612-59675 | URL param `&ptt` |
| PTT hotkey definition: settings field `#pptHotKey` / prompt `#pptHotKey0` | `onkeydown="setHotKey()"` records the pressed combo; stored in localStorage `PPTHotkey`; also pushed to Electron (`electronApi.updatePPT` or `ipcRenderer.send("PPTHotkey")`) | index.html:2682, lib.js:1958, lib.js:59677-59770, lib.js:59607-59610 | Settings UI |
| `CTRL + M` (Windows/Linux) | `toggleMute()` mic mute toggle; sets `KeyPressedTimeout` | main.js:10898-10918 | `&disablehotkeys`; fires even with focus in inputs |
| `CMD + ALT + M` (macOS; meta needs Alt) | `toggleMute()` | main.js:10900-10908 | `&disablehotkeys` |
| Hold `CTRL/CMD + M` > 300 ms then release | On keyup toggles mute again, so a long press acts as momentary mute/unmute | main.js:11020-11027 | `&disablehotkeys` |
| `CTRL/CMD + B` | `toggleVideoMute()` camera on/off | main.js:10919-10925 | `&disablehotkeys` |
| `CTRL/CMD + ALT + F` | `toggleFileshare()` opens file-share window | main.js:10929-10934 | `&disablehotkeys` |
| `CTRL/CMD + ALT + C` | `cycleCameras()` next camera | main.js:10935-10940 | `&disablehotkeys` |
| `CTRL/CMD + ALT + S` | `toggleScreenShare()` | main.js:10941-10946 | `&disablehotkeys` |
| `CTRL/CMD + ALT + D` | Draw-on-screen: `drawOnScreen()` or `drawOnScreenObject.stop()` | main.js:10947-10956 | `&disablehotkeys` |
| `CTRL/CMD + ALT + P` | `togglePictureInPicture(session.videoElement)` | main.js:10957-10964 | `&disablehotkeys`; needs `session.videoElement` |
| `ALT + A` | `toggleSpeakerMute()` speaker output mute | main.js:10968-10973 | `&disablehotkeys`; Ctrl not held |
| `ALT + S` (event.key `"s"`) | Clicks "go webcam": `publishWebcam(#gowebcam)` | main.js:10974-10978 | `&disablehotkeys`; only when `#gowebcam.dataset.ready=="true"`; macOS Alt+S yields `ß`, so effectively Win/Linux |
| `SHIFT + ALT + C` (on keyup) | `toggleControlBar()` show/hide bottom control bar | main.js:11017-11019, lib.js:20733 | Not gated by `&disablehotkeys` (keyup listener has no check) |
| Release CTRL/CMD after CTRL+clicks (director) | Flushes `Callbacks` queue: runs every action armed by CTRL+click | main.js:11002-11010 | Director; CTRL+click below |
| CTRL+click guest "Transfer/forward" | Arms `directMigrate` for batch run on CTRL release | lib.js:23324-23335 | Director |
| CTRL+click guest "Hangup" | Arms `directHangup` (batch disconnect) | lib.js:23416-23425 | Director |
| CTRL+click guest "Change URL / reload" | Arms `directPageReload` | lib.js:24569-24579 | Director |
| CTRL+click guest "Hide video" | Arms `remoteHideVideo` | lib.js:25332-25339 | Director |
| CTRL+click guest "Mute video" | Arms `remoteMuteVideo` | lib.js:25386-25392 | Director |
| CTRL+click guest "Google Drive record" | Toggles `.armed`; arms `multiGdriveRecord` once | lib.js:50122-50133 | Director |
| CTRL+click "Record" | Arms `recordVideo` (batch record) | lib.js:61152-61159 | Director / local record button |
| CTRL+click speaker button | `resetupAudioOut()` before toggling speaker | lib.js:21021-21023 | Any |
| CTRL+click audio-source checkbox | Multi-select audio inputs instead of single-select | lib.js:35183, 35614, 35817, 35956, 36061, 40682 | Settings menu |
| CTRL while changing guest video constraint (director) | `requestVideoHack(..., true)` variant | lib.js:52932, 52943, 53048, 53093 | Director, remote camera settings |
| CTRL while changing local camera constraint | `updateCameraConstraints(..., true, ...)` variant | lib.js:54293, 54319, 54345, 54433, 54442, 54605, 54647 | Settings menu |
| CTRL held during video pause | Suppresses auto-replay of paused video | lib.js:6772 | Any |
| CTRL held on MIDI UI button | Forces state change in `buttonMIDI` | lib.js:75577-75591 | MIDI button panel |
| Solo-talk button with CTRL (API alias) | `toggleSoloChat(UUID, {ctrlKey:true})` gives bidirectional solo | lib.js:73529-73535 | Director |
| `Escape` / `Esc` in speaker volume panel | `closeSpeakerVolumePanel()` | lib.js:21287, lib.js:21327-21334 | Panel open |
| `Escape` in settings panel `#popupSelector` | `hideSettings()` + posts `settings-menu-state:false` | index.html:2472 | Panel focused |
| `Escape` in room settings `#roomSettings` | `toggleRoomSettings()` | index.html:2973 | Panel focused |
| `Escape` in any dialog (accessible modal) | Clicks the dialog's `cancel_*` button or `.modalClose` | lib.js:1819-1829 | Modal open |
| `Tab` / `Shift+Tab` in modal | Focus trap cycles first/last control | lib.js:1829-1840 | `isModal` dialogs |
| `Enter` / `Space` on modal close X | `enterPressedClick` | lib.js:1816-1817 | Modal open |
| `Enter` / `Space` on any `role=button` div | `enterPressedClick(event,this)`: clicks on keyup, ignores modifiers | lib.js:48160-48174; 61 inline uses in index.html (e.g. 270, 274, 278, 282, 286, 290, 297, 300, 304, 307, 316, 339, 350, 360, 363) | Focused element |
| `Enter` in `#joinroomID` | `jumptoroom(event)` | index.html:112, lib.js:11826-11831 | Landing page |
| `Enter` / `Space` on `#meshDebugBtn` | `openMeshVisualization()` | index.html:161 | Director |
| `Enter` in `#chatInput` and room/password chat-param inputs | `EnterButtonChat` → `sendChatMessage()` | index.html:187, 3309, 3316; lib.js:59517-59526 | Chat open |
| `Enter` in room name / room password (create room) | `enterPressed(event, createRoom)`; keydown runs `checkStrengthRoom` | index.html:393, 411; lib.js:48176 | Landing page |
| `Enter` in `#videoname4` | `enterPressed(event, generateQRPage)` | index.html:890 | Invite builder |
| `Enter` / `Escape` in overlay chat input | Enter clicks send; Escape clears, hides overlay, unpresses button | lib.js:22004-22015 | Overlay input open |
| `Enter` in `promptAlt` fields | Moves focus to second field, then submit; submits prompt | lib.js:2038-2045, 2075-2080 | Prompt open |
| `Enter` in `promptAltRecord` fields | Same pattern for record prompt | lib.js:2502-2509, 2524-2527 | Prompt open |
| `Enter` in `promptRecord` | Submits | lib.js:2634-2637 | Prompt open |
| `Enter` in `promptTransfer` | Submits transfer room | lib.js:2743-2746 | Director transfer prompt |
| `Enter` in guest buffer-delay input | Sets `session.rpcs[UUID].buffer`, `playoutdelay(UUID)` | lib.js:41646-41660 | Director/scene buffer settings |
| Any key / pointer (first) | Re-acquires screen wake lock | lib.js:22385-22400 | Wake lock supported and not disabled |
| Mesh debug modal: `Escape` | Close detail panel, else close modal | lib.js:37704, 37758-37766 | Mesh modal open; ignored with Ctrl/Meta/Alt |
| Mesh debug modal: `R` | `requestMeshData()` refresh | lib.js:37767-37770 | Mesh modal open |
| Mesh debug modal: `F` | Toggle "Problems only" filter, re-render | lib.js:37771-37776 | Mesh modal open |
| Mesh debug modal: `Tab` | Focus trap | lib.js:37735-37756 | Mesh modal open |
| Mesh SVG edge/node: `Enter` / `Space` | `showEdgeDetails` / `showNodeDetails` | lib.js:38081-38086, 38176-38181 | Mesh modal open |
| Tip (Stripe) modal: `Escape`, `Tab` | Close modal; focus trap | lib.js:26566-26576 | Tip modal open |
| Stats menu: `Escape` | `closeStatsMenu()` | lib.js:45102-45107 | Stats menu open |
| Outside engine: mixer.html CTRL down/up | Toggles layout-editor interactions | mixer.html:1864-1882 | mixer.html |
| Outside engine: mixer.html digits `0-9` | Clicks layout N in `#containermenu` (listener on page and iframe) | mixer.html:3757-3770, 4330-4331 | mixer.html; ignored in INPUT |
| Outside engine: comms.html digits `1-9` | Clicks group N | comms.html:2055-2067, 2166-2167 | comms.html |
| Outside engine: meet.html digits `0-9` | Clicks group N | meet.html:1719-1731, 1811-1812 | meet.html |
| Outside engine: control.html `1-9` | Select camera N | control.html:2485-2494 | control.html |
| Outside engine: control.html arrows | `ptzPan` / `ptzTilt` +-0.01 via target action | control.html:2496-2504 | control.html |
| Outside engine: control.html `+`/`=`, `-`/`_` | `ptzZoom` (with Ctrl/Cmd: `ptzFocus`) | control.html:2505-2509 | control.html |
| Outside engine: control.html card `Enter`/`Space` | `selectCamera` | control.html:1508-1513 | control.html |
| Outside engine: studio/app.js `Delete`/`Backspace` | Remove selected layout box | studio/app.js:2487-2497 | Not in inputs or chat panel |
| Outside engine: studio/app.js `Escape` | Deselect box | studio/app.js:2498-2500 | same |
| Outside engine: studio/app.js arrows (+Shift = 5px) | Nudge selected box | studio/app.js:2501-2510 | same |
| Outside engine: studio/app.js `Enter` in scene title | Blur (commit rename) | studio/app.js:2538-2543 | same |

## IFRAME API: inbound

Main handler `session.remoteInterfaceAPI` (main.js:8715-10305). Non-object `e.data` is ignored. Messages whose `action` is `framegrab-audio-settings` are skipped here (main.js:8722) and handled by the lib.js child-frame listener. Several keys can be combined in one message. `cib` on any request is echoed back on its response. All rows gated by `isIFrame` unless noted; the same handler also runs from Electron via `window.electronApi.exposeDoSomethingInWebApp` (main.js:780-785).

| Name / key | Action | Source (file:line) | Gated by |
|---|---|---|---|
| `function:"previewWebcam"` | `previewWebcam()` | main.js:8730 | isIFrame |
| `function:"changeHTML"` + `target`, `value` | Sets `innerHTML` of element id `target` | main.js:8732-8734 | isIFrame |
| `function:"publishScreen"` | `publishScreen()` | main.js:8735 | isIFrame |
| `function:"targetGuest"` + `target`, `action`, `value`, `value2` | Calls `targetGuest()` (same action list as Remote control target actions) | main.js:8737-8738 | isIFrame |
| `function:"getGuestMediaDevices"` + `target`/`streamID`/`UUID` | Asks guest for device list; replies `{guestMediaDevices:{ok,devices,currentVideoLabel,...}, cib}`; 5.5 s timeout | main.js:8739-8798; reply webrtc.js:9359 | isIFrame; used by studio/app.js:1831 |
| `function:"setGuestMediaDevice"` + target, `kind` (camera/microphone/speaker), `deviceId` or `value` | Sends `changeCamera`/`changeMicrophone`/`changeSpeaker` request; replies `{guestMediaDeviceChange:{ok,error,kind,...}}` | main.js:8799-8891; replies webrtc.js:8865, 9394, 15367 | isIFrame; used by studio/app.js:1875 |
| `function:"activateQueuedGuest"` + target | Admits queued guest; replies `{queuedGuestActivation:{...}}` | main.js:8892-8947 | isIFrame; `&queue`; used by studio/app.js:1895 |
| `function:"commands"` + `action`, `value`, `value2` | Runs `Commands[action]` (see Remote control) | main.js:8948-8949 | isIFrame |
| `function:"routeMessage"` + `value` | Feeds `value` into `session.ws.onmessage` (bypass signaling) | main.js:8950-8955 | isIFrame |
| `function:"eval"` + `value` | `eval(value)` | main.js:8956-8957 | isIFrame (security: arbitrary code, bounded only by iframe embedding) |
| `sendData` + `UUID`/`streamID`, `type` | `session.sendGenericData()` P2P data; peer gets `dataReceived` | main.js:8964-8982 | isIFrame |
| `PPT` (true/false/"toggle") | Push-to-talk unmute/mute/toggle, sets `#mutebutton.PPTActive`; returns early | main.js:8984-9003 | isIFrame |
| `sendChat` | `sendChat(text)` to all peers; returns early | main.js:9005-9008 | isIFrame |
| `mic` (true/false/"toggle") | Mic unmute/mute/toggle | main.js:9014-9030 | isIFrame |
| `toggleSettings` (true/false/"toggle") | Opens/closes settings menu | main.js:9032-9042 | isIFrame; used by studio/app.js:2425 |
| `camera` (true/false/"toggle") | Camera unmute/mute/toggle | main.js:9044-9060 | isIFrame |
| `pauseinvisible` (true/false/"toggle") | Sets `session.pauseInvisible`, `updateMixer()` | main.js:9062-9072 | isIFrame |
| `keyframe` | `session.sendKeyFrameScenes()` | main.js:9074-9076 | isIFrame |
| `groups` (array or CSV; falsy clears) | Sets `session.group`, rebuilds `#groups` buttons, broadcasts group | main.js:9078-9126 | isIFrame |
| `getSnapshotBySlot` / `getSnapshotByStreamID` | Grabs one frame; posts `{type:"frame", frame (dataURL), UUID, streamID, trackID, kind, format, slot, cib}` | main.js:9128-9238 | isIFrame; format from `&sendframes` (default png) |
| `groupView` (array or CSV) | Sets `session.groupView`, `updateMixer()` | main.js:9246-9255 | isIFrame |
| `mute` (true/false/"toggle") | Speaker mute/unmute/toggle | main.js:9257-9269 | isIFrame |
| `speaker` (true/false/"toggle") | Inverse sense of `mute`; only if `mute` absent | main.js:9270-9284 | isIFrame |
| `record` (false/true/element id) | Stop/start local recording, or record the given video element | main.js:9286-9308 | isIFrame |
| `volume` (0-1 or 0-100) + optional `target` | `setSessionPlaybackVolume()` | main.js:9310-9318 | isIFrame |
| `enableYouTube` (key string) | Sets `session.youtubeKey`, `YoutubeChatInterface(true)` | main.js:9320-9329 | isIFrame |
| `nextSlide` | `nextSlide()` | main.js:9331-9334 | isIFrame |
| `prevSlide` | `gobackSlide()` | main.js:9336-9339 | isIFrame |
| `panning` + optional `UUID` | `adjustPan()` per peer or all | main.js:9341-9358 | isIFrame |
| `targetBitrate` / `targetAudioBitrate` + `target`/`UUID`/`streamID`, `requestAs`, `remote` | Sends bitrate request to matching peers | main.js:9360-9399 | isIFrame |
| `manualBitrate` + target selectors | Sets `manualBandwidth`, `requestRateLimit` | main.js:9401-9429 | isIFrame |
| `bitrate` + target selectors, `lock` | `requestRateLimit(bitrate)` (0 pauses video) | main.js:9431-9462 | isIFrame |
| `audiobitrate` + target selectors, `lock` | `requestAudioRateLimit()` | main.js:9464-9496 | isIFrame |
| `changeVideoDevice` | `changeVideoDevice(id)` | main.js:9498-9501 | isIFrame |
| `changeAudioDevice` | `changeAudioDevice(id)` | main.js:9503-9506 | isIFrame |
| `changeAudioOutputDevice` | `changeAudioOutputDeviceById(id)` | main.js:9508-9511 | isIFrame |
| `getDeviceList` | Posts `{deviceList, cib}` | main.js:9513-9525 | isIFrame |
| `sceneState` | Sends `obsState.visibility/recording` request to peers | main.js:9527-9534 | isIFrame |
| `layouts` + optional `obsSceneTriggers` | Stores `session.layouts`; forwards to layout-capable peers | main.js:9536-9550 | isIFrame |
| `sendMessage` | `session.sendMessage(payload)` raw P2P message | main.js:9552-9555 | isIFrame |
| `sendRequest` | `session.sendRequest(payload)` raw P2P request | main.js:9557-9560 | isIFrame |
| `sendRawMIDI` + `UUID`/`streamID` | `sendRawMIDI()` to one or all; returns early | main.js:9562-9578 | isIFrame |
| `sendPeers` | `session.sendPeers(payload)` | main.js:9580-9583 | isIFrame |
| `reload` | `reloadRequested()` forced reload | main.js:9585-9588 | isIFrame |
| `getFaces` + `faceTrack` | Enables/disables face-data grabbing (`getFaces()`) | main.js:9590-9597 | isIFrame |
| `getFreshStats` | Queries all PCs, posts `{stats, cib}` after 1 s | main.js:9599-9710 | isIFrame |
| `getStats` + optional `streamID` | Posts `{stats: getQuickStats(), cib}` | main.js:9712-9730 | isIFrame |
| `getRemoteStats` | Sends `requestStats` to peers; replies arrive as `{remoteStats, streamID, UUID}` | main.js:9732-9738; reply lib.js:17431 | isIFrame |
| `requestStatsContinuous` | Sends `requestStatsContinuous` to peers | main.js:9740-9746 | isIFrame |
| `getLoudness` (true/false) | true: enables loudness pipeline, posts snapshot `{action:"loudness", mode:"snapshot", loudness, cib}` then pushes updates; false: stops | main.js:9748-9796; push lib.js:64345-64361 | isIFrame; used by studio/app.js:2469 |
| `setBackgroundImage` | `changeVideoBackgroundImage()`; replies `{backgroundImageChanged, cib}` | main.js:9798-9802 | isIFrame |
| `getEffectsData` (effect id / false) | Sets `session.pushEffectsData`; frames post `{effectsData, eID}` | main.js:9804-9816; lib.js:15414, 15511 | isIFrame |
| `getStreamIDs` | Posts `{streamIDs:{streamID:label}, cib}` | main.js:9818-9833 | isIFrame |
| `getStreamInfo` | Posts `{streamInfo:{UUID:{label,streamID,tally,info}}, tally, cib}` | main.js:9835-9861 | isIFrame |
| `close` / `hangup` ("estop" / "reload" / other) | `session.hangup()` variants | main.js:9863-9877 | isIFrame |
| `style` (CSS text) | Appends a `<style>` to head | main.js:9883-9893 | isIFrame |
| `getDetailedState` | Posts `{detailedState, cib}` | main.js:9895-9904 | isIFrame; used by studio/app.js:595 |
| `getGuestList` | Posts `{guestList, cib}` | main.js:9906-9915 | isIFrame |
| `saveVideoFrameToDisk` + `streamID`/`UUID` ("*" = all), `filename` | Saves PNG of frame | main.js:9919-9957 | isIFrame |
| `getVideoFrame` + `streamID`/`UUID` | `sendVideoFrameToIframe()` | main.js:9959-9984 | isIFrame; used by studio/app.js:834 |
| `copyVideoFrameToClipboard` + `streamID`/`UUID` | Copies frame to clipboard | main.js:9986-10011 | isIFrame |
| `setBufferDelay` (ms) + `streamID`/`label`/`UUID` ("*") | Sets playout buffer per peer or default `session.buffer` | main.js:10013-10071 | isIFrame |
| `automixer` (true/false) | Toggles `session.manual` auto-mixer | main.js:10073-10083 | isIFrame |
| `advancedMode` (bool) | Shows/hides `.advanced` elements | main.js:10085-10097 | isIFrame |
| `requestStream` (streamID) | `session.requestStream()` load a stream outside the room | main.js:10099-10105 | isIFrame |
| `layout` (object or array) | Sets `session.layout` / `layout_array`; posts `layout-updated` with `cib` | main.js:10107-10117 | isIFrame |
| `previewMode` | `switchModes(previewMode)` (takes precedence over layout issue) | main.js:10119-10120 | isIFrame; used by studio/app.js:2423, 2466 |
| `layout` + `scene` / `UUID` (director) | `issueLayout(scene, UUID)` to scene(s); then `updateMixer()` | main.js:10121-10136 | `session.director`; used by studio/app.js:575, 2150 |
| `layout` + `obsCommand` | `issueLayoutOBS(e.data)` | main.js:10123-10124 | isIFrame |
| `obsCommand` (+ `remote`, `UUID`, `streamID`) | Encodes and sends OBS command to peers | main.js:10137-10155 | isIFrame; ignored when `layout` or `previewMode` present |
| `slotmode` | Updates `session.slotmode` and slot picker | main.js:10157-10164 | isIFrame |
| `slotReservationsEnabled` / `reservedSlots` | `setSlotReservationsState()` | main.js:10165-10169 | `session.director && session.slotmode` |
| `targetWidth` / `targetHeight` + `UUID`, `requestAs` | `session.requestResolution()` | main.js:10171-10187 | isIFrame; needs `UUID` |
| `scale` (false or %) + `UUID` / `target` | Disables dynamic scale or sends `scale` request | main.js:10190-10222 | isIFrame |
| `action` (+ `target`, `value`, `value2`, `cib`) | Runs Companion `processMessage()`; posts result (or `{action,error,message,cib}`) | main.js:10224-10253 | isIFrame; `action != "null"` |
| `target` without `action` + `settings` | Sets properties on matching guest video element(s) (`"*"` = all) | main.js:10254-10269 | isIFrame |
| `target` + `add` | Appends guest video to `#gridlayout` | main.js:10270-10275 | isIFrame |
| `target` + `remove` | Removes guest video (and parent) | main.js:10276-10283 | isIFrame |
| `target` + `replace` | Appends guest video and removes all others in `#gridlayout` | main.js:10284-10293 | isIFrame |
| `cib` | Correlation id echoed on every response | main.js:8668-8678 and per handler | n/a |
| Child-frame listener: YouTube origin | `processYoutubeEvent(e)` | lib.js:11630-11633 | Always attached; origin `https://www.youtube.com` |
| Child-frame listener: `action:"screen-share-state"`, `value` falsy | Closes the iframe-share element (only if sender is `session.screenShareElement`) | lib.js:11634-11647 | Always attached |
| Child-frame listener: `action:"framegrab-audio-settings"` + `enable`, `deviceId` | Starts or adjusts framegrab audio | lib.js:11648-11666 | `session.framegrab` |
| Child-frame listener: `action:"video-loaded"` | `toggleSpeakerMute(true)`, `updateMixer()` | lib.js:11667-11671 | Always attached |
| `sensors` | Merges into `session.sensors.data`, relays to peers | lib.js:61987-62018 | `&webxrbridge` / `&externalsensors` / `&sensorsbridge` (main.js:5515-5518); origin check `&sensorsorigin` |
| `type:"canvas-frame"` + `frame` | Feeds external frames into a canvas stream source | lib.js:47783, 47836-47850 | While a `CanvasStreamSource` exists |
| Dropbox auth `{source, type:"tokens"/"error"}` | Completes Dropbox OAuth | lib.js:60566-60600, 60648 | Allowed origin and matching popup window |
| `streamSaverError` + `reason` | Warns that recording download setup failed | lib.js:60618-60633, 60649 | `streamSaver.isTrustedMessage` |

## IFRAME API: outbound events

Unless noted, each row is `pokeIframeAPI(action, value, UUID, streamID)` → `parent.postMessage({action, value, UUID, streamID, cib}, session.iframetarget)`, gated by `isIFrame`. "dep" marks events the code comments as deprecated (still emitted).

| Name / key | Action | Source (file:line) | Gated by |
|---|---|---|---|
| `YoutubeChat` | YouTube chat message relayed | lib.js:66625 | isIFrame; `enableYouTube` |
| `add-to-scene` | Director added guest to scene N | lib.js:23741 | Director |
| `remove-from-scene` | Director removed guest from scene N | lib.js:23743 | Director |
| `alert` | Server/peer alert text | webrtc.js:8398 | isIFrame |
| `approved` | Peer approved a request | webrtc.js:8956, 15414 | isIFrame |
| `rejected` | Peer rejected a request (value = request type) | webrtc.js:8888, 8927, 15409 | isIFrame |
| `aspect-ratio` | Video aspect ratio detected/changed | lib.js:6283 | isIFrame |
| `audio-mute-state` | Local speaker mute state | lib.js:21117 | isIFrame |
| `auto-sync-updated` | Auto A/V sync object updated | lib.js:11973 | isIFrame |
| `available-speedtest-servers` (dep) | TURN/speedtest options | webrtc.js:568 | isIFrame |
| `back-slide` | Slide back pressed | lib.js:23226 | isIFrame |
| `next-slide` | Slide next pressed | lib.js:23236 | isIFrame |
| `camera-constraint-changed` | `{name, value}` local camera constraint changed | lib.js:54185, 54196, 54298, 54324, 54350, 54428, 54447, 54610, 54652 | isIFrame |
| `mic-constraint-changed` | `{name, value}` mic/compressor constraint changed | lib.js:50838, 53229, 53242, 53300, 53313, 53363, 53376, 53431, 53444, 53500, 53513, 53565, 53578, 53630, 53643, 53709, 53824, 53835, 53924, 53961, 54018, 54033 | isIFrame |
| `camera-operator-settings` | Guest camera-operator settings reply | webrtc.js:9302 | isIFrame |
| `camera-operator-rejected` | Camera-operator request rejected | webrtc.js:9305 | isIFrame |
| `camera-operator-effect-change` | Guest effect changed | webrtc.js:9308 | isIFrame |
| `camera-operator-device-change` | Guest device changed | webrtc.js:9314 | isIFrame |
| `camera-share` | Local camera started | lib.js:45446 | isIFrame |
| `started-camera` (dep) | Same as above | lib.js:45445 | isIFrame |
| `change-order` | Guest mix order changed | lib.js:50502 | isIFrame |
| `director-order` | Director-set order list received | lib.js:50494 | isIFrame |
| `chunked-inbound` | `{UUID, streamID, type, ts}` per chunked frame received | webrtc.js:22676 | isIFrame; `session.chunkIframe` (default true, `&nochunkediframestats` disables, main.js:1950-1952) |
| `chunked-outbound` | `{type, ts}` per chunked frame sent | webrtc.js:17420, 17872 | same |
| `control-box` | Guest control box created/updated | lib.js:32593, 32789, 33959, 34289 | Director |
| `control-box-video-updated` | Control-box video element id | lib.js:6484, 6868 | Director |
| `create-room` | Room created (room id) | lib.js:31907 | isIFrame |
| `director` | This page became director | webrtc.js:8132, 8143, 8485; lib.js:31159, 31263, 31268, 31273 | isIFrame |
| `director-connected` | Director peer connected | webrtc.js:15741 | isIFrame |
| `new-main-director` | Main director UUID | webrtc.js:7438 | isIFrame |
| `new-co-director` | Co-director UUID | webrtc.js:5797 | isIFrame |
| `director-mute-state` | Director muted guest in scenes | lib.js:24177, 24180, 25297, 25300, 25584 | Director |
| `director-share` | Director started publishing | webrtc.js:11401; lib.js:44826 | isIFrame; used by studio/app.js:571; also called by podcast/studio.js:2744 |
| `director-video-hide-state` | Director hid guest video | lib.js:25377 | Director |
| `director-volume-state` | Director changed guest volume | lib.js:25648 | Director |
| `end-view-connection` (dep) | Inbound view ended | webrtc.js:12241, 12243 | isIFrame |
| `new-view-connection` (dep) | Inbound view started | webrtc.js:12238, 24802 | isIFrame |
| `view-connection` | Inbound view started (true) / ended (false) | webrtc.js:12145, 24803 | isIFrame; used by studio/app.js:571 |
| `view-connection-info` | Info about an inbound viewer | webrtc.js:10073 | isIFrame |
| `view-stats-updated` | Inbound stats refreshed | lib.js:18206 | isIFrame |
| `face-tracking-data` | Face-tracking boxes | lib.js:16510 | `getFaces` |
| `file-share` | Local file share started | lib.js:46668, 46757, 47736 | isIFrame |
| `started-fileshare` (dep) | Same | lib.js:46758, 47735 | isIFrame |
| `frame-share` | Frame share started | lib.js:48125 | isIFrame |
| `started-frameshare` (dep) | Same | lib.js:48124 | isIFrame |
| `group-set-updated` | Local groups changed | webrtc.js:14310; lib.js:65067, 65204 | isIFrame |
| `group-view-set-updated` | View groups changed | lib.js:65249 | isIFrame |
| `remote-group-change` | Guest changed group | webrtc.js:9290 | isIFrame |
| `guest-connected` | Guest connected to director | webrtc.js:15576 | isIFrame; used by studio/app.js:571 |
| `hand` | Raise-hand state | lib.js:23277, 23288 | isIFrame |
| `hss-connection` | Handshake server status (e.g. "timeout") | webrtc.js:7519, 7601, 7637, 8574 | isIFrame |
| `hssConnection` (dep) | Same | webrtc.js:7518, 7600, 7636, 8573 | isIFrame |
| `hungup` | Local hang-up | lib.js:23192, 23459, 58101 | isIFrame |
| `iframe-loaded` | Shared iframe/widget src loaded | lib.js:48686 | isIFrame |
| `image-frame-capture` | Captured frame response | lib.js:31103 | isIFrame; used by studio/app.js:565 |
| `joined-room-complete` | Room join finished | lib.js:30714 | isIFrame |
| `joining-room` | Joining room (room id) | webrtc.js:6744, 6784 | isIFrame |
| `layout-updated` | Current layout object | main.js:10116; webrtc.js:7409, 9466; lib.js:74645, 74661, 74673, 74689, 74754 | isIFrame; used by studio/app.js:577 |
| `layout-index` | Active preset layout index | lib.js:74674, 74690, 74755 | isIFrame |
| `layout` | Commented out, not emitted | lib.js:24442 | dead |
| `limit-total-bitrate` | Room total bitrate cap | lib.js:41796 | isIFrame |
| `total-room-bitrate` | Room total bitrate | webrtc.js:10106; lib.js:41818 | isIFrame |
| `listing-audio-settings` | Guest audio settings listing | lib.js:49616 | Director |
| `listing-video-settings` | Guest video settings listing | lib.js:49665 | Director |
| `local-camera-event` | Local camera device event | lib.js:42937 | isIFrame |
| `local-microphone-event` | Local mic device event | lib.js:38949, 39156 | isIFrame |
| `mic-mute-state` | Local mic mute state | lib.js:20968 | isIFrame |
| `midi-in` | Incoming MIDI message `{d,...}` | lib.js:75744 | `&midiiframe` (main.js:1954-1956) |
| `motion-detected` | Motion detection fired | lib.js:13536 | Motion detection params |
| `new-audio-track-added` | Inbound audio track | lib.js:7375 | isIFrame |
| `new-video-track-added` | Inbound video track | lib.js:7386 | isIFrame |
| `new-stream-added` | Inbound stream | lib.js:7396 | isIFrame |
| `video-element-created` | Video element id for peer | lib.js:7464 | isIFrame |
| `push-connection` | Outbound viewer connected/disconnected | webrtc.js:11772, 12789 | isIFrame |
| `new-push-connection` (dep) | Same | webrtc.js:12788, 12797 | isIFrame |
| `push-connection-info` | Info on outbound viewer | webrtc.js:13431 | isIFrame |
| `push-video-track` | Local video track id published | lib.js:43196 | isIFrame |
| `obs-state` | Local OBS state (visibility, recording, streaming...) | lib.js:4119, 4624 | isIFrame |
| `tally` | Tally envelope per peer/local | lib.js:4118 | isIFrame |
| `picture-in-picture` | PiP state | lib.js:24716, 48756, 48760, 48762, 48766 | isIFrame (lib.js:58828 is commented) |
| `prioritize-audio` | Audio prioritized for peer | webrtc.js:5182 | isIFrame |
| `recording-started` | Local recording started | lib.js:61474, 62865 | isIFrame |
| `recording-stopped` | Local recording stopped | lib.js:62400 | isIFrame |
| `reload` | Director triggered remote reload | lib.js:58112 | Director |
| `reloading` | Page reloading | lib.js:23208 | isIFrame |
| `remote-devices-info` | Guest device list | lib.js:38756 | Director |
| `remote-label-changed` | Guest label changed | webrtc.js:10450 | isIFrame |
| `remote-mute-state` | Guest mic mute state | webrtc.js:9917, 10504 | isIFrame |
| `remote-video-mute-state` | Guest camera mute state | webrtc.js:10046, 10562; lib.js:25421 | isIFrame |
| `remote-screenshare-state` | Guest screen share state | webrtc.js:10646 | isIFrame |
| `remote-scene-mute-state` | Guest scene-mute flag | lib.js:20802 | isIFrame |
| `remote-scene-mute-status` | Guest scene-mute detail | lib.js:20804 | isIFrame |
| `scene-mute-state` | Local scene-mute flag | lib.js:20779 | isIFrame |
| `scene-mute-status` | Local scene-mute detail | lib.js:20783 | isIFrame |
| `request-audio-setting` | Director requested guest audio setting change | lib.js:50524 | Guest side |
| `request-change-compressor` | same, compressor | lib.js:50556 | Guest side |
| `request-change-eq` | same, EQ | lib.js:50535 | Guest side |
| `request-change-gating` | same, gate | lib.js:50546 | Guest side |
| `request-change-mic-delay` | same, mic delay | lib.js:50565 | Guest side |
| `request-change-micpanning` | same, mic panning | lib.js:29343 | Guest side |
| `request-low-cut` | same, low cut | lib.js:50586 | Guest side |
| `request-sub-gain` | same, sub gain | lib.js:50576 | Guest side |
| `request-video-setting` | same, video setting | lib.js:50513 | Guest side |
| `request-video-record` | Director requested guest recording | lib.js:50208, 50278, 50352, 50475 | Guest side |
| `request-file` | Peer requested a file | lib.js:46435 | isIFrame |
| `requested-stream` | Stream requested by id | webrtc.js:6669 | isIFrame |
| `room-peer-listing` | Room peer list | webrtc.js:8073 | isIFrame |
| `room-peer-discovered` | New room peer | webrtc.js:8327 | isIFrame |
| `scene-connected` | Scene connected (value = scene) | webrtc.js:15722 | isIFrame; used by studio/app.js:574 |
| `solo-scene-connected` | Solo scene connected | webrtc.js:15720 | isIFrame |
| `screen-share-state` | Local screen share state | webrtc.js:11396; lib.js:36030, 40183, 40200, 40217, 40224, 41519, 45593, 45926, 46259, 46291, 76818, 77113 | isIFrame (lib.js:11637 commented) |
| `started-screenshare` | Commented out, not emitted | lib.js:46258 | dead |
| `started-iframe-share` | Website/iframe share started | lib.js:28544, 28657 | isIFrame |
| `seeding` | Publishing/seeding active | webrtc.js:4373, 11402 | isIFrame; also podcast/studio.js:2745 |
| `seeding-started` | Same | webrtc.js:4372 | isIFrame |
| `set-audio-bitrate` | Audio bitrate applied | webrtc.js:5255, 5467 | isIFrame |
| `setAudioBitrate` (dep) | Same | webrtc.js:5254, 5466 | isIFrame |
| `set-video-bitrate` | Video bitrate applied | webrtc.js:6190, 6276, 6293, 6337, 6350 | isIFrame |
| `setVideoBitrate` (dep) | Same | webrtc.js:6189, 6274, 6291, 6336, 6349 | isIFrame |
| `set-video-scale` | Video scale applied | webrtc.js:4605, 4718, 4970, 6277, 6294 | isIFrame |
| `setVideoScale` (dep) | Same | webrtc.js:4604, 4717, 4969, 6275, 6292 | isIFrame |
| `set-meshcast-video-bitrate` | Meshcast bitrate | webrtc.js:5918, 5976, 5987 | Meshcast |
| `settings-menu-state` | Settings menu open/closed | lib.js:22179, 22192; index.html:2472 | isIFrame |
| `share-link` | Share link generated | lib.js:46821, 46834 | isIFrame |
| `slot-reservations` | Slot reservation state | lib.js:33364, 33398 | Director, slot mode |
| `slot-updated` | Guest slot changed | lib.js:32994, 32995, 33153, 33154, 33176, 33201, 33456 | Director, slot mode; used by studio/app.js:571 |
| `stream-id-detected` | Stream id detected | webrtc.js:6565 | isIFrame |
| `this-label` | Local label | main.js:3554 | isIFrame |
| `transcription-text` | Final transcript text | lib.js:50097 | Transcription enabled |
| `transfer` | Guest transferred to room | webrtc.js:5301, 13244 | isIFrame |
| `transferred` | This page was transferred | webrtc.js:8177 | isIFrame |
| `video-mute-state` | Local video mute / visibility state | lib.js:22066, 22140 | isIFrame |
| `widget-src` | Widget sidebar src | webrtc.js:10313; lib.js:31479, 31530 | isIFrame |
| Non-action: `{chat, gotChat}` | Incoming chat (`gotChat` deprecated) | lib.js:59199-59206 | isIFrame |
| Non-action: `{chat}` | Outgoing chat echo | lib.js:58701-58707 | isIFrame |
| Non-action: `{dataReceived, UUID}` | Generic P2P data received | webrtc.js:3495-3504 | isIFrame |
| Non-action: `{sensors}` | Peer sensor data | webrtc.js:9572-9576 | isIFrame |
| Non-action: `{remoteStats, streamID, UUID}` | Remote stats reply | lib.js:17431 | isIFrame |
| Non-action: `{targetBitrate, UUID, requestAs}` | Bitrate prompt result mirrored to parent | lib.js:17350-17358, 17495-17502 | isIFrame |
| Non-action: `{effectsData, eID}` | ML effects data | lib.js:15414-15420, 15511-15517 | `getEffectsData` |
| Non-action: `{action:"loudness", mode, loudness, value, UUID, cib}` | Loudness push | lib.js:64345-64361 | `getLoudness` |
| Non-action: `{action:"tip", value}` | Tip received | lib.js:26434 | isIFrame |
| Non-action: `{type:"frame", frame, UUID, streamID, trackID, kind, format}` | Continuous frame stream (dataURL or transferable VideoFrame) | lib.js:63471-63479, 63504-63511 | `&sendframes[=origin]` (main.js:6945-6954) |
| Non-action: `{bypass: data}` | Signaling routed through parent | webrtc.js:7494-7499 | `&bypass` (main.js:7656-7659) |
| Non-action: response keys `guestMediaDevices`, `guestMediaDeviceChange`, `queuedGuestActivation`, `backgroundImageChanged`, `deviceList`, `stats`, `streamIDs`, `streamInfo`, `detailedState`, `guestList` | Replies to inbound requests (see inbound table) | main.js:8668-8678 and rows above | isIFrame |

## Remote control API

Transport: `&api=<key>` or `&osc=<key>` starts `oscClient()` 1 s after load (main.js:7152-7161, lib.js:73995). WebSocket to `session.apiserver` (default `wss://api.vdo.ninja:443`, webrtc.js:898; override `&apiserver`, main.js:7089-7091), sends `{join: key}`, auto-reconnects. Inbound `{action, target, value, value2}` (optionally wrapped in `msg`) is validated (`validateIncomingStreamIDs`, `validTarget`) and passed to `processMessage()` (lib.js:74864); the reply is sent back as `{callback: {...data, result}}` (lib.js:74082-74090). HTTP GET form `https://api.vdo.ninja/{key}/{action}/{target}/{value}` is relayed by the server into this same socket (rawdoc.md:1247-1256). The IFRAME `action` key and `function:"commands"` reuse the same code. With `target` set (not "null"), `targetGuest()` runs; else `Commands[action]`. Strings "true"/"false" are coerced to booleans.

| Name / key | Action | Source (file:line) | Gated by |
|---|---|---|---|
| `raisehand` | `raisehand()` toggle | lib.js:74119 | `&api` / IFRAME |
| `togglehand` | Same | lib.js:74122 | same |
| `togglescreenshare` | `toggleScreenShare()`; returns state | lib.js:74125 | same |
| `chat` | `toggleChat(value)` | lib.js:74129 | same |
| `speaker` (true/false/toggle) | Speaker unmute/mute/toggle | lib.js:74133 | same |
| `mic` (true/false/toggle) | Mic unmute/mute/toggle | lib.js:74148 | same |
| `camera` (true/false/toggle) | Camera unmute/mute/toggle | lib.js:74165 | same |
| `video` | Alias of `camera` | lib.js:74193 | same |
| `muteAllGuests` (bool or toggle) | `muteAllGuests(#muteAllGuests)` | lib.js:74182 | `session.director` |
| `hangup` | `hangup()` | lib.js:74210 | same |
| `bitrate` (false=0, true=-1, int) | `requestRateLimit` all inbound | lib.js:74214 | same |
| `requestStats` | Returns stats incl. WHIP/WHEP, pcs, rpcs | lib.js:74232 | same |
| `getDetails` | `getDetailedState(value)` | lib.js:74258 | same |
| `getStats` | `getQuickStats(value)` | lib.js:74262 | same |
| `getGuestList` | `getGuestList()` | lib.js:74266 | same |
| `reload` | `reloadRequested()` | lib.js:74270 | same |
| `volume` (false=0, true=100, 0-100) | Sets all inbound video element volumes; pokes `details` | lib.js:74274 | same |
| `forceKeyframe` | `session.forcePLI()` | lib.js:74298 | same |
| `panning` (int; bool = 90) | `adjustPan()` all inbound | lib.js:74302 | same; `&panning` for effect |
| `record` (true/false) | Start/stop local recording | lib.js:74320 | needs `session.videoElement` |
| `group` | `changeGroupDirectorAPI(value)` toggle | lib.js:74340 | same |
| `joinGroup` | Join group | lib.js:74347 | same |
| `leaveGroup` | Leave group | lib.js:74354 | same |
| `viewGroup` | `changeGroupViewDirectorAPI(value)` toggle | lib.js:74361 | same |
| `joinViewGroup` | Join view group | lib.js:74368 | same |
| `leaveViewGroup` | Leave view group | lib.js:74375 | same |
| `sendChat` | `sendChat(value)` | lib.js:74382 | same |
| `sendChatMessage` | `sendChatMessage(value)` (adds to chat log) | lib.js:74388 | same |
| `showChatOverlay` | `getChatMessage(value, ..., overlay)` | lib.js:74393 | same |
| `startRoomTimer` | `directRoomTimer(#globalTimerDirectorToggle, ...)` start | lib.js:74398 | Director DOM |
| `pauseRoomTimer` | Pause (both branches identical) | lib.js:74404 | Director DOM |
| `stopRoomTimer` | Stop | lib.js:74413 | Director DOM |
| `tallylight` (onair/active/standby/off/false/int) | Sets `session.tallyOverride`, `applySceneState()` | lib.js:74419 | same |
| `prevSlide` | `playbackMIDI({d:[176,110,10]})` | lib.js:74439 | MIDI out path |
| `nextSlide` | `playbackMIDI({d:[176,110,11]})` | lib.js:74446 | MIDI out path |
| `zoom` (+ value2 true/"abs" absolute) | `session.remoteZoom()` | lib.js:74453 | same |
| `focus` | `session.remoteFocus()` | lib.js:74463 | same |
| `pan` | `session.remotePan()` | lib.js:74473 | same |
| `tilt` | `session.remoteTilt()` | lib.js:74483 | same |
| `exposure` | `session.remoteExposure()` | lib.js:74493 | same |
| `soloVideo` (toggle/null/true/false) | `requestInfocus(#highlightDirector)` | lib.js:74503 | Director DOM |
| `highlight` | Alias of `soloVideo` | lib.js:74516 | same |
| `activeSpeaker` (toggle/int/false) | Toggles active-speaker layout and audio analysis | lib.js:74520 | same |
| `setBufferDelay` (ms, value2 = target) | Default or per-target playout buffer; pokes `details` | lib.js:74554 | same |
| `layout` (0/int index, array, object, null/false, name) | Sets/combines layout, director issues to scene 0, emits `layout-updated` / `layout-index`; returns `{response, previous}` | lib.js:74619-74779 | same |
| `width` | Local camera width constraint | lib.js:74781 | same |
| `height` | Local camera height constraint | lib.js:74791 | same |
| `aspectRatio` ("16:9" or float) | Local camera aspect ratio | lib.js:74801 | same |
| `videoConstraint` (value = name, value2 = value) | Any local camera constraint | lib.js:74820 | same |
| Target: `activateQueuedGuest` / `removeQueue` / `removeQueuedGuest` | Click `[data-action-type="remove-queue"]` to admit queued guest | lib.js:73421-73439 | Director; `&queue` |
| Target: `0` / `forward` / `transfer` | `directMigrate(el, true, room)` | lib.js:73440 | Director |
| Target: `1` / `addScene` / `setScene` (value = scene, value2 = state) | `directEnable` / `setGuestSceneState` | lib.js:73447 | Director |
| Target: `2` / `muteScene` | `directMute` | lib.js:73470 | Director |
| Target: `3` / `mic` / `audio` | `remoteMute` | lib.js:73480 | Director |
| Target: `4` / `hangup` | `directHangup` | lib.js:73490 | Director |
| Target: `5` / `soloChat` / `soloTalk` | `toggleSoloChat` one-way | lib.js:73495 | Director |
| Target: `6` / `speaker` | `remoteSpeakerMute` | lib.js:73501 | Director |
| Target: `7` / `display` | `remoteDisplayMute` | lib.js:73511 | Director |
| Target: `8` / `group` | `changeGroup` | lib.js:73521 | Director |
| Target: `9` / `soloChatBidirectional` / `soloTalkBidirectional` | Two-way solo talk | lib.js:73529 | Director |
| Target: `10` / `video` / `camera` | Remote camera mute | lib.js:73536 | Director |
| Target: `12`-`18` / `addScene2`-`addScene8` | Toggle guest in scene 2-8 | lib.js:73546, 73556, 73566, 73576, 73586, 73596, 73606 | Director |
| Target: `19` / `forceKeyframe` | Keyframe for guest | lib.js:73616 | Director |
| Target: `20` / `soloVideo` | `requestInfocus(el)` | lib.js:73621 | Director |
| Target: `21` / `sendChat` | Private chat to guest | lib.js:73631 | Director |
| Target: `pgm` / `channel` | `directIsolateChannel(UUID, n)` | lib.js:73636 | Director |
| Target: `22` / `sendDirectorChat` | Director overlay chat | lib.js:73641 | Director |
| Target: `sendPinnedDirectorChat` | Pinned director chat | lib.js:73646 | Director |
| Target: `27` / `volume` | `remoteVolume` | lib.js:73651 | Director |
| Target: `28` / `setslot` | `setSlot(el, value)` | lib.js:73657 | Director, slot mode |
| Target: `29` / `mixorder` (true/false/int) | `changeOrder` | lib.js:73664 | Director |
| Target: `requestResolution` ("WxH") | Preview resolution request | lib.js:73678 | Director |
| Target: `setWidth` / `setHeight` / `setAspectRatio` | Capture constraint via `requestVideoHack` | lib.js:73691, 73698, 73705 | Director |
| Target: `requestAspectRatio` (ratio, value2 max dim) | Computes and requests resolution | lib.js:73712 | Director |
| Target: `startRoomTimer` / `pauseRoomTimer` / `stopRoomTimer` | Per-guest timer (`create-timer` button) | lib.js:73745, 73751, 73760 | Director |
| Target: `getCameraSettings` / `getCameraOperatorSettings` | Request guest camera settings | lib.js:73766 | Director; `&remote` code |
| Target: `setCameraConstraint` / `cameraConstraint` | Set guest camera constraint | lib.js:73777 | Director; remote code |
| Target: `setBackgroundImage` | Set guest virtual background | lib.js:73798 | Director |
| Target: `setVideoEffect` / `cameraEffect` | Set guest effect | lib.js:73810 | Director |
| Target: `setVideoEffectAmount` / `cameraEffectAmount` | Effect strength | lib.js:73822 | Director |
| Target: `setCameraDevice` / `cameraDevice` | Change guest camera | lib.js:73835 | Director |
| Target: `refreshVideo` / `refreshCamera` | Refresh guest video | lib.js:73846 | Director |
| Target: `refreshConnection` / `restartConnection` | Restart connection | lib.js:73857 | Director |
| Target: `refreshAll` / `recoverStream` | Full recovery | lib.js:73868 | Director |
| Target: `ptzZoom` / `remoteZoom` | Remote PTZ zoom | lib.js:73879 | `&remote` on guest |
| Target: `ptzPan` / `remotePan` | Remote PTZ pan | lib.js:73890 | same |
| Target: `ptzTilt` / `remoteTilt` | Remote PTZ tilt | lib.js:73901 | same |
| Target: `ptzFocus` / `remoteFocus` | Remote focus | lib.js:73912 | same |
| Target: `ptzAutofocus` / `remoteAutofocus` / `resetAutofocus` | Reset autofocus | lib.js:73923 | same |
| Target: `mirror` / `remoteMirror` / `mirrorGuest` | Mirror guest | lib.js:73939 | Director |
| Target: `rotate` / `remoteRotate` / `rotateGuest` (bool/degrees) | Rotate guest | lib.js:73964 | Director |
| Target: any `Commands` name | Falls back to `Commands[action](value, target)` | lib.js:73986-73991 | same |
| Target resolution | Numeric target < 100 is 1-based slot; else streamID / UUID via `getGuestTarget` | lib.js:73411-73417, 73299-73350 | DOM coupling |
| Outbound `pokeAPI` events → `{update:{streamID, action, value}}` on socket and `&postapi` | `chat`, `codirector`, `details`, `director`, `directorMuted`, `directorVideoHide`, `endViewConnection`, `hangup`, `muted`, `newViewConnection`, `obs-state`, `positionChange`, `remoteMuted`, `remoteSceneMuteStatus`, `remoteSceneMuted`, `remoteVideoMuted`, `sceneMuteStatus`, `sceneMuted`, `seeding`, `speakerMuted`, `streamAdded`, `tip`, `videoMuted` | lib.js:73232-73258 (pokeAPI); sites: lib.js:58715, 59209 (chat); webrtc.js:8950; details at webrtc.js:10072, 10290, 10852, 13957, lib.js:23792, 64891, 74046, 74291, 74567, 74581, 74593, 74607; director at webrtc.js:8131, 8142, 8484, lib.js:31158, 31262, 31267, 31272; lib.js:24178, 24181, 25298, 25301, 25378, 23193, 20969, 4116, 32847, 20803, 20805, 25422, 20780, 20784, 21120, 7397, 26428, 22143; webrtc.js:12146, 24804, 10503, 10561, 4371, 11403 | `&api` socket or `&postapi`; queued (max 20) until socket opens |
| On connect | Sends `details` snapshot and tally snapshot | lib.js:74045-74047 | `&api` |

## MIDI

Enable: `&midi=N` or `&hotkeys=N` sets `session.midiHotkeys` (main.js:1860-1863). WebMidi (`thirdparty/webmidi3.js`) is loaded when `midiHotkeys` or `&midiout` is set (main.js:10451-10491), or `&midiin` alone (main.js:10492-10501). Each input gets a listener; `&mididevice=N` restricts to input N (main.js:1979-1981, 10459); `&midichannel=1-16` restricts to a channel (main.js:1967-1978, 10464).

| Name / key | Action | Source (file:line) | Gated by |
|---|---|---|---|
| Mode 1 note `G3` | `toggleChat()` | lib.js:74915 | `&midi=1`, noteon |
| Mode 1 note `A3` | `toggleMute()` mic | lib.js:74919 | `&midi=1` |
| Mode 1 note `B3` | `toggleVideoMute()` | lib.js:74923 | `&midi=1` |
| Mode 1 note `C4` | `toggleScreenShare()` | lib.js:74927 | `&midi=1` |
| Mode 1 note `D4` | `hangup()` | lib.js:74931 | `&midi=1` |
| Mode 1 note `E4` | `raisehand()` called twice (net toggle cancels, see unresolved) | lib.js:74935-74938 | `&midi=1` |
| Mode 1 note `F4` | `recordLocalVideoToggle()` | lib.js:74939 | `&midi=1` |
| Mode 1 note `G4` | `press2talk(true)` director audio on | lib.js:74942 | `&midi=1` |
| Mode 1 note `A4` | `hangup2()` director cuts own A/V | lib.js:74946 | `&midi=1` |
| Mode 1 note `B4` | `toggleSpeakerMute()` | lib.js:74950 | `&midi=1` |
| Mode 2 notes `G1, A1, B1, C2, D2, E2, F2, G2, A2, B2` | Same ten actions as mode 1 in the same order (chat, mic, camera, screen, hangup, hand, record, press2talk, hangup2, speaker) | lib.js:74956-74985 | `&midi=2` |
| Mode 3 note `C1`, velocity `0`-`9` | Velocity selects: 0 chat, 1 mic, 2 camera, 3 screen, 4 hangup, 5 hand, 6 record, 7 press2talk, 8 hangup2, 9 speaker | lib.js:74988-75019 | `&midi=3` |
| Mode 4 CC110 value `0`-`8` | 0 chat, 1 mic, 2 camera, 3 screen, 4 hangup, 5 hand, 6 record, 7 press2talk, 8 hangup2 | lib.js:75092-75112 | `&midi=4`, controlchange |
| Mode 4 CC110 value `10` / `11` | Reserved for PowerPoint prev/next (sent out by `prevSlide`/`nextSlide`) | lib.js:75113, 74439-74451 | `&midi=4` |
| Mode 4 CC110 value `20`/`21` | Zoom +0.1 / -0.1 (relative) | lib.js:75116-75121 | `&midi=4` |
| Mode 4 CC110 value `22`/`23` | Pan -0.1 / +0.1 | lib.js:75122-75127 | `&midi=4` |
| Mode 4 CC110 value `24`/`25` | Tilt +0.1 / -0.1 | lib.js:75128-75133 | `&midi=4` |
| Mode 4 CC110 value `26`/`27` | Exposure +0.1 / -0.1 | lib.js:75134-75139 | `&midi=4` |
| Mode 4 CC110 value `28`/`29` | Focus -0.1 / +0.1 | lib.js:75140-75145 | `&midi=4` |
| Mode 4 CC110 value `30`/`31`/`32` | Camera preset: center (zoom 1), wide (0.5), close-up (2.0); pan/tilt 0 | lib.js:75149-75163 | `&midi=4` |
| Mode 4 CC111+ (guest slot = CC - 111) value `0` | `directMigrate` (transfer) | lib.js:75166-75173 | `&midi=4`, director |
| CC111+ value `1` | `directEnable` scene 1 | lib.js:75174 | same |
| CC111+ value `2` | `directMute` (scene mute) | lib.js:75179 | same |
| CC111+ value `3` | `remoteMute` (guest mic) | lib.js:75184 | same |
| CC111+ value `4` | `directHangup` | lib.js:75189 | same |
| CC111+ value `5` | `toggleSoloChat` | lib.js:75194 | same |
| CC111+ value `6` | `remoteSpeakerMute` | lib.js:75199 | same |
| CC111+ value `7` | `remoteDisplayMute` | lib.js:75204 | same |
| CC111+ value `8` | `requestKeyframeScene` | lib.js:75209 | same |
| CC111+ value `12`-`18` | `directEnable` scenes 2-8 | lib.js:75214-75243 | same |
| CC111+ value `>= 27` | Guest volume: gain = value - 27 mapped through `volumeLUT`, `remoteVolume` | lib.js:75249-75265 | same |
| CC80 | Zoom absolute (0-127 → 0-2x) | lib.js:75274-75276 | `&midi=4` |
| CC81 | Pan absolute (-1..+1) | lib.js:75277-75279 | `&midi=4` |
| CC82 | Tilt absolute (-1..+1) | lib.js:75280-75282 | `&midi=4` |
| CC83 | Exposure absolute (0-1) | lib.js:75283-75285 | `&midi=4` |
| CC84 | Focus absolute (0-1) | lib.js:75286-75288 | `&midi=4` |
| Mode 5 CC `offset`..`offset+8` | `remoteMute` guest slot (CC - offset) | lib.js:75080-75089, main.js:10472-10477 | `&midi=5`; `&midioffset=N` (main.js:1900-1903, default 23 at webrtc.js:1326) |
| Guest-slot ordering | Slot N = Nth child of `#guestFeeds`, or guest whose `#position_<UUID>.dataset.locked == N+1` | lib.js:75059-75078 | DOM coupling |
| `&midiremote` / `&remotemidi` = 4 (director default) | Incoming peer MIDI with status 176 → `midiHotkeysCommand(cc, value)` | main.js:1905-1911, lib.js:75794-75798 | `&midiremote` |
| `&midiremote` = 1/2/3 (guest default 1) | Incoming peer note-on status 156 mapped: 24→C1, 33→A1, 35→B1, 36→C2, 38→D2, 40→E2, 41→F2, 43→G2, 55→G3, 57→A3, 59→B3, 60→C4, 62→D4, 64→E4, 65→F4, 67→G4, 69→A4; then `midiHotkeysNote` | lib.js:75799-75835 | `&midiremote` and a matching `&midi` mode (see unresolved) |
| `&midiout` / `&midipush` / `&mo` [=index or name] | Captures local MIDI input and sends it to peers | main.js:1942-1944, 10379-10414 | URL param |
| `&midiin` / `&midipull` / `&midin` / `&mi` [=index or name] | Plays peer MIDI to local output(s) | main.js:1958-1960, 10416; lib.js:75637-75650 | URL param |
| `&mididelay=ms` | Delays MIDI playout (default 1000) | main.js:1962-1965, lib.js:75768-75787 | URL param |
| `&midiiframe` | Posts every incoming MIDI message to parent as `midi-in` | main.js:1954-1956, lib.js:75743-75745 | URL param + isIFrame |
| `&tc` / `&timecode` / `&showtimecode` | MIDI timecode quarter-frame (241) and full-frame SysEx display | main.js:1946-1948, lib.js:75747-75757 | URL param |
| IFRAME `sendRawMIDI` | Sends raw MIDI to one/all peers | main.js:9562-9578 | isIFrame |
| MIDI button panel (`data-action-type="midi-button"`, notes C1-G1, A0 toggle; C3-F3 ch 1) | `buttonMIDI(this)` sends notes | index.html:2238-2268, lib.js:75566 | UI |
| Inbound P2P `allowmidi` | Peer MIDI permission flag | webrtc.js:9567 | P2P |

## Other hooks

| Name / key | Action | Source (file:line) | Gated by |
|---|---|---|---|
| `&postapi` / `&posturl` webhook | POSTs `{update:{streamID, action, value}}` JSON for every `pokeAPI` event (list in Remote control) | main.js:7163-7171, lib.js:73203-73229, 73232-73235 | URL param (HTTPS URL) |
| Tally via API | `emitTallyState` sends `obs-state` to API/postapi and `tally`/`obs-state` to iframe | lib.js:4108-4126 | isIFrame or `&api` or `&postapi` |
| `&discordwebhook` / `&dwh` (`&discordwebhook2` / `&dwh2` sensitive) | Discord embed on unexpected inbound disconnect (`endViewConnection`) | main.js:1509-1519, lib.js:73260-73290, webrtc.js:12149 | URL param |
| BroadcastChannel popout chat (`session.broadcastChannelID`, random 8 chars) | Created by `createPopoutChat()`; inbound `{loaded}` → replies `{messageList}`; inbound `{msg}` → `sendChatMessage`; outbound chat objects and tip data | lib.js:58955-58980, 58697, 59237, 26413; popout.html:230 consumer | Popout chat opened; channel id passed in `popout.html?id=...&data=...` (XOR "encryption", lib.js:58990-59014) |
| BroadcastChannel `vdo-qrconnect` | QR handoff | qr.html:728 | Outside engine |
| Child iframe postMessage out: `{close:true}` | Closes iframe share | lib.js:11642, 56873 | Iframe share active |
| Child iframe postMessage out: `{mic: bool}` | Mirrors mic state into `#screensharesource` iframe | lib.js:20959 | Iframe share |
| Child iframe postMessage out: `{mute: bool}` | Mirrors speaker mute into peer iframe (`iframeEle`) | lib.js:21111, 20980-20995 | Iframe peers |
| OBS browser-source events listened | `obsSceneChanged`, `obsSourceVisibleChanged`, `obsSourceActiveChanged`, `obsStreamingStarted/Stopped`, `obsRecordingStarted/Stopped`, `obsVirtualcamStarted/Stopped` | main.js:4616-4642 | `window.obsstudio`; off with `&obsoff` / `&oo` / `&disableobs` (main.js:4491-4493) |
| `window.obsstudio[action](value)` from peer `obsCommand` | Executes OBS API (e.g. `setCurrentScene`, start/stop streaming/recording/virtualcam) | lib.js:4900-4985 | `&remote` code match; `&allowedscenes` filter (`session.filterOBSscenes`) |
| `window.obsstudio.setCurrentScene` automatic | Low-bitrate scene switch, motion switch | lib.js:6185-6201, 13525-13531 | Related URL params |
| `window.obsstudio` details polling | Reads all obsstudio getters into `session.obsState.details` | lib.js:4345-4395 | OBS |
| Electron `window.electronApi.exposeDoSomethingInWebApp(cb)` | Electron host drives the IFRAME API handler | main.js:780-785 | Electron Capture |
| Electron `electronApi.updateVersion` | Reports `session.version` | main.js:786-788 | Electron |
| Electron `electronApi.updatePPT` / `ipcRenderer.send("PPTHotkey")` | Global PTT hotkey registration | lib.js:59592-59593, 59664-59665, 59688-59689, 59754-59755 | Electron |
| Electron `electronApi.prompt` | Replaces `window.prompt` | main.js:743 | Electron |
| Electron ASIO: `isAsioAvailable(Async)`, `getAsioDevices(Async)`, `createAsioStream(Async)`, `onAsioAudioData`, `onAsioError`, `isWindowAudioCaptureAvailable` | ASIO audio capture | lib.js (multiple, grep `electronApi.`) | Electron |
| Custom event `vdoninja:gdrive-progress` on window | `{UUID, gdrive, screen}` | lib.js:61590-61600 | Consumed by podcast/studio.js:65, 1845 |
| Custom event `vdoninja:remote-recorder-status` on window | `{UUID, recorder, screen}` | lib.js:61663-61675 | Consumed by podcast/studio.js:66, 1847 |
| `VDOIcecastPublisher` events `status`, `progress`, `error` | EventTarget events | lib.js:77792-77815, 77972, 78020, 78128, 78266 | Icecast publish |
| Window globals exported explicitly | `window.vdoIcecastController`, `window.VDOIcecastPublisher`, `window.setupVDOIcecast`, `window.setupDropbox`, `window.stopWhepTestPreview`, `window.handleWhepUrlInputChange`, `window.toggleWhepTestPreview`, `window.startWhepSharingFromInput` | lib.js:78951, 79031, 79032, 60837; main.js:298, 300, 311, 349 | Always |
| Implicit globals called by same-origin wrappers (mixer.html) | `contentWindow.session` (`directorState`, `directorUUID`, `rpcs`, `pcs`, `layout`, `directorList`, `sendRequest`, `sendMessage`), `getTranslation`, `miniTranslate`, `buildCoDirectorInviteURL`, `updateMixer`, `warnUser`; mixer sends `{pipe:{mixerControl}}` via `sendRequest` | mixer.html:3784-3960, 4303-4359, 7132, 7281 | Outside engine; same origin |
| Implicit globals (qr.html, studio/app.js) | `frame.contentWindow.session.rpcs`; `contentWindow.miniTranslate` | qr.html:2407, 2676; studio/app.js:2461-2463 | Outside engine |
| Implicit globals (podcast/studio.js, core/uploads) | `window.session`, `requestGoogleDriveRecord`, `press2talk`, `setupDropbox`, `setupGoogleDriveUploader`, `pokeIframeAPI`, `pokeAPI`, `createPopoutChat`, `toggleMute`, `screenshareTypeDecider`, `sanitizeRoomName`, `getUserMediaRequestID`, `changeAudioDeviceById`, `screenShareAudioTrack`, `urlParams`, config `VDO_NINJA_ICECAST_RELAY_URL` / `_TOKEN` | podcast/studio.js:495, 869, 2312, 2478, 2645, 2682, 2744, 2748, 2781, 2936, 2987, 3409, 4293, 5859, 7419; core/uploads/cloud-storage.js:24, 53, 75 | Outside engine; same page |
| DOM coupling: API/MIDI selectors | `[data-action-type]` values `forward`, `addToScene` + `data-scene` 1-8, `mute-scene`, `mute-guest`, `hangup`, `solo-chat`, `toggle-remote-speaker`, `toggle-remote-display`, `toggle-group` + `data-group`, `mute-video-guest`, `force-keyframe`, `solo-video`, `isolate-channel`, `volume`, `setslot`, `order-down`, `create-timer`, `remove-queue`; keyed by `data-sid` / `data--u-u-i-d` | lib.js:73299-73337, 73427, 75059-75265 | Breaks API and MIDI if renamed |
| DOM coupling: fixed IDs | `#muteAllGuests`, `#globalTimerDirectorToggle`, `#highlightDirector`, `#mutebutton` (class `PPTActive`), `#groups`, `#gridlayout`, `#guestFeeds`, `#position_<UUID>` (`data-locked`), `#bufferSettings[data--u-u-i-d]`, `#pptHotKey`, `#pptHotKey0`, `#gowebcam` (`data-ready`), `#screensharesource`, `#zoomPositionControls` | lib.js:74182-74191, 74398-74417, 74503-74518; main.js:8989, 9087, 10026, 10272, 10974; lib.js:75059-75065, 59661 | Breaks API, MIDI, hotkeys if renamed |
| localStorage `PPTHotkey` | PTT hotkey combo | lib.js:59607, 59660, 59685, 59750 | Settings |
| localStorage `settings`, `permission`, `redirect` | Sticky session settings (`&sticky`), permission, redirect | main.js:676-720; lib.js:652-653, 707 | `&sticky` |
| localStorage `permaid`, `rememberStreamIDmobile` | Remembered stream id | main.js:7244-7263, 7377; lib.js:27508-27513 | `&permaid` / mobile |
| localStorage `directorCustomize`, `directorOtherSettings`, `directorWebsiteShare` | Director UI customization and settings | lib.js:25663-25796, 7574, 30742, 31860, 56570-56646; main.js:8488 | Director |
| localStorage `fullscreenButtonSetting`, `pipButtonSetting` | Show fullscreen/PiP buttons | lib.js:22289-22340; main.js:10681 | Settings |
| localStorage `showReshare`, `leaveInPeaceSSWarning`, `tipOnboardingSeen` | UI flags | lib.js:27544, 27626, 45944, 46007-46008, 26212-26267 | UI |
| localStorage `jumptoURL`, `jvi` | Landing/jump state | main.js:2433-2434; lib.js:11879, 11847, 27577-27578 | Landing |
| localStorage `vdo_ninja_language` | Interface language | main.js:392; lib.js:11150 | Language picker |
| localStorage `vdo_translation_language`, `vdo_translation_provider`, `vdo_translation_audio_mode`, `vdo_translation_broker_url` | Live translation prefs | main.js:4184-4208 | Translation |
| localStorage `camera_<deviceId>`, `audio_<deviceId>`, `micVolume_<...>`, `vdo_effect_value_<...>` | Per-device camera/audio constraints, mic volume, effect values | lib.js:54664-55207, 54132, 54767, 7475, 7489, 67757-67810 | Per device |
| localStorage `session_store` | Session store | lib.js:34733, 34744 | |
| localStorage `turnlist` | Cached TURN list | webrtc.js:517, 570 | |
| localStorage `deleteWhipOnLoad`, `deleteWhipScreenOnLoad` | Pending WHIP cleanup | main.js:600-619; lib.js:69438-69449, 70209-70222 | WHIP |
| localStorage `dropboxAccessToken`, `dropboxSession`, `dropboxOAuthTokens`, `dropboxOAuthSession` | Dropbox auth | lib.js:60256-60257, 60655-61062 | Dropbox |
| localStorage `YoutubeAuth` | YouTube auth | lib.js:66535-66539 | YouTube chat |
| localStorage `vdoNinja.icecastSettings` | Icecast settings | lib.js:77467, 77678-77692 | Icecast |
| localStorage `vdo_block_<room>_<hash>` | Shadow-ban flag (4 h) | webrtc.js:6723-6766, 14894 | Password rooms |
| localStorage `consentWarning:<hash>` | Consent warning dismissed (1 week) | main.js:4950-4965 | Consent warning |
| localStorage `vdo_scene_restore_director_v1_<room>`, `vdo_scene_restore_guest_v1_<room>_<stream>` | Scene restore leases and guest token | webrtc.js:10883-10966 | Scene restore |
| localStorage `studio.session.*`, `studio.joinSound`, `studio.meshcast.whipEndpoint` | Studio app state | studio/app.js:25-28 | Outside engine |
| `&api` / `&osc` socket | See Remote control | main.js:7152-7161 | URL param |
| `&pie` (piesocket) | Custom WSS via piesocket API key (deprecated service) | main.js:3838-3843 | URL param |
| `&socialstream` | Stored in `session.socialstream`; no engine reader found | main.js:1896-1898 | See unresolved |
| `&sendframes`, `&iframetarget`, `&bypass` / `&bypasssignaling`, `&webxrbridge` | Parent-frame integration switches (see IFRAME rows) | main.js:6936-6954, 7656-7660, 5515-5518 | URL params |
