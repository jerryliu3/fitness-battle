import { register } from "node:module";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./ts-resolve.mjs", import.meta.url);

const {
  NYRR_FINISHERS_API,
  assertNyrrPayloadNotChallenge,
  assertPreviewAllowsApply,
  buildFailedRunPatch,
  buildPreparedRunPatch,
  buildStageApplySql,
  fetchNyrrFinishers,
  buildAcquisitionPreview,
  editionImportSql,
  snapshotIdentity,
} = await import("../src/index.ts");

const root = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(root, "..");
const { requireDatabaseUrl, psqlFile, psqlQuery } = await import("./psql-util.mjs");

const argv = process.argv.slice(2);
const PARSER_VERSION = "acquire-2026-11-14";

function flag(name) {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

function quote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; OvertaekRankings/1.0; +https://github.com/jerryliu3/fitness-battle)";

function assertMappingPermitted(mapping) {
  if (!mapping.approvedAt) throw new Error("Edition mapping is not approved.");
  if (mapping.decision !== "permitted") {
    throw new Error(`Source decision is ${mapping.decision}; bulk acquisition is blocked.`);
  }
  if (!mapping.storageAllowed) throw new Error("Source decision does not allow storage.");
  const eventCode = mapping.externalEventId ?? mapping.adapterConfig?.eventCode;
  if (mapping.adapter === "nyrr") {
    if (!eventCode) throw new Error("NYRR mapping missing external event code.");
    if (mapping.adapterConfig?.eventCode && mapping.adapterConfig.eventCode !== eventCode) {
      throw new Error("adapter_config.eventCode must match external_event_id.");
    }
  }
}

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
      'externalEventId', m.external_event_id,
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
  const mapping = JSON.parse(row);
  if (mapping.externalEventId && mapping.adapterConfig?.eventCode) {
    mapping.adapterConfig.eventCode = mapping.externalEventId;
  }
  return mapping;
}

function getEditionPublicationState(databaseUrl, sourceSlug, externalEventId, editionYear) {
  const eventClause =
    externalEventId != null && externalEventId !== ""
      ? `e.external_event_id = ${quote(externalEventId)}`
      : "e.external_event_id is null";
  const row = psqlQuery(
    databaseUrl,
    `select ed.publication_state, ed.revision
     from public.event_editions ed
     join public.events e on e.id = ed.event_id
     join public.sources s on s.id = e.source_id
     where s.slug = ${quote(sourceSlug)}
       and ${eventClause}
       and ed.edition_year = ${editionYear}
     limit 1;`,
  );
  if (!row) return null;
  const [state, revision] = row.split("|");
  return { state, revision: Number(revision) || 1 };
}

async function claimRun(mappingId, owner) {
  const databaseUrl = requireDatabaseUrl();
  return Number(
    psqlQuery(databaseUrl, `select public.acquisition_claim_run(${mappingId}, ${quote(owner)}, 3600);`),
  );
}

function patchRun(runId, owner, patch) {
  const databaseUrl = requireDatabaseUrl();
  psqlQuery(
    databaseUrl,
    `select public.acquisition_patch_run(${runId}, ${quote(owner)}, ${quote(JSON.stringify(patch))}::jsonb);`,
  );
}

async function fetchNyrrEdition(mapping) {
  const eventCode = mapping.externalEventId ?? mapping.adapterConfig?.eventCode;
  if (!eventCode) throw new Error("NYRR mapping missing external event code.");
  const rawResponses = [];
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
    const payload = JSON.parse(text);
    rawResponses.push({ request: body, response: payload });
    return payload;
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
      externalEventId: eventCode,
      eventName: mapping.eventName,
      editionYear: mapping.editionYear,
      startsOn: mapping.startsOn,
      sourceUrl: mapping.sourceUrl,
      results: pages.flatMap((page) => page.results),
      skippedYouth: pages.reduce((sum, page) => sum + page.skippedYouth, 0),
      skippedUnparsed: pages.reduce((sum, page) => sum + page.skippedUnparsed, 0),
    },
    totalItems,
    providerResponses: rawResponses,
  };
}

async function writeRunArtifacts(runId, edition, providerResponses, totalItems) {
  const dir = join(packageRoot, "imports", "runs", String(runId));
  await mkdir(dir, { recursive: true });
  const normalizedBody = `${edition.results.map((row) => JSON.stringify(row)).join("\n")}\n`;
  const providerBody = JSON.stringify(providerResponses);
  const normalized = snapshotIdentity(normalizedBody, `${dir}/normalized.jsonl`);
  const providerSnapshot = snapshotIdentity(providerBody, `${dir}/provider-responses.json`);
  await writeFile(join(dir, "normalized.jsonl"), normalizedBody);
  await writeFile(join(dir, "provider-responses.json"), providerBody);
  const preview = buildAcquisitionPreview(edition, { expectedTotal: totalItems });
  assertPreviewAllowsApply(preview);
  await writeFile(join(dir, "preview.json"), `${JSON.stringify(preview, null, 2)}\n`);
  return { dir, normalized, providerSnapshot, preview };
}

function resolveStagedRunId(databaseUrl, populationKey, explicitRunId) {
  if (explicitRunId) return Number(explicitRunId);
  const row = psqlQuery(
    databaseUrl,
    `select ar.id::text
     from public.acquisition_runs ar
     join public.acquisition_edition_mappings m on m.id = ar.mapping_id
     where m.population_key = ${quote(populationKey)}
       and ar.status = 'succeeded'
       and ar.publication_outcome = 'staged'
       and ar.staged_edition_id is not null
     order by ar.finished_at desc nulls last, ar.id desc
     limit 1;`,
  );
  return row ? Number(row) : null;
}

if (argv.includes("--help") || argv.length === 0) {
  console.log(`Usage:
  node packages/rankings/scripts/acquire.mjs --population-key nyrr:M2026:finishers [--owner HOST] [--apply]
  node packages/rankings/scripts/acquire.mjs --publish-staged --population-key nyrr:M2026:finishers [--run RUN_ID] [--owner HOST]
`);
  process.exit(0);
}

const owner = flag("--owner") ?? `acquire-${createHash("sha256").update(PARSER_VERSION).digest("hex").slice(0, 8)}`;

if (argv.includes("--publish-staged")) {
  const populationKey = flag("--population-key");
  if (!populationKey) throw new Error("Provide --population-key");
  const mapping = await loadMapping(populationKey);
  assertMappingPermitted(mapping);
  const databaseUrl = requireDatabaseUrl();
  const runId = resolveStagedRunId(databaseUrl, populationKey, flag("--run"));
  if (!runId) throw new Error("No staged acquisition run with edition binding found.");
  const runMapping = psqlQuery(
    databaseUrl,
    `select m.population_key from public.acquisition_runs ar
     join public.acquisition_edition_mappings m on m.id = ar.mapping_id
     where ar.id = ${runId};`,
  );
  if (runMapping !== populationKey) throw new Error(`Run ${runId} does not belong to mapping ${populationKey}.`);
  const editionId = psqlQuery(
    databaseUrl,
    `select public.acquisition_publish_staged_run(${runId}, ${quote(owner)});`,
  );
  console.log(JSON.stringify({ populationKey, runId, editionId: Number(editionId), published: true }, null, 2));
  process.exit(0);
}

const populationKey = flag("--population-key");
if (!populationKey) throw new Error("Provide --population-key");

const mapping = await loadMapping(populationKey);
assertMappingPermitted(mapping);

const databaseUrl = requireDatabaseUrl();
const eventCode = mapping.externalEventId ?? mapping.adapterConfig?.eventCode;
const existing = getEditionPublicationState(databaseUrl, mapping.sourceSlug, eventCode, mapping.editionYear);
if (existing?.state === "frozen") {
  throw new Error(`Edition is frozen (revision ${existing.revision}); acquisition skipped.`);
}
if (existing?.state === "published") {
  throw new Error(`Edition is already published (revision ${existing.revision}); use authorized correction path.`);
}

const replaceStaged = argv.includes("--replace-staged");
if (existing?.state === "staged" && !replaceStaged) {
  throw new Error("Edition is already staged; pass --replace-staged for an authorized replacement import.");
}

const runId = await claimRun(mapping.mappingId, owner);

try {
  const fetched =
    mapping.adapter === "nyrr"
      ? await fetchNyrrEdition(mapping)
      : (() => {
          throw new Error(`Adapter ${mapping.adapter} is not wired in acquire.mjs yet.`);
        })();

  const artifacts = await writeRunArtifacts(runId, fetched.edition, fetched.providerResponses, fetched.totalItems);

  const importOptions = {
    stageOnly: true,
    populationScope: {
      distanceSlug: mapping.distanceSlug,
      externalResultIdPrefix: `${eventCode}:`,
    },
    allowCorrection: existing?.state === "staged",
    expectedRevision: existing?.state === "staged" ? existing.revision : undefined,
  };
  const importSql = editionImportSql(fetched.edition, artifacts.normalized, importOptions);
  const sqlPath = join(artifacts.dir, "import.sql");
  await writeFile(sqlPath, importSql);

  const preparedPatchInput = {
    parserVersion: PARSER_VERSION,
    artifactDir: artifacts.dir,
    normalizedSha256: artifacts.normalized.contentSha256,
    rawSha256: artifacts.providerSnapshot.contentSha256,
    counts: {
      extracted: fetched.edition.results.length,
      skippedYouth: fetched.edition.skippedYouth,
      skippedUnparsed: fetched.edition.skippedUnparsed,
      expectedTotal: fetched.totalItems,
    },
    warnings: artifacts.preview.warnings,
  };

  let publication = "prepared";
  if (argv.includes("--apply")) {
    patchRun(runId, owner, buildPreparedRunPatch(preparedPatchInput));
    const stageApplySql = buildStageApplySql(runId, owner, {
      sourceSlug: mapping.sourceSlug,
      externalEventId: eventCode,
      editionYear: mapping.editionYear,
    }, importSql);
    const stageApplyPath = join(artifacts.dir, "stage-apply.sql");
    await writeFile(stageApplyPath, stageApplySql);
    await psqlFile(databaseUrl, stageApplyPath);
    publication = "staged";
  } else {
    patchRun(runId, owner, buildPreparedRunPatch(preparedPatchInput, { releaseLease: true }));
  }

  console.log(
    JSON.stringify(
      {
        runId,
        populationKey,
        artifactDir: artifacts.dir,
        preview: artifacts.preview,
        sqlPath,
        stageApplySql: argv.includes("--apply") ? join(artifacts.dir, "stage-apply.sql") : null,
        apply: argv.includes("--apply") ? "applied" : "prepared-only",
        publication,
      },
      null,
      2,
    ),
  );
} catch (error) {
  patchRun(runId, owner, buildFailedRunPatch(error instanceof Error ? error.message : String(error)));
  throw error;
}
