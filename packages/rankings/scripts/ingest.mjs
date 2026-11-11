import { register } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

register("./ts-resolve.mjs", import.meta.url);

const {
  MAJOR_EVENTS,
  PUBLIC_LIST_REUSE,
  UNRESOLVED_MAJOR_EVENTS,
  editionFromOpenTrack,
  editionImportSql,
  mikaListUrl,
  parseMikaTimingList,
  parseResultsCsv,
  fetchRunSignupResults,
  readResultPages,
  snapshotIdentity,
} = await import("../src/index.ts");

const root = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(root, "..");

function flag(name, list) {
  const index = list.indexOf(name);
  if (index === -1) return null;
  return list[index + 1] ?? null;
}

const argv = process.argv.slice(2);
const importDir = flag("--output-dir", argv) || join(packageRoot, "imports");
const allowCorrection = argv.includes("--allow-correction");
const freezeFlag = argv.includes("--freeze");
const rawRevision = flag("--expected-revision", argv);
if (rawRevision && (!/^\d+$/.test(rawRevision) || Number(rawRevision) < 1)) {
  throw new Error("Provide --expected-revision as a positive integer.");
}
const expectedRevision = rawRevision ? Number(rawRevision) : undefined;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const PAGE_SIZE = 100;
const MAX_PAGES = 800;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  let lastError = new Error(`No response for ${url}`);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/json",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status === 429 || response.status >= 500) {
      lastError = new Error(`${response.status} ${url}`);
      await sleep(1000 * attempt);
      continue;
    }
    if (!response.ok) {
      throw new Error(`${response.status} ${url}`);
    }
    return response.text();
  }
  throw lastError;
}

async function fetchMika(event) {
  const pages = [];
  const seen = new Set();
  for (const sex of ["M", "W", "X"]) {
    const categoryPages = await readResultPages(async (page) => {
      if (page > 1) await sleep(200);
      const url = mikaListUrl({
        listUrl: event.listUrl,
        event: event.mikaEvent,
        page,
        pageSize: PAGE_SIZE,
        sex,
      });
      const html = await fetchText(url);
      const parsed = parseMikaTimingList(html, {
        sex,
        distance: event.distance,
        sourceUrl: event.listUrl,
      });
      for (const key of parsed.rowKeys) {
        if (seen.has(key)) throw new Error("MikaTiming category filters overlap; import held for review.");
      }
      process.stdout.write(`\r${event.slug} ${sex} page ${page} (+${parsed.results.length})`);
      return parsed;
    }, MAX_PAGES);
    for (const page of categoryPages) for (const key of page.rowKeys) seen.add(key);
    pages.push(...categoryPages);
    process.stdout.write("\n");
  }
  return pages;
}

function editionFromMika(event, pages) {
  return {
    sourceSlug: event.sourceSlug,
    sourceName: event.sourceName,
    accessMethod: "Public results list page",
    reuseNotes: event.note || PUBLIC_LIST_REUSE,
    attribution: event.attribution,
    displayAllowed: false,
    externalEventId: event.externalEventId,
    eventName: event.eventName,
    editionYear: event.editionYear,
    startsOn: event.startsOn,
    sourceUrl: event.listUrl,
    results: pages.flatMap((page) => page.results),
    skippedYouth: pages.reduce((sum, page) => sum + page.skippedYouth, 0),
    skippedUnparsed: pages.reduce((sum, page) => sum + page.skippedUnparsed, 0),
  };
}

async function getEditionPublicationState(sourceSlug, externalEventId, editionYear) {
  if (!process.env.RANKINGS_DATABASE_URL) return null;
  const { spawn } = await import("node:child_process");
  const eventClause = externalEventId != null && externalEventId !== ""
    ? `e.external_event_id = '${String(externalEventId).replaceAll("'", "''")}'`
    : `e.external_event_id is null`;
  const query = `select ed.publication_state, ed.revision from public.event_editions ed join public.events e on e.id = ed.event_id join public.sources s on s.id = e.source_id where s.slug = '${sourceSlug.replaceAll("'", "''")}' and ${eventClause} and ed.edition_year = ${editionYear} limit 1;`;
  return new Promise((resolve, reject) => {
    const child = spawn("psql", ["-X", "-d", process.env.RANKINGS_DATABASE_URL, "-t", "-A", "-F", ",", "-c", query], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => { output += chunk; });
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (err) => reject(new Error(`Failed to check edition publication state: ${err.message}`)));
    child.on("exit", (code) => {
      if (code !== 0) return reject(new Error(`Database publication check failed with exit code ${code}: ${stderr.trim()}`));
      const line = output.trim().split("\n")[0];
      if (!line) return resolve(null);
      const [state, rev] = line.split(",");
      resolve({ state, revision: Number(rev) || 1 });
    });
  });
}

async function writeEdition(slug, edition, rawForHash, storagePath, options = {}) {
  if (edition.results.length === 0) throw new Error("No accepted results; import held.");
  if (edition.skippedUnparsed > 0) throw new Error("Unparsed results; import held for review.");
  await mkdir(importDir, { recursive: true });
  const jsonlPath = join(importDir, `${slug}.jsonl`);
  const sqlPath = join(importDir, `${slug}.import.sql`);
  const body = edition.results.map((row) => JSON.stringify(row)).join("\n");
  await writeFile(jsonlPath, body);
  const snapshot = snapshotIdentity(rawForHash ?? body, rawForHash == null ? jsonlPath : storagePath);
  await writeFile(sqlPath, editionImportSql(edition, snapshot, options));
  return { jsonlPath, sqlPath, snapshot };
}

async function ingestOpenTrackFixture() {
  const existing = await getEditionPublicationState("opentrack", "a8c3d9b0-e5a1-44a9-bc15-71d6497e3a0d", 2025);
  if (existing) {
    if (existing.state === "frozen") {
      return {
        slug: "opentrack-emv-10k-2025",
        status: "skipped",
        reason: `Edition is frozen (revision ${existing.revision}); pre-fetch skipped.`,
      };
    }
    if (existing.state === "published" && !allowCorrection) {
      return {
        slug: "opentrack-emv-10k-2025",
        status: "skipped",
        reason: `Edition is already published (revision ${existing.revision}); pre-fetch skipped (use --allow-correction to update).`,
      };
    }
  }
  const fixturePath = join(packageRoot, "fixtures/emv-10k-2025.json");
  const raw = await readFile(fixturePath);
  const edition = editionFromOpenTrack(JSON.parse(raw.toString("utf8")), {
    sourceUrl: "https://estonia.opentrack.run/et/x/2025/EST/emv10km/",
  });
  const written = await writeEdition(
    "opentrack-emv-10k-2025",
    edition,
    raw,
    "packages/rankings/fixtures/emv-10k-2025.json",
    { allowCorrection, freeze: freezeFlag, expectedRevision },
  );
  return {
    slug: "opentrack-emv-10k-2025",
    status: "succeeded",
    results: edition.results.length,
    skippedYouth: edition.skippedYouth,
    skippedUnparsed: edition.skippedUnparsed,
    sql: written.sqlPath,
  };
}

async function ingestCatalogEvent(event) {
  const existing = await getEditionPublicationState(event.sourceSlug, event.externalEventId, event.editionYear);
  if (existing) {
    if (existing.state === "frozen") {
      return {
        slug: event.slug,
        status: "skipped",
        reason: `Edition is frozen (revision ${existing.revision}); pre-fetch skipped.`,
      };
    }
    if (existing.state === "published" && !allowCorrection) {
      return {
        slug: event.slug,
        status: "skipped",
        reason: `Edition is already published (revision ${existing.revision}); pre-fetch skipped (use --allow-correction to update).`,
      };
    }
  }
  const started = Date.now();
  const pages = await fetchMika(event);
  const edition = editionFromMika(event, pages);
  if (edition.results.length === 0) {
    return {
      slug: event.slug,
      status: "failed",
      results: 0,
      skippedYouth: edition.skippedYouth,
      skippedUnparsed: edition.skippedUnparsed,
      error: "The public list page returned no finishers.",
      seconds: Math.round((Date.now() - started) / 1000),
    };
  }
  const written = await writeEdition(
    event.slug,
    edition,
    null,
    `packages/rankings/imports/${event.slug}.jsonl`,
    { allowCorrection, freeze: freezeFlag, expectedRevision },
  );
  return {
    slug: event.slug,
    status: "succeeded",
    results: edition.results.length,
    skippedYouth: edition.skippedYouth,
    skippedUnparsed: edition.skippedUnparsed,
    women: edition.results.filter((row) => row.sex === "female").length,
    men: edition.results.filter((row) => row.sex === "male").length,
    seconds: Math.round((Date.now() - started) / 1000),
    sql: written.sqlPath,
  };
}

async function ingestCsv(file, flags) {
  const slug = flags.slug || "csv-import";
  const sourceSlug = flags.source || slug;
  const externalEventId = flags.event || slug;
  const editionYear = Number(flags.year || new Date().getUTCFullYear());
  const existing = await getEditionPublicationState(sourceSlug, externalEventId, editionYear);
  if (existing) {
    if (existing.state === "frozen") {
      return {
        slug,
        status: "skipped",
        reason: `Edition is frozen (revision ${existing.revision}); pre-fetch skipped.`,
      };
    }
    if (existing.state === "published" && !allowCorrection) {
      return {
        slug,
        status: "skipped",
        reason: `Edition is already published (revision ${existing.revision}); pre-fetch skipped (use --allow-correction to update).`,
      };
    }
  }
  const raw = await readFile(file);
  const parsed = parseResultsCsv(raw.toString("utf8"), {
    distance: flags.distance,
    sourceUrl: file,
  });
  const edition = {
    sourceSlug,
    sourceName: flags.name || slug,
    accessMethod: "CSV file of a full public results list",
    reuseNotes: PUBLIC_LIST_REUSE,
    attribution: flags.attribution || flags.name || "Forwarded results file",
    displayAllowed: false,
    externalEventId: flags.event || slug,
    eventName: flags.name || slug,
    editionYear,
    startsOn: flags.date || null,
    sourceUrl: file,
    results: parsed.results,
    skippedYouth: parsed.skippedYouth,
    skippedUnparsed: parsed.skippedUnparsed,
  };
  const written = await writeEdition(
    slug,
    edition,
    raw,
    file,
    { allowCorrection, freeze: freezeFlag, expectedRevision },
  );
  return { slug, status: "succeeded", results: parsed.results.length, sql: written.sqlPath };
}

async function ingestRunSignup(raceId, eventId, flags) {
  const sourceSlug = `runsignup_${raceId}`;
  const editionYear = Number(flags.year || new Date().getUTCFullYear());
  const existing = await getEditionPublicationState(sourceSlug, eventId, editionYear);
  const importSlug = `runsignup-${raceId}-${eventId}-${flags.resultSet}`;
  if (existing) {
    if (existing.state === "frozen") {
      return {
        slug: importSlug,
        status: "skipped",
        reason: `Edition is frozen (revision ${existing.revision}); pre-fetch skipped.`,
      };
    }
    if (existing.state === "published" && !allowCorrection) {
      return {
        slug: importSlug,
        status: "skipped",
        reason: `Edition is already published (revision ${existing.revision}); pre-fetch skipped (use --allow-correction to update).`,
      };
    }
  }
  const pages = await fetchRunSignupResults({
    raceId,
    eventId,
    resultSetId: flags.resultSet,
    distance: flags.distance,
    pageSize: PAGE_SIZE,
    maxPages: MAX_PAGES,
    fetchJson: async (url) => {
      await sleep(200);
      return JSON.parse(await fetchText(url));
    },
  });
  const results = pages.flatMap((page) => page.results);
  if (!results.length) throw new Error("No eligible public results were returned.");
  const edition = {
    sourceSlug,
    sourceName: flags.name || `RunSignup ${raceId}`,
    accessMethod: "RunSignup public results JSON",
    reuseNotes: PUBLIC_LIST_REUSE,
    attribution: flags.attribution || "Official results via RunSignup",
    displayAllowed: false,
    externalEventId: eventId,
    eventName: flags.name || `RunSignup race ${raceId}`,
    editionYear,
    startsOn: flags.date || null,
    sourceUrl: `https://runsignup.com/Race/Results/${raceId}`,
    results,
    skippedYouth: pages.reduce((sum, page) => sum + page.skippedYouth, 0),
    skippedUnparsed: pages.reduce((sum, page) => sum + page.skippedUnparsed, 0),
  };
  const written = await writeEdition(
    `runsignup-${raceId}-${eventId}-${flags.resultSet}`,
    edition,
    null,
    `packages/rankings/imports/runsignup-${raceId}-${eventId}-${flags.resultSet}.jsonl`,
    { allowCorrection, freeze: freezeFlag, expectedRevision },
  );
  return { slug: `runsignup-${raceId}-${eventId}-${flags.resultSet}`, status: "succeeded", results: results.length, sql: written.sqlPath };
}

if (argv.includes("--csv") || argv.includes("--runsignup")) {
  if (!["5k", "10k", "half_marathon", "marathon"].includes(flag("--distance", argv))) {
    throw new Error("Provide --distance: 5k, 10k, half_marathon, or marathon.");
  }
  if (!/^\d{4}$/.test(flag("--year", argv) ?? "")) throw new Error("Provide the edition --year.");
}
if (argv.includes("--runsignup") && !/^\d+$/.test(flag("--result-set", argv) ?? "")) {
  throw new Error("Provide --result-set ID for one public, finalized RunSignup result set.");
}
const from = flag("--from", argv);
if (from && !MAJOR_EVENTS.some((event) => event.slug === from)) throw new Error("Unknown --from catalog slug.");
const report = {
  generatedAt: new Date().toISOString(),
  events: [],
  unresolved: UNRESOLVED_MAJOR_EVENTS,
  apply: "skipped",
};

async function recordImport(slug, run) {
  try {
    report.events.push(await run());
  } catch (error) {
    report.events.push({ slug, status: "failed", error: error instanceof Error ? error.message : String(error) });
  }
}

if (argv.includes("--csv")) {
  await recordImport(flag("--slug", argv) || "csv-import", () => ingestCsv(flag("--csv", argv), {
      distance: flag("--distance", argv),
      name: flag("--name", argv),
      year: flag("--year", argv),
      date: flag("--date", argv),
      slug: flag("--slug", argv),
      source: flag("--source", argv),
      event: flag("--event", argv),
      attribution: flag("--attribution", argv),
    }));
} else if (argv.includes("--runsignup")) {
  await recordImport(`runsignup-${flag("--runsignup", argv)}-${flag("--event", argv)}-${flag("--result-set", argv)}`, () => ingestRunSignup(flag("--runsignup", argv), flag("--event", argv), {
      distance: flag("--distance", argv),
      name: flag("--name", argv),
      year: flag("--year", argv),
      date: flag("--date", argv),
      attribution: flag("--attribution", argv),
      resultSet: flag("--result-set", argv),
    }));
} else {
  if (!from) await recordImport("opentrack-emv-10k-2025", ingestOpenTrackFixture);
  const events = from
    ? MAJOR_EVENTS.slice(MAJOR_EVENTS.findIndex((event) => event.slug === from))
    : MAJOR_EVENTS;
  for (const event of events) {
    await recordImport(event.slug, () => ingestCatalogEvent(event));
  }
}

if (process.env.RANKINGS_DATABASE_URL) {
  const { spawn } = await import("node:child_process");
  for (const event of report.events) {
    if (event.status !== "succeeded" || !event.sql) continue;
    try {
      await new Promise((resolve, reject) => {
        const child = spawn("psql", ["-X", "-d", process.env.RANKINGS_DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-f", event.sql], {
          stdio: "inherit",
        });
        child.on("error", reject);
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`psql exited ${code}`))));
      });
      event.apply = "applied";
    } catch (error) {
      event.apply = "failed";
      event.error = error instanceof Error ? error.message : String(error);
    }
  }
  report.apply = report.events.some((event) => event.apply === "failed") ? "failed"
    : report.events.some((event) => event.apply === "applied") ? "applied" : "skipped";
} else {
  report.apply = "skipped";
}

await mkdir(importDir, { recursive: true });
const reportPath = join(importDir, `run-${report.generatedAt.replaceAll(/[:.]/g, "-")}.json`);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
console.log(`Report: ${reportPath}`);
if (!process.env.RANKINGS_DATABASE_URL && report.events.some((event) => event.sql)) {
  console.log("SQL files were written. Set RANKINGS_DATABASE_URL to apply imports; the anon key cannot write the ledger.");
}
if (report.events.some((event) => event.status === "failed" || event.apply === "failed")) process.exitCode = 1;
