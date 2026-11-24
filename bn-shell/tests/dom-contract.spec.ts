import { expect, test } from "@playwright/test";
import { bnBase, projectContextOptions, openEnginePage, readEngineState, upstreamBase, withQuery } from "./support/harness";

/**
 * Element ids are the engine's API (getById never throws). Every id upstream
 * renders in each view must exist in BytesNation Studio, with the same tag,
 * and the engine must reach the same state.
 */
const views = [
	{ name: "launcher", query: "" },
	{ name: "director", query: "director=bncontractroom" },
	{ name: "guest join", query: "room=bncontractroom" },
	{ name: "publish", query: "push=bncontractstream" },
	{ name: "publish webcam autostart", query: "push=bncontractstream&webcam&autostart" },
	{ name: "view", query: "view=bncontractstream" },
	{ name: "scene", query: "scene=0&room=bncontractroom" },
	{ name: "clean output", query: "view=bncontractstream&cleanoutput" }
];

const readIdTags = async (page: import("@playwright/test").Page): Promise<Record<string, string>> =>
	page.evaluate(() => {
		const tags: Record<string, string> = {};
		document.querySelectorAll("[id]").forEach(element => {
			if (element.id && element.id.indexOf("bn-") !== 0) {
				tags[element.id] = element.tagName;
			}
		});
		return tags;
	});

for (const view of views) {
	test(`DOM contract: ${view.name}`, async ({ browser }, testInfo) => {
		// Load both in parallel so engine timers (retry spinners, reconnect loops) line up.
		const [upstream, bytesNation] = await Promise.all([
			openEnginePage({ browser, url: withQuery(upstreamBase, view.query), contextOptions: projectContextOptions(testInfo) }),
			openEnginePage({ browser, url: withQuery(bnBase, view.query), contextOptions: projectContextOptions(testInfo) })
		]);

		const upstreamIds = await readIdTags(upstream.page);
		const bytesNationIds = await readIdTags(bytesNation.page);
		const missing = Object.keys(upstreamIds).filter(elementId => !(elementId in bytesNationIds));
		const retagged = Object.keys(upstreamIds).filter(elementId => elementId in bytesNationIds && bytesNationIds[elementId] !== upstreamIds[elementId]);
		expect(missing, "upstream ids missing in BytesNation").toEqual([]);
		expect(retagged, "ids whose element type changed").toEqual([]);

		expect(await readEngineState(bytesNation.page)).toEqual(await readEngineState(upstream.page));
		expect(bytesNation.pageErrors, "page errors in BytesNation that upstream does not have").toEqual(upstream.pageErrors);

		await upstream.context.close();
		await bytesNation.context.close();
	});
}
