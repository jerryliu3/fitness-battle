import { register } from "node:module";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./ts-resolve.mjs", import.meta.url);

const {
  NYRR_FINISHERS_API,
  assertNyrrPayloadNotChallenge,
  fetchNyrrFinishers,
  buildAcquisitionPreview,
  editionImportSql,
  snapshotIdentity,
} = await import("../src/index.ts");

const root = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(root, "..");
const { requireDatabaseUrl, psqlFile, psqlQuery } = await import("./psql-util.mjs");

const argv = process.argv.slice(2);
const PARSER_VERSION = "acquire-2026-11-12";

function flag(name) {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; OvertaekRankings/1.0; +https://github.com/jerryliu3/fitness-battle)";

async function loadMapping(populationKey) {
  const databaseUrl = requireDatabaseUrl();
  const safe = populationKey.replaceAll("'", "''");
  const row = psqlQuery(
    databaseUrl,
    `select json_build_object(
      'mappingId', m.id,
      'adapter', m.adapter,
      'populationKey', m.population_key,
      'distanceSlug', m.distance_slug,
      'editionYear', m.edition_year,
      'eventName', m.event_name,
      'startsOn', m.starts_on,
      'sourceUrl', m.source_url,
      'adapterConfig', m.adapter_config,
      'approvedAt', m.approved_at,
      'sourceDecisionId', d.id,
      'decision', d.decision,
      'storageAllowed', d.storage_allowed,
      'displayAllowed', d.display_allowed,
      'attribution', d.attribution,
      'reuseNotes', d.reuse_notes,
      'accessMethod', d.access_method,
      'sourceSlug', d.source_slug
    )::text
    from public.acquisition_edition_mappings m
    join public.acquisition_source_decisions d on d.id = m.source_decision_id
    where m.population_key = '${safe}'
    limit 1;`,
  );
  if (!row) throw new Error(`Unknown population mapping ${populationKey}`);
  return JSON.parse(row);
}

async function claimRun(mappingId, owner) {
  const databaseUrl = requireDatabaseUrl();
  return Number(
    psqlQuery(databaseUrl, `select public.acquisition_claim_run(${mappingId}, ${quote(owner)}, 3600);`),
  );
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function finishRun(runId, patch) {
  const databaseUrl = requireDatabaseUrl();
  const sets = Object.entries(patch)
    .map(([key, value]) => {
      if (value == null) return `${key} = null`;
      if (typeof value === "number") return `${key} = ${value}`;
      if (typeof value === "boolean") return `${key} = ${value ? "true" : "false"}`;
      if (Array.isArray(value)) return `${key} = array[${value.map((v) => quote(v)).join(",")}]::text[]`;
      if (typeof value === "object") return `${key} = ${quote(JSON.stringify(value))}::jsonb`;
      return `${key} = ${quote(value)}`;
    })
    .join(", ");
  psqlQuery(
    databaseUrl,
    `update public.acquisition_runs set ${sets}, finished_at = coalesce(finished_at, now()) where id = ${runId};`,
  );
}

async function fetchNyrrEdition(mapping) {
  const eventCode = mapping.adapterConfig?.eventCode;
  if (!eventCode) throw new Error("NYRR mapping missing adapter_config.eventCode");
  const fetchJson = async (body) => {
    const response = await fetch(NYRR_FINISHERS_API, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": USER_AGENT, accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    assertNyrrPayloadNotChallenge(text);
    if (!response.ok) throw new Error(`NYRR ${response.status}: ${text.slice(0, 200)}`);
    return JSON.parse(text);
  };
  const { pages, totalItems } = await fetchNyrrFinishers(fetchJson, {
    eventCode,
    distance: mapping.distanceSlug,
    sourceUrl: mapping.sourceUrl,
  });
  return {
    edition: {
      sourceSlug: mapping.sourceSlug,
      sourceName: mapping.eventName,
      accessMethod: mapping.accessMethod,
      reuseNotes: mapping.reuseNotes,
      attribution: mapping.attribution,
      displayAllowed: mapping.displayAllowed,
      externalEventId: mapping.adapterConfig.eventCode,
      eventName: mapping.eventName,
      editionYear: mapping.editionYear,
      startsOn: mapping.startsOn,
      sourceUrl: mapping.sourceUrl,
      results: pages.flatMap((page) => page.results),
      skippedYouth: pages.reduce((sum, page) => sum + page.skippedYouth, 0),
      skippedUnparsed: pages.reduce((sum, page) => sum + page.skippedUnparsed, 0),
    },
    totalItems,
    rawPayload: pages,
  };
}

async function writeRunArtifacts(runId, edition, rawPayload, totalItems) {
  const dir = join(packageRoot, "imports", "runs", String(runId));
  await mkdir(dir, { recursive: true });
  const normalizedBody = `${edition.results.map((row) => JSON.stringify(row)).join("\n")}\n`;
  const rawBody = JSON.stringify(rawPayload);
  const normalized = snapshotIdentity(normalizedBody, `${dir}/normalized.jsonl`);
  const raw = snapshotIdentity(rawBody, `${dir}/raw.json`);
  await writeFile(join(dir, "normalized.jsonl"), normalizedBody);
  await writeFile(join(dir, "raw.json"), rawBody);
  const preview = buildAcquisitionPreview(edition, { expectedTotal: totalItems });
  await writeFile(join(dir, "preview.json"), `${JSON.stringify(preview, null, 2)}\n`);
  return { dir, normalized, raw, preview };
}

if (argv.includes("--help") || !flag("--population-key")) {
  console.log(`Usage:
  node packages/rankings/scripts/acquire.mjs --population-key nyrr:M2026:finishers [--owner HOST] [--stage] [--publish]
  node packages/rankings/scripts/acquire.mjs --retry-run RUN_ID [--stage] [--publish]
`);
  process.exit(argv.includes("--help") ? 0 : 1);
}

const populationKey = flag("--population-key");
const owner = flag("--owner") ?? `acquire-${createHash("sha256").update(PARSER_VERSION).digest("hex").slice(0, 8)}`;
const stageOnly = !argv.includes("--publish");
const retryRunId = flag("--retry-run");

const mapping = await loadMapping(populationKey);
if (!mapping.approvedAt) throw new Error("Edition mapping is not approved.");
if (mapping.decision !== "permitted") {
  throw new Error(`Source decision is ${mapping.decision}; bulk acquisition is blocked.`);
}
if (!mapping.storageAllowed) throw new Error("Source decision does not allow storage.");

let runId = retryRunId ? Number(retryRunId) : await claimRun(mapping.mappingId, owner);
if (retryRunId) {
  const databaseUrl = requireDatabaseUrl();
  psqlQuery(
    databaseUrl,
    `update public.acquisition_runs set status = 'leased', lease_owner = ${quote(owner)},
      lease_until = now() + interval '1 hour', error_summary = '' where id = ${runId};`,
  );
}

try {
  psqlQuery(
    requireDatabaseUrl(),
    `update public.acquisition_runs set parser_version = ${quote(PARSER_VERSION)} where id = ${runId};`,
  );

  const fetched =
    mapping.adapter === "nyrr"
      ? await fetchNyrrEdition(mapping)
      : (() => {
          throw new Error(`Adapter ${mapping.adapter} is not wired in acquire.mjs yet.`);
        })();

  const artifacts = await writeRunArtifacts(runId, fetched.edition, fetched.rawPayload, fetched.totalItems);
  await finishRun(runId, {
    status: "succeeded",
    artifact_dir: artifacts.dir,
    normalized_sha256: artifacts.normalized.contentSha256,
    raw_sha256: artifacts.raw.contentSha256,
    counts: {
      extracted: fetched.edition.results.length,
      skippedYouth: fetched.edition.skippedYouth,
      skippedUnparsed: fetched.edition.skippedUnparsed,
      expectedTotal: fetched.totalItems,
    },
    warnings: artifacts.preview.warnings,
    publication_outcome: "skipped",
  });

  const importSql = editionImportSql(fetched.edition, artifacts.normalized, {
    stageOnly,
    populationScope: { distanceSlug: mapping.distanceSlug, externalResultIdPrefix: `${mapping.adapterConfig.eventCode}:` },
  });
  const sqlPath = join(artifacts.dir, "import.sql");
  await writeFile(sqlPath, importSql);

  if (argv.includes("--apply")) {
    await psqlFile(requireDatabaseUrl(), sqlPath);
    const databaseUrl = requireDatabaseUrl();
    if (stageOnly) {
      await finishRun(runId, { publication_outcome: "staged" });
    } else {
      const editionId = psqlQuery(
        databaseUrl,
        `select ee.id from public.event_editions ee
         join public.events e on e.id = ee.event_id
         where e.external_event_id = ${quote(String(mapping.adapterConfig.eventCode))}
           and ee.edition_year = ${mapping.editionYear}
         limit 1;`,
      );
      psqlQuery(databaseUrl, `select public.publish_event_edition(${editionId});`);
      await finishRun(runId, { publication_outcome: "published" });
    }
  }

  console.log(
    JSON.stringify(
      {
        runId,
        populationKey,
        artifactDir: artifacts.dir,
        preview: artifacts.preview,
        sqlPath,
        apply: argv.includes("--apply") ? "applied" : "skipped",
        publication: stageOnly ? "staged" : "published",
      },
      null,
      2,
    ),
  );
} catch (error) {
  await finishRun(runId, {
    status: "failed",
    error_summary: error instanceof Error ? error.message : String(error),
    publication_outcome: "failed",
  });
  throw error;
}
