import { register } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./ts-resolve.mjs", import.meta.url);

const {
  MARATHONGUIDE_TOKYO_2026,
  editionImportSql,
  marathonGuideApiUrl,
  parseMarathonGuideApiPage,
  readResultPages,
  snapshotIdentity,
} = await import("../src/index.ts");

const root = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(root, "..");
const importDir = join(packageRoot, "imports");

const argv = process.argv.slice(2);
const EVENTS = { "tokyo-marathon-2026-marathonguide": MARATHONGUIDE_TOKYO_2026 };

function flag(name) {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

const slug = flag("--slug") ?? MARATHONGUIDE_TOKYO_2026.slug;
const limitPages = Number(flag("--max-pages") ?? "0");
const pageSize = Number(flag("--page-size") ?? "100");
const apply = argv.includes("--apply");

const config = EVENTS[slug];
if (!config) {
  console.error(`Unknown slug ${slug}. Known: ${Object.keys(EVENTS).join(", ")}`);
  process.exit(1);
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; OvertaekRankings/1.0; +https://github.com/jerryliu3/fitness-battle)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(page) {
  const url = marathonGuideApiUrl(config, { page, limit: pageSize });
  let lastError = new Error(`No response for ${url}`);
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(60_000),
    });
    if (response.status === 429 || response.status >= 500) {
      lastError = new Error(`${response.status} ${url}`);
      await sleep(2000 * attempt);
      continue;
    }
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return response.json();
  }
  throw lastError;
}

const seen = new Set();
const pages = [];

async function ingestPage(pageIndex) {
  if (pageIndex > 1) await sleep(280);
  const payload = await fetchPage(pageIndex);
  const parsed = parseMarathonGuideApiPage(payload, { config, pageIndex, pageSize });
  for (const key of parsed.rowKeys) {
    if (seen.has(key)) throw new Error(`Repeated MarathonGuide runner on page ${pageIndex}.`);
    seen.add(key);
  }
  if (parsed.skippedUnparsed > 0) throw new Error(`Unparsed MarathonGuide rows on page ${pageIndex}.`);
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
    ...(await readResultPages(async (pageIndex) => ingestPage(pageIndex), Math.ceil(40_000 / pageSize) + 5)),
  );
}
process.stdout.write("\n");

const edition = {
  sourceSlug: config.sourceSlug,
  sourceName: config.sourceName,
  accessMethod: "MarathonGuide Runzy JSON API (back.runzy.com)",
  reuseNotes: config.reuseNotes,
  attribution: config.attribution,
  displayAllowed: false,
  externalEventId: `mg:${config.runzyRaceSlug}:${config.editionYear}`,
  eventName: config.eventName,
  editionYear: config.editionYear,
  startsOn: config.startsOn,
  sourceUrl: config.sourceUrl,
  results: pages.flatMap((page) => page.results),
  skippedYouth: pages.reduce((sum, page) => sum + page.skippedYouth, 0),
  skippedUnparsed: pages.reduce((sum, page) => sum + page.skippedUnparsed, 0),
};

const totalItems = pages[0]?.totalItems ?? 0;
if (limitPages === 0 && totalItems > 0 && seen.size !== totalItems) {
  throw new Error(`MarathonGuide field incomplete: ${seen.size} identities vs total ${totalItems}.`);
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