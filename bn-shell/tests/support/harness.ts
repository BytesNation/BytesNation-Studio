import type { Browser, BrowserContext, BrowserContextOptions, Page, TestInfo } from "@playwright/test";

export const bnBase = process.env.BN_BASE || "http://127.0.0.1:8180/";
export const upstreamBase = process.env.UPSTREAM_BASE || "http://127.0.0.1:8181/";

/** Element ids BytesNation hides on purpose (documented in docs/ARCHITECTURE.md). */
export const intentionalHiddenIds = new Set(["logoname", "qos"]);

const settleMs = 2500;

const contextOptionKeys = ["viewport", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "permissions", "locale", "screen"] as const;

/**
 * Context options for a manually created context, taken from the running
 * project's device settings (browser.newContext() does not inherit them).
 * The OS color scheme is dark so upstream's OS-following default matches
 * BytesNation's dark default; theme.spec.ts tests the default separately.
 * @param {TestInfo} testInfo
 * @param {BrowserContextOptions} overrides
 */
export const projectContextOptions = (testInfo: TestInfo, overrides: BrowserContextOptions = {}): BrowserContextOptions => {
	const projectUse = testInfo.project.use as Record<string, unknown>;
	const options: Record<string, unknown> = { colorScheme: "dark" };
	contextOptionKeys.forEach(key => {
		if (projectUse[key] !== undefined) {
			options[key] = projectUse[key];
		}
	});
	return { ...(options as BrowserContextOptions), ...overrides };
};

/**
 * Keeps a page entirely local: aborts every request that is not to 127.0.0.1
 * and replaces every WebSocket with an inert mock, so the engine never
 * reaches the public signaling server. Used by every test not tagged @live.
 * @param {BrowserContext} context
 */
export const isolateNetwork = async (context: BrowserContext): Promise<void> => {
	await context.route(/^(?!https?:\/\/127\.0\.0\.1[:/]).*/, route => route.abort());
	await context.routeWebSocket(/.*/, () => {
		// No connectToServer(): the socket stays local and silent.
	});
};

/**
 * Opens a page in a fresh context and waits for the engine to boot.
 * @param {{browser: Browser, url: string, contextOptions?: BrowserContextOptions, offline?: boolean, initScript?: string}} options
 * @returns {Promise<{context: BrowserContext, page: Page, pageErrors: string[]}>}
 */
export const openEnginePage = async (options: {
	browser: Browser;
	url: string;
	contextOptions?: BrowserContextOptions;
	offline?: boolean;
	initScript?: string;
	settle?: number;
}): Promise<{ context: BrowserContext; page: Page; pageErrors: string[] }> => {
	const context = await options.browser.newContext(options.contextOptions || { colorScheme: "dark" });
	if (options.offline !== false) {
		await isolateNetwork(context);
	}
	if (options.initScript) {
		await context.addInitScript(options.initScript);
	}
	const page = await context.newPage();
	const pageErrors: string[] = [];
	page.on("pageerror", pageError => pageErrors.push(pageError.message));
	page.on("dialog", dialog => {
		dialog.dismiss().catch(() => undefined);
	});
	// Some parameters start heavy loads (segmentation models, WASM) that never
	// finish offline; cap the wait for the load event in both builds alike.
	await page.goto(options.url, { waitUntil: "domcontentloaded" });
	await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => undefined);
	await page.waitForTimeout(options.settle === undefined ? settleMs : options.settle);
	return { context, page, pageErrors };
};

/**
 * Snapshot of what the engine shows: for every engine element with an id,
 * whether it is rendered. BytesNation's own nodes (ids starting "bn-" and
 * anything inside a shell slot) are excluded.
 * @param {Page} page
 * @returns {Promise<Record<string, boolean>>}
 */
export const readVisibilityMap = async (page: Page): Promise<Record<string, boolean>> => {
	return page.evaluate(() => {
		// Device ids are hashed per origin and modal ids carry random suffixes, so
		// both are normalized; repeated normalized ids are numbered in DOM order.
		const normalizeId = (rawId: string): string => rawId.replace(/[0-9a-f]{64}/g, "<device>").replace(/pid_[a-z0-9]+/g, "pid_<n>");
		const visibility: Record<string, boolean> = {};
		document.querySelectorAll("[id]").forEach(element => {
			const elementId = element.id;
			if (!elementId || elementId.indexOf("bn-") === 0 || element.closest(".bn-slot, #bn-shell-root")) {
				return;
			}
			const baseKey = normalizeId(elementId);
			let key = baseKey;
			let occurrence = 1;
			while (key in visibility) {
				occurrence += 1;
				key = `${baseKey}#${occurrence}`;
			}
			const style = window.getComputedStyle(element);
			visibility[key] = element.getClientRects().length > 0 && style.visibility !== "hidden" && style.display !== "none";
		});
		return visibility;
	});
};

/** Engine state that defines the view: body classes and the active session mode flags. */
export const readEngineState = async (page: Page): Promise<Record<string, unknown>> => {
	return page.evaluate(() => {
		const engineSession = (window as unknown as { session?: Record<string, unknown> }).session || {};
		const pick = ["director", "scene", "view", "roomid", "permaid", "cleanOutput", "studioSoftware", "darkmode", "muted", "videoMuted", "speakerMuted", "transparent", "screenshareType"];
		const flags: Record<string, unknown> = {};
		pick.forEach(key => {
			const value = engineSession[key];
			flags[key] = typeof value === "object" && value !== null ? JSON.stringify(value) : value;
		});
		const bodyClasses = document.body.className
			.split(/\s+/)
			.filter(Boolean)
			.sort()
			.join(" ");
		return { bodyClasses, ...flags };
	});
};

/**
 * Compares two visibility maps and returns the ids whose state differs,
 * ignoring intentional BytesNation differences.
 */
export const diffVisibility = (bytesNation: Record<string, boolean>, upstream: Record<string, boolean>): string[] => {
	const differences: string[] = [];
	const allIds = new Set([...Object.keys(bytesNation), ...Object.keys(upstream)]);
	allIds.forEach(elementId => {
		if (intentionalHiddenIds.has(elementId)) {
			return;
		}
		if (!(elementId in bytesNation)) {
			differences.push(`${elementId}: missing in BytesNation`);
			return;
		}
		if (elementId in upstream && bytesNation[elementId] !== upstream[elementId]) {
			differences.push(`${elementId}: upstream ${upstream[elementId] ? "shown" : "hidden"}, BytesNation ${bytesNation[elementId] ? "shown" : "hidden"}`);
		}
	});
	return differences.sort();
};

/** Base query that puts the engine in the mode a parameter's role applies to. */
export const roleBaseQuery = (role: string): string => {
	if (role === "Director") {
		return "director=bnparityroom";
	}
	if (role === "Viewer") {
		return "view=bnparitystream";
	}
	if (role === "Sender") {
		return "push=bnparitystream";
	}
	return "";
};

export const withQuery = (base: string, query: string): string => (query ? `${base}?${query}` : base);

/**
 * Test-only synthetic media for engines without a fake camera (Playwright's
 * WebKit) or whose fake devices allow only one capture at a time (Firefox).
 * getUserMedia and getDisplayMedia return a canvas video track and an
 * oscillator audio track. Never shipped; injected by the live tests only.
 */
export const syntheticMediaInit = `(() => {
	const mediaDevices = navigator.mediaDevices;
	if (!mediaDevices) { return; }
	const makeStream = constraints => {
		const tracks = [];
		const wantsVideo = !constraints || constraints.video;
		const wantsAudio = !constraints || constraints.audio;
		if (wantsVideo) {
			const canvas = document.createElement("canvas");
			canvas.width = 640;
			canvas.height = 360;
			const context = canvas.getContext("2d");
			let frame = 0;
			setInterval(() => {
				context.fillStyle = "hsl(" + ((frame * 7) % 360) + ",50%,35%)";
				context.fillRect(0, 0, 640, 360);
				context.fillStyle = "#ffffff";
				context.font = "28px sans-serif";
				context.fillText("BN synthetic camera " + frame, 24, 56);
				frame += 1;
			}, 66);
			canvas.captureStream(15).getVideoTracks().forEach(track => tracks.push(track));
		}
		if (wantsAudio) {
			const AudioContextType = window.AudioContext || window.webkitAudioContext;
			const audioContext = new AudioContextType();
			const oscillator = audioContext.createOscillator();
			const destination = audioContext.createMediaStreamDestination();
			// Zero gain: a valid live audio track that never sounds on the host.
			const silence = audioContext.createGain();
			silence.gain.value = 0;
			oscillator.connect(silence);
			silence.connect(destination);
			oscillator.start();
			destination.stream.getAudioTracks().forEach(track => tracks.push(track));
		}
		return new MediaStream(tracks);
	};
	mediaDevices.getUserMedia = constraints => Promise.resolve(makeStream(constraints));
	mediaDevices.getDisplayMedia = () => Promise.resolve(makeStream({ video: true, audio: false }));
	mediaDevices.enumerateDevices = () => Promise.resolve([
		{ deviceId: "bn-synthetic-camera", kind: "videoinput", label: "BN Synthetic Camera", groupId: "bn", toJSON() { return this; } },
		{ deviceId: "bn-synthetic-mic", kind: "audioinput", label: "BN Synthetic Microphone", groupId: "bn", toJSON() { return this; } },
		{ deviceId: "bn-synthetic-output", kind: "audiooutput", label: "BN Synthetic Output", groupId: "bn", toJSON() { return this; } }
	]);
})();`;

/** True for projects whose browser lacks usable built-in fake media. */
export const needsSyntheticMedia = (testInfo: TestInfo): boolean => !testInfo.project.name.includes("chrom");
