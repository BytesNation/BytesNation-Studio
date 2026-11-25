#!/usr/bin/env node
/**
 * Enforces the architecture's core promise: the engine is unmodified.
 *
 * Compares the working tree with the upstream commit in engine-lock.json and
 * fails if any upstream file changed other than the documented touchpoints
 * (docs/ARCHITECTURE.md "Upstream touchpoints"), or if index.html changed
 * anything beyond its BytesNation branding and loader lines.
 *
 * Usage: node bn-shell/scripts/check-upstream-footprint.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const lock = JSON.parse(readFileSync(join(repoRoot, "bn-shell/engine-lock.json"), "utf8"));
const ownedPrefixes = ["bn/", "bn-shell/", "docs/"];
const touchpoints = ["index.html", ".gitignore"];

const runGit = args => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

/** Upstream index.html lines BytesNation is allowed to replace. */
const replaceableIndexLines = [
	"<title>VDO.Ninja</title>",
	"<meta id=\"metaTitle\" name=\"title\" content=\"VDO.Ninja\" />",
	"<meta name=\"theme-color\" content=\"#0f131d\" />",
	"<link id=\"favicon1\" rel=\"icon\" type=\"image/png\" sizes=\"32x32\" href=\"./media/favicon-32x32.png\" />",
	"<link id=\"favicon2\" rel=\"icon\" type=\"image/png\" sizes=\"16x16\" href=\"./media/favicon-16x16.png\" />",
	"<link id=\"favicon3\" rel=\"icon\" href=\"./media/favicon.ico\" />",
	"<meta property=\"og:site_name\" content=\"VDO.Ninja\">",
	// Link preview: the title, description, address and image a chat app shows beside a link.
	"<meta name=\"description\" content=\"Bring live video from your smartphone, computer, or friends directly into your Studio. 100% free.\" />",
	"<meta name=\"twitter:title\" content=\"VDO.Ninja\">",
	"<meta name=\"twitter:description\" content=\"Bring live video from your smartphone, computer, or friends directly into OBS Studio or other. 100% free.\">",
	"<meta name=\"twitter:image\" content=\"https://vdo.ninja/media/vdoNinja_logo_full.png\">",
	"<meta property=\"og:url\" content=\"https://vdo.ninja/\">",
	"<meta property=\"og:title\" content=\"VDO.Ninja\">",
	"<meta property=\"og:description\" content=\"Bring live video from your smartphone, computer, or friends directly into OBS Studio or other. 100% free.\">",
	"<meta property=\"og:image\" content=\"https://vdo.ninja/media/vdoNinja_logo_full.png\">",
	"<link id=\"thumbnailUrl\" itemprop=\"thumbnailUrl\" href=\"./media/vdoNinja_logo_full.png\" />",
	"<link itemprop=\"thumbnailUrl\" href=\"./media/vdoNinja_logo_full.png\" />",
	"<link itemprop=\"url\" href=\"./media/vdoNinja_logo_full.png\" />",
	// Identity: the installed app's manifest is ours, and the page no longer claims to be upstream's author.
	"<link rel=\"manifest\" href=\"manifest.json\">",
	"<link rel=\"me\" href=\"https://vdo.ninja/about\" />"
];

const isBytesNationLine = line => /BytesNation|\.\/bn\/|#0a0b0d|https:\/\/studio\.bytesnation\.com\//.test(line);

const changedFiles = () => {
	const tracked = runGit(["diff", "--name-only", lock.upstreamCommit]).split("\n").filter(Boolean);
	const untracked = runGit(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
	return [...new Set([...tracked, ...untracked])];
};

const checkIndexHtml = () => {
	const problems = [];
	const diffText = runGit(["diff", "--unified=0", lock.upstreamCommit, "--", "index.html"]);
	diffText.split("\n").forEach(line => {
		if (line.startsWith("---") || line.startsWith("+++")) {
			return;
		}
		const content = line.slice(1).trim();
		if (line.startsWith("-") && content && replaceableIndexLines.indexOf(content) === -1) {
			problems.push(`index.html: upstream line removed or changed: ${content}`);
		}
		if (line.startsWith("+") && content && !isBytesNationLine(content)) {
			problems.push(`index.html: added line is not a BytesNation touchpoint: ${content}`);
		}
	});
	return problems;
};

const main = () => {
	const problems = [];
	changedFiles().forEach(filePath => {
		const isOwned = ownedPrefixes.some(prefix => filePath.startsWith(prefix));
		if (!isOwned && touchpoints.indexOf(filePath) === -1) {
			problems.push(`upstream file modified: ${filePath}`);
		}
	});
	problems.push(...checkIndexHtml());
	if (problems.length > 0) {
		process.stderr.write(`Upstream footprint check FAILED against ${lock.upstreamCommit.slice(0, 7)}:\n${problems.join("\n")}\n`);
		process.exit(1);
	}
	process.stdout.write(`Upstream footprint check passed: engine identical to ${lock.upstreamRepo}@${lock.upstreamCommit.slice(0, 7)}; only documented touchpoints changed.\n`);
};

main();
