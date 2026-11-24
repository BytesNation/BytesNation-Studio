#!/usr/bin/env node
/**
 * Exports pristine upstream (the commit in engine-lock.json) to a temp
 * directory and serves it, so every parity test can compare BytesNation
 * Studio against upstream side by side. Uses `git archive`, so it never
 * touches the working tree or the network.
 *
 * Usage: node tests/support/serve-upstream.mjs <port>
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const supportDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(supportDir, "../../..");
const port = process.argv[2] || "8081";
const lock = JSON.parse(readFileSync(join(repoRoot, "bn-shell/engine-lock.json"), "utf8"));
const exportDir = join(tmpdir(), `bn-upstream-${lock.upstreamCommit.slice(0, 12)}`);

if (!existsSync(join(exportDir, "index.html"))) {
	mkdirSync(exportDir, { recursive: true });
	const archive = execFileSync("git", ["archive", "--format=tar", lock.upstreamCommit], { cwd: repoRoot, maxBuffer: 1024 * 1024 * 1024 });
	execFileSync("tar", ["-x", "-C", exportDir], { input: archive });
}

spawn(process.execPath, [join(supportDir, "serve-static.mjs"), port, exportDir], { stdio: "inherit" });
