import { describe, expect, it } from "vitest";
import { normalizeRouteReplay, routeReplayAt } from "./route-replay";
import { parseGpx, parseTcx } from "./fitness/activity-files";
import { activityFromSample } from "./fitness/samples";
describe("recorded route replay", () => {
  it("keeps measurements from the nearest recorded position and rejects stale gaps", () => {
    const samples = normalizeRouteReplay([{ progress: 0, elapsedSec: 0, heartRate: 120 }, { progress: .5, elapsedSec: 10, heartRate: 140, speedMps: 0 }, { progress: 1, elapsedSec: 100, heartRate: 150 }]);
    expect(routeReplayAt(samples, .4)).toMatchObject({ heartRate: 140, speedMps: 0 });
    expect(routeReplayAt(samples, .7)).toBeNull();
    expect(routeReplayAt(samples, 1)?.heartRate).toBe(150);
    expect(routeReplayAt([], .2)).toBeNull();
  });
  it("filters malformed/out-of-order samples and unavailable sensor values", () => {
    expect(normalizeRouteReplay([{ progress: 0, elapsedSec: 0, heartRate: 0, cadence: 170, cadenceUnit: "unknown", speedMps: -3 }, { progress: -1, elapsedSec: 10 }, { progress: .5, elapsedSec: 10 }, { progress: .3, elapsedSec: 5 }])).toEqual([{ progress: 0, elapsedSec: 0 }, { progress: .5, elapsedSec: 10 }]);
    expect(normalizeRouteReplay(Array(20001).fill({ progress: 0, elapsedSec: 0 }))).toEqual([]);
  });
  it("imports timestamped GPX HR and derives interval speed without guessing running cadence units", () => {
    const [sample] = parseGpx(`<gpx><trk><type>running</type><trkseg>
      <trkpt lat="40" lon="-74"><time>2026-10-24T12:00:00Z</time><extensions><g:hr>130</g:hr><g:cad>85</g:cad></extensions></trkpt>
      <trkpt lat="40.0001" lon="-74.0001"><time>2026-10-24T12:00:05Z</time><extensions><g:hr>140</g:hr></extensions></trkpt>
      </trkseg></trk></gpx>`, "garmin");
    expect(sample.routeReplay?.[0]).toEqual({ progress: 0, elapsedSec: 0, heartRate: 130 });
    expect(sample.routeReplay?.[1]).toMatchObject({ progress: 1, elapsedSec: 5, heartRate: 140 });
    expect(sample.routeReplay?.[1].speedMps).toBeGreaterThan(2);
    expect(activityFromSample(sample, "imported")?.routeReplay).toEqual(sample.routeReplay);
  });
  it("imports TCX speed, HR and run stride cadence as steps/minute", () => {
    const [sample] = parseTcx(`<Activity Sport="Running"><Id>2026-10-24T12:00:00Z</Id><Lap><TotalTimeSeconds>10</TotalTimeSeconds><DistanceMeters>30</DistanceMeters><Track>
      <Trackpoint><Time>2026-10-24T12:00:00Z</Time><Position><LatitudeDegrees>40</LatitudeDegrees><LongitudeDegrees>-74</LongitudeDegrees></Position><HeartRateBpm><Value>130</Value></HeartRateBpm><Extensions><x:Speed>3.1</x:Speed><x:RunCadence>85</x:RunCadence></Extensions></Trackpoint>
      <Trackpoint><Time>2026-10-24T12:00:10Z</Time><Position><LatitudeDegrees>40.0002</LatitudeDegrees><LongitudeDegrees>-74</LongitudeDegrees></Position></Trackpoint>
      </Track></Lap></Activity>`, "garmin");
    expect(sample.routeReplay?.[0]).toMatchObject({ speedMps: 3.1, heartRate: 130, cadence: 170, cadenceUnit: "spm" });
    expect(sample.routeReplay?.[1].heartRate).toBeUndefined();
  });
});
