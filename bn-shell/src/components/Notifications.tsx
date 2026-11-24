import { useEffect, type CSSProperties } from "react";
import { Toaster } from "sonner";
import { areHotkeysEnabled } from "@/lib/engine";
import { canOpenChatPanel, openChatPanel } from "@/lib/engine-controls";
import { subscribeEngineEvents } from "@/lib/engine-events";
import { joinNames, notify } from "@/lib/notify";
import { formatTimecode } from "@/lib/timecode";

/** Sits under the app bar, clear of the control bar and the chat panel at the bottom. */
const desktopOffset = { top: 60, right: 12 };
const mobileOffset = { top: 56, left: 12, right: 12 };
const toasterStyle = { "--width": "360px" } as CSSProperties;

/**
 * Notification host. Mounted only on operator surfaces (see isOperatorSurface),
 * so nothing can ever appear over a scene, a view link or an OBS source.
 */
export const Notifications = () => {
	useEffect(() => {
		return subscribeEngineEvents({
			onSignalingChange: state => {
				if (state === "offline") {
					notify({ id: "signal", tone: "error", kicker: "Signal", message: "Signaling connection lost. Calls in progress continue; new connections wait.", durationMs: 12000 });
					return;
				}
				notify({ id: "signal", tone: "ok", kicker: "Signal", message: "Signaling connection restored." });
			},
			onGuestsChange: change => {
				if (change.joined.length > 0) {
					notify({ tone: "ok", kicker: "Guest", message: `${joinNames(change.joined)} joined.` });
				}
				if (change.left.length > 0) {
					notify({ tone: "neutral", kicker: "Guest", message: `${joinNames(change.left)} left.` });
				}
			},
			onChatMessage: message => {
				notify({
					id: "chat",
					tone: "neutral",
					kicker: message.sender ? `Chat · ${message.sender}` : "Chat",
					message: message.text,
					action: canOpenChatPanel() ? { label: "Open", onAction: openChatPanel } : undefined,
					durationMs: 7000
				});
			},
			onDirectorNotice: noticeText => {
				notify({ id: "director", tone: "warn", kicker: "Director", message: noticeText, durationMs: 7000 });
			},
			onRecordingChange: change => {
				if (!change.isRecording) {
					notify({ id: "recording", tone: "neutral", kicker: "Recording", message: `Recording stopped at ${formatTimecode(change.elapsedSeconds)}.` });
				}
			}
		});
	}, []);

	return (
		<Toaster
			position="top-right"
			offset={desktopOffset}
			mobileOffset={mobileOffset}
			visibleToasts={3}
			gap={8}
			style={toasterStyle}
			hotkey={areHotkeysEnabled() ? ["altKey", "KeyT"] : []}
			containerAriaLabel="Studio notifications"
		/>
	);
};
