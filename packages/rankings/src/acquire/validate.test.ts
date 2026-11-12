import { describe, expect, it } from "vitest";
import { assertPreviewAllowsApply } from "./validate";
import type { AcquisitionPreview } from "./preview";

const base: AcquisitionPreview = {
  extractedCount: 3,
  skippedYouth: 0,
  skippedUnparsed: 0,
  expectedTotal: 3,
  complete: true,
  bySex: {},
  byStatus: {},
  duplicateExternalIds: 0,
  sampleRows: [],
  warnings: [],
};

describe("assertPreviewAllowsApply", () => {
  it("rejects incomplete coverage", () => {
    expect(() => assertPreviewAllowsApply({ ...base, complete: false, expectedTotal: 10 })).toThrow(/Coverage incomplete/);
  });
});
