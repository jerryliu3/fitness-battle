import { describe, expect, it } from "vitest";
import {
  crewInviteHttpsUrl,
  crewInviteNativePath,
  crewInviteWebDestination,
  nativeAppDeepLink,
  publicAthleteHttpsUrl,
  publicAthleteNativePath,
  publicAthleteWebDestination,
} from "./share-links";

describe("share links", () => {
  it("builds crew invite URLs for web and native", () => {
    expect(crewInviteHttpsUrl("https://overtaek.xyz", "RALLY7")).toBe(
      "https://overtaek.xyz/invite?invite=RALLY7",
    );
    expect(crewInviteWebDestination("RALLY7")).toBe("/app/field?invite=RALLY7");
    expect(crewInviteNativePath("RALLY7")).toBe("/invite?invite=RALLY7");
    expect(nativeAppDeepLink(crewInviteNativePath("RALLY7"))).toBe(
      "overtaek://invite?invite=RALLY7",
    );
  });

  it("builds public athlete URLs for web and native", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(publicAthleteHttpsUrl("https://overtaek.xyz", id)).toBe(
      `https://overtaek.xyz/athlete?id=${encodeURIComponent(id)}`,
    );
    expect(publicAthleteWebDestination(id)).toBe(`/app/athlete?id=${encodeURIComponent(id)}`);
    expect(publicAthleteNativePath(id)).toBe(`/athlete-profile?id=${encodeURIComponent(id)}`);
  });
});