import { expect, test, type Page } from "@playwright/test";
import { bnBase, isolateNetwork, projectContextOptions, upstreamBase } from "./support/harness";

/**
 * IFRAME API (docs/inventory/shortcuts-and-apis.md). A host page embeds the
 * app, sends the same inbound messages to upstream and BytesNation Studio,
 * and the replies and events the engine posts back must match.
 */
const embedQuery = "push=bniframestream&webcam&autostart";

const inboundMessages: Record<string, unknown>[] = [
	{ getStreamIDs: true },
	{ getDetailedState: true },
	{ getDeviceList: true },
	{ mic: false },
	{ mic: true },
	{ camera: false },
	{ camera: true },
	{ speaker: false },
	{ speaker: true },
	{ sendChat: "parity check" },
	{ getLoudness: false },
	{ layout: null }
];

/** Fields that legitimately differ between two runs (timestamps, random ids, per-origin device ids). */
const volatileKeyPattern = /time|stamp|uuid|UUID|deviceId|groupId|id$|session|latency|bitrate|stats/i;

const normalizeReply = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(normalizeReply);
	}
	if (value && typeof value === "object") {
		const normalized: Record<string, unknown> = {};
		Object.keys(value as Record<string, unknown>)
			.sort()
			.forEach(key => {
				normalized[key] = volatileKeyPattern.test(key) ? "<volatile>" : normalizeReply((value as Record<string, unknown>)[key]);
			});
		return normalized;
	}
	return value;
};

const embedAndCollect = async (page: Page, appUrl: string): Promise<unknown[]> => {
	await page.setContent(`<iframe id="app" allow="camera;microphone;autoplay;display-capture" style="width:1280px;height:720px;border:0" src="${appUrl}"></iframe>`);
	await page.evaluate(() => {
		(window as unknown as { replies: unknown[] }).replies = [];
		window.addEventListener("message", event => {
			(window as unknown as { replies: unknown[] }).replies.push(event.data);
		});
	});
	await page.waitForTimeout(5000);
	for (const message of inboundMessages) {
		await page.evaluate(payload => {
			const frame = document.getElementById("app") as HTMLIFrameElement;
			frame.contentWindow!.postMessage(payload, "*");
		}, message);
		await page.waitForTimeout(500);
	}
	await page.waitForTimeout(1500);
	const replies = await page.evaluate(() => (window as unknown as { replies: unknown[] }).replies);
	// Keep only message kinds, in order, plus normalized payloads.
	return replies.map(normalizeReply);
};

test("IFRAME API replies and events match upstream", async ({ browser }, testInfo) => {
	test.skip(testInfo.project.name.startsWith("mobile"), "embedding API is engine-wide; desktop engines cover it");
	const contexts = await Promise.all([0, 1].map(async () => {
		const context = await browser.newContext(projectContextOptions(testInfo));
		await isolateNetwork(context);
		return context;
	}));
	const [upstreamPage, bytesNationPage] = await Promise.all(contexts.map(context => context.newPage()));
	const [upstreamReplies, bytesNationReplies] = await Promise.all([
		embedAndCollect(upstreamPage, `${upstreamBase}?${embedQuery}`),
		embedAndCollect(bytesNationPage, `${bnBase}?${embedQuery}`)
	]);
	expect(upstreamReplies.length, "upstream answered the API").toBeGreaterThan(0);
	expect(bytesNationReplies).toEqual(upstreamReplies);
	await Promise.all(contexts.map(context => context.close()));
});
