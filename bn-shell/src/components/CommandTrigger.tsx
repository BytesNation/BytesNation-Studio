import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { areHotkeysEnabled } from "@/lib/engine";
import { useShellState } from "@/lib/shell-state";

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** App-bar entry to the command palette. Shows the shortcut unless the link disables hotkeys. */
export const CommandTrigger = () => {
	const shell = useShellState();
	return (
		<Button variant="secondary" size="sm" className="bn-cmd-trigger tw-gap-2 tw-px-2" aria-label="Open command palette" aria-haspopup="dialog" onClick={() => shell.setPaletteOpen(true)}>
			<Search size={14} aria-hidden="true" />
			<span className="bn-cmd-trigger-label">Commands</span>
			{areHotkeysEnabled() ? (
				<span className="bn-cmd-trigger-keys tw-flex tw-items-center tw-gap-1">
					<Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
					<Kbd>K</Kbd>
				</span>
			) : null}
		</Button>
	);
};
