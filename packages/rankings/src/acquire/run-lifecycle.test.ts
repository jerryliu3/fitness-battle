import { describe, expect, it } from "vitest";
import { buildPreparedRunPatch, buildStagedRunPatch } from "./run-lifecycle";

describe("acquire run lifecycle patches", () => {
  it("keeps the run leased after preparation (no terminal status)", () => {
    const patch = buildPreparedRunPatch({
      parserVersion: "test",
      artifactDir: "/tmp/1",
      normalizedSha256: "a".repeat(64),
      rawSha256: "b".repeat(64),
      counts: { extracted: 3, expectedTotal: 3 },
      warnings: [],
    });
    expect(patch.status).toBeUndefined();
    expect(patch.publication_outcome).toBe("prepared");
  });

  it("marks terminal success only when staging completes", () => {
    const patch = buildStagedRunPatch({ stagedEditionId: 42, stagedRevision: 1 });
    expect(patch.status).toBe("succeeded");
    expect(patch.publication_outcome).toBe("staged");
    expect(patch.staged_edition_id).toBe(42);
    expect(patch.staged_revision).toBe(1);
  });

  it("successful apply requires a staged terminal patch after preparation", () => {
    const prepared = buildPreparedRunPatch({
      parserVersion: "test",
      artifactDir: "/tmp/1",
      normalizedSha256: "a".repeat(64),
      rawSha256: "b".repeat(64),
      counts: { extracted: 1, expectedTotal: 1 },
      warnings: [],
    });
    const staged = buildStagedRunPatch({ stagedEditionId: 7, stagedRevision: 2 });
    expect(prepared.status).toBeUndefined();
    expect(staged.status).toBe("succeeded");
  });
});
