/**
 * The shell's only bridge to the engine.
 *
 * The shell never reimplements engine behavior. It reads documented engine
 * state (window.session, DOM the engine owns) and, when it offers a control,
 * invokes the engine's own handler. Every engine touchpoint lives in this file
 * so an upstream change that breaks one is found in one place.
 */

interface EngineSession {
	version?: string | null;
	darkmode?: boolean | string | null;
	studioSoftware?: boolean;
	cleanOutput?: boolean;
	roomid?: string | boolean | null;
	director?: boolean | string | null;
	label?: string | boolean | null;
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
