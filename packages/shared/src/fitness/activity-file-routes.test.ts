import { describe, expect, it } from "vitest";
import { decodePolyline } from "../routeGeoUtils";
import { parseFit, parseGpx, parseTcx } from "./activity-files";

describe("GPS geometry in imported files", () => {
  it("retains GPX geometry, endpoints, elevation gain and bounds, skipping invalid points", () => {
    const [activity] = parseGpx(`<gpx><trk><type>running</type><trkseg>
      <trkpt lat='40' lon='-74'><ele>10</ele><time>2026-10-23T12:00:00Z</time></trkpt>
      <trkpt lat='bad' lon='-74'><time>2026-10-23T12:01:00Z</time></trkpt>
      <trkpt lat='40.01' lon='-74.01'><ele>25</ele><time>2026-10-23T12:10:00Z</time></trkpt>
      <trkpt lat='40.02' lon='-74.02'><ele>20</ele><time>2026-10-23T12:20:00Z</time></trkpt>
      </trkseg></trk></gpx>`, "garmin");
    expect(decodePolyline(activity.detailedPolyline!)).toEqual([[-74, 40], [-74.01, 40.01], [-74.02, 40.02]]);
    expect(activity).toMatchObject({ routeBounds: [-74.02, 40, -74, 40.02], elevationGainM: 15, movingSec: 1200 });
    expect(decodePolyline(activity.summaryPolyline!)).toHaveLength(2);
    expect(Number.isFinite(activity.metricValue)).toBe(true);
    expect(activity.id).toBe(`${activity.provider}-${activity.externalId}`);
  });

  it("retains TCX positions without inferring a route when positions are absent", () => {
    const [activity] = parseTcx(`<Activity Sport="Running"><Id>2026-10-23T12:00:00Z</Id><Lap><TotalTimeSeconds>600</TotalTimeSeconds><DistanceMeters>1000</DistanceMeters><Track>
      <Trackpoint><Position><LatitudeDegrees>40</LatitudeDegrees><LongitudeDegrees>-74</LongitudeDegrees></Position></Trackpoint>
      <Trackpoint><Position><LatitudeDegrees>40.01</LatitudeDegrees><LongitudeDegrees>-74.01</LongitudeDegrees></Position></Trackpoint>
      </Track></Lap></Activity>`, "garmin");
    expect(decodePolyline(activity.detailedPolyline!)).toHaveLength(2);
    expect(activity.id).toBe(`${activity.provider}-${activity.externalId}`);
    const [indoor] = parseTcx(`<Activity Sport="Running"><Id>2026-10-23T12:00:00Z</Id><Lap><TotalTimeSeconds>600</TotalTimeSeconds><DistanceMeters>1000</DistanceMeters></Lap></Activity>`, "garmin");
    expect(indoor.detailedPolyline).toBeUndefined();
  });

  it("decodes signed FIT GPS records and compressed timestamps, ignoring invalid positions", () => {
    const data: number[] = [];
    const u16 = (n: number) => data.push(n & 255, n >>> 8 & 255);
    const u32 = (n: number) => data.push(n & 255, n >>> 8 & 255, n >>> 16 & 255, n >>> 24 & 255);
    const degrees = (n: number) => Math.round(n * 2147483648 / 180);
    data.push(0x40, 0, 0); u16(20); data.push(4, 253, 4, 6, 0, 4, 5, 1, 4, 5, 2, 2, 4);
    data.push(0); u32(100); u32(degrees(40)); u32(degrees(-74)); u16(2550);
    data.push(0x80 | 9); u32(degrees(40.01)); u32(degrees(-74.01)); u16(2600);
    data.push(0x80 | 10); u32(0x7fffffff); u32(0x7fffffff); u16(0xffff);
    data.push(0x41, 0, 0); u16(18); data.push(5, 253, 4, 6, 2, 4, 6, 5, 1, 2, 8, 4, 6, 9, 4, 6);
    data.push(1); u32(120); u32(100); data.push(1); u32(20000); u32(100000);
    const bytes = new Uint8Array(14 + data.length + 2);
    bytes[0] = 14; bytes.set([46, 70, 73, 84], 8);
    new DataView(bytes.buffer).setUint32(4, data.length, true);
    bytes.set(data, 14);
    const [activity] = parseFit(bytes, "garmin");
    expect(decodePolyline(activity.detailedPolyline!)).toEqual([[-74, 40], [-74.01, 40.01]]);
    expect(activity).toMatchObject({ movingSec: 20, metricValue: 1000, elevationGainM: 10 });
  });
});
