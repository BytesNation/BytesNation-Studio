#!/usr/bin/env node
/**
 * Minimal static file server for the parity suite. Serves the BytesNation tree
 * (repo root) or the pristine upstream export, bound to 127.0.0.1 only.
 *
 * Usage: node tests/support/serve-static.mjs <port> <directory>
 */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const port = Number(process.argv[2]);
const rootDir = resolve(process.argv[3] || ".");

const mimeTypes = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".gif": "image/gif",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".wasm": "application/wasm",
	".mp3": "audio/mpeg",
	".wav": "audio/wav",
	".webm": "video/webm",
	".mp4": "video/mp4",
	".md": "text/markdown; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".webmanifest": "application/manifest+json"
};

/**
 * Resolves a request path inside rootDir, refusing traversal outside it.
 * @param {string} requestUrl
 * @returns {string | null}
 */
const resolveFilePath = requestUrl => {
	const pathname = decodeURIComponent(new URL(requestUrl, "http://127.0.0.1").pathname);
	const candidate = normalize(join(rootDir, pathname));
	if (!candidate.startsWith(rootDir)) {
		return null;
	}
	if (existsSync(candidate) && statSync(candidate).isDirectory()) {
		return join(candidate, "index.html");
	}
	return candidate;
};

const server = createServer((request, response) => {
	const filePath = resolveFilePath(request.url || "/");
	if (!filePath || !existsSync(filePath)) {
		response.writeHead(404, { "Content-Type": "text/plain" });
		response.end("not found");
		return;
	}
	response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
	createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
	process.stdout.write(`serving ${rootDir} on http://127.0.0.1:${port}/\n`);
});
