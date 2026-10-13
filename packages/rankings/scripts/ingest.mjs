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
  parseRunSignupResults,
  runSignupResultsUrl,
  snapshotIdentity,
} = await import("../src/index.ts");

const root = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(root, "..");
const repoRoot = join(packageRoot, "..", "..");
const importDir = join(packageRoot, "imports");
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
    let established = PAGE_SIZE;
    let previousFirst = null;
    for (let page = 1; page <= MAX_PAGES; page += 1) {
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
      const gained = parsed.results.length + parsed.skippedYouth + parsed.skippedUnparsed;
      if (gained === 0) break;
      const first = parsed.results[0]?.externalResultId ?? null;
      if (page > 1 && first && first === previousFirst) break;
      if (sex === "X" && page === 1) {
        const overlap = parsed.results.filter((row) => seen.has(row.externalResultId)).length;
        if (parsed.results.length > 0 && overlap / parsed.results.length > 0.5) break;
      }
      previousFirst = first;
      for (const row of parsed.results) {
        if (row.externalResultId) seen.add(row.externalResultId);
      }
      pages.push(parsed);
      if (page === 1 && gained < PAGE_SIZE) established = gained;
      process.stdout.write(`\r${event.slug} ${sex} page ${page} (+${parsed.results.length})`);
      if (gained < established) break;
      await sleep(200);
    }
    process.stdout.write("\n");
  }
  return pages;
}

function editionFromMika(event, pages) {
  const seen = new Set();
  const results = [];
  let skippedYouth = 0;
  let skippedUnparsed = 0;
  for (const page of pages) {
    skippedYouth += page.skippedYouth;
    skippedUnparsed += page.skippedUnparsed;
    for (const row of page.results) {
      const key =
        row.externalResultId ??
        `${row.normalizedName}|${row.normalizedBib ?? ""}|${row.categoryKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(row);
    }
  }
  return {
    sourceSlug: event.sourceSlug,
    sourceName: event.sourceName,
    accessMethod: "Public results list page",
    reuseNotes: event.note || PUBLIC_LIST_REUSE,
    attribution: event.attribution,
    displayAllowed: true,
    externalEventId: event.externalEventId,
    eventName: event.eventName,
    editionYear: event.editionYear,
    startsOn: event.startsOn,
    sourceUrl: event.listUrl,
    results,
    skippedYouth,
    skippedUnparsed,
  };
}

async function writeEdition(slug, edition, rawForHash, storagePath) {
  await mkdir(importDir, { recursive: true });
  const jsonlPath = join(importDir, `${slug}.jsonl`);
  const sqlPath = join(importDir, `${slug}.import.sql`);
  const body = edition.results.map((row) => JSON.stringify(row)).join("\n");
  await writeFile(jsonlPath, body);
  const snapshot = snapshotIdentity(rawForHash ?? body, storagePath);
  await writeFile(sqlPath, editionImportSql(edition, snapshot));
  return { jsonlPath, sqlPath, snapshot };
}

async function ingestOpenTrackFixture() {
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
    JSON.stringify(edition.results),
    `packages/rankings/imports/${event.slug}.jsonl`,
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
  const raw = await readFile(file);
  const parsed = parseResultsCsv(raw.toString("utf8"), {
    distance: flags.distance,
    sourceUrl: file,
  });
  const slug = flags.slug || "csv-import";
  const edition = {
    sourceSlug: flags.source || slug,
    sourceName: flags.name || slug,
    accessMethod: "CSV file of a full public results list",
    reuseNotes: PUBLIC_LIST_REUSE,
    attribution: flags.attribution || flags.name || "Forwarded results file",
    displayAllowed: true,
    externalEventId: flags.event || slug,
    eventName: flags.name || slug,
    editionYear: Number(flags.year || new Date().getUTCFullYear()),
    startsOn: flags.date || null,
    sourceUrl: file,
    results: parsed.results,
    skippedYouth: parsed.skippedYouth,
    skippedUnparsed: parsed.skippedUnparsed,
  };
  const written = await writeEdition(slug, edition, raw, file);
  return { slug, status: "succeeded", results: parsed.results.length, sql: written.sqlPath };
}

async function ingestRunSignup(raceId, eventId, flags) {
  const pages = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = runSignupResultsUrl(raceId, eventId, page, PAGE_SIZE);
    const payload = JSON.parse(await fetchText(url));
    const parsed = parseRunSignupResults(payload, {
      distance: flags.distance || "5k",
      sourceUrl: url,
    });
    if (parsed.results.length === 0 && parsed.skippedYouth === 0) break;
    pages.push(parsed);
    if (parsed.results.length < PAGE_SIZE) break;
    await sleep(200);
  }
  const results = pages.flatMap((page) => page.results);
  const edition = {
    sourceSlug: `runsignup_${raceId}`,
    sourceName: flags.name || `RunSignup ${raceId}`,
    accessMethod: "RunSignup public results JSON",
    reuseNotes: PUBLIC_LIST_REUSE,
    attribution: flags.attribution || "Official results via RunSignup",
    displayAllowed: true,
    externalEventId: eventId,
    eventName: flags.name || `RunSignup race ${raceId}`,
    editionYear: Number(flags.year || new Date().getUTCFullYear()),
    startsOn: flags.date || null,
    sourceUrl: `https://runsignup.com/Race/Results/${raceId}`,
    results,
    skippedYouth: pages.reduce((sum, page) => sum + page.skippedYouth, 0),
    skippedUnparsed: pages.reduce((sum, page) => sum + page.skippedUnparsed, 0),
  };
  const written = await writeEdition(
    `runsignup-${raceId}-${eventId}`,
    edition,
    JSON.stringify(results),
    `packages/rankings/imports/runsignup-${raceId}-${eventId}.jsonl`,
  );
  return { slug: `runsignup-${raceId}-${eventId}`, status: "succeeded", results: results.length, sql: written.sqlPath };
}

function flag(name, argv) {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

const argv = process.argv.slice(2);
const report = {
  generatedAt: new Date().toISOString(),
  events: [],
  unresolved: UNRESOLVED_MAJOR_EVENTS,
  apply: "skipped",
};

if (argv.includes("--csv")) {
  report.events.push(
    await ingestCsv(flag("--csv", argv), {
      distance: flag("--distance", argv),
      name: flag("--name", argv),
      year: flag("--year", argv),
      date: flag("--date", argv),
      slug: flag("--slug", argv),
      source: flag("--source", argv),
      event: flag("--event", argv),
      attribution: flag("--attribution", argv),
    }),
  );
} else if (argv.includes("--runsignup")) {
  report.events.push(
    await ingestRunSignup(flag("--runsignup", argv), flag("--event", argv), {
      distance: flag("--distance", argv),
      name: flag("--name", argv),
      year: flag("--year", argv),
      date: flag("--date", argv),
      attribution: flag("--attribution", argv),
    }),
  );
} else {
  const from = flag("--from", argv);
  if (!from) report.events.push(await ingestOpenTrackFixture());
  const events = from
    ? MAJOR_EVENTS.slice(MAJOR_EVENTS.findIndex((event) => event.slug === from))
    : MAJOR_EVENTS;
  for (const event of events) {
    try {
      report.events.push(await ingestCatalogEvent(event));
    } catch (error) {
      report.events.push({
        slug: event.slug,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

if (process.env.RANKINGS_DATABASE_URL) {
  const { spawn } = await import("node:child_process");
  for (const event of report.events) {
    if (event.status !== "succeeded" || !event.sql) continue;
    await new Promise((resolve, reject) => {
      const child = spawn("psql", [process.env.RANKINGS_DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-f", event.sql], {
        stdio: "inherit",
      });
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`psql exited ${code}`))));
    });
  }
  report.apply = "applied";
} else {
  report.apply =
    "SQL files were written. Set RANKINGS_DATABASE_URL to apply them. The hosted rankings project in apps/web/.env.local has an anon key only, and that key cannot write the ledger.";
}

const reportPath = join(repoRoot, "docs/ingestion-trial.json");
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
