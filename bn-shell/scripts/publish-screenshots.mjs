#!/usr/bin/env node
/**
 * Turns a capture-views.mjs output folder into docs/screenshots/*.jpg and an
 * index, docs/SCREENSHOTS.md, laid out dark beside light for every view.
 * Uses macOS `sips` for JPEG conversion (quality 78) to keep the repo small.
 *
 * Usage: node bn-shell/scripts/publish-screenshots.mjs <captureDir>
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const captureDir = process.argv[2];
const outDir = join(repoRoot, "docs/screenshots");

/** Display order and titles for each captured view. */
const viewTitles = [
	["launcher", "Launcher"],
	["launcher-more", "Launcher, all tools"],
	["launcher-mobile", "Launcher, phone"],
	["create-room", "Create a room"],
	["create-room-mobile", "Create a room, phone"],
	["camera-preview", "Camera setup and preview"],
	["publish-mobile", "Publish, phone"],
	["screenshare-setup", "Screen share setup"],
	["invite-builder", "Reusable invite builder"],
	["guest-join", "Guest join"],
	["director", "Director control room, two live guests"],
	["director-room-settings", "Director room settings"],
	["director-mobile", "Director, phone (co-director password prompt)"],
	["guest-call", "Guest in a call"],
	["guest-call-mobile", "Guest in a call, phone"],
	["guest-settings", "Settings and device pickers"],
	["guest-settings-mobile", "Settings, phone"],
	["guest-chat", "Chat"],
	["guest-chat-mobile", "Chat, phone"],
	["video-context-menu", "Video context menu"],
	["scene", "Scene output (OBS browser source)"],
	["view", "Single-stream viewer"]
];

const convert = (name, theme) => {
	const source = join(captureDir, `${name}-${theme}.png`);
	const target = join(outDir, `${name}-${theme}.jpg`);
	execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "78", source, "--out", target], { stdio: "ignore" });
	return `screenshots/${name}-${theme}.jpg`;
};

const main = () => {
	mkdirSync(outDir, { recursive: true });
	const available = new Set(readdirSync(captureDir).filter(file => file.endsWith(".png")));
	const lines = [
		"# Screenshots",
		"",
		"Every view of BytesNation Studio in the dark and light themes, desktop (1440 by 900) and phone (390 by 844). Captured with live peers by `bn-shell/scripts/capture-views.mjs`; regenerate this page with `bn-shell/scripts/publish-screenshots.mjs`. Video tiles show the browser's synthetic test camera.",
		""
	];
	viewTitles.forEach(([name, title]) => {
		const themes = ["dark", "light"].filter(theme => available.has(`${name}-${theme}.png`));
		if (themes.length === 0) {
			return;
		}
		lines.push(`## ${title}`, "", `| ${themes.map(theme => (theme === "dark" ? "Dark" : "Light")).join(" | ")} |`, `|${themes.map(() => "---").join("|")}|`);
		lines.push(`| ${themes.map(theme => `![${title}, ${theme}](${convert(name, theme)})`).join(" | ")} |`, "");
	});
	writeFileSync(join(repoRoot, "docs/SCREENSHOTS.md"), `${lines.join("\n")}\n`);
	process.stdout.write(`SCREENSHOTS.md written from ${captureDir}\n`);
};

main();
