import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const run = promisify(execFile);
const cli = fileURLToPath(new URL("../../scripts/ingest.mjs", import.meta.url));
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function setup(repeatPage = false) {
  const directory = await mkdtemp(join(tmpdir(), "rankings-cli-"));
  directories.push(directory);
  const preload = join(directory, "fetch.mjs");
  await writeFile(preload, `
    const set = { individual_result_set_id: 10, public_results: "T", preliminary_results: "F" };
    globalThis.fetch = async (address) => {
      const url = new URL(address);
      const page = Number(url.searchParams.get("page"));
      const result = { result_id: page, first_name: "Runner", last_name: "One", gender: "X", chip_time: "25:00", age: page === 1 ? 16 : 30 };
      const results = page < 3 ? [result] : [];
      if (${repeatPage} && page > 1) results.push({ ...result, result_id: 1 });
      return new Response(JSON.stringify({ individual_results_sets: [{ ...set, results }] }));
    };
  `);
  return {
    directory,
    args: ["--import", preload, cli, "--runsignup", "1", "--event", "2", "--result-set", "10", "--distance", "5k", "--year", "2026", "--output-dir", directory],
    // Never let a developer's live database env turn this test into an import.
    env: { ...process.env, RANKINGS_DATABASE_URL: "" },
  };
}

async function report(directory: string) {
  const files = await readdir(directory);
  const name = files.find((file) => file.startsWith("run-") && file.endsWith(".json"));
  return JSON.parse(await readFile(join(directory, name!), "utf8"));
}

describe("ingestion CLI", () => {
  it("wires the chosen result set and writes the adult after a youth-only page", async () => {
    const { directory, args, env } = await setup();
    await run(process.execPath, args, { env });
    const outcome = await report(directory);
    expect(outcome.events[0]).toMatchObject({ status: "succeeded", results: 1 });
    const rows = (await readFile(join(directory, "runsignup-1-2-10.jsonl"), "utf8")).split("\n").map((row) => JSON.parse(row));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ externalResultId: "2", sex: "other", ageYears: 30 });
    const sql = await readFile(join(directory, "runsignup-1-2-10.import.sql"), "utf8");
    expect(sql).toContain(join(directory, "runsignup-1-2-10.jsonl"));
  });

  it("exits unsuccessfully, retains a failure report and emits no import on repeated pages", async () => {
    const { directory, args, env } = await setup(true);
    await expect(run(process.execPath, args, { env })).rejects.toMatchObject({ code: 1 });
    const outcome = await report(directory);
    expect(outcome.events[0]).toMatchObject({ status: "failed", error: expect.stringContaining("Repeated result") });
    expect((await readdir(directory)).filter((file) => file.endsWith(".import.sql"))).toEqual([]);
  });

  it("passes --allow-correction and --freeze options through to the generated SQL", async () => {
    const { directory, args, env } = await setup();
    const freezeArgs = [...args, "--allow-correction", "--freeze", "--expected-revision", "1"];
    await run(process.execPath, freezeArgs, { env });
    const sql = await readFile(join(directory, "runsignup-1-2-10.import.sql"), "utf8");
    expect(sql).toContain("publication_state = 'frozen'");
    expect(sql).toContain("Expected edition revision % but found %; correction held', 1");
    expect(sql).toContain("revision = case when true then revision + 1 else revision end");
  });

  it("rejects invalid non-integer --expected-revision", async () => {
    const { directory, args, env } = await setup();
    const badArgs = [...args, "--expected-revision", "invalid"];
    await expect(run(process.execPath, badArgs, { env })).rejects.toThrow();
  });
});
