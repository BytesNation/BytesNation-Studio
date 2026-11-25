#!/usr/bin/env node
/**
 * Deploys BytesNation Studio to Cloudflare, in the one safe order:
 * build the site from a git ref, deploy it, then verify the live address.
 *
 *   --target preview      the workers.dev Worker only; never touches DNS (default)
 *   --target production   studio.bytesnation.com (creates Cloudflare's managed DNS record on first run)
 *   --ref <git ref>       what to publish (default: HEAD). Use a pushed commit:
 *                         the footer links to this repository as the source.
 *
 * Requires CLOUDFLARE_ACCOUNT_ID. It is not stored in this public repository;
 * pinning it here stops a deploy from landing in whichever account the
 * stored credentials happen to resolve to.
 *
 * Usage: CLOUDFLARE_ACCOUNT_ID=... node deploy/cloudflare/deploy.mjs --target preview --ref redesign/ui-v1
 */
import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const deployDir = dirname(fileURLToPath(import.meta.url));
const productionUrl = "https://studio.bytesnation.com";
const verifyAttempts = 12;
const verifyWaitMs = 15000;

const readFlag = (name, fallback) => {
	const index = process.argv.indexOf(`--${name}`);
	return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const fail = message => {
	process.stderr.write(`${message}\n`);
	process.exit(1);
};

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

/** Runs wrangler deploy and returns its output; exits on failure. */
const runWranglerDeploy = target => {
	// --env="" names the top-level (preview) environment explicitly, as wrangler asks when several exist.
	const wranglerArgs = ["deploy", target === "production" ? "--env=production" : "--env="];
	const deployment = spawnSync("wrangler", wranglerArgs, { cwd: deployDir, encoding: "utf8", env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" } });
	const output = `${deployment.stdout || ""}${deployment.stderr || ""}`;
	process.stdout.write(output);
	if (deployment.status !== 0) {
		fail(`wrangler deploy failed with exit code ${deployment.status}`);
	}
	return output;
};

/** A new hostname needs a moment for its certificate; retry verification until it answers. */
const verifyLive = async liveUrl => {
	for (let attempt = 1; attempt <= verifyAttempts; attempt += 1) {
		const verification = spawnSync("node", [join(deployDir, "verify-site.mjs"), "--base", liveUrl], { encoding: "utf8" });
		if (verification.status === 0 || attempt === verifyAttempts) {
			process.stdout.write(`${verification.stdout || ""}${verification.stderr || ""}`);
			return verification.status === 0;
		}
		process.stdout.write(`Waiting for ${liveUrl} (attempt ${attempt} of ${verifyAttempts})...\n`);
		await sleep(verifyWaitMs);
	}
	return false;
};

const main = async () => {
	const target = readFlag("target", "preview");
	const ref = readFlag("ref", "HEAD");
	if (target !== "preview" && target !== "production") {
		fail(`Unknown --target "${target}". Use preview or production.`);
	}
	if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
		fail("Set CLOUDFLARE_ACCOUNT_ID to the account that holds bytesnation.com. Refusing to let wrangler pick an account on its own.");
	}
	execFileSync("node", [join(deployDir, "build-site.mjs"), "--ref", ref], { stdio: "inherit" });
	const output = runWranglerDeploy(target);
	const workersDevMatch = output.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/);
	const liveUrl = target === "production" ? productionUrl : workersDevMatch ? workersDevMatch[0] : "";
	if (!liveUrl) {
		fail("Deployed, but could not read the workers.dev address from wrangler's output; verify it by hand with verify-site.mjs.");
	}
	const isVerified = await verifyLive(liveUrl);
	process.stdout.write(isVerified ? `\nLive and verified: ${liveUrl}\n` : `\nDeployed, but verification FAILED for ${liveUrl}.\n`);
	process.exit(isVerified ? 0 : 1);
};

await main();
