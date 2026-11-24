/**
 * Discovers the engine's own controls so the command palette can offer them.
 *
 * The rule: a command exists only while the engine is rendering its control.
 * Every URL parameter or mode that hides a button (&nomicbutton, &nochat,
 * guest versus director, a collapsed strip section) therefore hides the
 * command too, with no parameter logic repeated here. Labels come from the
 * engine's own translated aria-labels and button text. Running a command is a
 * click() on the engine's element, so its own handler does the work.
 *
 * Controls that end a session (hang up, guest hangup, transfer) are left out on
 * purpose: a fuzzy match plus Enter must never drop a live call.
 */
import { areHotkeysEnabled, isRendered } from "@/lib/engine";

export type CommandTone = "ok" | "warn" | "error" | "accent" | "neutral";

export interface CommandState {
	label: string;
	tone: CommandTone;
}

export interface EngineCommand {
	id: string;
	label: string;
	keywords: string[];
	iconClass?: string;
	maskImage?: string;
	shortcut?: string[];
	state?: CommandState;
	run: () => void;
}

export interface EngineGuest {
	uuid: string;
	label: string;
	streamId: string;
}

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const modKey = isMac ? "⌘" : "Ctrl";
const altKey = isMac ? "⌥" : "Alt";

/** Controls that end the session; never offered from the palette. */
const sessionEndingIds = new Set(["hangupbutton", "hangupbutton2"]);

/** Extra search words (English) for control-bar ids, on top of the engine's translated label and title. */
const controlKeywords: Record<string, string[]> = {
	mutebutton: ["mic", "microphone", "mute", "unmute", "audio"],
	mutevideobutton: ["camera", "video", "cam", "webcam"],
	mutespeakerbutton: ["speaker", "volume", "sound", "output"],
	chatbutton: ["chat", "message", "text"],
	settingsbutton: ["settings", "devices", "camera", "microphone", "preferences"],
	roomsettingsbutton: ["room", "settings", "quality", "timer", "co-director"],
	screensharebutton: ["screen", "share", "present", "display"],
	screenshare2button: ["screen", "share", "present", "second"],
	screenshare3button: ["screen", "share", "present"],
	sharefilebutton: ["file", "transfer", "send", "upload"],
	mediafileshare: ["media", "file", "video", "stream"],
	websitesharebutton: ["website", "iframe", "url", "page"],
	recordLocalbutton: ["record", "rec", "save", "disk"],
	raisehandbutton: ["hand", "raise", "question"],
	flipcamerabutton: ["flip", "cycle", "switch", "camera"],
	muteAllGuests: ["mute", "all", "guests", "everyone"],
	blindAllGuests: ["blind", "all", "guests", "everyone"],
	fullscreenPage: ["fullscreen", "full", "screen"],
	PictureInPicturePage: ["pip", "picture", "pop"],
	obscontrolbutton: ["obs", "remote", "scenes"],
	queuebutton: ["queue", "next", "guest"],
	unmuteSelf: ["monitor", "hear", "yourself", "feedback"]
};

/** Engine keyboard shortcuts (main.js keyDownEvent), shown as hints when hotkeys are on. */
const controlShortcuts: Record<string, string[]> = {
	mutebutton: isMac ? ["⌘", "⌥", "M"] : ["Ctrl", "M"],
	mutevideobutton: [modKey, "B"],
	mutespeakerbutton: [altKey, "A"],
	sharefilebutton: [modKey, altKey, "F"],
	flipcamerabutton: [modKey, altKey, "C"],
	screensharebutton: [modKey, altKey, "S"]
};

const cleanLabel = (rawLabel: string): string => {
	const withoutHint = rawLabel.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+/g, " ").trim();
	return withoutHint ? withoutHint.charAt(0).toUpperCase() + withoutHint.slice(1) : "";
};

const readIconClass = (control: Element): string => {
	const icon = control.querySelector("i");
	if (!icon) {
		return "";
	}
	return Array.prototype.filter.call(icon.classList, (className: string) => className === "las" || className === "lab" || className.indexOf("la-") === 0).join(" ");
};

const pressControl = (control: HTMLElement): void => {
	try {
		control.click();
	} catch (pressError) {
		const errorType = pressError instanceof Error ? pressError.name : typeof pressError;
		const stackTrace = pressError instanceof Error ? pressError.stack : "";
		console.error(`[bn-shell] ${new Date().toISOString()} engine control ${control.id || control.tagName} failed (${errorType})`, stackTrace);
		throw pressError;
	}
};

/** Current state of the known toggles, read from the classes lib.js sets. */
const readControlState = (control: HTMLElement): CommandState | undefined => {
	const isRed = control.classList.contains("red");
	if (control.id === "mutebutton" || control.id === "mutevideobutton" || control.id === "mutespeakerbutton") {
		return isRed ? { label: "Off", tone: "error" } : { label: "On", tone: "ok" };
	}
	if (control.id === "recordLocalbutton" && isRed) {
		return { label: "Recording", tone: "accent" };
	}
	if (control.id === "raisehandbutton" && isRed) {
		return { label: "Raised", tone: "warn" };
	}
	if (control.id === "chatbutton" && isRendered(document.getElementById("chatModule"))) {
		return { label: "Open", tone: "neutral" };
	}
	if (control.id === "settingsbutton" && isRendered(document.getElementById("popupSelector"))) {
		return { label: "Open", tone: "neutral" };
	}
	return undefined;
};

/**
 * Commands for the in-call control bar: one per control the engine currently renders.
 * @returns {EngineCommand[]}
 */
export const listControlBarCommands = (): EngineCommand[] => {
	const bar = document.getElementById("subControlButtons");
	if (!bar || !isRendered(bar)) {
		return [];
	}
	const controls = Array.prototype.slice.call(bar.querySelectorAll('[role="button"][id]')) as HTMLElement[];
	return controls
		.filter(control => isRendered(control) && !sessionEndingIds.has(control.id))
		.map(control => ({
			id: `bar:${control.id}`,
			label: cleanLabel(control.getAttribute("aria-label") || control.title || control.id),
			keywords: [control.title].concat(controlKeywords[control.id] || []),
			iconClass: readIconClass(control),
			shortcut: areHotkeysEnabled() ? controlShortcuts[control.id] : undefined,
			state: readControlState(control),
			run: () => pressControl(control)
		}))
		.filter(command => command.label !== "");
};

const directorHeaderControls = [
	{ selector: "#saveRoom", label: "Save this room for next time", keywords: ["save", "remember", "room"] },
	{ selector: "#togglePreviewMode", label: "Switch between control room and scene preview", keywords: ["preview", "mode", "scene", "switch"] },
	{ selector: '#directorLinks1 button[onclick^="copyFunction"]', label: "Copy guest invite link", keywords: ["copy", "invite", "guest", "link", "url"] },
	{ selector: '#directorLinks2 button[onclick^="copyFunction"]', label: "Copy scene link for OBS", keywords: ["copy", "scene", "obs", "link", "url", "browser source"] }
];

/**
 * Commands for the director room header and link panels.
 * @returns {EngineCommand[]}
 */
export const listDirectorCommands = (): EngineCommand[] => {
	return directorHeaderControls
		.map(entry => ({ entry, control: document.querySelector(entry.selector) }))
		.filter(pair => isRendered(pair.control))
		.map(pair => ({
			id: `director:${pair.entry.selector}`,
			label: pair.entry.label,
			keywords: pair.entry.keywords.concat([(pair.control as HTMLElement).title]),
			run: () => pressControl(pair.control as HTMLElement)
		}));
};

/**
 * Guests the director currently has a control strip for, in strip order.
 * @returns {EngineGuest[]}
 */
export const listGuests = (): EngineGuest[] => {
	const feeds = document.getElementById("guestFeeds");
	if (!feeds || !isRendered(feeds)) {
		return [];
	}
	const strips = Array.prototype.slice.call(feeds.children) as HTMLElement[];
	return strips
		.filter(strip => Boolean(strip.dataset.UUID) && isRendered(strip))
		.map(strip => {
			const uuid = String(strip.dataset.UUID);
			const labelElement = document.getElementById(`label_${uuid}`);
			const labelText = labelElement ? (labelElement.textContent || "").trim() : "";
			return { uuid, label: labelText || String(strip.dataset.sid || "Guest"), streamId: String(strip.dataset.sid || "") };
		});
};

/** Per-guest toggles offered from the palette. Hang up and transfer stay on the strip. */
const guestActionTypes = ["mute-guest", "addToScene", "solo-video", "solo-chat", "mute-video-guest", "toggle-remote-speaker", "hide-guest", "toggle-remote-display"];

/**
 * Commands for one guest: the allowed toggles the engine currently shows in that guest's strip.
 * @param {string} uuid engine connection id of the guest
 * @returns {EngineCommand[]}
 */
export const listGuestCommands = (uuid: string): EngineCommand[] => {
	const strip = document.getElementById(`container_${uuid}`);
	if (!strip || !isRendered(strip)) {
		return [];
	}
	const buttons = Array.prototype.slice.call(strip.querySelectorAll("button[data-action-type]")) as HTMLElement[];
	return buttons
		.filter(button => guestActionTypes.indexOf(String(button.dataset.actionType)) > -1 && isRendered(button))
		.map(button => ({
			id: `guest:${uuid}:${button.dataset.actionType}:${button.dataset.scene || ""}`,
			label: cleanLabel(button.textContent || button.title),
			keywords: [button.title, String(button.dataset.actionType)],
			iconClass: readIconClass(button),
			state: button.classList.contains("pressed") ? { label: "On", tone: "accent" as CommandTone } : undefined,
			run: () => pressControl(button)
		}));
};

const readTileMask = (tile: HTMLElement): string => {
	const pseudoStyle = window.getComputedStyle(tile, "::after");
	const mask = pseudoStyle.getPropertyValue("-webkit-mask-image") || pseudoStyle.getPropertyValue("mask-image");
	return mask && mask !== "none" ? mask : "";
};

/**
 * True for a tile the engine's "More options" button would reveal: hidden only
 * by the .hidden class that button removes. Tiles the engine also hides with
 * .permahide or an inline display (work-in-progress tools) stay unavailable.
 */
const isBehindMoreOptions = (tile: HTMLElement, moreButton: HTMLElement | null): boolean => {
	if (!moreButton || !isRendered(moreButton)) {
		return false;
	}
	return tile.classList.contains("hidden") && !tile.classList.contains("permahide") && tile.style.display !== "none";
};

/**
 * Commands for the launcher: every tool tile the engine offers, including the
 * ones behind "More options". Returns the Back control while a tile is expanded.
 * @returns {EngineCommand[]}
 */
export const listLauncherCommands = (): EngineCommand[] => {
	const expandedBack = document.querySelector(".column.skip-animation .close") as HTMLElement | null;
	if (expandedBack && isRendered(expandedBack)) {
		return [{ id: "launcher:back", label: cleanLabel(expandedBack.textContent || "Back"), keywords: ["back", "close", "cancel", "launcher"], run: () => pressControl(expandedBack) }];
	}
	if (!isRendered(document.getElementById("mainmenu")) || document.querySelector(".column.in-animation, .column.skip-animation")) {
		return [];
	}
	const moreButton = document.getElementById("dropButton");
	const tiles = Array.prototype.slice.call(document.querySelectorAll('#mainmenu div.column.card[id^="container-"]')) as HTMLElement[];
	return tiles
		.filter(tile => tile.id !== "container-22" && (isRendered(tile) || isBehindMoreOptions(tile, moreButton)))
		.map(tile => {
			const heading = tile.querySelector("h2");
			return {
				id: `launcher:${tile.id}`,
				label: cleanLabel(heading ? heading.textContent || "" : tile.title),
				keywords: [tile.title],
				maskImage: readTileMask(tile),
				run: () => {
					// A tile behind "More options" is revealed the way the engine reveals it, then opened.
					if (!isRendered(tile) && moreButton && isRendered(moreButton)) {
						pressControl(moreButton);
					}
					pressControl(tile);
				}
			};
		})
		.filter(command => command.label !== "");
};

/**
 * True when the launcher's quick-join field is on screen.
 * @returns {boolean}
 */
export const canJoinRoomByName = (): boolean => {
	return isRendered(document.getElementById("joinroomID")) && isRendered(document.getElementById("jumptoroomButton"));
};

/**
 * Joins a room through the engine's own quick-join field and button.
 * @param {string} roomName
 */
export const joinRoomByName = (roomName: string): void => {
	const field = document.getElementById("joinroomID") as HTMLInputElement | null;
	const button = document.getElementById("jumptoroomButton");
	if (!field || !button) {
		return;
	}
	field.value = roomName;
	pressControl(button);
};

/**
 * True when the engine shows a chat button and the chat panel is closed.
 * @returns {boolean}
 */
export const canOpenChatPanel = (): boolean => {
	return isRendered(document.getElementById("chatbutton")) && !isRendered(document.getElementById("chatModule"));
};

/**
 * Opens the chat panel through the engine's chat button, if it is closed.
 */
export const openChatPanel = (): void => {
	const chatButton = document.getElementById("chatbutton");
	if (chatButton && canOpenChatPanel()) {
		pressControl(chatButton);
	}
};
