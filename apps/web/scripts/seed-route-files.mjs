// Local-only GPS fixtures. No database or network writes; private geometry stays ignored.
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const require = createRequire(import.meta.url);
const testRequire = createRequire(require.resolve("vitest/package.json"));
const { build } = testRequire("esbuild");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const bundle = await build({ entryPoints: [path.join(root, "packages/shared/src/fitness/activity-files.ts")], bundle: true, write: false, platform: "node", format: "esm" });
const { parseActivityFile } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);
const activities = [], files = [];
for (const filename of process.argv.slice(2)) {
  const name = path.basename(filename);
  const parsed = parseActivityFile(name, new Uint8Array(await readFile(filename)), "garmin");
  files.push({ name, activities: parsed.activities.length });
  for (const activity of parsed.activities) activities.push({ ...activity, id: `local-route-${name}-${activities.length}` });
}
if (!files.length) throw new Error("Pass one or more GPX, TCX or FIT files.");
await mkdir(path.join(root, ".local"), { recursive: true });
await writeFile(path.join(root, ".local/route-activities.json"), JSON.stringify({ version: 1, files, activities }));
for (const activity of activities) console.log(`${activity.categorySlug}: ${Math.round(activity.metricValue)} ${activity.categorySlug === "strength" ? "seconds" : "meters"}, ${activity.detailedPolyline ? "GPS geometry retained" : "no GPS geometry"}`);
console.log(`Seeded ${activities.length} activities from ${files.length} files for local demo accounts. Original dates retained.`);
