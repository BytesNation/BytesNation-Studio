import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { bnBase, openEnginePage, projectContextOptions, upstreamBase, withQuery } from "./support/harness";

/**
 * Podcast Studio (&podcast) against upstream, screen by screen.
 *
 * Its elements carry classes, not ids, so the DOM contract used for the
 * engine views does not see them. These tests compare the structure upstream
 * builds (tag, classes, text and visibility of every element under its
 * roots) with what BytesNation shows, check contrast in both themes, and
 * hold every visible element to the brand's banned list: no blur, no
 * gradients, no pills.
 *
 * Signaling is blocked, as in the parameter sweep; both builds sit in the same
 * "connecting" state.
 */
const screens = [
	{ name: "room gate", query: "podcast", enter: async () => undefined, ready: "#podcast-room-gate" },
	{ name: "setup check", query: "podcast&director=bnpodparity", enter: async () => undefined, ready: ".podcast-preflight-panel" },
	{
		name: "control room",
		query: "podcast&director=bnpodparity",
		// Pressed through the DOM, not by pointer: on a small phone upstream's setup check
		// leaves this button below the screen in a layer that cannot scroll, so a real tap
		// never lands there. Both builds must still reach the control room to be compared.
		enter: async (page: Page) => {
			await page.evaluate(() => (document.querySelector(".preflight-secondary") as HTMLElement).click());
		},
		ready: ".podcast-main"
	}
];

const podcastRoots = "#podcast-root, #podcast-room-gate, .podcast-preflight-backdrop, .remote-overlay, .help-overlay";

/** One line per element under Podcast Studio's roots: tag, classes, own text, visible or not. */
const readStructure = (page: Page): Promise<string[]> =>
	page.evaluate(rootSelector => {
		const lines: string[] = [];
		const describe = (element: Element): void => {
			// The shell's brand and tools slots in the header are additions, not upstream's.
			if (element.classList.contains("bn-slot")) {
				return;
			}
			const ownText = Array.prototype.map
				.call(element.childNodes, (node: ChildNode) => (node.nodeType === 3 ? (node.textContent || "").trim() : ""))
				.join(" ")
				.replace(/\d+/g, "#")
				.trim();
			const classNames = Array.prototype.slice.call(element.classList).sort().join(".");
			const style = window.getComputedStyle(element);
			const isVisible = element.getClientRects().length > 0 && style.visibility !== "hidden";
			lines.push(`${element.tagName.toLowerCase()}.${classNames}|${isVisible ? "shown" : "hidden"}|${ownText}`);
			Array.prototype.forEach.call(element.children, describe);
		};
		Array.prototype.forEach.call(document.querySelectorAll(rootSelector), describe);
		return lines;
	}, podcastRoots);

/** Visible elements that break the banned list, as "selector: what". */
const findBannedPaint = (page: Page): Promise<string[]> =>
	page.evaluate(rootSelector => {
		const findings: string[] = [];
		const label = (element: Element): string => `${element.tagName.toLowerCase()}.${Array.prototype.slice.call(element.classList).join(".")}`;
		const isFlatBands = (image: string): boolean => /repeating-linear-gradient/.test(image) || /var\(|rgb/.test(image) === false || /(\d+%)\s*,[^,]+\s\1/.test(image);
		document.querySelectorAll(rootSelector).forEach(root => {
			[root].concat(Array.prototype.slice.call(root.querySelectorAll("*"))).forEach(element => {
				if (element.getClientRects().length === 0) {
					return;
				}
				const style = window.getComputedStyle(element);
				const box = element.getBoundingClientRect();
				const radius = parseFloat(style.borderTopLeftRadius) || 0;
				const isCircle = Math.abs(box.width - box.height) < 1 && (style.borderTopLeftRadius.indexOf("%") > -1 || radius >= box.width / 2 - 1);
				if (style.backdropFilter && style.backdropFilter !== "none") {
					findings.push(`${label(element)}: backdrop-filter ${style.backdropFilter}`);
				}
				if (/gradient\(/.test(style.backgroundImage) && !isFlatBands(style.backgroundImage)) {
					findings.push(`${label(element)}: gradient ${style.backgroundImage.slice(0, 60)}`);
				}
				if (radius > 8 && !isCircle) {
					findings.push(`${label(element)}: radius ${style.borderTopLeftRadius}`);
				}
			});
		});
		return findings;
	}, podcastRoots);

const openScreen = async (browser: Parameters<typeof openEnginePage>[0]["browser"], base: string, screen: (typeof screens)[number], extraQuery: string, contextOptions: object) => {
	const opened = await openEnginePage({ browser, url: withQuery(base, [screen.query, extraQuery].filter(Boolean).join("&")), contextOptions });
	await opened.page.waitForSelector(screen.name === "control room" ? ".podcast-preflight-panel" : screen.ready, { state: "visible" });
	await screen.enter(opened.page);
	await opened.page.waitForSelector(screen.ready, { state: "visible" });
	await opened.page.waitForTimeout(800);
	return opened;
};

test("podcast studio, setup check: Skip preflight can be reached and tapped, also on a phone", async ({ browser }, testInfo) => {
	// Upstream centers the setup check in a layer that cannot scroll; on an iPhone-sized
	// screen its buttons end up off screen. BytesNation lets that layer scroll.
	const { context, page } = await openEnginePage({ browser, url: withQuery(bnBase, "podcast&director=bnpodparity"), contextOptions: projectContextOptions(testInfo) });
	await page.waitForSelector(".podcast-preflight-panel", { state: "visible" });
	await page.getByRole("button", { name: /skip preflight/i }).click({ timeout: 15_000 });
	await expect(page.locator(".podcast-main")).toBeVisible();
	await context.close();
});

for (const screen of screens) {
	test(`podcast studio, ${screen.name}: same elements, text and visibility as upstream`, async ({ browser }, testInfo) => {
		const contextOptions = projectContextOptions(testInfo);
		const [upstream, bytesNation] = await Promise.all([openScreen(browser, upstreamBase, screen, "", contextOptions), openScreen(browser, bnBase, screen, "", contextOptions)]);
		expect(await readStructure(bytesNation.page)).toEqual(await readStructure(upstream.page));
		await upstream.context.close();
		await bytesNation.context.close();
	});

	for (const theme of ["dark", "light"] as const) {
		test(`podcast studio, ${screen.name}, ${theme}: brand rules and AA contrast`, async ({ browser }, testInfo) => {
			test.skip(testInfo.project.name !== "chromium" && testInfo.project.name !== "webkit" && testInfo.project.name !== "mobile-chrome", "paint is engine-independent; chromium, webkit and a phone profile cover it");
			const { context, page } = await openScreen(browser, bnBase, screen, theme === "light" ? "lightmode" : "", projectContextOptions(testInfo));
			expect(await findBannedPaint(page), "blur, gradients and pill radii are banned (docs/DESIGN.md)").toEqual([]);
			const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).exclude("canvas").exclude("video").analyze();
			const failures = results.violations.flatMap(violation => violation.nodes.map(node => `${node.target.join(" ")}: ${node.failureSummary ? node.failureSummary.split("\n").slice(1).join(" ").trim() : ""}`));
			expect(failures, `${screen.name} (${theme}) contrast failures`).toEqual([]);
			await context.close();
		});
	}
}
