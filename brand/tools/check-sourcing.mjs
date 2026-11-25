#!/usr/bin/env node
/**
 * Check a repository against the BytesNation component-sourcing policy
 * (brand/component-sourcing.md).
 *
 *   node brand/tools/check-sourcing.mjs [--tier public|private]
 *                                           [--history] [--verify-visibility]
 *                                           [--allow <path>]...
 *
 * Public tier: the repository holds no Shadcnblocks code, config or reference,
 * in the working tree or, with --history, in any commit.
 *
 * Private tier: the repository may use Shadcnblocks. The registry key stays out
 * of git, every file that mentions Shadcnblocks is listed in the ledger, no
 * package can be published, and, with --verify-visibility, the repository is
 * private on GitHub.
 *
 * The tier comes from --tier, or from a file named .brand-tier at the root.
 * No dependencies. Exit code 0 is a pass, 1 is a problem, 2 is a usage error.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";

const TIER_FILE = ".brand-tier";
const LEDGER_PATH = "docs/shadcnblocks-ledger.md";
const TIERS = ["public", "private"];
const MAX_TEXT_BYTES = 2_000_000;
const MINIMUM_KEY_LENGTH = 12;

const MENTION_PATTERN = /shadcnblocks/i;
const KEY_NAME_PATTERN = /SHADCNBLOCKS_API_KEY/;
const KEY_VALUE_PATTERN = /SHADCNBLOCKS_API_KEY\s*[:=]\s*["']?([^\s"'#]*)/;
const LITERAL_BEARER_PATTERN = /Bearer\s+(?!\$\{)[\w.-]{8,}/;
const ENV_FILE_PATTERN = /(^|\/)\.env(\.[\w-]+)?$/;
const ENV_TEMPLATE_PATTERN = /\.(example|sample|template)$/;
const LEDGER_PATH_PATTERN = /`([\w@./[\]-]+\/[\w@./[\]-]+\.\w+)`/g;
/** The same word as MENTION_PATTERN, spelled for git, which has no case flag for -G. */
const HISTORY_PATTERN = [..."shadcnblocks"]
  .map((letter) => `[${letter}${letter.toUpperCase()}]`)
  .join("");

const PROSE_EXTENSIONS = new Set([".md", ".mdx", ".markdown", ".txt"]);
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".gif",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  ".mp4",
  ".webm",
  ".mov",
  ".mp3",
  ".wasm",
]);
/** Kit files and the tier marker name Shadcnblocks in order to state the policy. */
const DEFAULT_ALLOWED_PATHS = ["brand/", TIER_FILE];

/** Say what was wrong with the command line, show the usage, and stop with exit code 2. */
function exitWithUsage(message) {
  console.error(message);
  console.error(
    "Usage: node brand/tools/check-sourcing.mjs [--tier public|private] [--history] [--verify-visibility] [--allow <path>]...",
  );
  process.exit(2);
}

/** Read the command line. Stops on an option this script does not know. */
function parseArguments(argv) {
  const options = { tier: undefined, hasHistory: false, hasVisibility: false, allowed: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--history") options.hasHistory = true;
    else if (argument === "--verify-visibility") options.hasVisibility = true;
    else if (argument === "--tier") options.tier = argv[++index];
    else if (argument === "--allow") options.allowed.push(argv[++index]);
    else exitWithUsage(`Unknown option: ${argument}`);
  }
  return options;
}

/** Run git with arguments passed as a list, so nothing is interpreted by a shell. */
function runGit(gitArguments) {
  return execFileSync("git", gitArguments, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

function readTierFile() {
  if (!existsSync(TIER_FILE)) return undefined;
  return readFileSync(TIER_FILE, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
}

function resolveTier(requestedTier) {
  const tier = requestedTier ?? readTierFile();
  if (!TIERS.includes(tier)) {
    exitWithUsage(
      `No tier. Pass --tier public or --tier private, or put one of those words in ${TIER_FILE}.`,
    );
  }
  return tier;
}

/** A tracked file's text, or undefined when it is binary, too large or gone from disk. */
function readTrackedText(path) {
  if (BINARY_EXTENSIONS.has(extname(path).toLowerCase())) return undefined;
  if (!existsSync(path) || statSync(path).size > MAX_TEXT_BYTES) return undefined;
  const text = readFileSync(path, "utf8");
  return text.includes("\u0000") ? undefined : text;
}

/** Every tracked text file with its contents, minus the allowed paths. */
function loadSources(allowedPaths) {
  const isAllowed = (path) => allowedPaths.some((allowed) => path.startsWith(allowed));
  return runGit(["ls-files", "-z"])
    .split("\0")
    .filter((path) => path && !isAllowed(path))
    .map((path) => ({ path, text: readTrackedText(path) }))
    .filter((source) => source.text !== undefined);
}

/** "path:line" for every line of a file that matches. */
function locateMatches(source, pattern) {
  return source.text
    .split("\n")
    .flatMap((line, index) => (pattern.test(line) ? [`${source.path}:${index + 1}`] : []));
}

const isProse = (path) => PROSE_EXTENSIONS.has(extname(path).toLowerCase());

/* ── Public tier ─────────────────────────────────────────────────────────── */

function checkPublicTree(sources) {
  const references = sources
    .filter((source) => !isProse(source.path))
    .flatMap((source) => locateMatches(source, MENTION_PATTERN));
  const keyNames = sources
    .filter((source) => !isProse(source.path))
    .flatMap((source) => locateMatches(source, KEY_NAME_PATTERN));
  return {
    title: "No Shadcnblocks code, config or key name in the working tree",
    problems: [...new Set([...references, ...keyNames])],
  };
}

function checkPublicHistory(allowedPaths) {
  const exclusions = [
    ...allowedPaths.map((path) => `:(exclude)${path}`),
    ...[...PROSE_EXTENSIONS].map((extension) => `:(exclude,glob)**/*${extension}`),
  ];
  const commits = runGit([
    "log",
    "--all",
    "--format=%h %s",
    `-G${HISTORY_PATTERN}`,
    "--",
    ".",
    ...exclusions,
  ]);
  return {
    title: "No commit in history adds or removes a Shadcnblocks reference",
    problems: commits.split("\n").filter(Boolean),
  };
}

/* ── Private tier ────────────────────────────────────────────────────────── */

function checkTrackedEnvFiles(sources) {
  return {
    title: "No .env file is tracked",
    problems: sources
      .map((source) => source.path)
      .filter((path) => ENV_FILE_PATTERN.test(path) && !ENV_TEMPLATE_PATTERN.test(path)),
  };
}

/**
 * True when a line assigns a real-looking value to the key, or sends a literal
 * bearer token to the registry. An empty value, a ${VARIABLE} and a short word
 * in a sentence are not keys.
 */
function hasLiteralKey(line) {
  const assigned = line.match(KEY_VALUE_PATTERN)?.[1] ?? "";
  const isKeyLike = assigned.length >= MINIMUM_KEY_LENGTH && !/^[$<{]/.test(assigned);
  return isKeyLike || (MENTION_PATTERN.test(line) && LITERAL_BEARER_PATTERN.test(line));
}

function checkCommittedKey(sources) {
  // Report where, never what: the value must not reach a log.
  const problems = sources.flatMap((source) =>
    source.text
      .split("\n")
      .flatMap((line, index) => (hasLiteralKey(line) ? [`${source.path}:${index + 1}`] : [])),
  );
  return { title: "No registry key is committed", problems };
}

function checkEnvIsIgnored(sources) {
  const problems = sources
    .filter((source) => source.path.endsWith("components.json"))
    .map((source) => join(dirname(source.path), ".env"))
    .filter((envPath) => {
      try {
        runGit(["check-ignore", "-q", envPath]);
        return false;
      } catch (error) {
        // check-ignore exits 1 when the path is not ignored. Anything else is a real failure.
        if (error.status === 1) return true;
        throw error;
      }
    });
  return { title: "The .env beside each components.json is gitignored", problems };
}

function checkLedger(sources) {
  const title = `Every file that mentions Shadcnblocks is listed in ${LEDGER_PATH}`;
  if (!existsSync(LEDGER_PATH)) return { title, problems: [`${LEDGER_PATH} does not exist`] };
  const ledger = readFileSync(LEDGER_PATH, "utf8");
  const tracked = new Set(sources.map((source) => source.path));
  const unlisted = sources
    .filter((source) => !isProse(source.path) && MENTION_PATTERN.test(source.text))
    .map((source) => source.path)
    .filter((path) => !ledger.includes(`\`${path}\``))
    .map((path) => `${path} is not in the ledger`);
  const stale = [...ledger.matchAll(LEDGER_PATH_PATTERN)]
    .map(([, path]) => path)
    .filter((path) => !tracked.has(path) && !existsSync(path))
    .map((path) => `${path} is in the ledger but not in the repository`);
  return { title, problems: [...unlisted, ...stale] };
}

function checkPackagesArePrivate(sources) {
  const problems = sources
    .filter((source) => source.path.split("/").pop() === "package.json")
    .filter((source) => {
      try {
        return JSON.parse(source.text).private !== true;
      } catch (error) {
        console.error(
          `${new Date().toISOString()} ${error.name} in ${source.path}: ${error.stack}`,
        );
        return true;
      }
    })
    .map((source) => `${source.path} is missing "private": true`);
  return { title: "No package can be published", problems };
}

function checkVisibility() {
  const title = "The repository is private on GitHub";
  try {
    const visibility = execFileSync(
      "gh",
      ["repo", "view", "--json", "visibility", "--jq", ".visibility"],
      { encoding: "utf8" },
    ).trim();
    return { title, problems: visibility === "PUBLIC" ? ["GitHub reports PUBLIC"] : [] };
  } catch (error) {
    console.error(`${new Date().toISOString()} ${error.name} running gh: ${error.stack}`);
    return { title, problems: ["Could not ask GitHub. Is the gh CLI installed and signed in?"] };
  }
}

/* ── Run ─────────────────────────────────────────────────────────────────── */

function runChecks(tier, options, allowedPaths) {
  const sources = loadSources(allowedPaths);
  if (tier === "public") {
    return [
      checkPublicTree(sources),
      ...(options.hasHistory ? [checkPublicHistory(allowedPaths)] : []),
    ];
  }
  return [
    checkTrackedEnvFiles(sources),
    checkCommittedKey(sources),
    checkEnvIsIgnored(sources),
    checkLedger(sources),
    checkPackagesArePrivate(sources),
    ...(options.hasVisibility ? [checkVisibility()] : []),
  ];
}

function reportResults(tier, results) {
  console.log(`BytesNation component sourcing: ${tier} tier`);
  for (const result of results) {
    console.log(`  ${result.problems.length === 0 ? "ok  " : "FAIL"} ${result.title}`);
    for (const problem of result.problems) console.log(`         ${problem}`);
  }
  const failed = results.filter((result) => result.problems.length > 0).length;
  console.log(failed === 0 ? "All checks passed." : `${failed} check(s) failed.`);
  return failed;
}

function main() {
  // Every path below is relative to the repository root, wherever the script was started.
  process.chdir(runGit(["rev-parse", "--show-toplevel"]).trim());
  const options = parseArguments(process.argv.slice(2));
  const tier = resolveTier(options.tier);
  const allowedPaths = [...DEFAULT_ALLOWED_PATHS, ...options.allowed];
  process.exit(reportResults(tier, runChecks(tier, options, allowedPaths)) === 0 ? 0 : 1);
}

main();
