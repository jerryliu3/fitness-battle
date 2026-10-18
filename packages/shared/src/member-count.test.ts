import { describe, expect, it } from "vitest";
import { formatMemberCount } from "./member-count";

describe("formatMemberCount", () => {
  it("singularizes one member", () => {
    expect(formatMemberCount(1)).toBe("1 member");
  });

  it("pluralizes multiple members", () => {
    expect(formatMemberCount(2)).toBe("2 members");
    expect(formatMemberCount(0)).toBe("0 members");
  });
});
