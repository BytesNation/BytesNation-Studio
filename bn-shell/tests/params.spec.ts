import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { bnBase, projectContextOptions, diffVisibility, openEnginePage, readEngineState, readVisibilityMap, roleBaseQuery, upstreamBase, withQuery } from "./support/harness";

/**
 * URL-parameter differential. For every parameter in the inventory, load the
 * same link in upstream and in BytesNation Studio and compare what the engine
 * shows (visibility of every engine element) and the state it reaches.
 * Parsing itself is covered by the footprint test (engine files identical);
 * this proves the presentation layer does not hide, reveal or break anything
 * a parameter controls.
 *
 * Signaling is blocked (offline), so the sweep never loads the public server.
 * Chromium runs every parameter; other engines run the UI-facing parameters
 * plus a fixed sample.
 */
interface ParamRecord {
	param: string;
	aliases: string[];
	role: string;
	isUiFacing: boolean | null;
}

const inventoryPath = join(dirname(fileURLToPath(import.meta.url)), "../../docs/inventory/params.json");
const params: ParamRecord[] = JSON.parse(readFileSync(inventoryPath, "utf8"));

/** Parameters whose effect is to leave the page or block on a native prompt; compared by final URL only. */
const navigatingParams = new Set(["redirect", "redirectpage", "goto"]);

const isInSample = (record: ParamRecord, index: number): boolean => record.isUiFacing === true || index % 6 === 0;

params.forEach((record, index) => {
	test(`param &${record.param}`, async ({ browser }, testInfo) => {
		const isChromium = testInfo.project.name === "chromium";
		test.skip(!isChromium && !isInSample(record, index), "full sweep runs in chromium; other engines run the UI-facing sample");

		const baseQuery = roleBaseQuery(record.role);
		const query = baseQuery ? `${baseQuery}&${record.param}` : record.param;
		// Load both in parallel so engine timers (retry spinners, reconnect loops) line up.
		const [upstream, bytesNation] = await Promise.all([
			openEnginePage({ browser, url: withQuery(upstreamBase, query), contextOptions: projectContextOptions(testInfo) }),
			openEnginePage({ browser, url: withQuery(bnBase, query), contextOptions: projectContextOptions(testInfo) })
		]);

		if (navigatingParams.has(record.param)) {
			expect(new URL(bytesNation.page.url()).search).toBe(new URL(upstream.page.url()).search);
		} else {
			const differences = diffVisibility(await readVisibilityMap(bytesNation.page), await readVisibilityMap(upstream.page));
			expect(differences, `&${record.param}: engine elements shown or hidden differently`).toEqual([]);
			expect(await readEngineState(bytesNation.page)).toEqual(await readEngineState(upstream.page));
		}

		await upstream.context.close();
		await bytesNation.context.close();
	});
});
