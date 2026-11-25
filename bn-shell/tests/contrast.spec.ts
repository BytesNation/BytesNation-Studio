import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { bnBase, openEnginePage, projectContextOptions, withQuery } from "./support/harness";

/**
 * WCAG AA color contrast (axe-core rule "color-contrast") across the main
 * views in both themes. Text over live video is excluded: axe cannot read a
 * video frame, and those labels sit on their own dark scrim.
 */
const views: { name: string; query: string; waitFor?: string }[] = [
	{ name: "launcher", query: "" },
	{ name: "director", query: "director=bncontrastroom" },
	{ name: "guest join", query: "room=bncontrastroom" },
	{ name: "publish", query: "push=bncontraststream&webcam" },
	// Panels that inject their own fixed-color styles; the call-in panel was unreadable in the light theme before it was themed.
	{ name: "phone call-in panel", query: "push=bncontrastcall&webcam&callin", waitFor: "#vdo-callin-panel" },
	{ name: "icecast panel", query: "push=bncontrastice&webcam&icecastpush", waitFor: "#vdo-icecast-panel" }
];

for (const theme of ["dark", "light"] as const) {
	for (const view of views) {
		test(`contrast AA: ${view.name}, ${theme}`, async ({ browser }, testInfo) => {
			test.skip(testInfo.project.name !== "chromium" && testInfo.project.name !== "webkit", "contrast is engine-independent; chromium and webkit cover it");
			const query = [view.query, theme === "light" ? "lightmode" : ""].filter(Boolean).join("&");
			const { context, page } = await openEnginePage({ browser, url: withQuery(bnBase, query), contextOptions: projectContextOptions(testInfo) });
			if (view.waitFor) {
				await page.waitForSelector(view.waitFor, { state: "visible" });
			}
			const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).exclude("video").exclude("#gridlayout").analyze();
			const failures = results.violations.flatMap(violation => violation.nodes.map(node => `${node.target.join(" ")}: ${node.failureSummary ? node.failureSummary.split("\n").slice(1).join(" ").trim() : ""}`));
			expect(failures, `${view.name} (${theme}) contrast failures`).toEqual([]);
			await context.close();
		});
	}
}
