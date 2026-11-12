import { describe, expect, it } from "vitest";
import { buildPreparedRunPatch, buildStagedRunPatch, buildStageApplySql } from "./run-lifecycle";

describe("acquire run lifecycle patches", () => {
  const preparedInput = {
    parserVersion: "test",
    artifactDir: "/tmp/1",
    normalizedSha256: "a".repeat(64),
    rawSha256: "b".repeat(64),
    counts: { extracted: 3, expectedTotal: 3 },
    warnings: [] as string[],
  };

  it("keeps the run leased while apply is pending", () => {
    const patch = buildPreparedRunPatch(preparedInput);
    expect(patch.status).toBeUndefined();
    expect(patch.publication_outcome).toBe("prepared");
  });

  it("releases the lease after preparation-only completion", () => {
    const patch = buildPreparedRunPatch(preparedInput, { releaseLease: true });
    expect(patch.status).toBe("succeeded");
    expect(patch.publication_outcome).toBe("prepared");
  });

  it("maps readStagedEditionBinding() into staged run fields", () => {
    const binding = { editionId: 42, revision: 1 };
    const patch = buildStagedRunPatch(binding);
    expect(patch.staged_edition_id).toBe(42);
    expect(patch.staged_revision).toBe(1);
    expect(patch.publication_outcome).toBe("staged");
  });

  it("wraps import SQL and bind RPC in one transaction", () => {
    const sql = buildStageApplySql(
      9,
      "owner-a",
      { sourceSlug: "nyrr_nyc_marathon", externalEventId: "M2026", editionYear: 2026 },
      "do $x$ select 1; $x$;",
    );
    expect(sql.startsWith("begin;")).toBe(true);
    expect(sql).toContain("acquisition_bind_staged_run");
    expect(sql.trimEnd()).toMatch(/commit;\s*$/);
  });
});
