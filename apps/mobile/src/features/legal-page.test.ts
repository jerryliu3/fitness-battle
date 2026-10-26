import { describe, expect, it } from "vitest";
import { legalPageUrl } from "./legal-page";

describe("legal page links", () => {
  it("builds privacy and terms URLs from the configured web origin", () => {
    expect(legalPageUrl("https://overtaek.xyz/", "/privacy")).toBe(
      "https://overtaek.xyz/privacy",
    );
    expect(legalPageUrl("https://overtaek.xyz", "/terms")).toBe(
      "https://overtaek.xyz/terms",
    );
  });
});
