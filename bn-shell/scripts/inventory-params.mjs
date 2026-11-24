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

// Text allowed between two param checks for them to count as aliases: "||",
// parentheses, and value wrappers such as parseInt( ... ) || parseInt( ... ).
const aliasJoinPattern = /^[\s()]*\|\|\s*(?:parseInt|parseFloat|Number|String|decodeURIComponent)?[\s(]*$/;

/**
 * Splits one source line into alias chains. The engine spells aliases as a
 * pure "||" chain: urlParams.has("a") || urlParams.has("b"). Any other term in
 * between (&&, a session field, a literal) starts a new group, so fallback
 * chains like get("director") || session.roomid || get("room") do not merge
 * unrelated parameters.
 * @param {string} lineText
 * @returns {string[][]}
 */
const splitAliasChains = lineText => {
	const matches = [...lineText.matchAll(paramCallPattern)];
	const chains = [];
	let currentChain = [];
	matches.forEach((match, matchIndex) => {
		if (matchIndex > 0) {
			const previous = matches[matchIndex - 1];
			const between = lineText.slice(previous.index + previous[0].length, match.index);
			if (!aliasJoinPattern.test(between)) {
				chains.push(currentChain);
				currentChain = [];
			}
		}
		currentChain.push(match[1]);
	});
	if (currentChain.length > 0) {
		chains.push(currentChain);
	}
	return chains;
};

/**
 * Collects alias groups from one engine file.
 * @param {string} fileName engine file relative to the repo root
 * @returns {{names: string[], file: string, line: number}[]}
 */
const extractParamGroups = fileName => {
	const source = readFileSync(join(repoRoot, fileName), "utf8");
	const groups = [];
	source.split("\n").forEach((lineText, index) => {
		splitAliasChains(lineText).forEach(chain => {
			groups.push({ names: [...new Set(chain)], file: fileName, line: index + 1 });
		});
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
 * Groups parameter names into features. Two names are aliases when they are
 * checked together in every chain that mentions either (identical chain
 * signature), or when upstream's docs list one as an alias of the other.
 * A name that also appears on its own (e.g. &miconly next to &webcam) keeps
 * its own row.
 * @param {{names: string[], file: string, line: number}[]} groups
 * @param {Map<string, {primary: string, aliases: string[]}>} documented
 * @returns {{names: Set<string>, locations: string[]}[]}
 */
const mergeGroups = (groups, documented) => {
	const signatureByName = new Map();
	const locationsByName = new Map();
	groups.forEach((group, groupIndex) => {
		group.names.forEach(name => {
			signatureByName.set(name, `${signatureByName.get(name) || ""}|${groupIndex}`);
			const locations = locationsByName.get(name) || [];
			locations.push(`${group.file}:${group.line}`);
			locationsByName.set(name, locations);
		});
	});

	// Union-find over names: same signature, or declared aliases in upstream docs.
	const parentByName = new Map([...signatureByName.keys()].map(name => [name, name]));
	const findRoot = name => {
		let root = name;
		while (parentByName.get(root) !== root) {
			root = parentByName.get(root);
		}
		return root;
	};
	const unite = (left, right) => {
		if (parentByName.has(left) && parentByName.has(right)) {
			parentByName.set(findRoot(left), findRoot(right));
		}
	};
	const nameBySignature = new Map();
	signatureByName.forEach((signature, name) => {
		if (nameBySignature.has(signature)) {
			unite(name, nameBySignature.get(signature));
		} else {
			nameBySignature.set(signature, name);
		}
	});
	signatureByName.forEach((signature, name) => {
		const docEntry = documented.get(name.toLowerCase());
		if (docEntry && name.toLowerCase() !== docEntry.primary) {
			const primaryName = [...signatureByName.keys()].find(candidate => candidate.toLowerCase() === docEntry.primary);
			if (primaryName) {
				unite(name, primaryName);
			}
		}
	});

	const recordsByRoot = new Map();
	[...signatureByName.keys()].forEach(name => {
		const root = findRoot(name);
		const record = recordsByRoot.get(root) || { names: new Set(), locations: [] };
		record.names.add(name);
		record.locations.push(...locationsByName.get(name));
		recordsByRoot.set(root, record);
	});
	return [...recordsByRoot.values()].map(record => ({ names: record.names, locations: [...new Set(record.locations)] }));
};

const buildInventory = () => {
	const groups = engineFiles.flatMap(extractParamGroups);
	const documented = parseUpstreamDocs();
	return mergeGroups(groups, documented).map(record => {
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
