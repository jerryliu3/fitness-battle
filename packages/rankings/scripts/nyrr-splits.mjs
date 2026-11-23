import { register } from "node:module";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./ts-resolve.mjs", import.meta.url);

const {
  NYRR_MARATHON_2026,
  NYRR_RESULT_DETAILS_API,
  nyrrResultPageUrl,
  parseNyrrSplitResults,
  splitImportSqlForEdition,
} = await import("../src/index.ts");

const root = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(root, "..");
const importDir = join(packageRoot, "imports");

const argv = process.argv.slice(2);

function flag(name) {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

const limit = Number(flag("--limit") ?? "0");
const delayMs = Number(flag("--delay-ms") ?? "80");
const batchSize = Number(flag("--batch-size") ?? "150");
const jsonlPath =
  flag("--jsonl") ?? join(importDir, "nyrr-M2026-finishers.jsonl");

const SOURCE_SLUG = "nyrr_nyc_marathon";
const SPLIT_PROFILE = "marathon_nyc";

const USER_AGENT =
  "Mozilla/5.0 (compatible; OvertaekRankings/1.0; +https://github.com/jerryliu3/fitness-battle)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadRunnerRefs(path) {
  const refs = [];
  const reader = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of reader) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    const external = row.externalResultId ?? row.external_result_id;
    if (!external) continue;
    const runnerId = String(external).split(":").pop();
    const bib = row.normalizedBib ?? row.bib;
    refs.push({
      externalResultId: String(external),
      runnerId: Number(runnerId),
      bib: bib != null ? String(bib) : null,
    });
  }
  return refs;
}

async function fetchResultDetails(runnerId) {
  const response = await fetch(NYRR_RESULT_DETAILS_API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": USER_AGENT,
    },
    body: JSON.stringify({ runnerId }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} runner ${runnerId}`);
  const payload = await response.json();
  return payload.details ?? payload;
}

const refs = await loadRunnerRefs(jsonlPath);
const selected = limit > 0 ? refs.slice(0, limit) : refs;

const rows = [];
let failures = 0;
for (let index = 0; index < selected.length; index += 1) {
  const ref = selected[index];
  if (!Number.isFinite(ref.runnerId)) {
    failures += 1;
    continue;
  }
  try {
    const details = await fetchResultDetails(ref.runnerId);
    const splits = parseNyrrSplitResults(details, SPLIT_PROFILE);
    if (splits.elapsedMs.some((ms) => ms == null)) {
      failures += 1;
      continue;
    }
    const bib = ref.bib ?? details.bib ?? ref.runnerId;
    rows.push({
      externalResultId: ref.externalResultId,
      splits,
      sourceUrl: nyrrResultPageUrl(NYRR_MARATHON_2026.eventCode, bib),
    });
  } catch (error) {
    failures += 1;
    if (failures <= 5) {
      console.error(
        `NYRR split failed for ${ref.externalResultId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  if ((index + 1) % 25 === 0) {
    process.stdout.write(`\rNYRR splits ${index + 1}/${selected.length} ok ${rows.length}`);
  }
  if (delayMs > 0) await sleep(delayMs);
}

process.stdout.write(`\rNYRR splits ${selected.length}/${selected.length} accepted ${rows.length} failures ${failures}\n`);

const splitsJsonl = join(importDir, `nyc-marathon-2026.splits.jsonl`);
await mkdir(importDir, { recursive: true });
await writeFile(splitsJsonl, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);

const editionTarget = {
  sourceSlug: SOURCE_SLUG,
  externalEventId: NYRR_MARATHON_2026.eventCode,
  editionYear: 2026,
  distance: "marathon",
  splitProfileId: SPLIT_PROFILE,
};

const sqlChunks = [];
for (let offset = 0; offset < rows.length; offset += batchSize) {
  sqlChunks.push(splitImportSqlForEdition(editionTarget, rows.slice(offset, offset + batchSize)));
}

const sqlPath = join(importDir, "nyc-marathon-2026.splits.import.sql");
await writeFile(sqlPath, `${sqlChunks.join("\n\n")}\n`);
console.log(`Wrote ${rows.length} split rows to ${splitsJsonl}`);
console.log(`SQL: ${sqlPath}`);

try {
  const { psqlFile, requireDatabaseUrl } = await import("./psql-util.mjs");
  await psqlFile(requireDatabaseUrl(), sqlPath);
  console.log("Applied NYRR split SQL.");
} catch {
  console.log("Link rankings-db or set RANKINGS_DATABASE_URL to apply split SQL.");
}