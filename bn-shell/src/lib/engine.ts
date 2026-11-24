/**
 * The shell's bridge to the engine: session state and page-level facts.
 *
 * The shell never reimplements engine behavior. It reads engine state
 * (window.session, DOM the engine owns) and, when it offers a control, presses
 * the engine's own control. Every engine touchpoint lives in src/lib/engine*.ts
 * (state here, controls in engine-controls.ts, events in engine-events.ts) so an
 * upstream change that breaks one is found in one place.
 */

interface RecordableVideo {
	recording?: boolean;
	stopWriter?: unknown;
}

interface EnginePeer {
	videoElement?: RecordableVideo | null;
	label?: string | boolean | null;
	streamID?: string;
}

export interface EngineSession {
	version?: string | null;
	darkmode?: boolean | string | null;
	studioSoftware?: boolean;
	cleanOutput?: boolean;
	roomid?: string | boolean | null;
	director?: boolean | string | null;
	label?: string | boolean | null;
	scene?: string | boolean | number | null;
	view?: string | boolean | null;
	whepInput?: unknown;
	whipView?: unknown;
	permaid?: string | boolean | null;
	disableHotKeys?: boolean;
	videoElement?: RecordableVideo | null;
	screenShareElement?: RecordableVideo | null;
	rpcs?: Record<string, EnginePeer>;
}

declare global {
	interface Window {
		session?: EngineSession;
		obsstudio?: unknown;
	}
}

export const upstreamRepoUrl = "https://github.com/steveseguin/vdo.ninja";
export const sourceRepoUrl = "https://github.com/BytesNation/BytesNation-Studio";
export const licenseUrl = `${sourceRepoUrl}/blob/develop/LICENSE`;
export const productName = "BytesNation Studio";

/**
 * Returns the engine session object once main.js has created it.
 * @returns {EngineSession | null}
 */
export const getSession = (): EngineSession | null => {
	return window.session ? window.session : null;
};

/**
 * Engine version string (set by webrtc.js / main.js), or null before boot.
 * @returns {string | null}
 */
export const getEngineVersion = (): string | null => {
	const session = getSession();
	return session && session.version ? String(session.version) : null;
};

/**
 * True when running inside OBS or other studio software, or with &cleanoutput.
 * The shell stays out of those outputs entirely.
 * @returns {boolean}
 */
export const isStudioOutput = (): boolean => {
	const session = getSession();
	if (window.obsstudio) {
		return true;
	}
	return Boolean(session && (session.studioSoftware || session.cleanOutput));
};

/**
 * True on pages where a person operates the studio: the launcher, the director
 * room, a guest or publisher. False on outputs that get captured (scenes,
 * view-only links, OBS, clean output), on links that hide the app bar
 * (&hideheader), and inside iframes, where an embedding page owns the interface. Mirrors the engine's own mode branches
 * (main.js: scene inside a room; view-only when nothing is published).
 * Floating shell layers (command palette, notifications) only exist here.
 * @returns {boolean}
 */
export const isOperatorSurface = (): boolean => {
	const session = getSession();
	if (!session || isStudioOutput()) {
		return false;
	}
	if (window.self !== window.top) {
		return false;
	}
	// &hideheader (and its aliases) removes the app bar with an inline display:
	// the link asked for no chrome, so the layers that hang off the bar stay off too.
	const header = document.getElementById("header");
	if (header && header.style.display === "none") {
		return false;
	}
	const isScene = session.scene !== false && session.scene !== undefined && session.scene !== null;
	const hasInboundOnly = (session.view !== false && session.view !== undefined && session.view !== null) || Boolean(session.whepInput) || Boolean(session.whipView);
	const isViewOnly = hasInboundOnly && session.permaid === false && !session.director && session.roomid === false;
	return !isScene && !isViewOnly;
};

/**
 * False when the link carries &disablehotkeys: the engine then ignores its own
 * shortcuts, and the shell must not add one either.
 * @returns {boolean}
 */
export const areHotkeysEnabled = (): boolean => {
	const session = getSession();
	return Boolean(session) && !(session as EngineSession).disableHotKeys;
};

/**
 * True when an element is laid out. The engine hides controls with the
 * .hidden class, inline display and URL parameters; all of them end here.
 * @param {Element | null} element
 * @returns {boolean}
 */
export const isRendered = (element: Element | null): boolean => {
	return element !== null && element.getClientRects().length > 0;
};

const isRecordingVideo = (video: RecordableVideo | null | undefined): boolean => {
	return Boolean(video) && ((video as RecordableVideo).recording === true || typeof (video as RecordableVideo).stopWriter === "function");
};

/**
 * How many streams this page is recording right now: the local stream, the
 * local screen share, and any guest the director records locally. Reads the
 * same flag the engine's record handlers check (video.recording).
 * @returns {number}
 */
export const readRecordingCount = (): number => {
	const session = getSession();
	if (!session) {
		return 0;
	}
	const peers = session.rpcs || {};
	const peerCount = Object.keys(peers).filter(uuid => isRecordingVideo(peers[uuid].videoElement)).length;
	return peerCount + (isRecordingVideo(session.videoElement) ? 1 : 0) + (isRecordingVideo(session.screenShareElement) ? 1 : 0);
};

export type ColorMode = "dark" | "light";

/**
 * Current theme: html.bn-dark, which boot.js keeps in sync with the engine
 * (body.darktheme, or session.darkmode in view mode where the engine resets body classes).
 * @returns {ColorMode}
 */
export const readColorMode = (): ColorMode => {
	return document.documentElement.classList.contains("bn-dark") ? "dark" : "light";
};

/**
 * Switches theme the way the engine's own boot does: toggles body.darktheme
 * and session.darkmode, and remembers the choice for the next load (read by
 * boot.js before main.js runs). URL params still win on the next load.
 * @param {ColorMode} mode
 */
export const applyColorMode = (mode: ColorMode): void => {
	const isDark = mode === "dark";
	document.body.classList.toggle("darktheme", isDark);
	document.body.classList.remove("whitetheme");
	const session = getSession();
	if (session) {
		session.darkmode = isDark;
	}
	try {
		window.localStorage.setItem("bn-color-mode", mode);
	} catch (storageError) {
		console.warn(`[bn-shell] ${new Date().toISOString()} could not persist color mode`, storageError);
	}
};

/**
 * Signaling health from the engine's QoS indicator (#qos turns red when the
 * signaling websocket is closed). The engine recreates #qos, so query each time.
 * @returns {"online" | "offline" | "unknown"}
 */
export const readSignalingState = (): "online" | "offline" | "unknown" => {
	const qosElement = document.getElementById("qos");
	const logoElement = document.getElementById("logoname");
	if (!qosElement || !logoElement || logoElement.style.display === "none") {
		return "unknown";
	}
	return qosElement.style.color === "red" ? "offline" : "online";
};

/**
 * Creates (once) a container element for a shell portal inside an
 * engine-owned element.
 * @param {{hostId: string, slotId: string, placement: "prepend" | "append"}} options
 * @returns {HTMLElement | null}
 */
export const ensureSlot = (options: { hostId: string; slotId: string; placement: "prepend" | "append" }): HTMLElement | null => {
	const existing = document.getElementById(options.slotId);
	if (existing) {
		return existing;
	}
	const host = document.getElementById(options.hostId);
	if (!host) {
		return null;
	}
	const slot = document.createElement("div");
	slot.id = options.slotId;
	slot.className = "bn-slot";
	if (options.placement === "prepend") {
		host.insertBefore(slot, host.firstChild);
	} else {
		host.appendChild(slot);
	}
	return slot;
};
