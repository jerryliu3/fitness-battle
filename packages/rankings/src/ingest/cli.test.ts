import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
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
    expect(rows[0]).toMatchObject({ externalResultId: "10:2", sex: "other", ageYears: 30 });
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

  it("stops scraping and fails when publication database check fails", async () => {
    const { directory, args } = await setup();
    const binDir = join(directory, "mock-bin");
    await mkdir(binDir, { recursive: true });
    await writeFile(join(binDir, "psql"), `#!/bin/sh\necho "connection to server failed" >&2\nexit 1\n`, { mode: 0o755 });

    const failingEnv = {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      RANKINGS_DATABASE_URL: "postgres://fake:5432/rankings",
    };

    await expect(run(process.execPath, args, { env: failingEnv })).rejects.toMatchObject({ code: 1 });
    const outcome = await report(directory);
    expect(outcome.events[0]).toMatchObject({
      status: "failed",
      error: expect.stringContaining("Database publication check failed with exit code 1"),
    });
    // No results fetched, no files written
    expect((await readdir(directory)).filter((file) => file.endsWith(".import.sql") || file.endsWith(".jsonl"))).toEqual([]);
  });

  it("skips pre-fetch when database reports edition is already published, but queries exact external event ID", async () => {
    const { directory, args } = await setup();
    const binDir = join(directory, "mock-bin");
    await mkdir(binDir, { recursive: true });
    await writeFile(
      join(binDir, "psql"),
      `#!/bin/sh
query="$*"
if echo "$query" | grep -q "external_event_id = '2'"; then
  echo "published,1"
  exit 0
else
  exit 0
fi
`,
      { mode: 0o755 },
    );

    const dbEnv = {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      RANKINGS_DATABASE_URL: "postgres://fake:5432/rankings",
    };

    // Event 2 is published in the database -> pre-fetch skipped
    await run(process.execPath, args, { env: dbEnv });
    const outcome1 = await report(directory);
    expect(outcome1.events[0]).toMatchObject({
      status: "skipped",
      reason: expect.stringContaining("Edition is already published (revision 1); pre-fetch skipped"),
    });
    expect((await readdir(directory)).filter((file) => file.endsWith(".import.sql"))).toEqual([]);

    // Event 3 under the same race is NOT published -> pre-fetch proceeds and imports
    const event3Directory = await mkdtemp(join(tmpdir(), "rankings-cli-event3-"));
    directories.push(event3Directory);
    const event3Preload = join(event3Directory, "fetch.mjs");
    await writeFile(
      event3Preload,
      `
      const set = { individual_result_set_id: 10, public_results: "T", preliminary_results: "F" };
      globalThis.fetch = async (address) => {
        const url = new URL(address);
        const page = Number(url.searchParams.get("page") || "1");
        const results = page === 1
          ? [{ result_id: 301, first_name: "Runner", last_name: "Three", gender: "F", chip_time: "20:00", age: 25 }]
          : [];
        return new Response(JSON.stringify({
          individual_results_sets: [{ ...set, results }]
        }));
      };
    `,
    );
    const event3Args = [
      "--import",
      event3Preload,
      cli,
      "--runsignup",
      "1",
      "--event",
      "3",
      "--result-set",
      "10",
      "--distance",
      "5k",
      "--year",
      "2026",
      "--output-dir",
      event3Directory,
    ];
    await run(process.execPath, event3Args, { env: dbEnv });
    const outcome2 = await report(event3Directory);
    expect(outcome2.events[0]).toMatchObject({
      status: "succeeded",
      results: 1,
    });
    expect((await readdir(event3Directory)).filter((file) => file.endsWith(".import.sql"))).toHaveLength(1);
  });
});
