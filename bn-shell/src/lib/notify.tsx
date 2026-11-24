/**
 * Operator notifications (Sonner, sonner.emilkowal.ski).
 *
 * A notification reports something the operator did not just do themselves:
 * signaling dropped, a guest joined, a chat message arrived, the director
 * muted them. Results of the operator's own actions already show on the
 * control they pressed, so those never produce a notification.
 *
 * The visitor can turn notifications off from the command palette; the choice
 * is kept in localStorage.
 */
import { toast } from "sonner";
import { StudioToast, type StudioToastProps } from "@/components/StudioToast";

const preferenceKey = "bn-notifications";

export interface NotifyOptions extends Omit<StudioToastProps, "onDismiss"> {
	/** Reuse an id to replace a notification in place instead of stacking a new one. */
	id?: string;
	durationMs?: number;
}

/**
 * Whether notifications are on. Defaults to on; storage failures count as on.
 * @returns {boolean}
 */
export const areNotificationsOn = (): boolean => {
	try {
		return window.localStorage.getItem(preferenceKey) !== "off";
	} catch (storageError) {
		return true;
	}
};

/**
 * Turns notifications on or off and clears anything on screen when turning off.
 * @param {boolean} isOn
 */
export const setNotificationsOn = (isOn: boolean): void => {
	try {
		window.localStorage.setItem(preferenceKey, isOn ? "on" : "off");
	} catch (storageError) {
		console.warn(`[bn-shell] ${new Date().toISOString()} could not persist notification preference`, storageError);
	}
	if (!isOn) {
		toast.dismiss();
	}
};

/**
 * Shows one notification, unless the visitor turned them off.
 * @param {NotifyOptions} options
 */
export const notify = (options: NotifyOptions): void => {
	if (!areNotificationsOn()) {
		return;
	}
	const { id, durationMs, ...toastProps } = options;
	toast.custom(toastId => <StudioToast {...toastProps} onDismiss={() => toast.dismiss(toastId)} />, {
		id,
		duration: durationMs === undefined ? 5000 : durationMs
	});
};

/**
 * Joins names for a batched message: "Alex", "Alex and Sam", "Alex, Sam and 2 more".
 * @param {string[]} names
 * @returns {string}
 */
export const joinNames = (names: string[]): string => {
	if (names.length <= 2) {
		return names.join(" and ");
	}
	return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
};
