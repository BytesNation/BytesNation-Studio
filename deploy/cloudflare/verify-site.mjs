#!/usr/bin/env node
/**
 * Verifies a running BytesNation Studio deployment: local (`wrangler dev`),
 * the workers.dev preview, or production. Checks the hosting behaviors the
 * engine depends on, and that the engine files served are byte-identical to
 * the commit the deployment says it was built from.
 *
 * Usage: node deploy/cloudflare/verify-site.mjs --base https://studio.bytesnation.com
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const flagIndex = process.argv.indexOf("--base");
const base = (flagIndex > -1 ? process.argv[flagIndex + 1] : "http://127.0.0.1:8787").replace(/\/$/, "");
const modelPath = "/thirdparty/longpipe/models/v/0.0.4/model_xl.bin";
const engineFiles = ["/webrtc.js", "/lib.js", "/main.js", "/main.css", "/bn/shell.js", "/bn/theme.css", "/bn/boot.js"];

const results = [];
const check = (name, isPassing, detail) => {
	results.push({ name, isPassing, detail: detail || "" });
};

/**
 * Name lookup that falls back to a direct DNS query. Right after a hostname is
 * first created, the operating system can still hold a cached "no such host"
 * answer for up to half an hour; the direct query sees the new record at once.
 */
const lookupWithFallback = (hostname, options, callback) => {
	dns.lookup(hostname, options, (lookupError, address, family) => {
		if (!lookupError) {
			callback(null, address, family);
			return;
		}
		dns.resolve4(hostname, (resolveError, addresses) => {
			if (resolveError || addresses.length === 0) {
				callback(lookupError);
				return;
			}
			callback(null, options && options.all ? addresses.map(entry => ({ address: entry, family: 4 })) : addresses[0], 4);
		});
	});
};

/**
 * Sends one request without following redirects and buffers the response.
 * @param {string} url absolute URL
 * @param {{method?: string, headers?: Record<string, string>}} options
 * @returns {Promise<{status: number, headers: {get: (name: string) => string | null}, arrayBuffer: () => Promise<Buffer>, text: () => Promise<string>, json: () => Promise<any>}>}
 */
const sendRequest = (url, options = {}) =>
	new Promise((resolve, reject) => {
		const client = url.indexOf("https://") === 0 ? https : http;
		const outgoing = client.request(url, { method: options.method || "GET", headers: options.headers || {}, lookup: lookupWithFallback }, incoming => {
			const chunks = [];
			incoming.on("data", chunk => chunks.push(chunk));
			incoming.on("end", () => {
				const body = Buffer.concat(chunks);
				resolve({
					status: incoming.statusCode || 0,
					headers: { get: name => (incoming.headers[name.toLowerCase()] === undefined ? null : String(incoming.headers[name.toLowerCase()])) },
					arrayBuffer: async () => body,
					text: async () => body.toString("utf8"),
					json: async () => JSON.parse(body.toString("utf8"))
				});
			});
		});
		outgoing.on("error", reject);
		outgoing.end();
	});

const request = (path, options = {}) => sendRequest(`${base}${path}`, options);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const readFromGit = (commit, path) => execFileSync("git", ["show", `${commit}:${path.slice(1)}`], { cwd: repoRoot, maxBuffer: 256 * 1024 * 1024 });
const isHtml = response => (response.headers.get("content-type") || "").indexOf("text/html") === 0;

const checkPages = async () => {
	const home = await request("/");
	const homeText = await home.text();
	check("/ serves the app", home.status === 200 && isHtml(home) && homeText.indexOf("<title>BytesNation Studio</title>") > -1, `status ${home.status}`);
	check("every asset allows cross-origin use", home.headers.get("access-control-allow-origin") === "*", String(home.headers.get("access-control-allow-origin")));

	const withParams = await request("/?director=verifyroom&scene=1&password=x");
	check("query parameters reach the app untouched", withParams.status === 200 && isHtml(withParams), `status ${withParams.status}`);

	const mixer = await request("/mixer");
	check("/mixer serves mixer.html without the extension", mixer.status === 200 && isHtml(mixer), `status ${mixer.status}`);

	const mixerHtml = await request("/mixer.html?room=abc&x=1");
	const mixerTarget = mixerHtml.headers.get("location") || "";
	check("/mixer.html redirects to /mixer and keeps the query", mixerHtml.status >= 301 && mixerHtml.status <= 308 && /\/mixer\?room=abc&x=1$/.test(mixerTarget), `${mixerHtml.status} -> ${mixerTarget}`);

	const podcast = await request("/podcast");
	check("/podcast redirects to /podcast/", podcast.status >= 301 && podcast.status <= 308 && /\/podcast\/$/.test(podcast.headers.get("location") || ""), `${podcast.status} -> ${podcast.headers.get("location")}`);

	const unknown = await request("/an-unknown-room-name");
	const unknownText = await unknown.text();
	check("an unknown path falls back to the app (engine reads it as a room)", unknown.status === 200 && unknownText.indexOf("<title>BytesNation Studio</title>") > -1, `status ${unknown.status}`);
};

const checkPrivatePaths = async () => {
	for (const path of ["/bn-shell/package.json", "/docs/DESIGN.md", "/deploy/cloudflare/wrangler.jsonc", "/.github/workflows/ci.yml", "/_headers"]) {
		const response = await request(path);
		const text = await response.text();
		const isRealFile = response.status === 200 && !isHtml(response) && text.indexOf("<title>BytesNation Studio</title>") === -1;
		check(`${path} is not published`, !isRealFile, `status ${response.status}, ${response.headers.get("content-type")}`);
	}
};

const checkEngineIntegrity = async () => {
	const stampResponse = await request("/bn/deploy.json");
	const stamp = stampResponse.status === 200 ? await stampResponse.json() : null;
	check("deploy stamp is served", Boolean(stamp && stamp.commit), stamp ? `${stamp.commit.slice(0, 7)} from ${stamp.ref}` : `status ${stampResponse.status}`);
	if (!stamp) {
		return null;
	}
	for (const path of engineFiles) {
		const served = Buffer.from(await (await request(path)).arrayBuffer());
		check(`${path} is byte-identical to commit ${stamp.commit.slice(0, 7)}`, sha256(served) === sha256(readFromGit(stamp.commit, path)), `${served.length} bytes`);
	}
	const wasm = await request("/thirdparty/mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm", { method: "HEAD" });
	check("WASM is served as application/wasm", wasm.status === 200 && (wasm.headers.get("content-type") || "").indexOf("application/wasm") === 0, String(wasm.headers.get("content-type")));
	return stamp;
};

const checkSplitModel = async stamp => {
	const original = readFromGit(stamp.commit, modelPath);
	const response = await request(modelPath);
	const served = Buffer.from(await response.arrayBuffer());
	check("46.6 MB model streams back whole", response.status === 200 && served.length === original.length && sha256(served) === sha256(original), `${served.length} of ${original.length} bytes`);
	check("model declares its length and allows cross-origin use", response.headers.get("content-length") === String(original.length) && response.headers.get("access-control-allow-origin") === "*", `length ${response.headers.get("content-length")}`);
	const etag = response.headers.get("etag") || "";
	const revalidated = await request(modelPath, { headers: { "If-None-Match": etag } });
	check("model revalidates with 304 instead of a new download", etag !== "" && revalidated.status === 304, `status ${revalidated.status}`);
};

const checkMediaRanges = async stamp => {
	const original = readFromGit(stamp.commit, "/media/micro.mp4");
	const full = await request("/media/micro.mp4");
	const fullBytes = Buffer.from(await full.arrayBuffer());
	check("media serves in full without a Range header", full.status === 200 && sha256(fullBytes) === sha256(original) && full.headers.get("accept-ranges") === "bytes", `status ${full.status}, accept-ranges ${full.headers.get("accept-ranges")}`);

	const probe = await request("/media/micro.mp4", { headers: { Range: "bytes=0-1" } });
	const probeBytes = Buffer.from(await probe.arrayBuffer());
	check("Safari's probe (bytes=0-1) gets a 206 with two bytes", probe.status === 206 && probe.headers.get("content-range") === `bytes 0-1/${original.length}` && probeBytes.equals(original.subarray(0, 2)), `${probe.status} ${probe.headers.get("content-range")}`);

	const middle = await request("/media/micro.mp4", { headers: { Range: "bytes=100-299" } });
	const middleBytes = Buffer.from(await middle.arrayBuffer());
	check("a mid-file range returns exactly those bytes", middle.status === 206 && middleBytes.equals(original.subarray(100, 300)), `${middle.status}, ${middleBytes.length} bytes`);

	const suffix = await request("/media/micro.mp4", { headers: { Range: "bytes=-64" } });
	const suffixBytes = Buffer.from(await suffix.arrayBuffer());
	check("a suffix range returns the last bytes", suffix.status === 206 && suffixBytes.equals(original.subarray(original.length - 64)), `${suffix.status}`);

	const beyond = await request("/media/micro.mp4", { headers: { Range: `bytes=${original.length + 10}-` } });
	check("a range past the end gets 416", beyond.status === 416, `status ${beyond.status}`);

	const sound = await request("/media/join.mp3", { headers: { Range: "bytes=0-99" } });
	check("audio honors ranges too", sound.status === 206, `status ${sound.status}`);
};

const checkEdge = async () => {
	const home = await request("/");
	const isWorkersDev = /\.workers\.dev$/.test(new URL(base).hostname);
	if (isWorkersDev) {
		check("workers.dev hostname is kept out of search results", (home.headers.get("x-robots-tag") || "").indexOf("noindex") > -1, String(home.headers.get("x-robots-tag")));
	}
	// workers.dev answers plain http itself; on the custom domain the zone's "Always Use HTTPS" setting applies.
	if (base.indexOf("https://") === 0 && !isWorkersDev) {
		const plain = await sendRequest(`${base.replace("https://", "http://")}/`).catch(() => null);
		check("plain http redirects to https (cameras need a secure page)", Boolean(plain) && plain.status >= 301 && plain.status <= 308 && (plain.headers.get("location") || "").indexOf("https://") === 0, plain ? `status ${plain.status}` : "no response");
	}
};

const main = async () => {
	await checkPages();
	await checkPrivatePaths();
	const stamp = await checkEngineIntegrity();
	if (stamp) {
		await checkSplitModel(stamp);
		await checkMediaRanges(stamp);
	}
	await checkEdge();
	results.forEach(result => process.stdout.write(`${result.isPassing ? "pass" : "FAIL"}  ${result.name}${result.detail ? `  (${result.detail})` : ""}\n`));
	const failures = results.filter(result => !result.isPassing);
	process.stdout.write(`\n${base}: ${results.length - failures.length} of ${results.length} checks passed.\n`);
	process.exit(failures.length > 0 ? 1 : 0);
};

await main();
