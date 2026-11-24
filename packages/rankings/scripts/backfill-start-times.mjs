/**
 * Backfill real per-runner `performances.start_at` timestamps (and NYRR `gun_time_ms`).
 *
 * Modes:
 *   1. gun-offset (no re-scrape — uses existing `gun_time_ms - chip_time_ms` in DB, e.g. SF / Boston):
 *      pnpm rankings:backfill-start-times -- --mode gun-offset --slug sf-marathon-2026 --gun-start 2026-07-26T05:15:00-07:00 [--apply]
 *
 *   2. nyrr (paginates NYRR finishers-filter list to populate `gun_time_ms` and `start_at` from wave anchor + gun-chip offset):
 *      pnpm rankings:backfill-start-times -- --mode nyrr --event-code M2026 --starts-on 2026-11-01 --year 2026 [--apply]
 *
 *   3. mika-splits (applies `startAt` already captured in `<slug>.splits.jsonl` to `performances.start_at`):
 *      pnpm rankings:backfill-start-times -- --mode mika-splits --slug chicago-marathon-2025 [--apply]
 */
import { register } from "node:module";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./ts-resolve.mjs", import.meta.url);

const {
  MAJOR_EVENTS,
  NYRR_FINISHERS_API,
  deriveNyrrStartAtIso,
  fetchNyrrFinishers,
  gunOffsetBackfillSql,
  performanceStartTimesUpdateSql,
} = await import("../src/index.ts");

const root = dirname(fileURLToPath(import.meta.url));
const importDir = join(root, "..", "imports");
const argv = process.argv.slice(2);

function flag(name) {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

const mode = flag("--mode");
const apply = argv.includes("--apply");
const batchSize = Math.max(50, Number(flag("--batch-size") ?? "500"));

async function emitAndMaybeApply(filename, sqlText) {
  await mkdir(importDir, { recursive: true });
  const sqlPath = join(importDir, filename);
  await writeFile(sqlPath, `${sqlText}\n`);
  console.log(`Wrote backfill SQL: ${sqlPath}`);
  if (!apply) {
    console.log("Dry run complete. Re-run with --apply (and RANKINGS_DATABASE_URL / RANKINGS_DB_PASSWORD) to apply.");
    return;
  }
  const { loadRankingsRepoEnv, psqlFile, requireDatabaseUrl } = await import("./psql-util.mjs");
  loadRankingsRepoEnv();
  await psqlFile(requireDatabaseUrl(), sqlPath);
  console.log("Applied start-time backfill SQL.");
}

if (mode === "gun-offset") {
  const slug = flag("--slug");
  const gunStartIso = flag("--gun-start");
  if (!slug || !gunStartIso) {
    console.error("Usage: --mode gun-offset --slug <catalog-slug> --gun-start <ISO-8601-with-tz> [--apply]");
    process.exit(1);
  }
  const event = MAJOR_EVENTS.find((entry) => entry.slug === slug);
  if (!event) throw new Error(`Unknown catalog slug: ${slug}`);
  const sql = gunOffsetBackfillSql({
    sourceSlug: event.sourceSlug,
    externalEventId: event.externalEventId,
    editionYear: event.editionYear,
    distance: event.distance,
    gunStartIso,
  });
  await emitAndMaybeApply(`${slug}.start-times.sql`, sql);
} else if (mode === "nyrr") {
  const eventCode = flag("--event-code") ?? "M2026";
  const startsOn = flag("--starts-on");
  const year = Number(flag("--year") ?? eventCode.replace(/\D/g, ""));
  if (!startsOn || !Number.isInteger(year)) {
    console.error("Usage: --mode nyrr --event-code M2026 --starts-on YYYY-MM-DD [--year 2026] [--apply]");
    process.exit(1);
  }
  const wave1StartLocal = flag("--wave1-start") ?? "09:10:00";
  const proMenStartLocal = flag("--pro-men-start") ?? "09:05:00";
  const proWomenStartLocal = flag("--pro-women-start") ?? "08:35:00";
  const wheelchairStartLocal = flag("--wheelchair-start") ?? "08:00:00";

  const { pages, totalItems } = await fetchNyrrFinishers(
    async (body) => {
      const response = await fetch(NYRR_FINISHERS_API, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`NYRR ${response.status} on page ${body.pageIndex}`);
      return response.json();
    },
    {
      eventCode,
      distance: "marathon",
      sourceUrl: `https://results.nyrr.org/event/${eventCode}/finishers`,
      pageSize: 100,
    },
  );

  const rows = [];
  for (const page of pages) {
    for (const finish of page.results) {
      if (!finish.externalResultId) continue;
      const startAt = deriveNyrrStartAtIso({
        startsOn,
        timeZone: "America/New_York",
        chipTimeMs: finish.chipTimeMs,
        gunTimeMs: finish.gunTimeMs,
        bib: finish.bib,
        sex: finish.sex,
        competitionClass: finish.competitionClass,
        wave1StartLocal,
        proMenStartLocal,
        proWomenStartLocal,
        wheelchairStartLocal,
      });
      if (!startAt) continue;
      rows.push({
        externalResultId: finish.externalResultId,
        gunTimeMs: finish.gunTimeMs,
        startAt,
      });
    }
  }
  console.log(`NYRR ${eventCode}: derived ${rows.length} start timestamps out of ${totalItems} finishers.`);

  const target = {
    sourceSlug: "nyrr_nyc_marathon",
    externalEventId: eventCode,
    editionYear: year,
    distance: "marathon",
  };
  const chunks = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    chunks.push(performanceStartTimesUpdateSql(target, rows.slice(i, i + batchSize)));
  }
  await emitAndMaybeApply(`nyrr-${eventCode}.start-times.sql`, chunks.join("\n\n"));
} else if (mode === "mika-splits") {
  const slug = flag("--slug");
  if (!slug) {
    console.error("Usage: --mode mika-splits --slug <catalog-slug> [--apply]");
    process.exit(1);
  }
  const event = MAJOR_EVENTS.find((entry) => entry.slug === slug);
  if (!event) throw new Error(`Unknown catalog slug: ${slug}`);
  const splitsJsonl = join(importDir, `${slug}.splits.jsonl`);
  const rows = [];
  const reader = createInterface({ input: createReadStream(splitsJsonl), crlfDelay: Infinity });
  for await (const line of reader) {
    if (!line.trim()) continue;
    const item = JSON.parse(line);
    const startAt = item.startAt ?? item.splits?.startAt ?? null;
    if (item.externalResultId && startAt) {
      rows.push({ externalResultId: String(item.externalResultId), startAt });
    }
  }
  if (rows.length === 0) {
    throw new Error(`No rows with startAt found in ${splitsJsonl}. Re-run splits.mjs first.`);
  }
  const target = {
    sourceSlug: event.sourceSlug,
    externalEventId: event.externalEventId,
    editionYear: event.editionYear,
    distance: event.distance,
  };
  const chunks = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    chunks.push(performanceStartTimesUpdateSql(target, rows.slice(i, i + batchSize)));
  }
  await emitAndMaybeApply(`${slug}.start-times.sql`, chunks.join("\n\n"));
} else {
  console.error("Specify --mode gun-offset | nyrr | mika-splits");
  process.exit(1);
}
