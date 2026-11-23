import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

register("./ts-resolve.mjs", import.meta.url);

const { MAJOR_EVENTS, splitImportSql } = await import("../src/index.ts");
const { loadRankingsRepoEnv, requireDatabaseUrl, psqlQuery, psqlFile } = await import("./psql-util.mjs");

function flag(name, list) {
  const index = list.indexOf(name);
  if (index === -1) return null;
  return list[index + 1] ?? null;
}

const argv = process.argv.slice(2);
const slug = flag("--slug", argv) ?? "sf-marathon-2026";
const event = MAJOR_EVENTS.find((e) => e.slug === slug);
if (!event?.splitProfileId) throw new Error(`Unknown split catalog slug: ${slug}`);

loadRankingsRepoEnv();
const databaseUrl = requireDatabaseUrl();
const importDir = join(dirname(fileURLToPath(import.meta.url)), "..", "imports");
const jsonlPath = join(importDir, `${slug}.splits.jsonl`);

const existing = new Set(
  psqlQuery(
    databaseUrl,
    `select sr.external_result_id
     from performance_split_times pst
     join performances p on p.id = pst.performance_id
     join source_records sr on sr.id = p.source_record_id
     join event_editions ed on ed.id = p.event_edition_id
     join events e on e.id = ed.event_id
     join sources s on s.id = e.source_id
     where s.slug = '${event.sourceSlug.replaceAll("'", "''")}'
       and ed.edition_year = ${event.editionYear};`,
  )
    .split("\n")
    .filter(Boolean),
);

const chipByExternal = new Map();
const chipRows = psqlQuery(
  databaseUrl,
  `select sr.external_result_id, p.chip_time_ms
   from performances p
   join source_records sr on sr.id = p.source_record_id
   join event_editions ed on ed.id = p.event_edition_id
   join events e on e.id = ed.event_id
   join sources s on s.id = e.source_id
   where s.slug = '${event.sourceSlug.replaceAll("'", "''")}'
     and ed.edition_year = ${event.editionYear}
     and p.chip_time_ms is not null;`,
)
  .split("\n")
  .filter(Boolean);
for (const line of chipRows) {
  const [id, chip] = line.split("|");
  if (id && chip) chipByExternal.set(id, Number(chip));
}

const pending = readFileSync(jsonlPath, "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line))
  .filter((row) => !existing.has(row.externalResultId));

let applied = 0;
let skipped = 0;
const failures = [];

for (const row of pending) {
  const chip = chipByExternal.get(row.externalResultId);
  const elapsed = [...row.splits.elapsedMs];
  const last = elapsed.length - 1;
  if (chip != null && elapsed[last] != null && elapsed[last] !== chip) {
    elapsed[last] = chip;
  }
  let monotone = true;
  for (let i = 1; i < elapsed.length; i += 1) {
    if (elapsed[i] != null && elapsed[i - 1] != null && elapsed[i] <= elapsed[i - 1]) {
      monotone = false;
      break;
    }
  }
  if (!monotone) {
    skipped += 1;
    failures.push({ id: row.externalResultId, reason: "non-monotone after chip align" });
    continue;
  }
  const normalized = { ...row, splits: { ...row.splits, elapsedMs: elapsed } };
  const sqlPath = join(importDir, `.pending-split-${row.externalResultId}.sql`);
  writeFileSync(sqlPath, splitImportSql(event, [normalized]));
  try {
    await psqlFile(databaseUrl, sqlPath);
    applied += 1;
    existing.add(row.externalResultId);
  } catch (error) {
    skipped += 1;
    failures.push({
      id: row.externalResultId,
      reason: error instanceof Error ? error.message : String(error),
    });
  } finally {
    try {
      unlinkSync(sqlPath);
    } catch {
      /* ignore */
    }
  }
  if ((applied + skipped) % 50 === 0) {
    process.stdout.write(`\rapplied ${applied} skipped ${skipped} / ${pending.length}`);
  }
}

process.stdout.write(`\rapplied ${applied} skipped ${skipped} / ${pending.length}\n`);
if (failures.length) {
  console.log("sample failures:", failures.slice(0, 8));
}
console.log(
  JSON.stringify(
    { slug, pending: pending.length, applied, skipped, dbTotal: existing.size },
    null,
    2,
  ),
);