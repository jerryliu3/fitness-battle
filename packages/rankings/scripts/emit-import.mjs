import { register } from "node:module";
import { readFile, writeFile } from "node:fs/promises";

register("./ts-resolve.mjs", import.meta.url);

const { editionFromOpenTrack, editionImportSql, snapshotIdentity } = await import("../src/index.ts");
const fixturePath = new URL("../fixtures/emv-10k-2025.json", import.meta.url);
const raw = await readFile(fixturePath);
const edition = editionFromOpenTrack(JSON.parse(raw.toString("utf8")), {
  sourceUrl: "https://estonia.opentrack.run/et/x/2025/EST/emv10km/",
});
const snapshot = snapshotIdentity(raw, "packages/rankings/fixtures/emv-10k-2025.json");
const sql = editionImportSql(edition, snapshot);
await writeFile(new URL("../fixtures/emv-10k-2025.import.sql", import.meta.url), sql);
console.log(JSON.stringify({
  results: edition.results.length,
  skippedYouth: edition.skippedYouth,
  bytes: Buffer.byteLength(sql),
  sha: snapshot.contentSha256,
}));
