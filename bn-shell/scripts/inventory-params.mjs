#!/usr/bin/env node
/**
 * Extracts every URL parameter the engine reads and joins it with upstream's
 * own documentation (rawdoc.md). Output is a JSON inventory that
 * docs/FEATURE-INVENTORY.md and the parity checklist are generated from.
 *
 * The engine reads parameters four ways, and all four are covered:
 *   1. a literal name at the call site: urlParams.has("name");
 *   2. a helper that takes the name, or a list of aliases, as an argument;
 *   3. a list of names checked in a loop: ["a", "b"].some(n => urlParams.has(n)),
 *      or a named list such as ROOM_QUERY_KEYS (nameListsByFile);
 *   4. a name built at runtime (listed by hand in nonLiteralReadsByFile, and
 *      checked to be read by one of the first three ways as well).
 *
 * A read that fits none of these fails the run with its location, so a new
 * kind of reader upstream cannot drop parameters from the inventory silently.
 *
 * Rerun after every upstream merge: a diff of the output is the list of
 * parameters upstream added, removed or renamed.
 *
 * Usage: node bn-shell/scripts/inventory-params.mjs [repoRoot] > params.json
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.argv[2] || process.cwd();

// Everything that reads the main page's URL: the three engine files, the two
// scripts main.js loads on demand (auth-client.js for &auth, callin.js for
// &callin), the inline scripts in index.html, and Podcast Studio, which
// index.html loads for &podcast.
const sourceFiles = ["main.js", "lib.js", "webrtc.js", "auth-client.js", "callin.js", "index.html", "podcast/bootstrap.js", "podcast/studio.js"];

// Objects that hold the page's query string. Listed per file because "params"
// is a common variable name: it counts only where it really is the page URL.
const paramObjectsByFile = {
	"main.js": ["urlParams"],
	"lib.js": ["urlParams"],
	"webrtc.js": ["urlParams", "__bufferParams", "params"],
	"auth-client.js": ["urlParams", "hashParams", "params"],
	"callin.js": ["params"],
	"index.html": [],
	"podcast/bootstrap.js": ["params"],
	"podcast/studio.js": ["urlParams", "params", "currentParams"]
};

// Functions that read a parameter named by their first argument: one name, or
// a list of aliases tried in order.
const nameHelpersByFile = {
	"main.js": ["getMIDIPortSelector", "parseIntegerParam", "parseFirstIntegerParam", "parseBooleanParam"],
	"lib.js": ["getLongpipeUrlParam", "hasLongpipeUrlParam", "vdoIcecastReadUrlParam", "vdoIcecastUrlHasAny"],
	"callin.js": ["getParam", "hasParam", "paramEnabled", "stripSensitiveParams", "getParamOrProfile", "boolFromParamOrProfile"],
	"podcast/studio.js": ["readUrlParam"]
};

// Named constants that hold a list of names, or an object of such lists, and
// are read in a loop. Each list inside the constant is one group.
const nameListsByFile = {
	"podcast/studio.js": ["ROOM_QUERY_KEYS", "DIRECTOR_QUERY_KEYS", "HOST_AUDIO_QUERY_KEYS"]
};

// Every read whose argument is not a literal name. Each entry gives how many
// such reads the file has and what captures the names instead:
//   coveredBy: a variable filled from a helper argument or a list;
//   names:     a name built at runtime. Each must also be read another way,
//              which is checked, so the alias groups come from those reads.
// The counts are a tripwire. A new helper that reuses a variable name such as
// names[i] changes the count and fails the run instead of hiding its parameters.
const nonLiteralReadsByFile = {
	"main.js": {
		parameterName: { count: 2, coveredBy: "getMIDIPortSelector call sites" },
		name: { count: 6, coveredBy: "parseIntegerParam, parseFirstIntegerParam and parseBooleanParam call sites" },
		framegrabAudioParamName: { count: 1, coveredBy: "literal has() calls in the same statement" },
		holderColorParam: { count: 1, coveredBy: "the name list it is picked from" },
		param: { count: 1, coveredBy: "the name list it iterates" },
		'urlParams.has("rtpprofile") ? "rtpprofile" : "connectionprofile"': { count: 1, coveredBy: "literal has() calls on the line above" }
	},
	"lib.js": {
		"names[i]": { count: 6, coveredBy: "the Longpipe and Icecast helper call sites" },
		"para[0]": { count: 1, coveredBy: "nothing to capture: updateURL edits the address bar and reads no particular parameter" },
		'protocol + "wait"': { count: 1, names: ["whipwait", "whepwait"] },
		'protocol + "icewait"': { count: 1, names: ["whipicewait", "whepicewait"] }
	},
	"webrtc.js": {
		flag: { count: 1, coveredBy: "the name list it iterates" },
		key: { count: 1, coveredBy: "the name list it iterates" }
	},
	"callin.js": {
		"names[i]": { count: 5, coveredBy: "the call-in helper call sites" }
	},
	"podcast/studio.js": {
		key: { count: 5, coveredBy: "ROOM_QUERY_KEYS, DIRECTOR_QUERY_KEYS and HOST_AUDIO_QUERY_KEYS" },
		name: { count: 2, coveredBy: "readUrlParam call sites" }
	}
};

// Text allowed between two param checks for them to count as aliases: "||",
// parentheses, and value wrappers such as parseInt( ... ) || parseInt( ... ).
const aliasJoinPattern = /^[\s()]*\|\|\s*(?:parseInt|parseFloat|Number|String|decodeURIComponent)?[\s(]*$/;

const quotedNamePattern = /"([^"]+)"|'([^']+)'/g;
const inlinePageParams = "URLSearchParams\\(window\\.location\\.search\\)";

/** Everything that could not be resolved; reported together at the end. */
const problems = [];

const escapeForPattern = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches "<page params object>.has(" (or get, getAll) for one file. */
const buildReadPrefix = fileName => {
	const readers = paramObjectsByFile[fileName].map(objectName => `\\b${escapeForPattern(objectName)}`).concat(inlinePageParams);
	return `(?:${readers.join("|")})\\.(?:has|get|getAll)\\(`;
};

const listQuotedNames = text => [...text.matchAll(quotedNamePattern)].map(match => match[1] || match[2]);

/**
 * Blanks whole-line and block comments, keeping line numbers, so disabled
 * code does not put parameters in the inventory. Trailing comments stay.
 * @param {string} source
 * @returns {string[]} one entry per source line
 */
const blankCommentLines = source => {
	let isInsideBlock = false;
	return source.split("\n").map(lineText => {
		const trimmed = lineText.trim();
		if (!isInsideBlock && trimmed.indexOf("//") === 0) {
			return "";
		}
		if (!isInsideBlock && trimmed.indexOf("/*") !== 0) {
			return lineText;
		}
		const closeIndex = lineText.indexOf("*/");
		isInsideBlock = closeIndex === -1;
		return isInsideBlock ? "" : lineText.slice(closeIndex + 2);
	});
};

/**
 * Scans a call from openIndex (just past its opening parenthesis) and returns
 * the index where its first argument ends, or where the whole call ends.
 * @param {string} source
 * @param {number} openIndex
 * @param {string} stopCharacters ",)" for the first argument, ")" for the call
 * @returns {number}
 */
const findCallBoundary = (source, openIndex, stopCharacters) => {
	let depth = 0;
	let quote = "";
	for (let index = openIndex; index < source.length; index += 1) {
		const character = source[index];
		if (quote) {
			quote = character === quote && source[index - 1] !== "\\" ? "" : quote;
		} else if (character === '"' || character === "'") {
			quote = character;
		} else if ("([{".indexOf(character) > -1) {
			depth += 1;
		} else if (depth === 0 && stopCharacters.indexOf(character) > -1) {
			return index;
		} else if (")]}".indexOf(character) > -1) {
			depth -= 1;
		}
	}
	return source.length;
};

const readArgument = (source, openIndex) => source.slice(openIndex, findCallBoundary(source, openIndex, ",)")).trim();

const lineNumberAt = (source, index) => source.slice(0, index).split("\n").length;

/**
 * Splits one source line into alias chains. The engine spells aliases as a
 * pure "||" chain: urlParams.has("a") || urlParams.has("b"). Any other term in
 * between (&&, a session field, a literal) starts a new group, so fallback
 * chains like get("director") || session.roomid || get("room") do not merge
 * unrelated parameters.
 * @param {string} lineText
 * @param {RegExp} literalReadPattern
 * @returns {string[][]}
 */
const splitAliasChains = (lineText, literalReadPattern) => {
	const matches = [...lineText.matchAll(literalReadPattern)];
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
		currentChain.push(match[1] || match[2]);
	});
	if (currentChain.length > 0) {
		chains.push(currentChain);
	}
	return chains;
};

/** Way 1: literal names at the call site, grouped into alias chains per line. */
const extractLiteralGroups = (fileName, liveLines) => {
	const literalReadPattern = new RegExp(`${buildReadPrefix(fileName)}\\s*(?:"([^"]+)"|'([^']+)')\\s*\\)`, "g");
	const groups = [];
	liveLines.forEach((lineText, index) => {
		splitAliasChains(lineText, literalReadPattern).forEach(chain => {
			groups.push({ names: [...new Set(chain)], file: fileName, line: index + 1 });
		});
	});
	return groups;
};

/**
 * Resolves a helper's first argument to the names it carries: a string, a
 * list, or a variable assigned a list in the same file. Returns null for a
 * helper's own definition or a helper forwarding its argument to another.
 * @param {string} argument
 * @param {string} liveSource
 * @param {Set<string>} forwardedNames first-parameter names of the file's helpers
 * @returns {string[] | null | undefined} undefined when it cannot be resolved
 */
const resolveHelperNames = (argument, liveSource, forwardedNames) => {
	if (/^["'[]/.test(argument)) {
		return listQuotedNames(argument);
	}
	if (forwardedNames.has(argument)) {
		return null;
	}
	if (!/^[A-Za-z_$][\w$]*$/.test(argument)) {
		return undefined;
	}
	const assignment = liveSource.match(new RegExp(`\\b(?:var|let|const)\\s+${escapeForPattern(argument)}\\s*=\\s*\\[([^\\]]*)\\]`));
	return assignment ? listQuotedNames(assignment[1]) : undefined;
};

/** First-parameter names of a file's helpers: a call passing one is a helper forwarding its own argument. */
const listForwardedNames = (helperNames, liveSource) => {
	const forwardedNames = new Set();
	helperNames.forEach(helperName => {
		const definition = liveSource.match(new RegExp(`\\bfunction\\s+${helperName}\\(\\s*([A-Za-z_$][\\w$]*)`));
		if (definition) {
			forwardedNames.add(definition[1]);
		}
	});
	return forwardedNames;
};

/** Every helper call in one file that names parameters, in source order. */
const listHelperCalls = (fileName, liveSource) => {
	const helperNames = nameHelpersByFile[fileName] || [];
	const forwardedNames = listForwardedNames(helperNames, liveSource);
	const calls = [];
	helperNames.forEach(helperName => {
		[...liveSource.matchAll(new RegExp(`\\b${helperName}\\(`, "g"))].forEach(match => {
			const openIndex = match.index + match[0].length;
			const argument = readArgument(liveSource, openIndex);
			const names = resolveHelperNames(argument, liveSource, forwardedNames);
			if (names === undefined) {
				problems.push(`${fileName}:${lineNumberAt(liveSource, match.index)} ${helperName}(${argument}) passes names this script cannot resolve`);
			} else if (names && names.length > 0) {
				calls.push({ names, startIndex: match.index, endIndex: findCallBoundary(liveSource, openIndex, ")") });
			}
		});
	});
	return calls.sort((left, right) => left.startIndex - right.startIndex);
};

/**
 * Way 2: helpers that take the name, or a list of aliases, as their first
 * argument. Calls joined by nothing but "||" are one alias chain, as with
 * literal reads: readUrlParam("a") || readUrlParam("b").
 */
const extractHelperGroups = (fileName, liveSource) => {
	const chains = [];
	listHelperCalls(fileName, liveSource).forEach(call => {
		const previous = chains[chains.length - 1];
		if (previous && /^\s*\|\|\s*$/.test(liveSource.slice(previous.endIndex + 1, call.startIndex))) {
			previous.names.push(...call.names);
			previous.endIndex = call.endIndex;
		} else {
			chains.push({ names: [...call.names], startIndex: call.startIndex, endIndex: call.endIndex });
		}
	});
	return chains.map(chain => ({ names: [...new Set(chain.names)], file: fileName, line: lineNumberAt(liveSource, chain.startIndex) }));
};

/** Way 3, named form: each list inside a constant from nameListsByFile. */
const extractNamedListGroups = (fileName, liveSource) =>
	(nameListsByFile[fileName] || []).flatMap(listName => {
		const declaration = liveSource.match(new RegExp(`\\b(?:var|let|const)\\s+${listName}\\s*=\\s*([^;]*);`));
		if (!declaration) {
			problems.push(`${fileName}: the name list ${listName} was not found`);
			return [];
		}
		const line = lineNumberAt(liveSource, declaration.index);
		return [...declaration[1].matchAll(/\[([^\[\]]*)\]/g)].map(match => ({ names: [...new Set(listQuotedNames(match[1]))], file: fileName, line }));
	});

/** Way 3, inline form: a literal list of names checked in a loop. */
const extractListGroups = (fileName, liveSource) => {
	const callbackStart = "(?:function\\s*\\(\\s*\\w+\\s*\\)\\s*\\{\\s*return\\s+|\\(?\\s*\\w+\\s*\\)?\\s*=>\\s*)";
	const listPattern = new RegExp(`\\[([^\\[\\]]*)\\]\\s*\\.(?:some|find|filter|every|forEach)\\(\\s*${callbackStart}!?\\s*${buildReadPrefix(fileName)}\\s*\\w+\\s*\\)`, "g");
	return [...liveSource.matchAll(listPattern)].map(match => ({
		names: [...new Set(listQuotedNames(match[1]))],
		file: fileName,
		line: lineNumberAt(liveSource, match.index)
	}));
};

/**
 * Way 4, and the safety net: every read whose argument is not a literal must
 * be listed in nonLiteralReadsByFile, the listed number of times.
 */
const checkNonLiteralReads = (fileName, liveSource) => {
	const expectedReads = nonLiteralReadsByFile[fileName] || {};
	const countByArgument = new Map();
	[...liveSource.matchAll(new RegExp(buildReadPrefix(fileName), "g"))].forEach(match => {
		const argument = readArgument(liveSource, match.index + match[0].length);
		if (/^(?:"[^"]*"|'[^']*')$/.test(argument)) {
			return;
		}
		if (!Object.prototype.hasOwnProperty.call(expectedReads, argument)) {
			problems.push(`${fileName}:${lineNumberAt(liveSource, match.index)} reads a parameter named by ${argument}, which is not a literal, a known helper argument or a listed computed name`);
		}
		countByArgument.set(argument, (countByArgument.get(argument) || 0) + 1);
	});
	Object.keys(expectedReads).forEach(argument => {
		const foundCount = countByArgument.get(argument) || 0;
		if (foundCount !== expectedReads[argument].count) {
			problems.push(`${fileName}: expected ${expectedReads[argument].count} read(s) through ${argument}, found ${foundCount}; a reader was added or removed`);
		}
	});
};

/** Every computed name must also be read by a literal, a helper or a list. */
const checkComputedNames = groups => {
	const readNames = new Set(groups.flatMap(group => group.names));
	Object.keys(nonLiteralReadsByFile).forEach(fileName => {
		Object.keys(nonLiteralReadsByFile[fileName]).forEach(argument => {
			(nonLiteralReadsByFile[fileName][argument].names || [])
				.filter(name => !readNames.has(name))
				.forEach(name => problems.push(`${fileName}: computed name "${name}" (from ${argument}) is read no other way; give it a group of its own`));
		});
	});
};

/**
 * Collects every group of names one file reads together.
 * @param {string} fileName source file relative to the repo root
 * @returns {{names: string[], file: string, line: number}[]}
 */
const extractParamGroups = fileName => {
	const liveLines = blankCommentLines(readFileSync(join(repoRoot, fileName), "utf8"));
	const liveSource = liveLines.join("\n");
	checkNonLiteralReads(fileName, liveSource);
	return [
		...extractLiteralGroups(fileName, liveLines),
		...extractHelperGroups(fileName, liveSource),
		...extractListGroups(fileName, liveSource),
		...extractNamedListGroups(fileName, liveSource)
	];
};

/**
 * Reads the description from a page's YAML frontmatter. Upstream writes long
 * ones as a block scalar (">-" with the text on the indented lines below) and
 * a few in quotes.
 * @param {string} yamlText
 * @returns {string}
 */
const readFrontmatterDescription = yamlText => {
	const match = yamlText.match(/^description:[ \t]*(.*)$/m);
	if (!match) {
		return "";
	}
	const firstLine = match[1].trim();
	const followingLines = yamlText.slice(match.index + match[0].length).split("\n").slice(1);
	const lastIndented = followingLines.findIndex(lineText => !/^\s+\S/.test(lineText));
	const continuation = (lastIndented === -1 ? followingLines : followingLines.slice(0, lastIndented)).map(lineText => lineText.trim());
	const isBlockScalar = /^[>|][-+]?$/.test(firstLine);
	const joined = (isBlockScalar ? continuation : [firstLine, ...continuation]).join(" ");
	return joined.replace(/^(["'])(.*)\1$/, "$2").trim();
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
		const summary = readFrontmatterDescription(frontmatter) || readFrontmatterDescription(section);
		const roleMatch = section.match(/^(General|Sender-Side|Viewer-Side|Director|Sender|Viewer)[^\n]*Option[^\n]*$/im);
		const aliasBlock = section.match(/## Aliases\s*\n([\s\S]*?)(\n## |$)/);
		const aliases = aliasBlock ? [...aliasBlock[1].matchAll(/`&([A-Za-z0-9_-]+)`/g)].map(match => match[1].toLowerCase()) : [];
		const entry = {
			primary,
			summary,
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
	const groups = sourceFiles.flatMap(extractParamGroups);
	checkComputedNames(groups);
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

const inventory = buildInventory();
if (problems.length > 0) {
	process.stderr.write(`Parameter inventory FAILED: ${problems.length} read(s) are not covered.\n${problems.join("\n")}\nTeach this script the reader (see the tables at the top) before trusting the inventory.\n`);
	process.exit(1);
}
process.stdout.write(`${JSON.stringify(inventory, null, "\t")}\n`);
