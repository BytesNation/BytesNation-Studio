/**
 * Turns engine state changes into events the shell can announce.
 *
 * The engine only posts its events to a parent page (IFRAME API), so at the
 * top level the shell observes the DOM and session state the engine already
 * maintains. Nothing here writes to the engine.
 *
 * Events: signaling lost and restored, guests joining and leaving the
 * director's room, chat messages that arrive while the chat panel is closed,
 * notices the director sends a guest (muted, camera disabled, solo), and
 * recordings starting and stopping.
 */
import { isRendered, readRecordingCount, readSignalingState } from "@/lib/engine";

export interface EngineEventHandlers {
	onSignalingChange: (state: "offline" | "online") => void;
	onGuestsChange: (change: { joined: string[]; left: string[] }) => void;
	onChatMessage: (message: { sender: string; text: string }) => void;
	onDirectorNotice: (noticeText: string) => void;
	onRecordingChange: (change: { isRecording: boolean; elapsedSeconds: number }) => void;
}

const signalingPollMs = 2000;
const recordingPollMs = 1000;
const guestSettleMs = 1400;
const maxChatPreviewLength = 140;
const directorNoticeIds = ["head6", "head7", "head8"];

const readStripLabel = (strip: HTMLElement): string => {
	const labelElement = strip.querySelector('[id^="label_"]');
	const labelText = labelElement ? (labelElement.textContent || "").trim() : "";
	return labelText || String(strip.dataset.sid || "A guest");
};

/** Offline must hold for two polls after a first connection, so a normal connect never reads as a loss. */
const watchSignaling = (handlers: EngineEventHandlers): (() => void) => {
	let hasBeenOnline = false;
	let offlinePolls = 0;
	let isAnnouncedOffline = false;
	const timer = window.setInterval(() => {
		const state = readSignalingState();
		if (state === "online") {
			hasBeenOnline = true;
			offlinePolls = 0;
			if (isAnnouncedOffline) {
				isAnnouncedOffline = false;
				handlers.onSignalingChange("online");
			}
			return;
		}
		offlinePolls = state === "offline" ? offlinePolls + 1 : 0;
		if (hasBeenOnline && offlinePolls === 2 && !isAnnouncedOffline) {
			isAnnouncedOffline = true;
			handlers.onSignalingChange("offline");
		}
	}, signalingPollMs);
	return () => window.clearInterval(timer);
};

const listStrips = (feeds: HTMLElement): HTMLElement[] => {
	return (Array.prototype.slice.call(feeds.children) as HTMLElement[]).filter(strip => Boolean(strip.dataset.UUID));
};

/**
 * Joins and leaves, tracked by connection id rather than by DOM mutation: the
 * engine reorders strips with insertBefore (shiftPC), which a mutation log
 * would read as a leave and a join. Changes are batched, so a room that
 * reconnects at once reads as one event.
 */
const watchGuests = (handlers: EngineEventHandlers): (() => void) => {
	const feeds = document.getElementById("guestFeeds");
	if (!feeds) {
		return () => undefined;
	}
	const labelByUuid = new Map<string, string>();
	listStrips(feeds).forEach(strip => labelByUuid.set(String(strip.dataset.UUID), readStripLabel(strip)));
	let settleTimer = 0;
	const reconcile = () => {
		settleTimer = 0;
		const strips = listStrips(feeds);
		const presentUuids = new Set(strips.map(strip => String(strip.dataset.UUID)));
		const joined = strips.filter(strip => !labelByUuid.has(String(strip.dataset.UUID))).map(strip => readStripLabel(strip));
		const left: string[] = [];
		labelByUuid.forEach((label, uuid) => {
			if (!presentUuids.has(uuid)) {
				left.push(label);
			}
		});
		labelByUuid.clear();
		strips.forEach(strip => labelByUuid.set(String(strip.dataset.UUID), readStripLabel(strip)));
		if (joined.length > 0 || left.length > 0) {
			handlers.onGuestsChange({ joined, left });
		}
	};
	// The wait covers both batching and the label, which arrives a moment after the strip.
	const observer = new MutationObserver(() => {
		if (!settleTimer) {
			settleTimer = window.setTimeout(reconcile, guestSettleMs);
		}
	});
	observer.observe(feeds, { childList: true });
	return () => {
		observer.disconnect();
		window.clearTimeout(settleTimer);
	};
};

/** Reads sender and text from an engine chat row as plain text (never HTML). */
const readChatMessage = (row: HTMLElement): { sender: string; text: string } => {
	const senderElement = row.querySelector(".chat_name");
	const copy = row.cloneNode(true) as HTMLElement;
	Array.prototype.forEach.call(copy.querySelectorAll("b, small"), (element: Element) => element.remove());
	const text = (copy.textContent || "").replace(/\s+/g, " ").trim();
	return {
		sender: senderElement ? (senderElement.textContent || "").trim() : "",
		text: text.length > maxChatPreviewLength ? `${text.slice(0, maxChatPreviewLength - 1)}…` : text
	};
};

/**
 * The engine clears and rebuilds the whole chat list on every update
 * (updateMessages), so added rows say nothing. Instead, compare the count and
 * content of incoming rows: a new message is a longer list or a different
 * newest incoming row.
 */
const watchChat = (handlers: EngineEventHandlers): (() => void) => {
	const chatBody = document.getElementById("chatBody");
	if (!chatBody) {
		return () => undefined;
	}
	const readNewest = (): { count: number; newest: HTMLElement | null; signature: string } => {
		const incoming = chatBody.querySelectorAll(".inMessage");
		const newest = incoming.length > 0 ? (incoming[incoming.length - 1] as HTMLElement) : null;
		const message = newest ? readChatMessage(newest) : { sender: "", text: "" };
		return { count: incoming.length, newest, signature: `${incoming.length}|${message.sender}|${message.text}` };
	};
	let last = readNewest();
	const observer = new MutationObserver(() => {
		const current = readNewest();
		const hasNewMessage = current.signature !== last.signature && current.count >= last.count && current.newest !== null;
		last = current;
		if (!hasNewMessage || !current.newest || isRendered(document.getElementById("chatModule"))) {
			return;
		}
		const message = readChatMessage(current.newest);
		if (message.text) {
			handlers.onChatMessage(message);
		}
	});
	observer.observe(chatBody, { childList: true });
	return () => observer.disconnect();
};

/** #head6-8 are the engine's director notices to a guest; announce each when it appears. */
const watchDirectorNotices = (handlers: EngineEventHandlers): (() => void) => {
	const shownById: Record<string, boolean> = {};
	const observers = directorNoticeIds.map(noticeId => {
		const notice = document.getElementById(noticeId);
		if (!notice) {
			return null;
		}
		shownById[noticeId] = isRendered(notice);
		const observer = new MutationObserver(() => {
			const isShown = isRendered(notice);
			if (isShown && !shownById[noticeId]) {
				handlers.onDirectorNotice((notice.textContent || "").replace(/\s+/g, " ").trim());
			}
			shownById[noticeId] = isShown;
		});
		observer.observe(notice, { attributes: true, attributeFilter: ["class", "style"] });
		return observer;
	});
	return () => observers.forEach(observer => observer && observer.disconnect());
};

const watchRecording = (handlers: EngineEventHandlers): (() => void) => {
	let startedAt = 0;
	const timer = window.setInterval(() => {
		const isRecording = readRecordingCount() > 0;
		if (isRecording && !startedAt) {
			startedAt = Date.now();
			handlers.onRecordingChange({ isRecording: true, elapsedSeconds: 0 });
		} else if (!isRecording && startedAt) {
			const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
			startedAt = 0;
			handlers.onRecordingChange({ isRecording: false, elapsedSeconds });
		}
	}, recordingPollMs);
	return () => window.clearInterval(timer);
};

/**
 * Starts every engine watcher and returns a function that stops them all.
 * @param {EngineEventHandlers} handlers
 * @returns {() => void}
 */
export const subscribeEngineEvents = (handlers: EngineEventHandlers): (() => void) => {
	const stops = [watchSignaling(handlers), watchGuests(handlers), watchChat(handlers), watchDirectorNotices(handlers), watchRecording(handlers)];
	return () => stops.forEach(stop => stop());
};
