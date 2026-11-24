import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { bnBase, diffVisibility, openEnginePage, projectContextOptions, readEngineState, readVisibilityMap, upstreamBase, withQuery } from "./support/harness";

/**
 * The shell's floating layers: command palette (cmdk), notifications (Sonner)
 * and the recording readout, animated with Motion. They are additions, so the
 * tests prove two things: they only ever offer what the engine itself offers,
 * and they leave the engine exactly as upstream.
 */
const publishQuery = "push=bnlayerstream&webcam&autostart";
const isPhone = (testInfo: TestInfo): boolean => testInfo.project.name.startsWith("mobile");

const openPalette = async (page: Page, testInfo: TestInfo): Promise<void> => {
	if (isPhone(testInfo)) {
		await page.locator(".bn-cmd-trigger").click();
	} else {
		await page.keyboard.press("ControlOrMeta+k");
	}
	await expect(page.locator("[cmdk-root]")).toBeVisible();
	// Let the 160ms open animation and list-height transition finish before tapping rows.
	await page.waitForTimeout(350);
};

const paletteLabels = (page: Page, heading: string): Promise<string[]> =>
	page.evaluate(groupHeading => {
		const groups = Array.prototype.slice.call(document.querySelectorAll("[cmdk-group]")) as HTMLElement[];
		const group = groups.find(candidate => (candidate.querySelector("[cmdk-group-heading]") as HTMLElement).textContent === groupHeading);
		return group ? Array.prototype.map.call(group.querySelectorAll(".bn-cmd-label"), (label: HTMLElement) => (label.textContent || "").trim()) : [];
	}, heading) as Promise<string[]>;

/** What the engine itself renders in the control bar, minus the controls that end the session. */
const renderedBarLabels = (page: Page): Promise<string[]> =>
	page.evaluate(() => {
		const clean = (raw: string): string => {
			const text = raw.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+/g, " ").trim();
			return text.charAt(0).toUpperCase() + text.slice(1);
		};
		const controls = Array.prototype.slice.call(document.querySelectorAll('#subControlButtons [role="button"][id]')) as HTMLElement[];
		return controls.filter(control => control.getClientRects().length > 0 && control.id !== "hangupbutton" && control.id !== "hangupbutton2").map(control => clean(control.getAttribute("aria-label") || control.title));
	});

const toastTexts = (page: Page): Promise<string[]> => page.locator("[data-sonner-toast] .bn-toast").allInnerTexts();

test.describe("command palette", () => {
	test("opens on the launcher and lists exactly the tools upstream offers", async ({ browser }, testInfo) => {
		const [upstream, bytesNation] = await Promise.all([
			openEnginePage({ browser, url: upstreamBase, contextOptions: projectContextOptions(testInfo) }),
			openEnginePage({ browser, url: bnBase, contextOptions: projectContextOptions(testInfo) })
		]);
		// Upstream's own answer: what is on screen after its "More options" button.
		const upstreamTools = await upstream.page.evaluate(() => {
			const moreButton = document.getElementById("dropButton");
			// Some platforms (Android) never show "More options"; only press it where a visitor could.
			if (moreButton && moreButton.getClientRects().length > 0) {
				moreButton.click();
			}
			const tiles = Array.prototype.slice.call(document.querySelectorAll('#mainmenu div.column.card[id^="container-"]')) as HTMLElement[];
			return tiles.filter(tile => tile.getClientRects().length > 0).map(tile => ((tile.querySelector("h2") as HTMLElement).textContent || "").replace(/\s+/g, " ").trim());
		});
		await openPalette(bytesNation.page, testInfo);
		const startLabels = await paletteLabels(bytesNation.page, "Start");
		expect(startLabels.slice(0, -1)).toEqual(upstreamTools);
		expect(startLabels[startLabels.length - 1]).toBe("Join a room by name");
		await bytesNation.page.keyboard.press("Escape");
		await expect(bytesNation.page.locator("[cmdk-root]")).toHaveCount(0);
		await upstream.context.close();
		await bytesNation.context.close();
	});

	test("offers exactly the controls the engine renders, and follows hide parameters", async ({ browser }, testInfo) => {
		for (const query of [publishQuery, `${publishQuery}&nomicbutton&nosettings`]) {
			const { context, page } = await openEnginePage({ browser, url: withQuery(bnBase, query), contextOptions: projectContextOptions(testInfo), settle: 4000 });
			const expected = await renderedBarLabels(page);
			await openPalette(page, testInfo);
			expect(await paletteLabels(page, "Session"), `Session commands for ?${query}`).toEqual(expected);
			if (query.includes("nomicbutton")) {
				await expect(page.locator('[data-command-id="bar:mutebutton"]')).toHaveCount(0);
				await expect(page.locator('[data-command-id="bar:settingsbutton"]')).toHaveCount(0);
			} else {
				await expect(page.locator('[data-command-id="bar:mutebutton"]')).toHaveCount(1);
			}
			await context.close();
		}
	});

	test("never offers a control that ends the session", async ({ browser }, testInfo) => {
		const { context, page } = await openEnginePage({ browser, url: withQuery(bnBase, publishQuery), contextOptions: projectContextOptions(testInfo), settle: 4000 });
		await expect(page.locator("#hangupbutton")).toBeVisible();
		await openPalette(page, testInfo);
		await expect(page.locator('[data-command-id="bar:hangupbutton"]')).toHaveCount(0);
		await expect(page.locator("[cmdk-item]").filter({ hasText: /hang ?up/i })).toHaveCount(0);
		await context.close();
	});

	test("running a command equals pressing the engine's control", async ({ browser }, testInfo) => {
		const [upstream, bytesNation] = await Promise.all([
			openEnginePage({ browser, url: withQuery(upstreamBase, publishQuery), contextOptions: projectContextOptions(testInfo), settle: 4000 }),
			openEnginePage({ browser, url: withQuery(bnBase, publishQuery), contextOptions: projectContextOptions(testInfo), settle: 4000 })
		]);
		await upstream.page.evaluate(() => (document.getElementById("mutebutton") as HTMLElement).click());
		await openPalette(bytesNation.page, testInfo);
		await bytesNation.page.locator('[data-command-id="bar:mutebutton"]').click();
		await expect(bytesNation.page.locator("[cmdk-root]")).toHaveCount(0);
		await bytesNation.page.waitForTimeout(800);
		const readMute = (page: Page) => page.evaluate(() => (document.getElementById("mutebutton") as HTMLElement).className.split(/\s+/).filter(name => name !== "pulsate").sort().join(" "));
		expect(await readEngineState(bytesNation.page)).toEqual(await readEngineState(upstream.page));
		expect(await readMute(bytesNation.page)).toBe(await readMute(upstream.page));
		expect(await bytesNation.page.evaluate(() => (window as unknown as { session: { muted: boolean } }).session.muted)).toBe(true);
		await upstream.context.close();
		await bytesNation.context.close();
	});

	test("opening and closing it leaves the engine exactly as upstream", async ({ browser }, testInfo) => {
		const query = "director=bnlayerroom";
		const [upstream, bytesNation] = await Promise.all([
			openEnginePage({ browser, url: withQuery(upstreamBase, query), contextOptions: projectContextOptions(testInfo) }),
			openEnginePage({ browser, url: withQuery(bnBase, query), contextOptions: projectContextOptions(testInfo) })
		]);
		await openPalette(bytesNation.page, testInfo);
		expect((await paletteLabels(bytesNation.page, "Room")).length).toBeGreaterThan(0);
		await bytesNation.page.keyboard.press("Escape");
		await expect(bytesNation.page.locator("[cmdk-root]")).toHaveCount(0);
		await bytesNation.page.waitForTimeout(400);
		expect(diffVisibility(await readVisibilityMap(bytesNation.page), await readVisibilityMap(upstream.page))).toEqual([]);
		expect(await readEngineState(bytesNation.page)).toEqual(await readEngineState(upstream.page));
		expect(await bytesNation.page.evaluate(() => document.body.style.pointerEvents)).toBe("");
		await upstream.context.close();
		await bytesNation.context.close();
	});

	test("&disablehotkeys turns the hotkey off; the button still opens it", async ({ browser }, testInfo) => {
		test.skip(isPhone(testInfo), "hardware keyboard shortcuts are a desktop feature");
		const { context, page } = await openEnginePage({ browser, url: withQuery(bnBase, "disablehotkeys"), contextOptions: projectContextOptions(testInfo) });
		await page.keyboard.press("ControlOrMeta+k");
		await page.waitForTimeout(400);
		await expect(page.locator("[cmdk-root]")).toHaveCount(0);
		await expect(page.locator(".bn-cmd-trigger-keys")).toHaveCount(0);
		await page.locator(".bn-cmd-trigger").click();
		await expect(page.locator("[cmdk-root]")).toBeVisible();
		await context.close();
	});

	test("opens the About view with the AGPL credit", async ({ browser }, testInfo) => {
		const { context, page } = await openEnginePage({ browser, url: bnBase, contextOptions: projectContextOptions(testInfo) });
		await openPalette(page, testInfo);
		await page.locator('[data-command-id="studio:about"]').click();
		const dialog = page.getByRole("dialog");
		await expect(dialog).toContainText("BytesNation Studio is built on VDO.Ninja by Steve Seguin (AGPL-3.0).");
		await context.close();
	});
});

test.describe("output surfaces", () => {
	const outputs = [
		{ name: "view link", query: "view=bnlayerstream", initScript: undefined },
		{ name: "scene link", query: "scene=0&room=bnlayerroom", initScript: undefined },
		{ name: "OBS browser source", query: "push=bnlayerstream&webcam", initScript: "window.obsstudio = { pluginVersion: '30.0.0', getCurrentScene: function () {} };" }
	];
	for (const output of outputs) {
		test(`${output.name}: no palette, no notifications`, async ({ browser }, testInfo) => {
			const { context, page } = await openEnginePage({ browser, url: withQuery(bnBase, output.query), contextOptions: projectContextOptions(testInfo), initScript: output.initScript });
			await page.keyboard.press("ControlOrMeta+k");
			await page.waitForTimeout(400);
			await expect(page.locator("[cmdk-root]")).toHaveCount(0);
			await expect(page.locator(".bn-cmd-trigger")).toHaveCount(0);
			await expect(page.locator('section[aria-label^="Studio notifications"]')).toHaveCount(0);
			await context.close();
		});
	}
});

test.describe("notifications and readouts", () => {
	test("guest join and leave, chat as plain text, and the off switch", async ({ browser }, testInfo) => {
		const { context, page } = await openEnginePage({ browser, url: withQuery(bnBase, "director=bnlayerroom"), contextOptions: projectContextOptions(testInfo) });
		// Stand in for the engine: add and remove a guest strip the way lib.js does.
		await page.evaluate(() => {
			const strip = document.createElement("div");
			strip.id = "container_test-guest";
			strip.className = "vidcon";
			strip.dataset.UUID = "test-guest";
			strip.dataset.sid = "alexstream";
			strip.innerHTML = '<span id="label_test-guest">Alex</span>';
			(document.getElementById("guestFeeds") as HTMLElement).appendChild(strip);
		});
		await expect.poll(() => toastTexts(page), { timeout: 8000 }).toContainEqual(expect.stringContaining("Alex joined."));
		await page.evaluate(() => (document.getElementById("container_test-guest") as HTMLElement).remove());
		await expect.poll(() => toastTexts(page), { timeout: 8000 }).toContainEqual(expect.stringContaining("Alex left."));

		// The director reorders strips with insertBefore (shiftPC). That is neither a leave nor a join.
		await page.evaluate(() => {
			const feeds = document.getElementById("guestFeeds") as HTMLElement;
			["one", "two"].forEach(name => {
				const strip = document.createElement("div");
				strip.className = "vidcon";
				strip.dataset.UUID = `reorder-${name}`;
				strip.innerHTML = `<span id="label_reorder-${name}">Guest ${name}</span>`;
				feeds.appendChild(strip);
			});
		});
		await expect.poll(() => toastTexts(page), { timeout: 8000 }).toContainEqual(expect.stringContaining("Guest one and Guest two joined."));
		await page.locator('[data-sonner-toast] button[aria-label="Dismiss notification"]').first().click();
		await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Guest one and Guest two joined." })).toHaveCount(0, { timeout: 8000 });
		const toastsBeforeReorder = (await toastTexts(page)).length;
		await page.evaluate(() => {
			const feeds = document.getElementById("guestFeeds") as HTMLElement;
			feeds.insertBefore(feeds.lastElementChild as HTMLElement, feeds.firstElementChild);
		});
		await page.waitForTimeout(2500);
		expect((await toastTexts(page)).filter(text => /Guest (one|two)/.test(text)).length, "a reorder must not announce anything").toBe(0);
		expect((await toastTexts(page)).length).toBeLessThanOrEqual(toastsBeforeReorder);

		// Chat: the engine rebuilds the whole list on every update (updateMessages). Markup must stay text.
		const renderChat = (messages: string[]) =>
			page.evaluate(rows => {
				const chatBody = document.getElementById("chatBody") as HTMLElement;
				chatBody.innerHTML = "";
				rows.forEach(rowHtml => {
					const row = document.createElement("div");
					row.className = "inMessage";
					row.innerHTML = rowHtml;
					chatBody.appendChild(row);
				});
			}, messages);
		const firstMessage = '<b><i><span class="chat_name">Sam</span>:</i></b> going live <img id="bn-injected" src="x"> in 30<i><small><small><span> - Seconds ago</span></small></small></i>';
		await renderChat([firstMessage]);
		await expect.poll(() => toastTexts(page), { timeout: 8000 }).toContainEqual(expect.stringMatching(/Sam[\s\S]*going live\s+in 30/i));
		await expect(page.locator("[data-sonner-toast] img")).toHaveCount(0);
		// A rebuild with nothing new (the timestamp ages) must not announce the old message again.
		await page.locator('[data-sonner-toast] button[aria-label="Dismiss notification"]').first().click();
		await expect(page.locator("[data-sonner-toast]").filter({ hasText: /going live/i })).toHaveCount(0, { timeout: 8000 });
		await renderChat([firstMessage.replace("Seconds ago", "1 minute ago")]);
		await page.waitForTimeout(1500);
		await expect(page.locator("[data-sonner-toast]").filter({ hasText: /going live/i })).toHaveCount(0);
		await renderChat([firstMessage, '<b><i><span class="chat_name">Sam</span>:</i></b> standing by']);
		await expect.poll(() => toastTexts(page), { timeout: 8000 }).toContainEqual(expect.stringMatching(/standing by/i));

		// Off switch, from the palette.
		await openPalette(page, testInfo);
		await page.locator('[data-command-id="studio:notifications"]').click();
		await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, { timeout: 8000 });
		await page.evaluate(() => {
			const strip = document.createElement("div");
			strip.className = "vidcon";
			strip.dataset.UUID = "second-guest";
			strip.innerHTML = '<span id="label_second-guest">Jo</span>';
			(document.getElementById("guestFeeds") as HTMLElement).appendChild(strip);
		});
		await page.waitForTimeout(3000);
		await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
		await context.close();
	});

	test("recording readout follows the engine's recording flag", async ({ browser }, testInfo) => {
		const { context, page } = await openEnginePage({ browser, url: withQuery(bnBase, publishQuery), contextOptions: projectContextOptions(testInfo), settle: 4000 });
		await expect(page.locator(".bn-rec")).toHaveCount(0);
		const setRecording = (isRecording: boolean) =>
			page.evaluate(recording => {
				const video = (window as unknown as { session: { videoElement: { recording?: boolean } } }).session.videoElement;
				if (recording) {
					video.recording = true;
				} else {
					delete video.recording;
				}
			}, isRecording);
		await setRecording(true);
		await expect(page.locator(".bn-rec")).toContainText("REC", { timeout: 5000 });
		await expect(page.locator(".bn-rec-time")).toHaveText(/^00:00:0\d$/);
		// Hold long enough for the once-a-second event watcher to see the recording.
		await page.waitForTimeout(1600);
		await setRecording(false);
		await expect(page.locator(".bn-rec")).toHaveCount(0, { timeout: 5000 });
		await expect.poll(() => toastTexts(page), { timeout: 8000 }).toContainEqual(expect.stringContaining("Recording stopped at 00:00:0"));
		await context.close();
	});
});

test.describe("engine left as upstream", () => {
	test("launcher reveal animation leaves the tiles as the engine set them", async ({ browser }, testInfo) => {
		const [upstream, bytesNation] = await Promise.all([
			openEnginePage({ browser, url: upstreamBase, contextOptions: projectContextOptions(testInfo) }),
			openEnginePage({ browser, url: bnBase, contextOptions: projectContextOptions(testInfo) })
		]);
		for (const page of [upstream.page, bytesNation.page]) {
			await page.evaluate(() => {
				const moreButton = document.getElementById("dropButton");
				if (moreButton && moreButton.getClientRects().length > 0) {
					moreButton.click();
				}
			});
		}
		await bytesNation.page.waitForTimeout(1500);
		expect(diffVisibility(await readVisibilityMap(bytesNation.page), await readVisibilityMap(upstream.page))).toEqual([]);
		// Every tile's inline style must equal upstream's: nothing added, nothing of the engine's removed.
		const readTileStyles = (page: Page) =>
			page.evaluate(() => {
				const styles: Record<string, string> = {};
				Array.prototype.forEach.call(document.querySelectorAll("#mainmenu div.column"), (tile: HTMLElement) => {
					styles[tile.id] = (tile.getAttribute("style") || "").replace(/\s+/g, "");
				});
				return styles;
			});
		expect(await readTileStyles(bytesNation.page)).toEqual(await readTileStyles(upstream.page));
		await upstream.context.close();
		await bytesNation.context.close();
	});

	test("hang up behaves as upstream", async ({ browser }, testInfo) => {
		const [upstream, bytesNation] = await Promise.all([
			openEnginePage({ browser, url: withQuery(upstreamBase, publishQuery), contextOptions: projectContextOptions(testInfo), settle: 4000 }),
			openEnginePage({ browser, url: withQuery(bnBase, publishQuery), contextOptions: projectContextOptions(testInfo), settle: 4000 })
		]);
		for (const page of [upstream.page, bytesNation.page]) {
			await page.evaluate(() => (document.getElementById("hangupbutton") as HTMLElement).click());
		}
		await bytesNation.page.waitForTimeout(2500);
		const normalize = (errors: string[]) => errors.map(message => message.replace(/'[0-9a-f-]{36}'/g, "'<uuid>'")).sort();
		expect(normalize(bytesNation.pageErrors)).toEqual(normalize(upstream.pageErrors));
		expect(diffVisibility(await readVisibilityMap(bytesNation.page), await readVisibilityMap(upstream.page))).toEqual([]);
		await upstream.context.close();
		await bytesNation.context.close();
	});
});

for (const theme of ["dark", "light"] as const) {
	test(`contrast AA: command palette and a notification, ${theme}`, async ({ browser }, testInfo) => {
		test.skip(testInfo.project.name !== "chromium" && testInfo.project.name !== "webkit", "contrast is engine-independent; chromium and webkit cover it");
		const query = ["director=bnlayerroom", theme === "light" ? "lightmode" : ""].filter(Boolean).join("&");
		const { context, page } = await openEnginePage({ browser, url: withQuery(bnBase, query), contextOptions: projectContextOptions(testInfo) });
		await page.evaluate(() => {
			const row = document.createElement("div");
			row.className = "inMessage";
			row.innerHTML = '<b><i><span class="chat_name">Sam</span>:</i></b> ready when you are';
			(document.getElementById("chatBody") as HTMLElement).appendChild(row);
		});
		await expect(page.locator("[data-sonner-toast]")).toHaveCount(1, { timeout: 8000 });
		await openPalette(page, testInfo);
		await page.waitForTimeout(400);
		const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).include(".bn-cmd").include("[data-sonner-toast]").analyze();
		const failures = results.violations.flatMap(violation => violation.nodes.map(node => `${node.target.join(" ")}: ${node.failureSummary ? node.failureSummary.split("\n").slice(1).join(" ").trim() : ""}`));
		expect(failures, `palette and notification contrast failures (${theme})`).toEqual([]);
		await context.close();
	});
}
