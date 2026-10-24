import { describe, expect, it } from "vitest";
import {
  buildMapboxStaticImageUrl,
  calculateRouteBounds,
  calculateRouteDistance,
  decodePolyline,
  encodePolyline,
  getBearingBetweenPoints,
  getPointAlongRoute,
  lerp,
  lerpAngle,
  shortestAngleDiff,
  simplifyCoordinates,
  simplifyForStaticMap,
  type LngLat,
} from "./routeGeoUtils";
import { MARIN_HEADLANDS_ROUTE_COORDINATES } from "./sampleRoute";

describe("routeGeoUtils", () => {
  describe("encodePolyline & decodePolyline", () => {
    it("encodes and decodes coordinates with high precision roundtrip", () => {
      const coords: LngLat[] = [
        [-122.4194, 37.7749],
        [-122.42, 37.7755],
        [-122.4215, 37.776],
      ];

      const encoded = encodePolyline(coords);
      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);

      const decoded = decodePolyline(encoded);
      expect(decoded.length).toBe(coords.length);

      for (let i = 0; i < coords.length; i++) {
        expect(decoded[i][0]).toBeCloseTo(coords[i][0], 4);
        expect(decoded[i][1]).toBeCloseTo(coords[i][1], 4);
      }
    });

    it("handles empty and single coordinate inputs gracefully", () => {
      expect(encodePolyline([])).toBe("");
      expect(decodePolyline("")).toEqual([]);

      const single: LngLat[] = [[-73.97, 40.78]];
      const encSingle = encodePolyline(single);
      const decSingle = decodePolyline(encSingle);
      expect(decSingle.length).toBe(1);
      expect(decSingle[0][0]).toBeCloseTo(-73.97, 4);
      expect(decSingle[0][1]).toBeCloseTo(40.78, 4);
    });

    it("matches Google polyline algorithm standard reference", () => {
      // Reference: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
      // Note coordinates are [lng, lat]
      const googleTestCoords: LngLat[] = [
        [-120.2, 38.5],
        [-120.95, 40.7],
        [-126.453, 43.252],
      ];
      const encoded = encodePolyline(googleTestCoords);
      expect(encoded).toBe("_p~iF~ps|U_ulLnnqC_mqNvxq`@");

      const decoded = decodePolyline(encoded);
      expect(decoded[0][0]).toBeCloseTo(-120.2, 5);
      expect(decoded[0][1]).toBeCloseTo(38.5, 5);
      expect(decoded[1][0]).toBeCloseTo(-120.95, 5);
      expect(decoded[1][1]).toBeCloseTo(40.7, 5);
      expect(decoded[2][0]).toBeCloseTo(-126.453, 5);
      expect(decoded[2][1]).toBeCloseTo(43.252, 5);
    });
  });

  describe("simplifyCoordinates & simplifyForStaticMap", () => {
    it("simplifies dense coordinates while preserving endpoints", () => {
      // Generate a dense line of 1000 points with tiny perturbations
      const dense: LngLat[] = [];
      for (let i = 0; i < 1000; i++) {
        const t = i / 1000;
        const lng = -122.5 + t * 0.1;
        const lat = 37.8 + Math.sin(t * 20) * 0.0001;
        dense.push([lng, lat]);
      }

      const simplified = simplifyCoordinates(dense, { tolerance: 0.0001 });
      expect(simplified.length).toBeLessThan(dense.length);
      expect(simplified.length).toBeLessThan(100);

      // Start and end points preserved
      expect(simplified[0]).toEqual(dense[0]);
      expect(simplified[simplified.length - 1]).toEqual(dense[dense.length - 1]);
    });

    it("enforces <= 300 points and keeps encoded length safely below 8,192 chars", () => {
      const dense: LngLat[] = [];
      for (let i = 0; i < 1500; i++) {
        const t = i / 1500;
        dense.push([-122.5 + t * 0.2, 37.8 + Math.sin(t * 100) * 0.005]);
      }

      const result = simplifyForStaticMap(dense, 300, 7500);
      expect(result.coordinates.length).toBeLessThanOrEqual(300);
      expect(result.urlSafePolyline.length).toBeLessThan(7500);
      expect(result.encodedPolyline.length).toBeGreaterThan(0);
    });
  });

  describe("calculateRouteDistance & calculateRouteBounds", () => {
    it("computes realistic distance and bounds for Marin Headlands loop", () => {
      const dist = calculateRouteDistance(MARIN_HEADLANDS_ROUTE_COORDINATES);
      expect(dist).toBeGreaterThan(6.0);
      expect(dist).toBeLessThan(12.0);

      const bounds = calculateRouteBounds(MARIN_HEADLANDS_ROUTE_COORDINATES);
      expect(bounds[0]).toBeLessThan(bounds[2]); // minLng < maxLng
      expect(bounds[1]).toBeLessThan(bounds[3]); // minLat < maxLat
      expect(bounds[0]).toBeCloseTo(-122.5222, 2);
      expect(bounds[2]).toBeCloseTo(-122.4985, 2);
    });
  });

  describe("getPointAlongRoute & getBearingBetweenPoints", () => {
    it("returns start, midpoint, and end along route", () => {
      const totalDist = calculateRouteDistance(MARIN_HEADLANDS_ROUTE_COORDINATES);
      const start = getPointAlongRoute(MARIN_HEADLANDS_ROUTE_COORDINATES, 0);
      const mid = getPointAlongRoute(MARIN_HEADLANDS_ROUTE_COORDINATES, totalDist / 2);
      const end = getPointAlongRoute(MARIN_HEADLANDS_ROUTE_COORDINATES, totalDist);

      expect(start[0]).toBeCloseTo(MARIN_HEADLANDS_ROUTE_COORDINATES[0][0], 3);
      expect(start[1]).toBeCloseTo(MARIN_HEADLANDS_ROUTE_COORDINATES[0][1], 3);
      expect(end[0]).toBeCloseTo(MARIN_HEADLANDS_ROUTE_COORDINATES[MARIN_HEADLANDS_ROUTE_COORDINATES.length - 1][0], 3);
      expect(mid[0]).toBeDefined();
    });

    it("calculates bearing between two points", () => {
      // Due north: bearing ~ 0
      const north = getBearingBetweenPoints([0, 0], [0, 1]);
      expect(north).toBeCloseTo(0, 1);

      // Due east: bearing ~ 90
      const east = getBearingBetweenPoints([0, 0], [1, 0]);
      expect(east).toBeCloseTo(90, 1);
    });
  });

  describe("shortestAngleDiff, lerpAngle & lerp", () => {
    it("calculates shortest angular distance across wrap boundaries", () => {
      // 10 to 350 is -20 deg, not +340 deg
      expect(shortestAngleDiff(10, 350)).toBeCloseTo(-20, 1);
      expect(shortestAngleDiff(350, 10)).toBeCloseTo(20, 1);
      expect(shortestAngleDiff(-170, 170)).toBeCloseTo(-20, 1);
      expect(shortestAngleDiff(170, -170)).toBeCloseTo(20, 1);
    });

    it("smoothly interpolates angles without spinning around 360", () => {
      const halfway = lerpAngle(350, 10, 0.5);
      // Halfway between 350 and 10 is 0 (or 360)
      expect(halfway).toBeCloseTo(0, 1);

      const lerped = lerp(10, 20, 0.25);
      expect(lerped).toBe(12.5);
    });
  });

  describe("buildMapboxStaticImageUrl", () => {
    it("constructs valid Mapbox Static Images API URL with overlays, retina, and auto framing", () => {
      const url = buildMapboxStaticImageUrl({
        coordinates: MARIN_HEADLANDS_ROUTE_COORDINATES,
        width: 600,
        height: 400,
        mapStyle: "mapbox/outdoors-v12",
        strokeColor: "f7c948",
        strokeWidth: 4,
        strokeOpacity: 0.9,
        padding: 40,
        retina: true,
        showStartEndPins: true,
        mapboxToken: "pk.test-token-12345",
      });

      expect(url).toContain("https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/");
      expect(url).toContain("path-4+f7c948-0.9(");
      expect(url).toContain("pin-s-a+142b3b(");
      expect(url).toContain("pin-s-b+f7c948(");
      expect(url).toContain("/auto/600x400@2x");
      expect(url).toContain("access_token=pk.test-token-12345");
      expect(url).toContain("padding=40");
    });
  });
});
