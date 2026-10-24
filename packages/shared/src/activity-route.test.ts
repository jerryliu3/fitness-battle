import { describe, expect, it } from "vitest";
import { activityRoute } from "./activity-route";
import { encodePolyline } from "./routeGeoUtils";
import { activityFromSample } from "./fitness/samples";

const summary = encodePolyline([[-122.4, 37.8], [-122.41, 37.81]]);
const detailed = encodePolyline([[-122.4, 37.8], [-122.405, 37.805], [-122.41, 37.81]]);

describe("recorded activity routes", () => {
  it("preserves imported GPS geometry through conversion without changing provenance", () => {
    const activity = activityFromSample({ id: "strava-42", provider: "strava", externalId: "42", categorySlug: "running", startedAt: "2026-10-23T12:00:00Z", metricValue: 5000, movingSec: 1800, rawName: "Run", summaryPolyline: summary, detailedPolyline: detailed }, "imported");
    expect(activity).toMatchObject({ summaryPolyline: summary, detailedPolyline: detailed, verified: false, disposition: "pending" });
    expect(activityRoute(activity!)).toHaveLength(3);
  });

  it("falls back from unusable detailed geometry to summary", () => {
    expect(activityRoute({ detailedPolyline: encodePolyline([[190, 35], [191, 36]]), summaryPolyline: summary })).toHaveLength(2);
  });

  it("never invents geometry for GPS sessions without a route", () => {
    expect(activityRoute()).toBeNull();
    expect(activityRoute({ summaryPolyline: "" })).toBeNull();
    expect(activityRoute({ summaryPolyline: "???" })).toBeNull();
    expect(activityRoute({ detailedPolyline: encodePolyline([[0, 0], [0, 0]]) })).toBeNull();
  });
});
