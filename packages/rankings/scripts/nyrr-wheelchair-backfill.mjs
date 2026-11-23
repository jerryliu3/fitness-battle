#!/usr/bin/env node
/**
 * Tag NYRR performances as wheelchair using finishers-filter ageGradePercent metadata.
 *
 *   node packages/rankings/scripts/nyrr-wheelchair-backfill.mjs --event-code M2026 [--apply]
 */
import { nyrrCompetitionClassFromFinisher } from "../src/ingest/competition-class.ts";
import { loadRankingsRepoEnv, requireDatabaseUrl, psqlQuery } from "./psql-util.mjs";

const eventCode = process.argv.includes("--event-code")
  ? process.argv[process.argv.indexOf("--event-code") + 1]
  : "M2026";
const apply = process.argv.includes("--apply");
const pageSize = 200;

async function fetchPage(pageIndex) {
  const res = await fetch("https://rmsprodapi.nyrr.org/api/v2/runners/finishers-filter", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventCode,
      searchString: null,
      handicap: null,
      sortColumn: "overallTime",
      sortDescending: false,
      pageIndex,
      pageSize,
    }),
  });
  if (!res.ok) throw new Error(`NYRR page ${pageIndex} failed: ${res.status}`);
  return res.json();
}

loadRankingsRepoEnv();
const dbUrl = requireDatabaseUrl();

const editionId = Number(
  psqlQuery(
    dbUrl,
    `select ed.id::text from event_editions ed
     join events e on e.id = ed.event_id
     join sources s on s.id = e.source_id
     where s.slug = 'nyrr_nyc_marathon' and e.external_event_id = '${eventCode.replace(/'/g, "''")}'
     limit 1`,
  ),
);
if (!Number.isFinite(editionId)) {
  console.error("Edition not found for", eventCode);
  process.exit(1);
}

let pageIndex = 1;
let totalItems = null;
const wheelchairIds = [];
const openIds = [];

while (true) {
  const payload = await fetchPage(pageIndex);
  if (totalItems == null) totalItems = payload.totalItems ?? 0;
  const items = payload.items ?? [];
  if (!items.length) break;
  for (const row of items) {
    const klass = nyrrCompetitionClassFromFinisher(row);
    const key = `${eventCode}:${row.runnerId}`;
    if (klass === "wheelchair") wheelchairIds.push(key);
    else openIds.push(key);
  }
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (pageIndex >= totalPages) break;
  pageIndex += 1;
  if (pageIndex % 25 === 0) console.error(`scanned page ${pageIndex}/${totalPages}, wheelchair ids ${wheelchairIds.length}`);
}

console.log(`NYRR ${eventCode}: wheelchair ${wheelchairIds.length}, open sample ${openIds.length} (edition ${editionId})`);

if (!apply) {
  console.log("Dry run. Re-run with --apply to update competition_class.");
  process.exit(0);
}

function batchUpdate(ids, klass) {
  if (!ids.length) return;
  const esc = ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
  psqlQuery(
    dbUrl,
    `update performances p
     set competition_class = '${klass}', updated_at = now()
     from source_records sr
     where sr.id = p.source_record_id
       and p.event_edition_id = ${editionId}
       and sr.external_result_id in (${esc})`,
  );
}

for (let i = 0; i < wheelchairIds.length; i += 100) {
  batchUpdate(wheelchairIds.slice(i, i + 100), "wheelchair");
}
for (let i = 0; i < openIds.length; i += 500) {
  batchUpdate(openIds.slice(i, i + 500), "open");
}

psqlQuery(dbUrl, "select private.refresh_rankings_time_counts()");
console.log("Applied wheelchair tags and refreshed time-count cache.");