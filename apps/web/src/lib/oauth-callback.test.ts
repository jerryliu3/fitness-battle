import { describe, expect, it } from "vitest";
import { trackerRedirect } from "./oauth-callback";

describe("trackerRedirect", () => {
  it("returns a path-style deep link and web fallback", async () => {
    const response = trackerRedirect("https://example.com", "oura", "connected");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("overtaek:///you?tracker=connected&provider=oura");
    expect(html).toContain("https://example.com/you?tracker=connected&provider=oura");
  });
});
