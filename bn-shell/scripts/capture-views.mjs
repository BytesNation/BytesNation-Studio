#!/usr/bin/env node
/**
 * Captures every BytesNation Studio view with live peers, in dark and light,
 * desktop and mobile, for design review and the parity report.
 *
 * Peers use the unmodified engine (webrtc.js) and its default signaling, so
 * keep runs small: one director, two or three guests, one scene, one viewer.
 *
 * Usage:
 *   node scripts/capture-views.mjs --base http://127.0.0.1:8080/ --out ./shots [--group director] [--theme dark] [--browser chromium]
 * Groups: launcher, publish, director, panels, video, all (default).
 */
import { chromium, firefox, webkit } from "playwright";
import { mkdirSync } from "node:fs";

const readFlag = (name, fallback) => {
	const index = process.argv.indexOf(`--${name}`);
	return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const baseUrl = readFlag("base", "http://127.0.0.1:8080/");
const outDir = readFlag("out", "./shots");
const groupFilter = readFlag("group", "all");
const themeFilter = readFlag("theme", "all");
const browserName = readFlag("browser", "chromium");
const browserTypes = { chromium, firefox, webkit };

const launchOptions = {
	chromium: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] },
	firefox: { firefoxUserPrefs: { "media.navigator.streams.fake": true, "media.navigator.permission.disabled": true, "media.autoplay.default": 0 } },
	webkit: {}
};

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };
const settleMs = 2500;

/**
 * Opens a page in its own context (so peers are independent).
 * @param {import("playwright").Browser} browser
 * @param {{url: string, viewport?: {width: number, height: number}, isMobile?: boolean, waitMs?: number}} options
 */
const openPage = async (browser, options) => {
	const context = await browser.newContext({
		viewport: options.viewport || desktop,
		colorScheme: "dark",
		permissions: browserName === "chromium" ? ["camera", "microphone"] : [],
		isMobile: browserName === "firefox" ? undefined : Boolean(options.isMobile),
		hasTouch: Boolean(options.isMobile)
	});
	const page = await context.newPage();
	page.on("pageerror", pageError => {
		console.error(`[pageerror] ${options.url}: ${pageError.message}`);
	});
	await page.goto(options.url, { waitUntil: "load" });
	await page.waitForTimeout(options.waitMs || settleMs);
	return page;
};

const capture = async (page, name) => {
	await page.screenshot({ path: `${outDir}/${name}.png` });
	console.log(`captured ${name}`);
};

const tryClick = async (page, selector) => {
	try {
		await page.click(selector, { timeout: 3000 });
	} catch (clickError) {
		console.warn(`[capture] could not click ${selector}: ${clickError.message.split("\n")[0]}`);
	}
};

/** One run of every group for one theme. */
const runTheme = async (browser, theme) => {
	const themeParam = theme === "light" ? "&lightmode" : "";
	const room = `bncap${Date.now().toString(36)}${theme}`;
	const withBase = query => `${baseUrl}?${query}${themeParam}`;
	const wants = group => groupFilter === "all" || groupFilter === group;

	if (wants("launcher")) {
		const launcher = await openPage(browser, { url: `${baseUrl}${theme === "light" ? "?lightmode" : ""}` });
		await capture(launcher, `launcher-${theme}`);
		await tryClick(launcher, "#dropButton");
		await launcher.waitForTimeout(800);
		await capture(launcher, `launcher-more-${theme}`);
		const launcherPhone = await openPage(browser, { url: `${baseUrl}${theme === "light" ? "?lightmode" : ""}`, viewport: phone, isMobile: true });
		await capture(launcherPhone, `launcher-mobile-${theme}`);
	}

	if (wants("publish")) {
		const createRoom = await openPage(browser, { url: `${baseUrl}${theme === "light" ? "?lightmode" : ""}` });
		await tryClick(createRoom, "#container-1");
		await createRoom.waitForTimeout(1500);
		await capture(createRoom, `create-room-${theme}`);
		const camera = await openPage(browser, { url: `${baseUrl}${theme === "light" ? "?lightmode" : ""}` });
		await tryClick(camera, "#container-3");
		await camera.waitForTimeout(4000);
		await capture(camera, `camera-preview-${theme}`);
		const screen = await openPage(browser, { url: `${baseUrl}${theme === "light" ? "?lightmode" : ""}` });
		await tryClick(screen, "#container-2");
		await screen.waitForTimeout(1500);
		await capture(screen, `screenshare-setup-${theme}`);
		const invite = await openPage(browser, { url: `${baseUrl}${theme === "light" ? "?lightmode" : ""}` });
		await tryClick(invite, "#container-4");
		await invite.waitForTimeout(1500);
		await capture(invite, `invite-builder-${theme}`);
		const guestJoin = await openPage(browser, { url: withBase(`room=${room}join`), waitMs: 4000 });
		await capture(guestJoin, `guest-join-${theme}`);
		const cameraPhone = await openPage(browser, { url: withBase(`push=bnphone${theme}`), viewport: phone, isMobile: true, waitMs: 4000 });
		await capture(cameraPhone, `publish-mobile-${theme}`);
	}

	if (wants("director") || wants("panels") || wants("video")) {
		const director = await openPage(browser, { url: withBase(`director=${room}`) });
		const guestA = await openPage(browser, { url: withBase(`room=${room}&push=ga${room}&label=Alex&webcam&autostart`), waitMs: 5000 });
		const guestB = await openPage(browser, { url: withBase(`room=${room}&push=gb${room}&label=Sam&webcam&autostart`), waitMs: 5000 });
		await director.waitForTimeout(7000);

		if (wants("director")) {
			await capture(director, `director-${theme}`);
			await tryClick(director, "#roomsettingsbutton");
			await director.waitForTimeout(1200);
			await capture(director, `director-room-settings-${theme}`);
			await tryClick(director, "#roomsettingsbutton");
			const directorPhone = await openPage(browser, { url: withBase(`director=${room}&codirector`), viewport: phone, isMobile: true, waitMs: 6000 });
			await capture(directorPhone, `director-mobile-${theme}`);
		}

		if (wants("video")) {
			await capture(guestA, `guest-call-${theme}`);
			const scene = await openPage(browser, { url: withBase(`scene=0&room=${room}`), waitMs: 8000 });
			await capture(scene, `scene-${theme}`);
			const viewer = await openPage(browser, { url: withBase(`view=ga${room}`), waitMs: 8000 });
			await capture(viewer, `view-${theme}`);
			const guestPhone = await openPage(browser, { url: withBase(`room=${room}&push=gp${room}&label=Jo&webcam&autostart`), viewport: phone, isMobile: true, waitMs: 7000 });
			await capture(guestPhone, `guest-call-mobile-${theme}`);
		}

		if (wants("panels")) {
			await tryClick(guestB, "#settingsbutton");
			await guestB.waitForTimeout(1500);
			await capture(guestB, `guest-settings-${theme}`);
			await tryClick(guestB, "#settingsbutton");
			await tryClick(guestB, "#chatbutton");
			await guestB.waitForTimeout(800);
			await guestB.fill("#chatInput", "Rolling in 30.").catch(() => {});
			await guestB.keyboard.press("Enter").catch(() => {});
			await guestB.waitForTimeout(800);
			await capture(guestB, `guest-chat-${theme}`);
			await guestB.click("#gridlayout video", { button: "right", timeout: 3000 }).catch(() => {});
			await guestB.waitForTimeout(600);
			await capture(guestB, `video-context-menu-${theme}`);
		}
	}

	for (const context of browser.contexts()) {
		await context.close();
	}
};

const main = async () => {
	mkdirSync(outDir, { recursive: true });
	const browser = await browserTypes[browserName].launch(launchOptions[browserName]);
	const themes = themeFilter === "all" ? ["dark", "light"] : [themeFilter];
	for (const theme of themes) {
		await runTheme(browser, theme);
	}
	await browser.close();
};

await main();
