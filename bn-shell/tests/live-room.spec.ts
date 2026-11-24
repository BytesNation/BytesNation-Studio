import { expect, test, type Browser, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { bnBase, needsSyntheticMedia, projectContextOptions, syntheticMediaInit, upstreamBase } from "./support/harness";

/**
 * @live End-to-end room: director, two camera guests, a screen-share guest,
 * a scene output, chat, director mute, and per-guest recording, in every
 * engine and on phones. Peers connect through the unmodified engine and its
 * default signaling: one short run uses five sessions.
 *
 * Runs against BytesNation Studio. Set PARITY_LIVE_CONTROL=1 to run the same
 * steps against upstream as a control.
 */
const targets = process.env.PARITY_LIVE_CONTROL ? [{ name: "BytesNation", base: bnBase }, { name: "upstream", base: upstreamBase }] : [{ name: "BytesNation", base: bnBase }];

const peerTimeoutMs = 45_000;

const openPeer = async (browser: Browser, testInfo: TestInfo, url: string): Promise<{ context: BrowserContext; page: Page }> => {
	const context = await browser.newContext(projectContextOptions(testInfo));
	if (needsSyntheticMedia(testInfo)) {
		await context.addInitScript(syntheticMediaInit);
	}
	const page = await context.newPage();
	page.on("dialog", dialog => {
		dialog.dismiss().catch(() => undefined);
	});
	await page.goto(url, { waitUntil: "load" });
	return { context, page };
};

/** Count of video elements under a selector that are actually decoding frames. */
const countPlayingVideos = (page: Page, containerSelector: string): Promise<number> =>
	page.evaluate(selector => {
		const container = document.querySelector(selector);
		if (!container) {
			return 0;
		}
		return Array.prototype.filter.call(container.querySelectorAll("video"), (video: HTMLVideoElement) => video.readyState >= 2 && video.videoWidth > 0).length;
	}, containerSelector);

/** The engine UUID of the peer publishing a stream id, as the director sees it. */
const findGuestUuid = (page: Page, streamId: string): Promise<string | null> =>
	page.evaluate(targetStreamId => {
		const engineSession = (window as unknown as { session: { rpcs: Record<string, { streamID?: string }> } }).session;
		const match = Object.keys(engineSession.rpcs).find(uuid => engineSession.rpcs[uuid].streamID === targetStreamId);
		return match || null;
	}, streamId);

/** A control in one guest's box. Template boxes carry the same data-action-type, so scope by UUID. */
const guestControl = (page: Page, actionType: string, uuid: string) => page.locator(`[data-action-type="${actionType}"][data--u-u-i-d="${uuid}"]`).first();

const supportsScreenCapture = (testInfo: TestInfo): boolean => testInfo.project.name !== "mobile-chrome" && testInfo.project.name !== "mobile-safari";

for (const target of targets) {
	test(`@live room on ${target.name}: director, guests, scene, screen share, chat, mute, recording`, async ({ browser }, testInfo) => {
		test.setTimeout(300_000);
		const room = `bnlive${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
		const url = (query: string) => `${target.base}?${query}`;
		const sessions: BrowserContext[] = [];
		if (needsSyntheticMedia(testInfo)) {
			testInfo.annotations.push({ type: "synthetic-media", description: "camera and microphone supplied by the test's synthetic media (canvas + oscillator)" });
		}

		const director = await openPeer(browser, testInfo, url(`director=${room}`));
		sessions.push(director.context);
		const guestAlex = await openPeer(browser, testInfo, url(`room=${room}&push=a${room}&label=Alex&webcam&autostart`));
		const guestSam = await openPeer(browser, testInfo, url(`room=${room}&push=s${room}&label=Sam&webcam&autostart`));
		sessions.push(guestAlex.context, guestSam.context);

		await test.step("director receives both guests", async () => {
			await expect.poll(() => countPlayingVideos(director.page, "#guestFeeds"), { timeout: peerTimeoutMs }).toBeGreaterThanOrEqual(2);
		});

		await test.step("scene output plays both guests", async () => {
			const scene = await openPeer(browser, testInfo, url(`scene=0&room=${room}`));
			sessions.push(scene.context);
			await expect.poll(() => countPlayingVideos(scene.page, "#gridlayout"), { timeout: peerTimeoutMs }).toBeGreaterThanOrEqual(2);
		});

		await test.step("screen share reaches the director", async () => {
			if (!supportsScreenCapture(testInfo)) {
				testInfo.annotations.push({ type: "manual", description: `mobile browsers do not offer screen capture to web pages; ${testInfo.project.name} skips this step as upstream does` });
				return;
			}
			if (needsSyntheticMedia(testInfo)) {
				testInfo.annotations.push({ type: "synthetic-media", description: "screen capture supplied by the test's synthetic getDisplayMedia; the real OS picker is on the manual checklist" });
			}
			const screen = await openPeer(browser, testInfo, url(`room=${room}&push=c${room}&label=Screen&screenshare&autostart`));
			sessions.push(screen.context);
			await expect.poll(() => countPlayingVideos(director.page, "#guestFeeds"), { timeout: peerTimeoutMs }).toBeGreaterThanOrEqual(3);
		});

		await test.step("chat from a guest reaches the director", async () => {
			await guestAlex.page.locator("#chatbutton").click();
			await guestAlex.page.locator("#chatInput").fill("rolling in 30");
			await guestAlex.page.locator("#chatInput").press("Enter");
			await expect(director.page.locator("#chatBody")).toContainText("rolling in 30", { timeout: peerTimeoutMs });
		});

		await test.step("director mutes a guest and the guest is told", async () => {
			const samUuid = await findGuestUuid(director.page, `s${room}`);
			expect(samUuid, "director knows Sam's connection").not.toBeNull();
			await guestControl(director.page, "mute-guest", samUuid as string).click();
			await expect.poll(() => guestSam.page.evaluate(() => {
				const notice = document.getElementById("head7");
				return Boolean(notice && !notice.classList.contains("hidden") && notice.getClientRects().length > 0);
			}), { timeout: peerTimeoutMs }).toBe(true);
		});

		await test.step("director records one guest locally", async () => {
			const alexUuid = await findGuestUuid(director.page, `a${room}`);
			expect(alexUuid, "director knows Alex's connection").not.toBeNull();
			const recordButton = guestControl(director.page, "recorder-local", alexUuid as string);
			// The record control lives in the collapsed "additional controls" group;
			// element.click() fires the engine's own onclick (recordVideo) as a user click would.
			await recordButton.evaluate(element => (element as HTMLElement).click());
			// The engine asks for a recording bitrate first.
			const submit = director.page.locator(".promptModal button[id^='submit_']").first();
			if (await submit.isVisible({ timeout: 5000 }).catch(() => false)) {
				await submit.click();
			}
			await expect.poll(() => director.page.evaluate(() => {
				const engineSession = (window as unknown as { session: { rpcs: Record<string, { videoElement?: HTMLVideoElement & { recording?: unknown } }> } }).session;
				return Object.keys(engineSession.rpcs).some(uuid => {
					const video = engineSession.rpcs[uuid].videoElement;
					return Boolean(video && ("recording" in video || (video as unknown as { stopWriter?: unknown }).stopWriter));
				});
			}), { timeout: 20_000 }).toBe(true);
			const download = director.page.waitForEvent("download", { timeout: 30_000 }).catch(() => null);
			await director.page.waitForTimeout(3000);
			await recordButton.evaluate(element => (element as HTMLElement).click());
			const recordingFile = await download;
			if (recordingFile) {
				testInfo.annotations.push({ type: "recording", description: `downloaded ${recordingFile.suggestedFilename()}` });
			} else {
				testInfo.annotations.push({ type: "recording", description: "recording started and stopped; no download event (browser saves through the file system API or the engine streams to disk)" });
			}
		});

		for (const context of sessions) {
			await context.close();
		}
	});
}
