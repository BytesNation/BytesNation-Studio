import { expect, test } from "@playwright/test";
import { bnBase, diffVisibility, openEnginePage, projectContextOptions, readEngineState, readVisibilityMap, upstreamBase, withQuery } from "./support/harness";

/**
 * BytesNation-specific guarantees: dark by default, light on request, the
 * required credit, the &classicui escape hatch, and untouched transparency
 * paths for OBS and &transparent.
 */
test.describe("theme and shell", () => {
	test("dark is the default even when the OS prefers light", async ({ browser }, testInfo) => {
		const { context, page } = await openEnginePage({ browser, url: bnBase, contextOptions: projectContextOptions(testInfo, { colorScheme: "light" }) });
		await expect(page.locator("body")).toHaveClass(/darktheme/);
		await expect(page.locator("html")).toHaveClass(/bn-dark/);
		const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
		expect(background).toBe("rgb(10, 11, 13)");
		await context.close();
	});

	test("&lightmode gives the light theme", async ({ browser }, testInfo) => {
		const { context, page } = await openEnginePage({ browser, url: withQuery(bnBase, "lightmode"), contextOptions: projectContextOptions(testInfo) });
		await expect(page.locator("body")).not.toHaveClass(/darktheme/);
		const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
		expect(background).toBe("rgb(243, 241, 237)");
		await context.close();
	});

	test("credit is visible in the launcher footer and the About view", async ({ browser }, testInfo) => {
		const { context, page } = await openEnginePage({ browser, url: bnBase, contextOptions: projectContextOptions(testInfo) });
		const footer = page.locator("#bn-footer");
		await expect(footer).toContainText("BytesNation Studio is built on VDO.Ninja by Steve Seguin (AGPL-3.0)");
		await expect(footer.locator('a[href="https://github.com/steveseguin/vdo.ninja"]')).toBeVisible();
		await expect(footer.locator('a[href="https://github.com/BytesNation/BytesNation-Studio"]')).toBeVisible();

		// On phones the app bar keeps only the palette button; About is a command in it.
		if (testInfo.project.name.startsWith("mobile")) {
			await page.locator(".bn-cmd-trigger").click();
			await page.locator('[data-command-id="studio:about"]').click();
		} else {
			await page.getByRole("button", { name: "About BytesNation Studio" }).click();
		}
		const dialog = page.getByRole("dialog");
		await expect(dialog).toContainText("BytesNation Studio is built on VDO.Ninja by Steve Seguin (AGPL-3.0).");
		await expect(dialog.locator('a[href="https://github.com/BytesNation/BytesNation-Studio"]')).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
		await context.close();
	});

	test("theme switch flips the engine theme and is remembered", async ({ browser }, testInfo) => {
		test.skip(testInfo.project.name.startsWith("mobile"), "same code path as desktop");
		const { context, page } = await openEnginePage({ browser, url: bnBase, contextOptions: projectContextOptions(testInfo) });
		await page.getByRole("button", { name: "Switch to light theme" }).click();
		await expect(page.locator("body")).not.toHaveClass(/darktheme/);
		expect(await page.evaluate(() => (window as unknown as { session: { darkmode: boolean } }).session.darkmode)).toBe(false);
		await page.reload();
		await page.waitForTimeout(2000);
		await expect(page.locator("body")).not.toHaveClass(/darktheme/);
		await context.close();
	});

	test("&classicui restores upstream presentation exactly", async ({ browser }, testInfo) => {
		const query = "classicui";
		const [upstream, classic] = await Promise.all([
			openEnginePage({ browser, url: withQuery(upstreamBase, query), contextOptions: projectContextOptions(testInfo) }),
			openEnginePage({ browser, url: withQuery(bnBase, query), contextOptions: projectContextOptions(testInfo) })
		]);
		expect(await classic.page.evaluate(() => (document.getElementById("bn-theme") as HTMLLinkElement).disabled)).toBe(true);
		await expect(classic.page.locator("#bn-shell-root")).toHaveCount(0);
		// In classic mode even #logoname is shown, so compare without exceptions.
		const classicMap = await readVisibilityMap(classic.page);
		const upstreamMap = await readVisibilityMap(upstream.page);
		expect(Object.keys(classicMap).filter(elementId => classicMap[elementId] !== upstreamMap[elementId])).toEqual([]);
		expect(await readEngineState(classic.page)).toEqual(await readEngineState(upstream.page));
		const backgrounds = await Promise.all([upstream.page, classic.page].map(page => page.evaluate(() => getComputedStyle(document.body).backgroundColor)));
		expect(backgrounds[1]).toBe(backgrounds[0]);
		await upstream.context.close();
		await classic.context.close();
	});

	test("&transparent keeps every layer transparent", async ({ browser }, testInfo) => {
		const { context, page } = await openEnginePage({ browser, url: withQuery(bnBase, "scene=0&room=bnthemeroom&transparent"), contextOptions: projectContextOptions(testInfo) });
		const layers = await page.evaluate(() => ["html", "body", "#gridlayout"].map(selector => {
			const element = document.querySelector(selector);
			return element ? getComputedStyle(element).backgroundColor : "missing";
		}));
		layers.forEach(color => expect(color).toMatch(/rgba\(0, 0, 0, 0\)|transparent|missing/));
		await context.close();
	});

	test("in OBS the shell stays out and the engine behaves as upstream", async ({ browser }, testInfo) => {
		const obsInit = "window.obsstudio = { pluginVersion: '30.0.0', getCurrentScene: function () {} };";
		const query = "scene=0&room=bnobsroom";
		const [upstream, bytesNation] = await Promise.all([
			openEnginePage({ browser, url: withQuery(upstreamBase, query), contextOptions: projectContextOptions(testInfo), initScript: obsInit }),
			openEnginePage({ browser, url: withQuery(bnBase, query), contextOptions: projectContextOptions(testInfo), initScript: obsInit })
		]);
		await expect(bytesNation.page.locator("#bn-shell-root")).toHaveCount(0);
		expect(diffVisibility(await readVisibilityMap(bytesNation.page), await readVisibilityMap(upstream.page))).toEqual([]);
		expect(await readEngineState(bytesNation.page)).toEqual(await readEngineState(upstream.page));
		await upstream.context.close();
		await bytesNation.context.close();
	});
});
