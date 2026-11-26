/**
 * MarathonGuide finisher import (JSON API behind Cloudflare on HTML; finishers API is
 * /api/v1/races/{slug}/{year}/finishers). No course splits on this source.
 *
 * Usage:
 *   pnpm rankings:ingest-marathonguide -- --slug tokyo-marathon-2025 [--max-pages 400] [--apply]
 *   pnpm rankings:ingest-marathonguide -- --results-url URL ...
 */
import { register } from "node:module";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./ts-resolve.mjs", import.meta.url);

const {
  MAJOR_EVENTS,
  PUBLIC_LIST_REUSE,
  editionImportSql,
  snapshotIdentity,
  marathonGuideFinishersApiUrl,
  parseMarathonGuideFinishersPage,
  parseMarathonGuideResultsUrl,
} = await import("../src/index.ts");

const root = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(root, "..");

function flag(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchFinishersPage(apiUrl, resultsUrl) {
  const response = await fetch(apiUrl, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/json",
      referer: resultsUrl,
    },
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  if (response.status === 403 && text.includes("Just a moment")) {
    throw new Error(
      "MarathonGuide returned Cloudflare challenge (403). Run this import from a network that can pass the challenge, or capture pages locally and use rankings:ingest --csv.",
    );
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${apiUrl}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${apiUrl}`);
  }
}

const slug = flag("--slug");
const resultsUrlFlag = flag("--results-url");
const maxPages = Number(flag("--max-pages") ?? "400");
const importDir = flag("--output-dir") || join(packageRoot, "imports");
const apply = process.argv.includes("--apply");

if (!slug && !resultsUrlFlag) {
  console.error(`Usage:
  node packages/rankings/scripts/ingest-marathonguide.mjs --slug tokyo-marathon-2025 [--max-pages 400] [--apply]
  node packages/rankings/scripts/ingest-marathonguide.mjs --results-url https://www.marathonguide.com/races/run/.../results/ ...`);
  process.exit(1);
}

const catalog = slug ? MAJOR_EVENTS.find((row) => row.slug === slug) : null;
if (slug && !catalog) throw new Error(`Unknown catalog slug: ${slug}`);
if (slug && !catalog.listUrl) throw new Error(`${slug} has no listUrl.`);

const resultsUrl = resultsUrlFlag ?? catalog.listUrl;
const { raceSlug, year } = parseMarathonGuideResultsUrl(resultsUrl);
const distance = catalog?.distance ?? "marathon";
const sourceSlug = catalog?.sourceSlug ?? `marathonguide_${raceSlug}`;
const sourceName = catalog?.sourceName ?? raceSlug;
const eventName = catalog?.eventName ?? `${raceSlug} ${year}`;
const externalEventId = catalog?.externalEventId ?? `${raceSlug}-${year}`;
const startsOn = catalog?.startsOn ?? null;

const allResults = [];
let skippedYouth = 0;
let skippedUnparsed = 0;
let pagesRead = 0;

for (let page = 1; page <= maxPages; page += 1) {
  const apiUrl = marathonGuideFinishersApiUrl(raceSlug, year, page);
  const payload = await fetchFinishersPage(apiUrl, resultsUrl);
  const parsed = parseMarathonGuideFinishersPage(payload, { distance, sourceUrl: resultsUrl });
  pagesRead += 1;
  allResults.push(...parsed.results);
  skippedYouth += parsed.skippedYouth;
  skippedUnparsed += parsed.skippedUnparsed;
  if (parsed.results.length < 100) break;
}

const edition = {
  sourceSlug,
  sourceName,
  accessMethod: "MarathonGuide public finishers JSON API",
  reuseNotes: PUBLIC_LIST_REUSE,
  attribution: catalog?.attribution ?? "Finisher list via MarathonGuide",
  displayAllowed: false,
  externalEventId,
  eventName,
  editionYear: year,
  startsOn,
  sourceUrl: resultsUrl,
  results: allResults,
  skippedYouth,
  skippedUnparsed,
};

const snapshotBody = JSON.stringify({ pagesRead, results: allResults });
const raw = Buffer.from(snapshotBody, "utf8");
const snapshot = snapshotIdentity(raw, `marathonguide:${raceSlug}:${year}:${pagesRead}`);
const sql = editionImportSql(edition, snapshot);
const outSlug = slug ?? `${raceSlug}-${year}`;

await mkdir(importDir, { recursive: true });
const sqlPath = join(importDir, `${outSlug}.import.sql`);
await writeFile(sqlPath, sql);
const jsonlPath = join(importDir, `${outSlug}.jsonl`);
await writeFile(jsonlPath, `${allResults.map((row) => JSON.stringify(row)).join("\n")}\n`);

const report = {
  slug: outSlug,
  raceSlug,
  year,
  pagesRead,
  results: allResults.length,
  skippedYouth,
  skippedUnparsed,
  sql: sqlPath,
  sha256: createHash("sha256").update(raw).digest("hex"),
  apply: "skipped",
};

if (apply) {
  const { loadRankingsRepoEnv, psqlFile, requireDatabaseUrl } = await import("./psql-util.mjs");
  loadRankingsRepoEnv();
  await psqlFile(requireDatabaseUrl(), sqlPath);
  report.apply = "applied";
}

console.log(JSON.stringify(report, null, 2));
if (report.apply === "failed") process.exitCode = 1;