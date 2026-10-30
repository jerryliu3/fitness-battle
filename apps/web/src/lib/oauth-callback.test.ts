import { signOAuthState } from "./oauth-state";
import { describe, expect, it } from "vitest";
import { trackerRedirect, trackerRedirectForRequest } from "./oauth-callback";

describe("trackerRedirect", () => {
  it("returns a path-style deep link and web fallback", async () => {
    const response = trackerRedirect("https://example.com", "oura", "connected", "bearer");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("overtaek:///you?tracker=connected&provider=oura");
    expect(html).toContain(
      "https://example.com/app/you?tracker=connected&provider=oura",
    );
  });
});

it("keeps web-started authorization in the browser", async () => {
  const response = trackerRedirect("https://example.com", "garmin", "connected");
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("https://example.com/app/you?tracker=connected&provider=garmin");
  expect(await response.text()).not.toContain("overtaek://");
});

it("launches the app only for authenticated mobile state", async () => {
  const state = signOAuthState("athlete", "garmin", "bearer");
  const response = trackerRedirectForRequest(new Request(`https://example.com/api/fitness/garmin/callback?state=${encodeURIComponent(state)}`), "garmin", "connected");
  expect(response.status).toBe(200);
  expect(await response.text()).toContain("provider=garmin&panel=connections");
  const forged = trackerRedirectForRequest(new Request("https://example.com/api/fitness/garmin/callback?state=forged"), "garmin", "error");
  expect(forged.status).toBe(303);
});
