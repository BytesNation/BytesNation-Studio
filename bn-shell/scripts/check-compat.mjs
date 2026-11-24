#!/usr/bin/env node
/**
 * Post-build guard: the engine's compatibility floor is Chrome 80 and its
 * startup scripts must parse on Chromium 75. Fails the build if bn/ output
 * contains syntax that floor cannot parse (optional chaining, nullish
 * coalescing, logical assignment, class static blocks).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../../bn");
const bannedPatterns = [
	// "?." followed by a digit is a ternary and a decimal (a ? .5 : b), not optional chaining.
	{ name: "optional chaining", pattern: /[\w)\]]\?\.[A-Za-z_$([]/ },
	{ name: "nullish coalescing", pattern: /[^?]\?\?[^?]/ },
	{ name: "logical assignment", pattern: /(\|\||&&|\?\?)=/ },
	{ name: "class static block", pattern: /static\s*\{/ }
];

const listFiles = directory => readdirSync(directory).flatMap(name => {
	const fullPath = join(directory, name);
	return statSync(fullPath).isDirectory() ? listFiles(fullPath) : [fullPath];
});

const failures = listFiles(outDir)
	.filter(filePath => filePath.endsWith(".js"))
	.flatMap(filePath => {
		const source = readFileSync(filePath, "utf8").replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, "\"\"");
		return bannedPatterns.filter(rule => rule.pattern.test(source)).map(rule => `${filePath}: ${rule.name}`);
	});

if (failures.length > 0) {
	process.stderr.write(`Compatibility check failed:\n${failures.join("\n")}\n`);
	process.exit(1);
}
process.stdout.write("Compatibility check passed (Chrome 80 syntax floor).\n");
