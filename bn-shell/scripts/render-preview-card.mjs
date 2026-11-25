#!/usr/bin/env node
/**
 * Renders the link preview card (the image Discord, Slack, iMessage and X show
 * beside a link to the site) to public/preview-card.png, 1200x630.
 *
 * The card uses the theme's dark tokens, the header's lockup and the shipped
 * fonts, so it stays in step with the site. Run it again after the mark, the
 * tokens or the wording change, then build:
 *
 *   node scripts/render-preview-card.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const shellDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(shellDir, "public/preview-card.png");
const cardSize = { width: 1200, height: 630 };

// The dark theme's values, from src/theme/tokens.css.
const tokens = { background: "#0a0b0d", text: "#edebe6", textMuted: "#9ea3ab", border: "#22252b", accent: "#ff6a13" };

const fontFiles = [
	{ family: "Inter Tight", weight: 400, file: "@fontsource/inter-tight/files/inter-tight-latin-400-normal.woff2" },
	{ family: "Inter Tight", weight: 600, file: "@fontsource/inter-tight/files/inter-tight-latin-600-normal.woff2" },
	{ family: "Geist Mono", weight: 500, file: "@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff2" }
];

const buildFontFaces = () =>
	fontFiles
		.map(font => {
			const encoded = readFileSync(join(shellDir, "node_modules", font.file)).toString("base64");
			return `@font-face { font-family: "${font.family}"; font-weight: ${font.weight}; src: url(data:font/woff2;base64,${encoded}) format("woff2"); }`;
		})
		.join("\n");

/** The mark as drawn in src/components/BrandMark.tsx. */
const brandMark = `<svg viewBox="0 0 64 64" width="76" height="76" aria-hidden="true">
	<path d="M16 14 L16 50 M16 14 L47 32 M16 50 L47 32" stroke="${tokens.text}" stroke-width="3.2" stroke-linecap="round" fill="none" />
	<path d="M16 32 L31 32" stroke="${tokens.text}" stroke-width="3.2" stroke-linecap="round" opacity="0.55" />
	<circle cx="16" cy="14" r="6" fill="${tokens.text}" />
	<circle cx="16" cy="50" r="6" fill="${tokens.text}" />
	<circle cx="16" cy="32" r="3.4" fill="${tokens.text}" />
	<circle cx="47" cy="32" r="8" fill="${tokens.accent}" />
</svg>`;

const buildCardHtml = () => `<!doctype html>
<html>
	<head>
		<meta charset="utf-8" />
		<style>
			${buildFontFaces()}
			* { box-sizing: border-box; margin: 0; }
			body { width: ${cardSize.width}px; height: ${cardSize.height}px; background: ${tokens.background}; color: ${tokens.text}; font-family: "Inter Tight", sans-serif; }
			.card { display: flex; flex-direction: column; justify-content: space-between; height: 100%; padding: 72px 80px 64px; }
			.lockup { display: flex; align-items: center; gap: 20px; font-size: 54px; font-weight: 600; letter-spacing: -0.02em; }
			.lockup svg { margin-left: -12px; }
			.lockup span { font-weight: 400; color: ${tokens.textMuted}; }
			h1 { max-width: 940px; font-size: 84px; font-weight: 600; line-height: 1.04; letter-spacing: -0.03em; }
			.labels { display: flex; justify-content: space-between; padding-top: 28px; border-top: 1px solid ${tokens.border}; font-family: "Geist Mono", monospace; font-size: 22px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: ${tokens.textMuted}; }
			.labels strong { font-weight: 500; color: ${tokens.text}; }
		</style>
	</head>
	<body>
		<div class="card">
			<div class="lockup">${brandMark}<div>BytesNation <span>Studio</span></div></div>
			<h1>Live guests into OBS,<br />from any browser.</h1>
			<div class="labels"><strong>studio.bytesnation.com</strong><div>Peer to peer / Nothing to install</div></div>
		</div>
	</body>
</html>`;

const main = async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: cardSize, deviceScaleFactor: 1 });
	await page.setContent(buildCardHtml(), { waitUntil: "load" });
	await page.evaluate(() => document.fonts.ready);
	await page.screenshot({ path: outputPath, type: "png" });
	await browser.close();
	process.stdout.write(`Wrote ${outputPath}\n`);
};

await main();
