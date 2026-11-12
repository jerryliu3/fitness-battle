import { register } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./ts-resolve.mjs", import.meta.url);

const {
  candidateDedupeKey,
  upsertCandidateSql,
  upsertEditionMappingSql,
  upsertSourceDecisionSql,
} = await import("../src/index.ts");

const root = dirname(fileURLToPath(import.meta.url));
const { requireDatabaseUrl, psqlFile, psqlQuery } = await import("./psql-util.mjs");

const argv = process.argv.slice(2);

function flag(name) {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function runSql(label, sql) {
  const databaseUrl = requireDatabaseUrl();
  const dir = join(root, "..", "imports", "ops");
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${label}-${Date.now()}.sql`);
  await writeFile(path, `${sql}\n`);
  await psqlFile(databaseUrl, path);
  console.log(`Applied ${path}`);
  return path;
}

const NYC_2026 = {
  eventName: "TCS New York City Marathon 2026",
  officialWebsite: "https://www.nyrr.org",
  editionYear: 2026,
  startsOn: null,
  locationText: "New York, NY, USA",
  distances: ["marathon"],
  resultsUrls: ["https://results.nyrr.org/event/M2026/finishers"],
  discoverySource: "manual",
  unresolvedFields: ["source_permission", "edition_date"],
};

const NYC_DEDUPE_KEY = candidateDedupeKey({
  eventName: NYC_2026.eventName,
  editionYear: NYC_2026.editionYear,
  resultsUrls: NYC_2026.resultsUrls,
});
const NYC_SOURCE_SLUG = "nyrr_nyc_marathon";
const NYC_POPULATION_KEY = "nyrr:M2026:finishers";

if (argv.includes("--help") || argv.length === 0) {
  console.log(`Usage:
  node packages/rankings/scripts/candidate.mjs --nyc-2026
  node packages/rankings/scripts/candidate.mjs --nyc-2026-map [--approve] [--reviewer NAME]
  node packages/rankings/scripts/candidate.mjs --import path/to/candidates.json
  node packages/rankings/scripts/candidate.mjs --source-review --slug nyrr_nyc_marathon --decision blocked|permitted|pending [...]
  node packages/rankings/scripts/candidate.mjs --map --population-key KEY --candidate-id ID --decision-id ID --external-event-id CODE [...]
`);
  process.exit(0);
}

if (argv.includes("--nyc-2026-map")) {
  const databaseUrl = requireDatabaseUrl();
  const candidateId = psqlQuery(
    databaseUrl,
    `select id from public.acquisition_candidates where dedupe_key = ${quote(NYC_DEDUPE_KEY)} limit 1;`,
  );
  const decisionId = psqlQuery(
    databaseUrl,
    `select id from public.acquisition_source_decisions where source_slug = ${quote(NYC_SOURCE_SLUG)} limit 1;`,
  );
  if (!candidateId || !decisionId) throw new Error("Run --nyc-2026 bootstrap first.");
  const sql = upsertEditionMappingSql({
    candidateId: Number(candidateId),
    sourceDecisionId: Number(decisionId),
    adapter: "nyrr",
    populationKey: NYC_POPULATION_KEY,
    externalEventId: "M2026",
    distanceSlug: "marathon",
    editionYear: 2026,
    eventName: NYC_2026.eventName,
    startsOn: null,
    sourceUrl: "https://results.nyrr.org/event/M2026/finishers",
    approvedBy: argv.includes("--approve") ? flag("--reviewer") ?? "operator" : null,
  });
  await runSql("nyc-2026-map", sql);
  process.exit(0);
}

if (argv.includes("--nyc-2026")) {
  await runSql("candidate-nyc-2026", upsertCandidateSql(NYC_2026));
  const databaseUrl = requireDatabaseUrl();
  const candidateId = psqlQuery(
    databaseUrl,
    `select id from public.acquisition_candidates where dedupe_key = ${quote(NYC_DEDUPE_KEY)} limit 1;`,
  );
  if (!candidateId) throw new Error("Candidate upsert did not persist.");
  const blocked = upsertSourceDecisionSql({
    candidateId: Number(candidateId),
    sourceSlug: NYC_SOURCE_SLUG,
    decision: "blocked",
    accessMethod: "NYRR public finishers API (unreviewed)",
    storageAllowed: false,
    displayAllowed: false,
    attribution: "Official results, New York Road Runners",
    reuseNotes:
      "Blocked until operator records explicit access/reuse evidence. Public readability is not approval.",
    evidenceUrl: "https://prod.nyrr.org/terms-of-use",
    reviewer: "acquisition-bootstrap",
    notes: "Default bootstrap decision; override with --source-review --decision permitted after review.",
  });
  await runSql("source-nyrr-blocked", blocked);
  console.log(JSON.stringify({ candidateId: Number(candidateId), dedupeKey: NYC_DEDUPE_KEY }, null, 2));
  process.exit(0);
}

if (argv.includes("--import")) {
  const file = flag("--import");
  const raw = JSON.parse(await readFile(file, "utf8"));
  const list = Array.isArray(raw) ? raw : [raw];
  for (const item of list) {
    await runSql("candidate-import", upsertCandidateSql(item));
  }
  process.exit(0);
}

if (argv.includes("--source-review")) {
  const slug = flag("--slug");
  const decision = flag("--decision") ?? "pending";
  if (!slug || !["pending", "permitted", "blocked"].includes(decision)) {
    throw new Error("Provide --slug and --decision pending|permitted|blocked");
  }
  const sql = upsertSourceDecisionSql({
    candidateId: flag("--candidate-id") ? Number(flag("--candidate-id")) : null,
    sourceSlug: slug,
    decision,
    accessMethod: flag("--access-method") ?? "",
    storageAllowed: argv.includes("--storage-allowed"),
    displayAllowed: argv.includes("--display-allowed"),
    attribution: flag("--attribution") ?? "",
    reuseNotes: flag("--reuse-notes") ?? "",
    evidenceUrl: flag("--evidence-url"),
    reviewer: flag("--reviewer") ?? "operator",
    notes: flag("--notes") ?? "",
  });
  await runSql("source-review", sql);
  process.exit(0);
}

if (argv.includes("--map")) {
  const populationKey = flag("--population-key");
  if (!populationKey) throw new Error("Provide --population-key");
  const externalEventId = flag("--external-event-id");
  if (!externalEventId) throw new Error("Provide --external-event-id.");
  const sql = upsertEditionMappingSql({
    candidateId: Number(flag("--candidate-id")),
    sourceDecisionId: Number(flag("--decision-id")),
    adapter: flag("--adapter") ?? "nyrr",
    populationKey,
    externalEventId,
    distanceSlug: flag("--distance") ?? "marathon",
    editionYear: Number(flag("--year")),
    eventName: flag("--name") ?? populationKey,
    startsOn: flag("--date"),
    sourceUrl: flag("--source-url") ?? "",
    approvedBy: argv.includes("--approve") ? flag("--reviewer") ?? "operator" : null,
  });
  await runSql("edition-map", sql);
  process.exit(0);
}

throw new Error("No candidate command recognized. Use --help.");
