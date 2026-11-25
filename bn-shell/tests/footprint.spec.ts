import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const shellDir = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The strongest parity guarantee: WebRTC, signaling, handshake, codec and
 * URL-parameter behavior all live in engine files that must be byte-identical
 * to upstream. Browser-independent, so it runs once.
 */
test.describe("upstream footprint", () => {
	test("engine files are identical to upstream; only documented touchpoints changed", ({ browserName }, testInfo) => {
		test.skip(testInfo.project.name !== "chromium", "browser-independent check runs once");
		const output = execFileSync("node", [join(shellDir, "scripts/check-upstream-footprint.mjs")], { encoding: "utf8" });
		expect(output).toContain("Upstream footprint check passed");
		expect(browserName).toBe("chromium");
	});

	test("the Podcast Studio theme is generated from the current upstream stylesheet", ({}, testInfo) => {
		test.skip(testInfo.project.name !== "chromium", "browser-independent check runs once");
		// Fails after an upstream merge changes podcast/studio.css, until gen-podcast-theme.mjs is rerun.
		const output = execFileSync("node", [join(shellDir, "scripts/gen-podcast-theme.mjs"), "--check"], { encoding: "utf8" });
		expect(output).toContain("up to date");
	});
});
