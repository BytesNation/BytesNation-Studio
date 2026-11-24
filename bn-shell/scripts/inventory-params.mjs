#!/usr/bin/env node
/**
 * Extracts every URL parameter the engine reads and joins it with upstream's
 * own documentation (rawdoc.md). Output is a JSON inventory that
 * docs/FEATURE-INVENTORY.md and the parity checklist are generated from.
 *
 * Rerun after every upstream merge: a diff of the output is the list of
 * parameters upstream added, removed or renamed.
 *
 * Usage: node bn-shell/scripts/inventory-params.mjs [repoRoot] > params.json
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.argv[2] || process.cwd();
const engineFiles = ["main.js", "lib.js", "webrtc.js"];
const paramCallPattern = /urlParams\.(?:has|get)\(\s*"([^"]+)"\s*\)/g;

/**
 * Collects alias groups: every parameter name checked on the same source line
 * is treated as one alias group, which is how the engine spells aliases.
 * @param {string} fileName engine file relative to the repo root
 * @returns {{names: string[], file: string, line: number}[]}
 */
const extractParamGroups = fileName => {
	const source = readFileSync(join(repoRoot, fileName), "utf8");
	const groups = [];
	source.split("\n").forEach((lineText, index) => {
		const names = [...lineText.matchAll(paramCallPattern)].map(match => match[1]);
		if (names.length === 0) {
			return;
		}
		groups.push({ names: [...new Set(names)], file: fileName, line: index + 1 });
	});
	return groups;
};

/**
 * Parses rawdoc.md into a map of documented parameters keyed by every name
 * and alias, each pointing at the section's summary, role and aliases.
 * @returns {Map<string, {primary: string, summary: string, role: string, aliases: string[]}>}
 */
const parseUpstreamDocs = () => {
	const rawDoc = readFileSync(join(repoRoot, "rawdoc.md"), "utf8");
	const sections = rawDoc.split(/\n---\n/);
	const documented = new Map();
	sections.forEach((section, sectionIndex) => {
		const headingMatch = section.match(/^# `?&([A-Za-z0-9_-]+)`?\s*$/m);
		if (!headingMatch) {
			return;
		}
		const primary = headingMatch[1].toLowerCase();
		// Gitbook frontmatter sits in the chunk before the heading, between "---" fences.
		const frontmatter = sectionIndex > 0 ? sections[sectionIndex - 1] : "";
		const summaryMatch = frontmatter.match(/^description:\s*(.+)$/m) || section.match(/^description:\s*(.+)$/m);
		const roleMatch = section.match(/^(General|Sender-Side|Viewer-Side|Director|Sender|Viewer)[^\n]*Option[^\n]*$/im);
		const aliasBlock = section.match(/## Aliases\s*\n([\s\S]*?)(\n## |$)/);
		const aliases = aliasBlock ? [...aliasBlock[1].matchAll(/`&([A-Za-z0-9_-]+)`/g)].map(match => match[1].toLowerCase()) : [];
		const entry = {
			primary,
			summary: summaryMatch ? summaryMatch[1].trim() : "",
			role: roleMatch ? roleMatch[1] : "",
			aliases
		};
		[primary, ...aliases].forEach(name => {
			if (!documented.has(name)) {
				documented.set(name, entry);
			}
		});
	});
	return documented;
};

/**
 * Merges code alias groups that share any name into one record per feature.
 * @param {{names: string[], file: string, line: number}[]} groups
 * @returns {{names: Set<string>, locations: string[]}[]}
 */
const mergeGroups = groups => {
	const merged = [];
	const indexByName = new Map();
	groups.forEach(group => {
		const existingIndex = group.names.map(name => indexByName.get(name)).find(index => index !== undefined);
		const location = `${group.file}:${group.line}`;
		if (existingIndex === undefined) {
			merged.push({ names: new Set(group.names), locations: [location] });
			group.names.forEach(name => indexByName.set(name, merged.length - 1));
			return;
		}
		const record = merged[existingIndex];
		group.names.forEach(name => {
			record.names.add(name);
			indexByName.set(name, existingIndex);
		});
		record.locations.push(location);
	});
	return merged;
};

const buildInventory = () => {
	const groups = engineFiles.flatMap(extractParamGroups);
	const documented = parseUpstreamDocs();
	return mergeGroups(groups).map(record => {
		const names = [...record.names];
		const docEntry = names.map(name => documented.get(name.toLowerCase())).find(Boolean);
		const param = docEntry && names.includes(docEntry.primary) ? docEntry.primary : names[0];
		return {
			param,
			aliases: names.filter(name => name !== param),
			role: docEntry ? docEntry.role : "",
			summary: docEntry ? docEntry.summary : "",
			isDocumented: Boolean(docEntry),
			firstLocation: record.locations[0],
			locationCount: record.locations.length
		};
	});
};

process.stdout.write(`${JSON.stringify(buildInventory(), null, "\t")}\n`);
