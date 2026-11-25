#!/usr/bin/env node
/**
 * Builds the directory Cloudflare serves (deploy/cloudflare/.site).
 *
 * The site is exported from a git ref with `git archive`, so only committed,
 * tracked files can ever be published: no node_modules, no worktrees, no local
 * scratch files. Development-only directories are left out.
 *
 * It then adapts the export to Cloudflare's static-asset limits:
 *   - a file over 25 MiB is split into parts, and src/split-manifest.json tells
 *     the Worker script how to stream it back as one file;
 *   - the build fails if an oversized or media file is not covered by a
 *     run_worker_first pattern in wrangler.jsonc, or if the file count exceeds
 *     the free plan's limit.
 *
 * Usage: node deploy/cloudflare/build-site.mjs [--ref <git ref>]   (default ref: HEAD)
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const deployDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(deployDir, "../..");
const siteDir = join(deployDir, ".site");

/** Tracked paths that are development-only and never published. */
const excludedPaths = ["bn-shell", "docs", "deploy", ".github", ".gitignore", ".gitattributes", ".prettierrc"];

const maxAssetBytes = 25 * 1024 * 1024;
const partBytes = 20 * 1024 * 1024;
const maxAssetCount = 20000;
const mediaExtensions = [".mp4", ".webm", ".mov", ".m4a", ".mp3", ".wav", ".ogg"];

const readFlag = (name, fallback) => {
	const index = process.argv.indexOf(`--${name}`);
	return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const runGit = args => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();

const listFiles = directory =>
	readdirSync(directory).flatMap(name => {
		const fullPath = join(directory, name);
		return statSync(fullPath).isDirectory() ? listFiles(fullPath) : [fullPath];
	});

/** Exports the ref's tracked files, minus development-only paths, into .site. */
const exportSite = ref => {
	rmSync(siteDir, { recursive: true, force: true });
	mkdirSync(siteDir, { recursive: true });
	const pathspecs = ["."].concat(excludedPaths.map(path => `:(exclude)${path}`));
	const archive = execFileSync("git", ["archive", "--format=tar", ref, "--"].concat(pathspecs), { cwd: repoRoot, maxBuffer: 1024 * 1024 * 1024 });
	execFileSync("tar", ["-x", "-C", siteDir], { input: archive });
};

/**
 * Splits one oversized file into parts under /_bn/parts/ and removes the original.
 * @param {string} filePath absolute path inside .site
 * @returns {{sitePath: string, entry: {parts: string[], size: number, etag: string, contentType: string}}}
 */
const splitFile = filePath => {
	const fileBytes = readFileSync(filePath);
	const digest = createHash("sha256").update(fileBytes).digest("hex");
	const parts = [];
	mkdirSync(join(siteDir, "_bn/parts"), { recursive: true });
	for (let offset = 0; offset < fileBytes.length; offset += partBytes) {
		const partPath = `/_bn/parts/${digest.slice(0, 16)}.part${parts.length}`;
		writeFileSync(join(siteDir, partPath), fileBytes.subarray(offset, offset + partBytes));
		parts.push(partPath);
	}
	unlinkSync(filePath);
	return {
		sitePath: `/${relative(siteDir, filePath).split("\\").join("/")}`,
		entry: { parts, size: fileBytes.length, etag: `"${digest.slice(0, 32)}"`, contentType: "application/octet-stream" }
	};
};

/** run_worker_first patterns from wrangler.jsonc, as regular expressions (a * matches any run of characters). */
const readWorkerFirstPatterns = () => {
	const configText = readFileSync(join(deployDir, "wrangler.jsonc"), "utf8").replace(/^\s*\/\/.*$/gm, "");
	const config = JSON.parse(configText);
	return config.assets.run_worker_first.map(pattern => new RegExp(`^${pattern.split("*").map(piece => piece.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`));
};

const writeDeployStamp = ref => {
	const lock = JSON.parse(readFileSync(join(repoRoot, "bn-shell/engine-lock.json"), "utf8"));
	const stamp = {
		commit: runGit(["rev-parse", ref]),
		ref,
		builtAt: new Date().toISOString(),
		source: "https://github.com/BytesNation/BytesNation-Studio",
		upstream: `${lock.upstreamRepo}@${lock.upstreamCommit}`,
		engineVersion: lock.engineVersion
	};
	writeFileSync(join(siteDir, "bn/deploy.json"), `${JSON.stringify(stamp, null, "\t")}\n`);
	return stamp;
};

const main = () => {
	const ref = readFlag("ref", "HEAD");
	exportSite(ref);
	const patterns = readWorkerFirstPatterns();
	const isRouted = sitePath => patterns.some(pattern => pattern.test(sitePath));
	const problems = [];
	const manifest = {};

	listFiles(siteDir).forEach(filePath => {
		const sitePath = `/${relative(siteDir, filePath).split("\\").join("/")}`;
		const isMedia = mediaExtensions.indexOf(extname(filePath).toLowerCase()) > -1;
		const isOversized = statSync(filePath).size > maxAssetBytes;
		if ((isMedia || isOversized) && !isRouted(sitePath)) {
			problems.push(`${sitePath} is ${isOversized ? "over 25 MiB" : "a media file"} but no run_worker_first pattern in wrangler.jsonc covers it`);
		}
		if (isOversized) {
			const split = splitFile(filePath);
			manifest[split.sitePath] = split.entry;
		}
	});

	copyFileSync(join(deployDir, "_headers"), join(siteDir, "_headers"));
	writeFileSync(join(deployDir, "src/split-manifest.json"), `${JSON.stringify(manifest, null, "\t")}\n`);
	const stamp = writeDeployStamp(ref);

	const files = listFiles(siteDir);
	const totalBytes = files.reduce((total, filePath) => total + statSync(filePath).size, 0);
	const largestBytes = files.reduce((largest, filePath) => Math.max(largest, statSync(filePath).size), 0);
	if (files.length > maxAssetCount) {
		problems.push(`${files.length} files exceed the free plan's ${maxAssetCount} static assets`);
	}
	if (largestBytes > maxAssetBytes) {
		problems.push("a file is still over 25 MiB after splitting");
	}
	if (problems.length > 0) {
		process.stderr.write(`Site build FAILED:\n${problems.join("\n")}\n`);
		process.exit(1);
	}
	process.stdout.write(
		`Site built from ${ref} (${stamp.commit.slice(0, 7)}): ${files.length} files, ${(totalBytes / 1048576).toFixed(1)} MB, largest ${(largestBytes / 1048576).toFixed(1)} MB, ${Object.keys(manifest).length} file(s) split.\n`
	);
};

main();
