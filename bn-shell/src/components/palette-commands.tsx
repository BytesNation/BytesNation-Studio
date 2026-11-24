import type { ReactNode } from "react";
import { AppWindow, Bell, BellOff, Copy, Info, LogIn, Moon, Save, Sun, User } from "lucide-react";
import { applyColorMode, productName, readColorMode } from "@/lib/engine";
import { canJoinRoomByName, listControlBarCommands, listDirectorCommands, listGuestCommands, listGuests, listLauncherCommands, type EngineCommand, type EngineGuest } from "@/lib/engine-controls";

/**
 * Builds what the command palette lists: the engine's live controls, grouped,
 * plus the shell's own few commands. Rebuilt every time the palette opens, so
 * it always matches what the engine is showing.
 */
export type PalettePage = { kind: "root" } | { kind: "guest"; guest: EngineGuest } | { kind: "join" };

export interface PaletteCommand extends EngineCommand {
	glyph?: ReactNode;
	opensPage?: PalettePage;
	/** What cmdk scores against: the visible label first, so ranking follows what the visitor reads. */
	searchValue?: string;
}

export interface PaletteGroup {
	heading: string;
	commands: PaletteCommand[];
}

/** The slice of shell state the shell's own commands need. */
export interface StudioCommandContext {
	hasNotifications: boolean;
	setHasNotifications: (isOn: boolean) => void;
	setAboutOpen: (isOpen: boolean) => void;
}

export const rootPage: PalettePage = { kind: "root" };
export const glyphSize = 16;

const directorGlyphs: Record<string, ReactNode> = {
	"director:#saveRoom": <Save size={glyphSize} aria-hidden="true" />,
	"director:#togglePreviewMode": <AppWindow size={glyphSize} aria-hidden="true" />
};

const buildStudioCommands = (context: StudioCommandContext): PaletteCommand[] => {
	const nextMode = readColorMode() === "dark" ? "light" : "dark";
	return [
		{
			id: "studio:theme",
			label: `Switch to ${nextMode} theme`,
			keywords: ["appearance", "dark", "light", "mode"],
			glyph: nextMode === "light" ? <Sun size={glyphSize} aria-hidden="true" /> : <Moon size={glyphSize} aria-hidden="true" />,
			run: () => applyColorMode(nextMode)
		},
		{
			id: "studio:notifications",
			label: context.hasNotifications ? "Turn notifications off" : "Turn notifications on",
			keywords: ["toasts", "alerts", "quiet", "silence"],
			glyph: context.hasNotifications ? <BellOff size={glyphSize} aria-hidden="true" /> : <Bell size={glyphSize} aria-hidden="true" />,
			state: { label: context.hasNotifications ? "On" : "Off", tone: context.hasNotifications ? "ok" : "neutral" },
			run: () => context.setHasNotifications(!context.hasNotifications)
		},
		{
			id: "studio:about",
			label: `About ${productName}`,
			keywords: ["license", "agpl", "credit", "source", "version", "vdo.ninja"],
			glyph: <Info size={glyphSize} aria-hidden="true" />,
			run: () => context.setAboutOpen(true)
		}
	];
};

const buildGuestEntries = (): PaletteCommand[] => {
	return listGuests().map(guest => ({
		id: `guests:${guest.uuid}`,
		label: guest.label,
		keywords: ["guest"],
		glyph: <User size={glyphSize} aria-hidden="true" />,
		opensPage: { kind: "guest", guest },
		run: () => undefined
	}));
};

const buildStartCommands = (): PaletteCommand[] => {
	const start: PaletteCommand[] = listLauncherCommands();
	if (canJoinRoomByName()) {
		start.push({ id: "start:join", label: "Join a room by name", keywords: ["enter", "guest"], glyph: <LogIn size={glyphSize} aria-hidden="true" />, opensPage: { kind: "join" }, run: () => undefined });
	}
	return start;
};

/** Gives every command a unique, label-first search value. */
const assignSearchValues = (groups: PaletteGroup[]): PaletteGroup[] => {
	const usedValues = new Set<string>();
	groups.forEach(group => {
		group.commands.forEach(command => {
			const baseValue = `${command.label} · ${group.heading}`;
			let searchValue = baseValue;
			let duplicateNumber = 2;
			while (usedValues.has(searchValue)) {
				searchValue = `${baseValue} ${duplicateNumber}`;
				duplicateNumber += 1;
			}
			usedValues.add(searchValue);
			command.searchValue = searchValue;
		});
	});
	return groups;
};

/**
 * Groups for a palette page, with empty groups dropped.
 * @param {PalettePage} page
 * @param {StudioCommandContext} context
 * @returns {PaletteGroup[]}
 */
export const buildPaletteGroups = (page: PalettePage, context: StudioCommandContext): PaletteGroup[] => {
	if (page.kind === "join") {
		return [];
	}
	if (page.kind === "guest") {
		return assignSearchValues([{ heading: page.guest.label, commands: listGuestCommands(page.guest.uuid) }]);
	}
	const room: PaletteCommand[] = listDirectorCommands().map(command => ({ ...command, glyph: directorGlyphs[command.id] || <Copy size={glyphSize} aria-hidden="true" /> }));
	const groups: PaletteGroup[] = [
		{ heading: "Session", commands: listControlBarCommands() },
		{ heading: "Room", commands: room },
		{ heading: "Guests", commands: buildGuestEntries() },
		{ heading: "Start", commands: buildStartCommands() },
		{ heading: "Studio", commands: buildStudioCommands(context) }
	];
	return assignSearchValues(groups.filter(group => group.commands.length > 0));
};
