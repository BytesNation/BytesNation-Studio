/*
 * BytesNation Studio on Cloudflare Workers.
 *
 * Almost every request is a static asset, served by Cloudflare without running
 * this script (free and unlimited). The script runs only for the paths listed
 * under assets.run_worker_first in wrangler.jsonc, and does two jobs that
 * plain asset serving cannot:
 *
 * 1. Byte ranges for media. Static assets answer a Range request with the
 *    whole file and a 200. Safari then refuses to play video, which breaks the
 *    engine's keep-alive player (media/micro.mp4) on Safari and iOS.
 * 2. Files over the 25 MiB asset limit. build-site.mjs splits them into parts
 *    and writes split-manifest.json; this script streams the parts back as
 *    the one file the engine asks for.
 *
 * It adds no behavior of its own: no rewriting, no redirects, no state.
 *
 * Copyright (C) 2026 BytesNation. AGPL-3.0-only; see LICENSE.
 */
import splitManifest from "./split-manifest.json";

interface AssetFetcher {
	fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>;
}

interface Env {
	ASSETS: AssetFetcher;
}

interface WorkerContext {
	waitUntil(promise: Promise<unknown>): void;
}

interface SplitFile {
	parts: string[];
	size: number;
	etag: string;
	contentType: string;
}

/** Workers runtime API: a stream that carries a known Content-Length. */
declare class FixedLengthStream {
	constructor(length: number);
	readonly readable: ReadableStream<Uint8Array>;
	readonly writable: WritableStream<Uint8Array>;
}

const splitFiles = splitManifest as Record<string, SplitFile>;

/** Upstream's hosting sends this on every response; _headers covers assets, this covers the script. */
const corsHeaderName = "Access-Control-Allow-Origin";

/** Above this size a ranged response is not worth buffering; the full file is returned instead. */
const maxRangeBufferBytes = 32 * 1024 * 1024;

const logError = (context: string, error: unknown): void => {
	const errorType = error instanceof Error ? error.name : typeof error;
	const stackTrace = error instanceof Error ? error.stack : String(error);
	console.error(JSON.stringify({ timestamp: new Date().toISOString(), errorType, context, stackTrace }));
};

/** Streams every part into one writable, in order, then closes it. */
const pumpParts = async (options: { env: Env; origin: string; file: SplitFile; writable: WritableStream<Uint8Array> }): Promise<void> => {
	try {
		for (const partPath of options.file.parts) {
			const partResponse = await options.env.ASSETS.fetch(new URL(partPath, options.origin));
			if (!partResponse.ok || !partResponse.body) {
				throw new Error(`part ${partPath} returned ${partResponse.status}`);
			}
			await partResponse.body.pipeTo(options.writable, { preventClose: true });
		}
		await options.writable.close();
	} catch (pumpError) {
		logError("streaming split file", pumpError);
		await options.writable.abort(pumpError).catch(() => undefined);
	}
};

/**
 * Serves a file that was split at build time as the single file it was.
 * @param {Request} request
 * @param {{env: Env, context: WorkerContext, file: SplitFile}} options
 * @returns {Response}
 */
const serveSplitFile = (request: Request, options: { env: Env; context: WorkerContext; file: SplitFile }): Response => {
	const headers = new Headers({
		"Content-Type": options.file.contentType,
		"Content-Length": String(options.file.size),
		"Cache-Control": "public, max-age=0, must-revalidate",
		ETag: options.file.etag,
		[corsHeaderName]: "*"
	});
	if (request.headers.get("If-None-Match") === options.file.etag) {
		headers.delete("Content-Length");
		return new Response(null, { status: 304, headers });
	}
	if (request.method === "HEAD") {
		return new Response(null, { status: 200, headers });
	}
	const stream = new FixedLengthStream(options.file.size);
	options.context.waitUntil(pumpParts({ env: options.env, origin: new URL(request.url).origin, file: options.file, writable: stream.writable }));
	return new Response(stream.readable, { status: 200, headers });
};

/**
 * Parses a single-range "bytes=" header against a file size.
 * Returns null when the header is absent, malformed or asks for several ranges
 * (the full file is the correct answer then), and "unsatisfiable" for a range
 * outside the file.
 */
const parseRange = (rangeHeader: string | null, size: number): { start: number; end: number } | "unsatisfiable" | null => {
	const match = rangeHeader ? /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim()) : null;
	if (!match || (match[1] === "" && match[2] === "")) {
		return null;
	}
	if (match[1] === "") {
		const suffixLength = Number(match[2]);
		return suffixLength > 0 ? { start: Math.max(0, size - suffixLength), end: size - 1 } : "unsatisfiable";
	}
	const start = Number(match[1]);
	const end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
	return start >= size || start > end ? "unsatisfiable" : { start, end };
};

const withHeaders = (response: Response, extraHeaders: Record<string, string>): Response => {
	const headers = new Headers(response.headers);
	Object.keys(extraHeaders).forEach(name => headers.set(name, extraHeaders[name]));
	return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

/**
 * Serves a media asset, honoring a byte-range request the way upstream's
 * hosting does.
 * @param {Request} request
 * @param {Env} env
 * @returns {Promise<Response>}
 */
const serveMedia = async (request: Request, env: Env): Promise<Response> => {
	const assetResponse = await env.ASSETS.fetch(request);
	const baseHeaders: Record<string, string> = { [corsHeaderName]: "*", "Accept-Ranges": "bytes" };
	const rangeHeader = request.headers.get("Range");
	const declaredSize = Number(assetResponse.headers.get("Content-Length") || 0);
	// Anything but a plain 200 (a 304, or a 206 if Cloudflare ever serves ranges itself) passes through.
	if (request.method !== "GET" || assetResponse.status !== 200 || !rangeHeader || declaredSize > maxRangeBufferBytes) {
		return withHeaders(assetResponse, baseHeaders);
	}
	const fileBytes = await assetResponse.arrayBuffer();
	const size = fileBytes.byteLength;
	const range = parseRange(rangeHeader, size);
	const headers = new Headers(assetResponse.headers);
	Object.keys(baseHeaders).forEach(name => headers.set(name, baseHeaders[name]));
	headers.delete("Content-Encoding");
	if (range === "unsatisfiable") {
		return new Response(null, { status: 416, headers: { ...baseHeaders, "Content-Range": `bytes */${size}` } });
	}
	if (range === null) {
		headers.set("Content-Length", String(size));
		return new Response(fileBytes, { status: 200, headers });
	}
	headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
	headers.set("Content-Length", String(range.end - range.start + 1));
	return new Response(fileBytes.slice(range.start, range.end + 1), { status: 206, headers });
};

const handleRequest = async (request: Request, env: Env, context: WorkerContext): Promise<Response> => {
	if (request.method !== "GET" && request.method !== "HEAD") {
		return env.ASSETS.fetch(request);
	}
	const splitFile = splitFiles[new URL(request.url).pathname];
	try {
		return splitFile ? serveSplitFile(request, { env, context, file: splitFile }) : await serveMedia(request, env);
	} catch (handlerError) {
		logError(`serving ${new URL(request.url).pathname}`, handlerError);
		throw handlerError;
	}
};

// The Workers runtime requires the handler as the module's default export.
export default { fetch: handleRequest };
