import { describe, expect, it } from "vitest";
import { garminActivity, garminFileUrl, garminSleep, parseGarminPush } from "./garmin-feeds";
const summary = { activityType: "RUNNING", startTimeInSeconds: 1700000000, durationInSeconds: 600, distanceInMeters: 2000 };
describe("Garmin feeds", () => {
  it("uses one identity for summary, nested details and edits, retaining real GPS and sensor samples", () => {
    const item = { userId: "garmin-user", summaryId: "123", ...summary };
    const details = { userId: item.userId, activityId: 123, summaryId: "123-detail", summary, samples: [0,1,2].map(i => ({
      latitudeInDegree: 40 + i * .001, longitudeInDegree: -74, startTimeInSeconds: 1700000000 + i * 10,
      heartRate: 140 + i, elevationInMeters: 10 + i,
    })) };
    const basic = garminActivity("activities", item), detailed = garminActivity("activityDetails", details);
    expect(detailed?.externalId).toBe(basic?.externalId);
    expect(detailed?.summaryPolyline).toBeTruthy();
    expect(detailed?.routeReplay).toEqual(expect.arrayContaining([expect.objectContaining({ heartRate: 141 })]));
    expect(garminActivity("manuallyUpdatedActivities", { ...item, startingLatitudeInDegree: 40, startingLongitudeInDegree: -74 })?.verified).toBe(false);
  });
  it("accepts all configured feeds and rejects unrecognized or oversized batches", () => {
    expect(parseGarminPush(JSON.stringify({ dailies: [{ userId: "user", calendarDate: "2026-10-31" }], activityDetails: [] }))).toHaveProperty("dailies");
    for (const payload of [{ unknown: [] }, { sleeps: [{}] }, { activities: Array(501).fill({ userId: "user" }) }]) {
      expect(() => parseGarminPush(JSON.stringify(payload))).toThrow("invalid_payload");
    }
  });
  it("maps recorded sleep stages and the Garmin score without fabricating a route", () => {
    const night = garminSleep({ userId: "user", calendarDate: "2026-10-31", durationInSeconds: 28800,
      awakeDurationInSeconds: 1800, deepSleepDurationInSeconds: 3600, remSleepInSeconds: 7200, overallSleepScore: { value: 87 } });
    expect(night).toMatchObject({ day: "2026-10-31", source: "garmin", score: 87, durationMin: 480, deepMin: 60, remMin: 120, verified: true });
    expect(garminSleep({ userId: "user", calendarDate: "invalid", durationInSeconds: 100 })).toBeNull();
  });
  it("follows only Garmin's fixed activity-file endpoint, with no redirects", () => {
    expect(garminFileUrl({ userId: "u", callbackURL: "https://apis.garmin.com/wellness-api/rest/activityFile?id=123&token=private" })).toContain("activityFile");
    for (const callbackURL of ["http://apis.garmin.com/wellness-api/rest/activityFile", "https://apis.garmin.com.evil.test/wellness-api/rest/activityFile", "https://apis.garmin.com/other"]) {
      expect(() => garminFileUrl({ userId: "u", callbackURL })).toThrow();
    }
  });
});
