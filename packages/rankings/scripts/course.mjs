import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

register("./ts-resolve.mjs", import.meta.url);

const {
  MAJOR_EVENTS,
  buildReplayCoursePoints,
  parseMapMyRunRouteHtml,
  replayCourseFromGpx,
  replayCourseImportSql,
} = await import("../src/index.ts");

const root = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(root, "..");

function flag(name, list) {
  const index = list.indexOf(name);
  if (index === -1) return null;
  return list[index + 1] ?? null;
}

const argv = process.argv.slice(2);
const slug = flag("--slug", argv);
const editionIdRaw = flag("--edition-id", argv);
const eventEditionId =
  editionIdRaw != null && editionIdRaw !== ""
    ? Number.parseInt(editionIdRaw, 10)
    : undefined;
if (editionIdRaw != null && editionIdRaw !== "" && !Number.isFinite(eventEditionId)) {
  throw new Error(`Invalid --edition-id: ${editionIdRaw}`);
}
const displayAllowed = argv.includes("--display-allowed");
const importDir = flag("--output-dir", argv) || join(packageRoot, "imports");
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

if (!slug) throw new Error("Provide --slug from the catalog.");
const event = MAJOR_EVENTS.find((row) => row.slug === slug);
if (!event) throw new Error(`Unknown catalog slug: ${slug}`);
if (!event.replayCourseSourceUrl) throw new Error(`${slug} has no replay course source configured.`);

let points;
let attribution = event.replayCourseAttribution ?? event.sourceName;
const reviewNotes = event.replayCourseReviewNotes ?? "Operator course import";

if (event.mapmyrunRouteId != null) {
  const url = `https://www.mapmyrun.com/routes/view/${event.mapmyrunRouteId}`;
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const route = parseMapMyRunRouteHtml(await response.text());
  attribution = `${route.name} (MapMyRun)`;
  points = buildReplayCoursePoints(
    route.points.map((row) => ({ lon: row.lon, lat: row.lat, metres: row.metres })),
    event.distance,
  );
} else if (event.replayCourseGpxFixture) {
  const gpxPath = join(packageRoot, event.replayCourseGpxFixture);
  const gpx = await readFile(gpxPath, "utf8");
  points = replayCourseFromGpx(gpx, event.distance);
} else {
  throw new Error(`${slug} has no mapmyrunRouteId or replayCourseGpxFixture.`);
}

const sql = replayCourseImportSql({
  sourceSlug: event.sourceSlug,
  externalEventId: event.externalEventId,
  editionYear: event.editionYear,
  distanceSlug: event.distance,
  points,
  sourceUrl: event.replayCourseSourceUrl,
  attribution,
  reviewNotes,
  displayAllowed,
  reviewedAt: new Date().toISOString(),
  eventEditionId,
});

await mkdir(importDir, { recursive: true });
const sqlPath = join(importDir, `${slug}.course.import.sql`);
await writeFile(sqlPath, sql);

const report = {
  slug,
  pointCount: points.length,
  distance: event.distance,
  sql: sqlPath,
  apply: "skipped",
};

try {
  const { loadRankingsRepoEnv, psqlFile, requireDatabaseUrl } = await import("./psql-util.mjs");
  loadRankingsRepoEnv();
  const databaseUrl = requireDatabaseUrl();
  await psqlFile(databaseUrl, sqlPath);
  report.apply = "applied";
} catch (error) {
  if (argv.includes("--apply")) {
    report.apply = "failed";
    report.error = error instanceof Error ? error.message : String(error);
  }
}

console.log(JSON.stringify(report, null, 2));
if (report.apply === "failed") process.exitCode = 1;