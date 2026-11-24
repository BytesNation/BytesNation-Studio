import { expect, test } from "@playwright/test";
import { bnBase, openEnginePage, projectContextOptions, readEngineState, upstreamBase, withQuery } from "./support/harness";

/**
 * Keyboard shortcuts (docs/inventory/shortcuts-and-apis.md). Each one runs in
 * upstream and in BytesNation Studio on a live local publish, and the engine
 * state afterwards must match. Signaling is blocked; publishing a local camera
 * needs none.
 */
const publishQuery = "push=bnshortcutstream&webcam&autostart";

const shortcuts = [
	{ name: "Ctrl+M toggles the microphone", keys: ["Control+m"] },
	{ name: "Ctrl+B toggles the camera", keys: ["Control+b"] },
	{ name: "Alt+A toggles the speaker", keys: ["Alt+a"] },
	{ name: "Shift+Alt+C toggles the control bar", keys: ["Shift+Alt+c"] },
	{ name: "Ctrl+M twice restores the microphone", keys: ["Control+m", "Control+m"] },
	{ name: "Escape closes the topmost modal", keys: ["Escape"] }
];

const readShortcutState = async (page: import("@playwright/test").Page) => ({
	engine: await readEngineState(page),
	controlBarHidden: await page.evaluate(() => {
		const controlBar = document.getElementById("controlButtons");
		return controlBar ? getComputedStyle(controlBar).display === "none" || controlBar.classList.contains("hidden") : null;
	}),
	muteButtonClasses: await page.evaluate(() => (document.getElementById("mutebutton") || { className: "" }).className),
	videoButtonClasses: await page.evaluate(() => (document.getElementById("mutevideobutton") || { className: "" }).className)
});

for (const shortcut of shortcuts) {
	test(`shortcut: ${shortcut.name}`, async ({ browser }, testInfo) => {
		test.skip(testInfo.project.name.startsWith("mobile"), "hardware keyboard shortcuts are a desktop feature");
		const [upstream, bytesNation] = await Promise.all([
			openEnginePage({ browser, url: withQuery(upstreamBase, publishQuery), contextOptions: projectContextOptions(testInfo), settle: 4000 }),
			openEnginePage({ browser, url: withQuery(bnBase, publishQuery), contextOptions: projectContextOptions(testInfo), settle: 4000 })
		]);
		for (const page of [upstream.page, bytesNation.page]) {
			await page.locator("body").click({ position: { x: 5, y: 300 } }).catch(() => undefined);
			for (const key of shortcut.keys) {
				await page.keyboard.press(key);
				await page.waitForTimeout(400);
			}
			await page.waitForTimeout(600);
		}
		expect(await readShortcutState(bytesNation.page)).toEqual(await readShortcutState(upstream.page));
		await upstream.context.close();
		await bytesNation.context.close();
	});
}
