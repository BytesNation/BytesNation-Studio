import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { Command, defaultFilter } from "cmdk";
import { ArrowLeft, ChevronRight, LogIn, Search } from "lucide-react";
import * as m from "motion/react-m";
import { buildPaletteGroups, glyphSize, rootPage, type PaletteCommand, type PaletteGroup, type PalettePage } from "@/components/palette-commands";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/cn";
import { areHotkeysEnabled } from "@/lib/engine";
import { joinRoomByName, type CommandTone } from "@/lib/engine-controls";
import { tweenFast } from "@/lib/motion";
import { notify } from "@/lib/notify";
import { useShellState } from "@/lib/shell-state";

/**
 * Command palette (cmdk, cmdk.paco.me): every control the engine is showing
 * right now, searchable from the keyboard. Ctrl+K or Cmd+K opens it.
 *
 * It is a remote control, not a second implementation: commands come from
 * engine-controls.ts and press the engine's own buttons.
 */
const toneDotClass: Record<CommandTone, string> = {
	ok: "tw-bg-ok",
	warn: "tw-bg-warn",
	error: "tw-bg-error",
	accent: "tw-bg-accent",
	neutral: "tw-bg-muted"
};

/** Below this score a match is a stray run of letters across keywords, not a result. */
const relevanceFloor = 0.15;

const filterByRelevance = (value: string, search: string, keywords?: string[]): number => {
	const score = defaultFilter ? defaultFilter(value, search, keywords) : 1;
	return score >= relevanceFloor ? score : 0;
};

const isTouchDevice = (): boolean => typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;

const CommandGlyph = ({ command }: { command: PaletteCommand }) => {
	if (command.glyph) {
		return <span className="bn-cmd-glyph">{command.glyph}</span>;
	}
	if (command.maskImage) {
		return <span aria-hidden="true" className="bn-cmd-glyph bn-cmd-mask" style={{ WebkitMaskImage: command.maskImage, maskImage: command.maskImage }} />;
	}
	return <span className="bn-cmd-glyph">{command.iconClass ? <i aria-hidden="true" className={command.iconClass} /> : null}</span>;
};

const CommandRow = ({ command, onRun }: { command: PaletteCommand; onRun: (command: PaletteCommand) => void }) => (
	<Command.Item value={command.searchValue || command.id} keywords={command.keywords} onSelect={() => onRun(command)} className="bn-cmd-item" data-command-id={command.id}>
		<CommandGlyph command={command} />
		<span className="bn-cmd-label tw-min-w-0 tw-flex-1 tw-truncate">{command.label}</span>
		{command.state ? (
			<span className="tw-flex tw-flex-none tw-items-center tw-gap-1.5 tw-font-mono tw-text-[11px] tw-uppercase tw-tracking-[0.08em] tw-text-muted">
				<span aria-hidden="true" className={cn("tw-inline-block tw-h-1.5 tw-w-1.5 tw-rounded-full", toneDotClass[command.state.tone])} />
				{command.state.label}
			</span>
		) : null}
		{command.shortcut ? (
			<span className="bn-cmd-keys tw-flex tw-flex-none tw-items-center tw-gap-1">
				{command.shortcut.map(keyLabel => (
					<Kbd key={keyLabel}>{keyLabel}</Kbd>
				))}
			</span>
		) : null}
		{command.opensPage ? <ChevronRight size={14} aria-hidden="true" className="tw-flex-none tw-text-faint" /> : null}
	</Command.Item>
);

const JoinRoomRow = ({ roomName, onRun }: { roomName: string; onRun: (command: PaletteCommand) => void }) => (
	<Command.Group heading="Join">
		<Command.Item value="join:go" disabled={roomName === ""} onSelect={() => onRun({ id: "join:go", label: `Join ${roomName}`, keywords: [], run: () => joinRoomByName(roomName) })} className="bn-cmd-item">
			<span className="bn-cmd-glyph">
				<LogIn size={glyphSize} aria-hidden="true" />
			</span>
			<span className="tw-min-w-0 tw-flex-1 tw-truncate">{roomName === "" ? "Type a room name, then press Enter" : `Join room “${roomName}”`}</span>
		</Command.Item>
	</Command.Group>
);

const PaletteFooter = ({ hasBack }: { hasBack: boolean }) => (
	<div className="bn-cmd-footer max-sm:tw-hidden">
		<span className="tw-flex tw-items-center tw-gap-1.5">
			<Kbd>↑</Kbd>
			<Kbd>↓</Kbd>
			Navigate
		</span>
		<span className="tw-flex tw-items-center tw-gap-1.5">
			<Kbd>↵</Kbd>
			Run
		</span>
		{hasBack ? (
			<span className="tw-flex tw-items-center tw-gap-1.5">
				<Kbd>⌫</Kbd>
				Back
			</span>
		) : null}
	</div>
);

/**
 * Ctrl+K or Cmd+K toggles the palette. Stays off with &disablehotkeys and
 * yields when the engine already claimed the key (a custom push-to-talk combo).
 */
const usePaletteHotkey = (onToggle: () => void): void => {
	useEffect(() => {
		const handleKeyDown = (event: globalThis.KeyboardEvent) => {
			const isPaletteCombo = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && (event.key === "k" || event.key === "K");
			if (!isPaletteCombo || event.defaultPrevented || !areHotkeysEnabled()) {
				return;
			}
			event.preventDefault();
			onToggle();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onToggle]);
};

/** Measures the selected row so the active marker can glide to it. */
const useSelectionMarker = (listRef: RefObject<HTMLDivElement | null>, dependencies: unknown[]): { top: number; height: number } | null => {
	const [marker, setMarker] = useState<{ top: number; height: number } | null>(null);
	useLayoutEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			const list = listRef.current;
			const selected = list ? (list.querySelector('[cmdk-item][data-selected="true"]') as HTMLElement | null) : null;
			const sizer = list ? (list.querySelector("[cmdk-list-sizer]") as HTMLElement | null) : null;
			if (!selected || !sizer) {
				setMarker(null);
				return;
			}
			setMarker({ top: selected.getBoundingClientRect().top - sizer.getBoundingClientRect().top, height: selected.offsetHeight });
		});
		return () => window.cancelAnimationFrame(frame);
	}, dependencies);
	return marker;
};

const readPlaceholder = (page: PalettePage): string => {
	if (page.kind === "join") {
		return "Room name";
	}
	return page.kind === "guest" ? `Search ${page.guest.label}'s controls` : "Type a command or search";
};

export const CommandPalette = () => {
	const shell = useShellState();
	const { isPaletteOpen: isOpen, setPaletteOpen, hasNotifications, setHasNotifications, setAboutOpen } = shell;
	const [page, setPage] = useState<PalettePage>(rootPage);
	const [search, setSearch] = useState("");
	const [selectedValue, setSelectedValue] = useState("");
	const pendingRun = useRef<(() => void) | null>(null);
	const didRunCommand = useRef(false);
	const lastGroups = useRef<PaletteGroup[]>([]);
	const listRef = useRef<HTMLDivElement>(null);

	usePaletteHotkey(useCallback(() => setPaletteOpen(!isOpen), [setPaletteOpen, isOpen]));

	// Start every opening at the root page with an empty search.
	useLayoutEffect(() => {
		if (isOpen) {
			setPage(rootPage);
			setSearch("");
			didRunCommand.current = false;
		}
	}, [isOpen]);

	// Snapshot the engine's controls while open; keep the last snapshot through the exit animation.
	const groups = useMemo(() => {
		if (isOpen) {
			lastGroups.current = buildPaletteGroups(page, { hasNotifications, setHasNotifications, setAboutOpen });
		}
		return lastGroups.current;
	}, [isOpen, page, hasNotifications, setHasNotifications, setAboutOpen]);

	const marker = useSelectionMarker(listRef, [selectedValue, search, page, groups, isOpen]);

	const runCommand = (command: PaletteCommand) => {
		if (command.opensPage) {
			setPage(command.opensPage);
			setSearch("");
			return;
		}
		didRunCommand.current = true;
		pendingRun.current = () => {
			try {
				command.run();
			} catch (runError) {
				// engine-controls.ts already logged the failure with its stack.
				notify({ tone: "error", kicker: "Command", message: `"${command.label}" could not run.` });
			}
		};
		setPaletteOpen(false);
	};

	// The command runs after the palette and its focus trap are gone, so the engine owns focus.
	const handleExitComplete = () => {
		const run = pendingRun.current;
		pendingRun.current = null;
		if (run) {
			run();
		}
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape") {
			// Radix closes the palette; the engine must not also close a modal of its own.
			event.stopPropagation();
		}
		if (event.key === "Backspace" && search === "" && page.kind !== "root") {
			event.preventDefault();
			setPage(rootPage);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setPaletteOpen}>
			<DialogContent
				placement="top"
				showClose={false}
				aria-describedby={undefined}
				className="bn-cmd tw-max-w-[640px] tw-overflow-hidden tw-bg-surface-2 tw-p-0"
				onExitComplete={handleExitComplete}
				onOpenAutoFocus={event => {
					// On touch screens, do not raise the keyboard until the visitor taps the field.
					if (isTouchDevice()) {
						event.preventDefault();
					}
				}}
				onCloseAutoFocus={event => {
					if (didRunCommand.current) {
						event.preventDefault();
					}
				}}
			>
				<DialogTitle className="tw-sr-only">Command palette</DialogTitle>
				<Command label="Command palette" value={selectedValue} onValueChange={setSelectedValue} shouldFilter={page.kind !== "join"} filter={filterByRelevance} loop onKeyDown={handleKeyDown}>
					<div className="bn-cmd-search tw-flex tw-items-center tw-gap-2 tw-px-3">
						{page.kind === "root" ? (
							<Search size={16} aria-hidden="true" className="tw-flex-none tw-text-muted" />
						) : (
							<button type="button" className="bn-cmd-back" aria-label="Back to all commands" onClick={() => setPage(rootPage)}>
								<ArrowLeft size={14} aria-hidden="true" />
								{page.kind === "guest" ? page.guest.label : "Join"}
							</button>
						)}
						<Command.Input value={search} onValueChange={setSearch} placeholder={readPlaceholder(page)} className="bn-cmd-input" />
						<Kbd className="max-sm:tw-hidden">Esc</Kbd>
					</div>
					<Command.List ref={listRef} className="bn-cmd-list">
						<m.div aria-hidden="true" className="bn-cmd-marker" initial={false} animate={marker ? { y: marker.top, height: marker.height, opacity: 1 } : { opacity: 0 }} transition={tweenFast} />
						{page.kind === "join" ? <JoinRoomRow roomName={search.trim()} onRun={runCommand} /> : <Command.Empty className="bn-cmd-empty">No matching command.</Command.Empty>}
						{groups.map(group => (
							<Command.Group key={group.heading} heading={group.heading}>
								{group.commands.map(command => (
									<CommandRow key={command.id} command={command} onRun={runCommand} />
								))}
							</Command.Group>
						))}
					</Command.List>
					<PaletteFooter hasBack={page.kind !== "root"} />
				</Command>
			</DialogContent>
		</Dialog>
	);
};
