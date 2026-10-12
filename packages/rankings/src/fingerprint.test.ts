import { describe, expect, it } from "vitest";
import {
  categoryKey,
  normalizeAthleteName,
  normalizeBib,
  resultFingerprint,
} from "./fingerprint";

const base = {
  sourceId: 4,
  eventEditionId: 18,
  normalizedName: "ada lovelace",
  normalizedBib: "1042",
  categoryKey: categoryKey("marathon", "female"),
};

describe("result fingerprint", () => {
  it("matches private.result_fingerprint for the shared fixture", () => {
    expect(resultFingerprint(base)).toBe(
      "5b57eb5a2924fe6f7c5465f373e434d9e925187c245258717a39e8caf1401cd5",
    );
  });

  it("ignores finish time because time is not an input", () => {
    const first = resultFingerprint(base);
    const second = resultFingerprint({ ...base });
    expect(first).toBe(second);
  });

  it("keeps same-name finishers with different bibs apart", () => {
    const a = resultFingerprint(base);
    const b = resultFingerprint({ ...base, normalizedBib: "1043" });
    expect(a).not.toBe(b);
  });

  it("treats a missing bib and a blank bib as the same key", () => {
    const missing = resultFingerprint({ ...base, normalizedBib: null });
    const blank = resultFingerprint({
      ...base,
      normalizedBib: normalizeBib("   "),
    });
    expect(normalizeBib("   ")).toBeNull();
    expect(missing).toBe(blank);
  });

  it("normalizes names before they are stored", () => {
    expect(normalizeAthleteName("  Ada   Lovelace ")).toBe("ada lovelace");
    expect(normalizeBib(" a12 ")).toBe("A12");
  });
});
