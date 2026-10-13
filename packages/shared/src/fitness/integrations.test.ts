import { describe, expect, it } from "vitest";
import { parseFit, parseGpx, parseTcx } from "./activity-files";
import { mapGarminActivity } from "./garmin-provider";
import { oauth1BaseString } from "./oauth1";
import { activityFromSample } from "./samples";
import { mapOuraReadiness, mapOuraWorkout } from "./oura-provider";
import { mapWhoopRecovery, mapWhoopWorkout } from "./whoop-provider";

describe("oauth1", () => {
  it("builds a sorted signature base string", () => {
    const base = oauth1BaseString(
      "GET",
      "https://apis.garmin.com/wellness-api/rest/user/id",
      {
        oauth_version: "1.0",
        oauth_consumer_key: "key",
        oauth_timestamp: "1",
        oauth_nonce: "n",
        oauth_signature_method: "HMAC-SHA1",
      },
    );
    expect(base).toBe(
      "GET&https%3A%2F%2Fapis.garmin.com%2Fwellness-api%2Frest%2Fuser%2Fid&oauth_consumer_key%3Dkey%26oauth_nonce%3Dn%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1%26oauth_version%3D1.0",
    );
  });
});

describe("whoop and oura mappers", () => {
  it("maps a scored WHOOP workout and recovery", () => {
    const activity = mapWhoopWorkout({
      id: "abc",
      start: "2026-10-01T12:00:00.000Z",
      end: "2026-10-01T12:25:00.000Z",
      sport_name: "running",
      score: { distance_meter: 5000, average_heart_rate: 150 },
    });
    expect(activity?.categorySlug).toBe("running");
    expect(activity?.metricValue).toBe(5000);
    expect(activity?.movingSec).toBe(1500);
    expect(
      mapWhoopRecovery({
        cycle_id: 7,
        created_at: "2026-10-01T08:00:00.000Z",
        score_state: "SCORED",
        score: { recovery_score: 81 },
      })?.score,
    ).toBe(81);
    expect(mapWhoopRecovery({ score_state: "PENDING", created_at: "2026-10-01T08:00:00.000Z" })).toBeNull();
  });

  it("maps Oura readiness and workouts", () => {
    expect(mapOuraReadiness({ id: "r1", day: "2026-10-01", score: 77 })?.score).toBe(77);
    const ride = mapOuraWorkout({
      id: "w1",
      activity: "cycling",
      start_datetime: "2026-10-01T12:00:00Z",
      end_datetime: "2026-10-01T13:00:00Z",
      distance: 30000,
    });
    expect(ride?.categorySlug).toBe("cycling");
    expect(ride?.metricValue).toBe(30000);
    expect(activityFromSample(ride!)?.source).toBe("oura");
  });
});

describe("garmin", () => {
  it("maps a health API summary", () => {
    const sample = mapGarminActivity({
      summaryId: "sum-1",
      activityType: "RUNNING",
      activityName: "Morning",
      startTimeInSeconds: 1_759_320_000,
      durationInSeconds: 1800,
      distanceInMeters: 5200,
      averageHeartRateInBeatsPerMinute: 148,
    });
    expect(sample?.externalId).toBe("sum-1");
    expect(sample?.categorySlug).toBe("running");
    expect(sample?.metricValue).toBe(5200);
    expect(activityFromSample(sample!)?.source).toBe("garmin");
  });
});

describe("activity files", () => {
  it("parses a GPX track", () => {
    const xml = `<?xml version="1.0"?>
      <gpx><trk><name>Park</name><type>running</type><trkseg>
        <trkpt lat="43.65" lon="-79.38"><time>2026-10-01T12:00:00Z</time></trkpt>
        <trkpt lat="43.66" lon="-79.38"><time>2026-10-01T12:10:00Z</time></trkpt>
      </trkseg></trk></gpx>`;
    const [activity] = parseGpx(xml, "garmin");
    expect(activity?.categorySlug).toBe("running");
    expect(activity?.metricValue).toBeGreaterThan(1000);
    expect(activity?.movingSec).toBe(600);
  });

  it("parses a TCX run", () => {
    const xml = `<?xml version="1.0"?>
      <TrainingCenterDatabase><Activities>
        <Activity Sport="Running">
          <Id>2026-10-01T12:00:00Z</Id>
          <Lap>
            <TotalTimeSeconds>1500</TotalTimeSeconds>
            <DistanceMeters>5000</DistanceMeters>
            <HeartRateBpm><Value>150</Value></HeartRateBpm>
          </Lap>
        </Activity>
      </Activities></TrainingCenterDatabase>`;
    const [activity] = parseTcx(xml, "garmin");
    expect(activity?.metricValue).toBe(5000);
    expect(activity?.movingSec).toBe(1500);
    expect(activity?.avgHr).toBe(150);
  });

  it("parses a FIT session", () => {
    const fitEpoch = Date.UTC(1989, 11, 31);
    const start = Math.round((Date.parse("2026-10-01T12:00:00Z") - fitEpoch) / 1000);
    const fields = [
      [5, 1],
      [2, 4],
      [8, 4],
      [9, 4],
      [16, 1],
    ];
    const dataSize = 6 + fields.length * 3 + 1 + 1 + 4 + 4 + 4 + 1;
    const bytes = new Uint8Array(12 + dataSize);
    const view = new DataView(bytes.buffer);
    bytes[0] = 12;
    bytes.set([0x2e, 0x46, 0x49, 0x54], 8);
    view.setUint32(4, dataSize, true);
    let offset = 12;
    bytes[offset++] = 0x40;
    bytes[offset++] = 0;
    bytes[offset++] = 0;
    view.setUint16(offset, 18, true);
    offset += 2;
    bytes[offset++] = fields.length;
    for (const [num, size] of fields) {
      bytes[offset++] = num!;
      bytes[offset++] = size!;
      bytes[offset++] = size === 1 ? 2 : 6;
    }
    bytes[offset++] = 0x00;
    bytes[offset++] = 1;
    view.setUint32(offset, start, true);
    offset += 4;
    view.setUint32(offset, 1_500_000, true);
    offset += 4;
    view.setUint32(offset, 500_000, true);
    offset += 4;
    bytes[offset] = 140;
    const [activity] = parseFit(bytes, "garmin");
    expect(activity?.categorySlug).toBe("running");
    expect(activity?.metricValue).toBe(5000);
    expect(activity?.movingSec).toBe(1500);
    expect(activity?.avgHr).toBe(140);
    expect(activity?.startedAt).toBe("2026-10-01T12:00:00.000Z");
  });
});
