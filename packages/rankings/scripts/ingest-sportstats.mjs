import { register } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./ts-resolve.mjs", import.meta.url);

const {
  SPORTSTATS_TORONTO_2026,
  editionImportSql,
  parseSportstatsResultsPage,
  readResultPages,
  snapshotIdentity,
  sportstatsResultsUrl,
} = await import("../src/index.ts");

const root = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(root, "..");
const importDir = join(packageRoot, "imports");

const argv = process.argv.slice(2);
const EVENTS = { [SPORTSTATS_TORONTO_2026.slug]: SPORTSTATS_TORONTO_2026 };

function flag(name) {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

const slug = flag("--slug") ?? SPORTSTATS_TORONTO_2026.slug;
const limitPages = Number(flag("--max-pages") ?? "0");
const pageSize = Number(flag("--page-size") ?? "100");
const apply = argv.includes("--apply");

const config = EVENTS[slug];
if (!config) {
  console.error(`Unknown slug ${slug}. Known: ${Object.keys(EVENTS).join(", ")}`);
  process.exit(1);
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOffset(offset) {
  const url = sportstatsResultsUrl(config, { offset, limit: pageSize });
  let lastError = new Error(`No response for ${url}`);
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/json, text/plain, */*",
        referer: config.sourceUrl,
        origin: "https://sportstats.one",
      },
      signal: AbortSignal.timeout(60_000),
    });
    if (response.status === 429 || response.status === 403 || response.status >= 500) {
      lastError = new Error(`${response.status} ${url}`);
      await sleep(response.status === 403 ? 4000 * attempt : 1500 * attempt);
      continue;
    }
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return response.json();
  }
  throw lastError;
}

const seen = new Set();
const pages = [];
let authoritativeTotal = null;

async function ingestPage(pageIndex) {
  const offset = (pageIndex - 1) * pageSize;
  if (pageIndex > 1) await sleep(200);
  const payload = await fetchOffset(offset);
  if (authoritativeTotal == null) {
    authoritativeTotal = Number(payload.info?.total ?? 0);
  }
  const parsed = parseSportstatsResultsPage(payload, {
    config,
    offset,
    pageSize,
    authoritativeTotal,
  });
  for (const key of parsed.rowKeys) {
    if (seen.has(key)) throw new Error(`Repeated Sportstats participant on page ${pageIndex}.`);
    seen.add(key);
  }
  if (parsed.skippedUnparsed > 0) throw new Error(`Unparsed Sportstats rows on page ${pageIndex}.`);
  const totalPages = parsed.totalItems ? Math.ceil(parsed.totalItems / pageSize) : "?";
  process.stdout.write(`\r${slug} page ${pageIndex}/${totalPages} (+${parsed.results.length})`);
  return parsed;
}

if (limitPages > 0) {
  for (let pageIndex = 1; pageIndex <= limitPages; pageIndex += 1) {
    pages.push(await ingestPage(pageIndex));
  }
} else {
  pages.push(
    ...(await readResultPages(async (pageIndex) => ingestPage(pageIndex), Math.ceil(12_000 / pageSize) + 2)),
  );
}
process.stdout.write("\n");

const edition = {
  sourceSlug: config.sourceSlug,
  sourceName: config.sourceName,
  accessMethod: "Sportstats public leaderboard API (public.sportstats.one)",
  reuseNotes: config.reuseNotes,
  attribution: config.attribution,
  displayAllowed: false,
  externalEventId: `ss:${config.raceRid}`,
  eventName: config.eventName,
  editionYear: config.editionYear,
  startsOn: config.startsOn,
  sourceUrl: config.sourceUrl,
  results: pages.flatMap((page) => page.results),
  skippedYouth: pages.reduce((sum, page) => sum + page.skippedYouth, 0),
  skippedUnparsed: pages.reduce((sum, page) => sum + page.skippedUnparsed, 0),
};

const totalItems = pages[0]?.totalItems ?? 0;
const missing = totalItems > 0 ? totalItems - seen.size : 0;
if (limitPages === 0 && totalItems > 0 && missing > 100) {
  throw new Error(`Sportstats field incomplete: ${seen.size} identities vs total ${totalItems}.`);
}

await mkdir(importDir, { recursive: true });
const jsonlPath = join(importDir, `${slug}.jsonl`);
const jsonl = `${edition.results.map((row) => JSON.stringify(row)).join("\n")}\n`;
await writeFile(jsonlPath, jsonl);
const snapshot = snapshotIdentity(jsonl, jsonlPath);
const sqlPath = join(importDir, `${slug}.import.sql`);
await writeFile(sqlPath, editionImportSql(edition, snapshot, { stageOnly: true }));

console.log(`Wrote ${edition.results.length} finishers to ${jsonlPath}`);
console.log(`SQL: ${sqlPath}`);

if (apply) {
  const { loadRankingsRepoEnv, psqlFile, requireDatabaseUrl } = await import("./psql-util.mjs");
  loadRankingsRepoEnv();
  await psqlFile(requireDatabaseUrl(), sqlPath);
  console.log("Applied import SQL (staged edition).");
} else {
  console.log("Pass --apply with RANKINGS_DATABASE_URL or linked rankings-db to stage the edition.");
}