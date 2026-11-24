import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { areNotificationsOn, setNotificationsOn } from "@/lib/notify";

/**
 * State shared across shell surfaces: which floating layer is open and the
 * notification preference. Lets the command palette open the About view and
 * the app bar open the palette without the components knowing each other.
 */
interface ShellState {
	isPaletteOpen: boolean;
	setPaletteOpen: (isOpen: boolean) => void;
	isAboutOpen: boolean;
	setAboutOpen: (isOpen: boolean) => void;
	hasNotifications: boolean;
	setHasNotifications: (isOn: boolean) => void;
	/** False on outputs and embeds: no palette, no notifications (see isOperatorSurface). */
	isOperator: boolean;
}

const ShellStateContext = createContext<ShellState | null>(null);

export const ShellStateProvider = ({ isOperator, children }: { isOperator: boolean; children: ReactNode }) => {
	const [isPaletteOpen, setPaletteOpen] = useState(false);
	const [isAboutOpen, setAboutOpen] = useState(false);
	const [hasNotifications, setHasNotificationsState] = useState(areNotificationsOn);

	const setHasNotifications = useCallback((isOn: boolean) => {
		setNotificationsOn(isOn);
		setHasNotificationsState(isOn);
	}, []);

	const state = useMemo(
		() => ({ isPaletteOpen, setPaletteOpen, isAboutOpen, setAboutOpen, hasNotifications, setHasNotifications, isOperator }),
		[isPaletteOpen, isAboutOpen, hasNotifications, setHasNotifications, isOperator]
	);
	return <ShellStateContext.Provider value={state}>{children}</ShellStateContext.Provider>;
};

/**
 * Shell state for the calling component.
 * @returns {ShellState}
 */
export const useShellState = (): ShellState => {
	const state = useContext(ShellStateContext);
	if (!state) {
		throw new Error("useShellState must be used inside ShellStateProvider");
	}
	return state;
};
