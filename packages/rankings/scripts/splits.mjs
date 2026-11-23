import { register } from "node:module";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./ts-resolve.mjs", import.meta.url);

const {
  CHRONOTRACK_CTLIVE_ORIGIN,
  MAJOR_EVENTS,
  chronotrackEntryResultFromHtml,
  chronotrackEntryUrl,
  chronotrackResultUrl,
  chronotrackSplitsForProfile,
  mikaDetailUrl,
  mikaSplitsForProfile,
  splitImportSql,
} = await import("../src/index.ts");

const root = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(root, "..");
const importDir = join(packageRoot, "imports");

function flag(name, list) {
  const index = list.indexOf(name);
  if (index === -1) return null;
  return list[index + 1] ?? null;
}

const argv = process.argv.slice(2);
const slug = flag("--slug", argv);
const limit = Number(flag("--limit", argv) ?? "0");
const delayMs = Number(flag("--delay-ms", argv) ?? "120");
const batchSize = Number(flag("--batch-size", argv) ?? "200");
const concurrency = Math.max(1, Number(flag("--concurrency", argv) ?? "1"));

if (!slug) {
  console.error(`Usage: node packages/rankings/scripts/splits.mjs --slug <catalog-slug> [--limit N] [--delay-ms 120] [--batch-size 200]`);
  process.exit(1);
}

const event = MAJOR_EVENTS.find((entry) => entry.slug === slug);
if (!event?.listUrl || !event.splitProfileId) {
  throw new Error(`Unknown or non-split catalog slug: ${slug}`);
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  let lastError = new Error(`No response for ${url}`);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status === 429 || response.status === 403 || response.status >= 500) {
      lastError = new Error(`${response.status} ${url}`);
      await sleep(response.status === 403 ? 8000 * attempt : 1000 * attempt);
      continue;
    }
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return response.text();
  }
  throw lastError;
}

async function chronotrackBearerToken() {
  const response = await fetch("https://ctlive-api.chronotrack.com/registration/createAnonymousSession", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: CHRONOTRACK_CTLIVE_ORIGIN,
    },
    body: JSON.stringify({ clientId: "registration" }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} ChronoTrack anonymous session`);
  const body = await response.json();
  if (!body?.token) throw new Error("ChronoTrack anonymous session missing token.");
  return body.token;
}

async function fetchChronotrackResult(eventId, entryId, token) {
  const url = chronotrackResultUrl(eventId, entryId);
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      origin: CHRONOTRACK_CTLIVE_ORIGIN,
      accept: "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 401) return { unauthorized: true, blocked: false };
  if (response.status === 403) return { unauthorized: false, blocked: true };
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return { unauthorized: false, blocked: false, data: await response.json(), sourceUrl: url };
}

async function loadExternalIds(jsonlPath) {
  const ids = [];
  const reader = createInterface({ input: createReadStream(jsonlPath), crlfDelay: Infinity });
  for await (const line of reader) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (row.externalResultId) ids.push(String(row.externalResultId));
  }
  return ids;
}

const jsonlPath = join(importDir, `${slug}.jsonl`);
const splitsJsonlPath = join(importDir, `${slug}.splits.jsonl`);
let existingRows = [];
if (argv.includes("--resume")) {
  try {
    const raw = await readFile(splitsJsonlPath, "utf8");
    existingRows = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    existingRows = [];
  }
}
const ids = await loadExternalIds(jsonlPath);
const resumeIds = new Set(existingRows.map((row) => row.externalResultId));
const pending = ids.filter((id) => !resumeIds.has(id));
const selected = limit > 0 ? pending.slice(0, limit) : pending;

const isChronotrack = event.chronotrackEventId != null && event.chronotrackRaceId != null;
let chronotrackToken = isChronotrack ? await chronotrackBearerToken() : null;
let refreshToken = Promise.resolve(null);

async function chronotrackTokenRefreshed() {
  refreshToken = refreshToken.then(async (inFlight) => {
    if (inFlight) return inFlight;
    chronotrackToken = await chronotrackBearerToken();
    return chronotrackToken;
  });
  return refreshToken;
}

async function splitForId(idp) {
  let splits;
  let sourceUrl;
  if (isChronotrack) {
    let payload;
    let fetched = await fetchChronotrackResult(event.chronotrackEventId, idp, chronotrackToken);
    if (fetched.unauthorized) {
      await chronotrackTokenRefreshed();
      fetched = await fetchChronotrackResult(event.chronotrackEventId, idp, chronotrackToken);
    }
    if (!fetched.unauthorized && !fetched.blocked) {
      payload = fetched.data;
      sourceUrl = fetched.sourceUrl;
    } else {
      sourceUrl = chronotrackEntryUrl(event.chronotrackEventId, idp);
      const html = await fetchText(sourceUrl);
      payload = chronotrackEntryResultFromHtml(html, event.chronotrackEventId, idp);
    }
    splits = chronotrackSplitsForProfile(payload, event.splitProfileId);
  } else {
    sourceUrl = mikaDetailUrl(event.listUrl, idp);
    const html = await fetchText(sourceUrl);
    splits = mikaSplitsForProfile(html, event.splitProfileId);
  }
  if (splits.elapsedMs.some((ms) => ms == null)) return null;
  return { externalResultId: idp, splits, sourceUrl };
}

const rows = [...existingRows];
let failures = 0;
let completed = 0;
let nextIndex = 0;

async function worker() {
  while (true) {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= selected.length) return;
    const idp = selected[index];
    try {
      const row = await splitForId(idp);
      if (!row) failures += 1;
      else rows.push(row);
    } catch (error) {
      failures += 1;
      if (failures <= 5) {
        console.error(`split fetch failed for ${idp}: ${error instanceof Error ? error.message : error}`);
      }
    }
    completed += 1;
    if (completed % 50 === 0 || completed === selected.length) {
      process.stdout.write(`\r${slug} splits ${completed}/${selected.length} (+${rows.length})`);
    }
    if (delayMs > 0) await sleep(delayMs);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, () => worker()));

process.stdout.write(`\r${slug} splits ${selected.length}/${selected.length} accepted ${rows.length} failures ${failures}\n`);

await mkdir(importDir, { recursive: true });
const splitsJsonl = splitsJsonlPath;
await writeFile(splitsJsonl, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);

const sqlChunks = [];
for (let offset = 0; offset < rows.length; offset += batchSize) {
  const chunk = rows.slice(offset, offset + batchSize);
  sqlChunks.push(splitImportSql(event, chunk));
}

const sqlPath = join(importDir, `${slug}.splits.import.sql`);
await writeFile(sqlPath, `${sqlChunks.join("\n\n")}\n`);
console.log(`Wrote ${rows.length} split rows to ${splitsJsonl}`);
console.log(`SQL: ${sqlPath}`);
try {
  const { loadRankingsRepoEnv, psqlFile, requireDatabaseUrl } = await import("./psql-util.mjs");
  loadRankingsRepoEnv();
  await psqlFile(requireDatabaseUrl(), sqlPath);
  console.log("Applied split SQL.");
} catch {
  console.log("Link rankings-db or set RANKINGS_DATABASE_URL to apply split SQL.");
}