/**
 * Export display-allowed marathon replay courses into race-route catalog JSON.
 * Usage: node packages/rankings/scripts/export-marathon-race-routes.mjs
 *        [--out packages/shared/fixtures/marathon-race-routes.json]
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRankingsRepoEnv, requireDatabaseUrl, psqlQuery } from "./psql-util.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

/** Evenly sample dense replay polylines for map rendering (matches ~400pt target). */
function decimate(coords, maxPoints = 400) {
  if (coords.length <= maxPoints) return coords;
  const out = [coords[0]];
  const step = (coords.length - 1) / (maxPoints - 1);
  for (let i = 1; i < maxPoints - 1; i++) out.push(coords[Math.round(i * step)]);
  out.push(coords[coords.length - 1]);
  return out;
}

function slugToRouteId(sourceSlug, year) {
  const base = sourceSlug.replace(/_/g, "-");
  return `marathon-${base}-${year}`.replace(/-+/g, "-").slice(0, 80);
}

function locationForSlug(slug) {
  const map = {
    boston_marathon: "Boston, MA",
    chicago_marathon: "Chicago, IL",
    nyrr_nyc_marathon: "New York, NY",
    sf_marathon: "San Francisco, CA",
    toronto_waterfront_marathon: "Toronto, ON",
    tokyo_marathon: "Tokyo, JP",
  };
  return map[slug] ?? "";
}

function parseRows(text) {
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(line => {
      const tab = line.indexOf("\t");
      if (tab < 0) throw new Error(`Bad row: ${line.slice(0, 80)}`);
      const meta = line.slice(0, tab).split("|");
      const pointsJson = line.slice(tab + 1);
      return {
        sourceSlug: meta[0],
        year: Number(meta[1]),
        name: meta[2],
        points: JSON.parse(pointsJson),
      };
    });
}

const outArg = process.argv.indexOf("--out");
const outPath = outArg >= 0
  ? path.resolve(process.argv[outArg + 1])
  : path.join(repoRoot, "packages/shared/fixtures/marathon-race-routes.json");

loadRankingsRepoEnv();
const dbUrl = requireDatabaseUrl();

const raw = psqlQuery(
  dbUrl,
  `select s.slug || '|' || ed.edition_year::text || '|' || replace(ed.name, E'\\t', ' ') || E'\\t' || rc.points::text
   from rankings_replay_courses rc
   join event_editions ed on ed.id = rc.event_edition_id
   join events e on e.id = ed.event_id
   join sources s on s.id = e.source_id
   where rc.distance_slug = 'marathon' and rc.display_allowed
   order by s.slug`,
);

const routes = parseRows(raw).map(row => {
  const coordinates = decimate(
    row.points.map(p => [Number(p[0]), Number(p[1])]),
  );
  return {
    id: slugToRouteId(row.sourceSlug, row.year),
    name: row.name,
    location: locationForSlug(row.sourceSlug),
    coordinates,
    sourceSlug: row.sourceSlug,
    editionYear: row.year,
  };
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), routes }, null, 2)}\n`);
console.log(`Wrote ${routes.length} marathon routes to ${path.relative(repoRoot, outPath)}`);