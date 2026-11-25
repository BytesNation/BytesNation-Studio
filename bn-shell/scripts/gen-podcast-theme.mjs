#!/usr/bin/env node
/**
 * Generates the BytesNation theme for Podcast Studio from upstream's own
 * stylesheet, podcast/studio.css.
 *
 * Upstream paints Podcast Studio with about 470 fixed colors, gradients,
 * blurs and pill radii, and no custom properties, so there is nothing to
 * remap. This script reads every rule and writes an override for each paint
 * declaration, pointing it at a BytesNation token. Each override repeats
 * upstream's selector behind `html body.podcast-studio-mode`. That outranks
 * upstream's own rule whatever order the sheets load in, and it outranks
 * main.css's `.darktheme :not(.promptModalInner) > button`, which otherwise
 * repaints every button on the page.
 *
 * What it maps (see docs/DESIGN.md for the rules behind each):
 *   color, background, border colors -> surface, text and status tokens
 *   gradients                        -> flat fills (a level meter keeps three flat bands)
 *   backdrop-filter                  -> none
 *   box-shadow                       -> the one elevation shadow, or none
 *   border-radius                    -> the radius scale; pills become squares
 *   font-family, uppercase labels    -> Inter Tight, Geist Mono for labels
 *   opacity used to dim text         -> full opacity with the muted text token
 *
 * Hand-written refinements live next to the output in overrides.css. Rerun
 * after an upstream merge; the output is checked in, and a test fails if it
 * no longer matches podcast/studio.css.
 *
 * Usage: node bn-shell/scripts/gen-podcast-theme.mjs [--check]
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = join(repoRoot, "podcast/studio.css");
const outputPath = join(repoRoot, "bn-shell/src/theme/podcast/generated.css");

/** The one primary action on each screen: the accent fill. */
const primarySelectors = [/\.podcast-room-gate__submit/, /\.preflight-primary/, /\.btn-record(?![\w.-]*\.recording)/];
/** A live recording: the error fill, as the engine's "armed" state. */
const liveSelectors = [/\.btn-record\.recording/];
/** Where green text reports a state. Everywhere else upstream's green is decoration and becomes plain text. */
const statusSelector = /status|live|ready|success|active|recording|connected|pill|badge|indicator|meter|level|online|linked|enabled|granted|dest-light|drive/;
const buttonSelector = /button|btn|__submit|__close|-toggle|preflight-(?:primary|secondary)|invite-link-copy|__action/;
/** Layers that sit above the page. Panels in the page flow get no shadow: no floating cards. */
const floatingSelector = /room-gate__panel|preflight-panel|remote-overlay__|help-overlay__|modal|menu|popover|toast|dialog|dropdown|tooltip/;
const backdropSelector = /backdrop|-overlay$|^\.remote-overlay$|^\.help-overlay$/;
const pageSelector = /^body\.podcast-studio-mode$|^#podcast-root$|^#podcast-room-gate$/;

/** Opacity that is not there to dim text: disabled controls, overlays and the waveform. */
const keptOpacitySelector = /:disabled|\[disabled\]|::before|::after|wavefill/;

const colorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;

/**
 * Parses one CSS color into channels.
 * @param {string} text hex, rgb() or rgba()
 * @returns {{red: number, green: number, blue: number, alpha: number}}
 */
const parseColor = text => {
	if (text[0] === "#") {
		const hex = text.length <= 5 ? text.slice(1).replace(/./g, "$&$&") : text.slice(1);
		const channel = offset => parseInt(hex.slice(offset, offset + 2), 16);
		return { red: channel(0), green: channel(2), blue: channel(4), alpha: hex.length === 8 ? channel(6) / 255 : 1 };
	}
	const parts = text.slice(text.indexOf("(") + 1, -1).split(/[\s,/]+/).filter(Boolean).map(parseFloat);
	return { red: parts[0], green: parts[1], blue: parts[2], alpha: parts.length > 3 ? parts[3] : 1 };
};

/**
 * Sorts a color into the handful of roles upstream's palette uses.
 * @param {string} text
 * @returns {{family: "white" | "dark" | "black" | "green" | "blue" | "red" | "yellow", alpha: number, lightness: number}}
 */
const classifyColor = text => {
	const { red, green, blue, alpha } = parseColor(text);
	const highest = Math.max(red, green, blue);
	const lowest = Math.min(red, green, blue);
	const lightness = (highest + lowest) / 510;
	const spread = highest - lowest;
	if (highest === 0) {
		return { family: "black", alpha, lightness };
	}
	if (lightness >= 0.88 || (spread < 40 && lightness >= 0.7)) {
		return { family: "white", alpha, lightness };
	}
	if (lightness <= 0.3) {
		return { family: "dark", alpha, lightness };
	}
	let hue = highest === red ? ((green - blue) / spread) % 6 : highest === green ? (blue - red) / spread + 2 : (red - green) / spread + 4;
	hue = (hue * 60 + 360) % 360;
	const family = hue >= 80 && hue < 200 ? "green" : hue >= 200 && hue < 290 ? "blue" : hue >= 25 && hue < 80 ? "yellow" : "red";
	return { family, alpha, lightness };
};

const matchesAny = (selector, patterns) => patterns.some(pattern => pattern.test(selector));

/** The fill a rule ends up with, so its text can take the matching ink. */
const fillRole = (selector, value) => {
	if (matchesAny(selector, liveSelectors)) {
		return "error";
	}
	if (matchesAny(selector, primarySelectors)) {
		return "accent";
	}
	const colors = (value.match(colorPattern) || []).map(classifyColor);
	const strong = colors.find(color => color.alpha >= 0.5 && ["green", "yellow", "red"].indexOf(color.family) > -1);
	return strong ? { green: "ok", yellow: "warn", red: "error" }[strong.family] : "surface";
};

/** A dark upstream surface, by how deep it sits: wells, panels, raised cards. */
const darkSurfaceToken = (selector, color) => {
	if (pageSelector.test(selector)) {
		return "var(--bn-bg)";
	}
	if (backdropSelector.test(selector)) {
		return "var(--bn-scrim)";
	}
	if (color.lightness < 0.065) {
		return "var(--bn-sunken)";
	}
	return color.lightness < 0.115 ? "var(--bn-surface)" : "var(--bn-surface-2)";
};

/** One flat fill for a background color. */
const fillToken = (selector, colorText) => {
	const color = classifyColor(colorText);
	const role = fillRole(selector, colorText);
	if (role === "accent") {
		return /:hover/.test(selector) ? "var(--bn-accent-hover)" : "var(--bn-accent)";
	}
	if (role === "error") {
		return "var(--bn-error)";
	}
	if (color.family === "dark") {
		return darkSurfaceToken(selector, color);
	}
	if (color.family === "black") {
		return backdropSelector.test(selector) ? "var(--bn-scrim)" : "var(--bn-sunken)";
	}
	if (color.family === "white") {
		return color.alpha <= 0.06 ? "var(--bn-surface-2)" : "var(--bn-surface-3)";
	}
	// A tint marks a state (hover, selected, linked): one neutral step. A solid status color stays a status fill.
	return color.alpha < 0.5 ? "var(--bn-surface-3)" : `var(--bn-${{ green: "ok", yellow: "warn", red: "error", blue: "text-muted" }[color.family]})`;
};

const isMeterGradient = value => /gradient/.test(value) && ["green", "yellow", "red"].every(family => (value.match(colorPattern) || []).some(text => classifyColor(text).family === family));

/**
 * Maps a background value. Gradients and stripes flatten to one fill; a level
 * meter keeps its three zones as flat bands.
 */
const mapBackground = (selector, value) => {
	if (/^(none|transparent|inherit)$/.test(value) || !colorPattern.test(value)) {
		return null;
	}
	colorPattern.lastIndex = 0;
	if (isMeterGradient(value)) {
		return "linear-gradient(90deg, var(--bn-ok) 0 70%, var(--bn-warn) 70% 90%, var(--bn-error) 90% 100%)";
	}
	if (/repeating-linear-gradient/.test(value)) {
		// Striped fills are decoration; the well they sit in stays.
		return "var(--bn-sunken)";
	}
	const colors = value.match(colorPattern);
	if (/gradient/.test(value) && colors.every(text => classifyColor(text).family === "white")) {
		return "none";
	}
	return fillToken(selector, colors[0]);
};

/** Text color: upstream's white-with-alpha scale becomes text, muted and faint. */
const mapTextColor = (selector, value, role) => {
	if (!colorPattern.test(value)) {
		return null;
	}
	colorPattern.lastIndex = 0;
	if (role !== "surface") {
		return `var(--bn-${role}-ink)`;
	}
	const color = classifyColor(value.match(colorPattern)[0]);
	if (color.family === "red" || color.family === "yellow") {
		return `var(--bn-${color.family === "red" ? "error" : "warn"})`;
	}
	if (color.family === "green") {
		return statusSelector.test(selector) ? "var(--bn-ok)" : "var(--bn-text)";
	}
	if (color.family !== "white") {
		return "var(--bn-text)";
	}
	return color.alpha >= 0.8 ? "var(--bn-text)" : "var(--bn-text-muted)";
};

/**
 * Border and outline colors: hairlines stay neutral; only error and warning
 * carry color. Upstream's green and blue lines mark a state (connected,
 * selected, focused): a strong border, or the control border on an outline.
 */
const mapLineColors = (property, value) =>
	value.replace(colorPattern, text => {
		const color = classifyColor(text);
		if (color.family === "red" || color.family === "yellow") {
			return `var(--bn-${color.family === "red" ? "error" : "warn"})`;
		}
		if (color.family === "green" || color.family === "blue") {
			return /^outline/.test(property) ? "var(--bn-control-border)" : "var(--bn-border-strong)";
		}
		return color.family === "white" && color.alpha > 0.14 ? "var(--bn-border-strong)" : "var(--bn-border)";
	});

/** Shadows: a spread-only ring stays a ring, floating layers get the one elevation, glows go. */
const mapShadow = (selector, value) => {
	if (value === "none") {
		return null;
	}
	const isRing = /^(inset\s+)?0\s+0\s+0\s+\d/.test(value) && value.indexOf("),") === -1;
	if (isRing) {
		return `${/^inset/.test(value) ? "inset " : ""}0 0 0 1px var(--bn-control-border)`;
	}
	return floatingSelector.test(selector) ? "var(--bn-shadow)" : "none";
};

/** Radii: pills become squares, true circles stay round, the rest snaps to the scale. */
const mapRadius = (value, isDot) =>
	value.replace(/(\d+(?:\.\d+)?)px/g, (text, size) => {
		const pixels = parseFloat(size);
		if (pixels >= 99) {
			return isDot ? "50%" : "var(--bn-radius-sm)";
		}
		if (pixels <= 2) {
			return text;
		}
		return pixels >= 14 ? "var(--bn-radius-lg)" : pixels >= 8 ? "var(--bn-radius)" : "var(--bn-radius-sm)";
	});

/** A small element with equal width and height is a status dot, not a pill. */
const isDotRule = declarations => {
	const width = declarations.find(declaration => declaration.property === "width");
	const height = declarations.find(declaration => declaration.property === "height");
	return Boolean(width && height && width.value === height.value && parseFloat(width.value) <= 20);
};

/** Type: uppercase labels go to mono with the label tracking; buttons drop the caps. */
const mapType = (selector, declaration) => {
	if (declaration.property === "font-family") {
		return [["font-family", /mono|courier|consolas|menlo/i.test(declaration.value) ? "var(--bn-font-mono)" : "var(--bn-font-sans)"]];
	}
	if (declaration.property === "text-transform" && declaration.value === "uppercase") {
		return buttonSelector.test(selector)
			? [["text-transform", "none"], ["letter-spacing", "0"]]
			: [["font-family", "var(--bn-font-mono)"], ["letter-spacing", "var(--bn-label-tracking)"]];
	}
	return [];
};

/**
 * Upstream dims secondary text with opacity on top of its color. On a token
 * that is already the muted text color, the result drops under AA contrast.
 * The dimming moves into the color: full opacity, and the muted token where
 * the rule sets no color of its own.
 * @returns {string[][]} [property, value] pairs
 */
const mapOpacity = (selector, value, hasOwnColor) => {
	const amount = parseFloat(value);
	if (!(amount < 1) || keptOpacitySelector.test(selector)) {
		return [];
	}
	return hasOwnColor || amount >= 0.8 ? [["opacity", "1"]] : [["opacity", "1"], ["color", "var(--bn-text-muted)"]];
};

/**
 * Builds the overrides for one upstream rule.
 * @param {string} selector
 * @param {{property: string, value: string, isImportant: boolean}[]} declarations
 * @returns {string[]} "property: value" lines
 */
const themeDeclarations = (selector, declarations) => {
	const background = declarations.find(declaration => declaration.property === "background" || declaration.property === "background-color");
	const role = background ? fillRole(selector, background.value) : matchesAny(selector, liveSelectors) ? "error" : matchesAny(selector, primarySelectors) ? "accent" : "surface";
	const isUppercase = declarations.some(declaration => declaration.property === "text-transform" && declaration.value === "uppercase");
	const hasOwnColor = declarations.some(declaration => declaration.property === "color");
	const lines = [];
	const push = (property, value, isImportant) => {
		if (value !== null && value !== undefined) {
			lines.push(`${property}: ${value}${isImportant ? " !important" : ""}`);
		}
	};
	declarations.forEach(declaration => {
		const { property, value, isImportant } = declaration;
		if (property === "color") {
			push(property, mapTextColor(selector, value, role), isImportant);
		} else if (property === "background" || property === "background-color") {
			push(property, mapBackground(selector, value), isImportant);
		} else if (/^(border(-(top|right|bottom|left))?(-color)?|outline(-color)?)$/.test(property) && colorPattern.test(value)) {
			colorPattern.lastIndex = 0;
			push(property, role === "surface" ? mapLineColors(property, value) : value.replace(colorPattern, "transparent"), isImportant);
		} else if (property === "box-shadow") {
			push(property, mapShadow(selector, value), isImportant);
		} else if (property === "border-radius" && mapRadius(value, isDotRule(declarations)) !== value) {
			push(property, mapRadius(value, isDotRule(declarations)), isImportant);
		} else if (property === "backdrop-filter" || property === "-webkit-backdrop-filter") {
			push(property, "none", isImportant);
		} else if (property === "accent-color") {
			push(property, "var(--bn-accent)", isImportant);
		} else if (property === "caret-color") {
			push(property, "var(--bn-text)", isImportant);
		} else if (property === "letter-spacing" && !isUppercase) {
			push(property, "0", isImportant);
		} else if (property === "opacity") {
			mapOpacity(selector, value, hasOwnColor).forEach(([mappedProperty, mappedValue]) => push(mappedProperty, mappedValue, isImportant));
		} else {
			mapType(selector, declaration).forEach(([mappedProperty, mappedValue]) => push(mappedProperty, mappedValue, isImportant));
		}
		colorPattern.lastIndex = 0;
	});
	return lines;
};

/** Splits a declaration block on semicolons that are not inside parentheses. */
const parseDeclarations = block => {
	const declarations = [];
	let depth = 0;
	let start = 0;
	for (let index = 0; index <= block.length; index += 1) {
		const character = block[index];
		depth += character === "(" ? 1 : character === ")" ? -1 : 0;
		if ((character === ";" && depth === 0) || index === block.length) {
			const text = block.slice(start, index).trim();
			const colon = text.indexOf(":");
			if (colon > 0) {
				const rawValue = text.slice(colon + 1).trim();
				declarations.push({ property: text.slice(0, colon).trim(), value: rawValue.replace(/\s*!important$/, ""), isImportant: /!important$/.test(rawValue) });
			}
			start = index + 1;
		}
	}
	return declarations;
};

/**
 * Parses the stylesheet into rules, keeping the media query each sits in.
 * @param {string} css
 * @returns {{media: string, selector: string, declarations: object[]}[]}
 */
const parseRules = css => {
	const rules = [];
	let media = "";
	const blockPattern = /([^{}]+)\{([^{}]*)\}|@media[^{]+\{|\}/g;
	const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
	for (const match of source.matchAll(blockPattern)) {
		if (match[0][0] === "@") {
			media = match[0].slice(0, -1).trim();
		} else if (match[0] === "}") {
			media = "";
		} else {
			rules.push({ media, selector: match[1].trim().replace(/\s+/g, " "), declarations: parseDeclarations(match[2]) });
		}
	}
	return rules;
};

/** Puts each selector in a list behind `html body.podcast-studio-mode` (see the header for why). */
const raiseSelector = selector =>
	selector
		.split(/,\s*/)
		.map(part => (part.indexOf("body.podcast-studio-mode") === 0 ? `html ${part}` : `html body.podcast-studio-mode ${part}`))
		.join(",\n");

const render = () => {
	const source = readFileSync(sourcePath, "utf8");
	const digest = createHash("sha256").update(source).digest("hex").slice(0, 16);
	const blocks = [];
	parseRules(source).forEach(rule => {
		const lines = themeDeclarations(rule.selector, rule.declarations);
		if (lines.length === 0) {
			return;
		}
		const body = `${raiseSelector(rule.selector)} {\n${lines.map(line => `\t${line};`).join("\n")}\n}`;
		blocks.push(rule.media ? `${rule.media} {\n${body.replace(/^/gm, "\t")}\n}` : body);
	});
	const header = `/*\n * GENERATED by bn-shell/scripts/gen-podcast-theme.mjs. Do not edit by hand:\n * change the script, or add a refinement to overrides.css, and rerun it.\n * Source: podcast/studio.css sha256 ${digest}\n */\n`;
	return `${header}\n${blocks.join("\n\n")}\n`;
};

const main = () => {
	const output = render();
	if (process.argv.indexOf("--check") > -1) {
		const isCurrent = readFileSync(outputPath, "utf8") === output;
		process.stdout.write(isCurrent ? "Podcast Studio theme is up to date.\n" : "Podcast Studio theme is STALE: rerun bn-shell/scripts/gen-podcast-theme.mjs.\n");
		process.exit(isCurrent ? 0 : 1);
	}
	writeFileSync(outputPath, output);
	process.stdout.write(`generated.css: ${output.split("\n").length} lines from podcast/studio.css\n`);
};

main();
