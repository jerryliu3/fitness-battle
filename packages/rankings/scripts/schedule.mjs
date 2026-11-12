import { register } from "node:module";

register("./ts-resolve.mjs", import.meta.url);

const { requireDatabaseUrl, psqlQuery } = await import("./psql-util.mjs");

const argv = process.argv.slice(2);

if (argv.includes("--help")) {
  console.log(`Usage:
  node packages/rankings/scripts/schedule.mjs --list
  node packages/rankings/scripts/schedule.mjs --queue-approved
`);
  process.exit(0);
}

const databaseUrl = requireDatabaseUrl();

if (argv.includes("--list")) {
  const rows = psqlQuery(
    databaseUrl,
    `select m.population_key, m.adapter, m.approved_at::text, d.decision,
            coalesce(ar.status, 'none'), coalesce(ar.finished_at::text, '')
     from public.acquisition_edition_mappings m
     join public.acquisition_source_decisions d on d.id = m.source_decision_id
     left join lateral (
       select status, finished_at
       from public.acquisition_runs r
       where r.mapping_id = m.id
       order by r.created_at desc
       limit 1
     ) ar on true
     order by m.population_key;`,
  );
  console.log(rows || "(no mappings)");
  process.exit(0);
}

if (argv.includes("--queue-approved")) {
  const rows = psqlQuery(
    databaseUrl,
    `insert into public.acquisition_runs (mapping_id, status)
     select m.id, 'queued'
     from public.acquisition_edition_mappings m
     join public.acquisition_source_decisions d on d.id = m.source_decision_id
     where m.approved_at is not null
       and d.decision = 'permitted'
       and d.storage_allowed
       and not exists (
         select 1 from public.acquisition_runs r
         where r.mapping_id = m.id and r.status in ('queued', 'leased', 'succeeded')
       )
     returning id;`,
  );
  console.log(rows ? `Queued run ids: ${rows}` : "No approved mappings needed queueing.");
  process.exit(0);
}

console.error("Use --list or --queue-approved");
process.exit(1);
