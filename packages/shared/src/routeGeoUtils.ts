import * as turf from "@turf/turf";

/**
 * Coordinate in GeoJSON / Turf / Mapbox format: [longitude, latitude].
 */
export type LngLat = [number, number];

/**
 * Bounding box: [minLng, minLat, maxLng, maxLat].
 */
export type RouteBBox = [number, number, number, number];

/**
 * Encode a sequence of [longitude, latitude] coordinates into a Google Polyline string.
 *
 * In Google's format, each point is stored as [latitude, longitude] deltas
 * scaled by 1e5 (or custom precision).
 */
export function encodePolyline(
  coordinates: LngLat[],
  precision = 5,
): string {
  if (!coordinates || coordinates.length === 0) return "";
  const factor = Math.pow(10, precision);
  let output = "";
  let prevLat = 0;
  let prevLng = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];
    if (!coord || !Number.isFinite(coord[0]) || !Number.isFinite(coord[1])) {
      continue;
    }
    const lng = coord[0];
    const lat = coord[1];

    const latRound = Math.round(lat * factor);
    const lngRound = Math.round(lng * factor);

    const dLat = latRound - prevLat;
    const dLng = lngRound - prevLng;

    prevLat = latRound;
    prevLng = lngRound;

    output += encodeSignedNumber(dLat);
    output += encodeSignedNumber(dLng);
  }

  return output;
}

function encodeSignedNumber(num: number): string {
  let sgnNum = num < 0 ? ~(num << 1) : num << 1;
  let chunk = "";
  while (sgnNum >= 0x20) {
    chunk += String.fromCharCode((0x20 | (sgnNum & 0x1f)) + 63);
    sgnNum >>>= 5;
  }
  chunk += String.fromCharCode(sgnNum + 63);
  return chunk;
}

/**
 * Decode a Google Polyline string into a sequence of [longitude, latitude] coordinates.
 */
export function decodePolyline(
  encoded: string,
  precision = 5,
): LngLat[] {
  if (!encoded || typeof encoded !== "string") return [];
  // Handle pre-URL-encoded polyline strings gracefully
  const cleanStr = encoded.includes("%")
    ? (() => {
        try {
          return decodeURIComponent(encoded);
        } catch {
          return encoded;
        }
      })()
    : encoded;

  const factor = Math.pow(10, precision);
  const coordinates: LngLat[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < cleanStr.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    // Decode latitude delta
    do {
      if (index >= cleanStr.length) break;
      b = cleanStr.charCodeAt(index++) - 63;
      if (isNaN(b) || b < 0) break;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && shift < 32 && index < cleanStr.length);

    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    // Decode longitude delta
    shift = 0;
    result = 0;
    do {
      if (index >= cleanStr.length) break;
      b = cleanStr.charCodeAt(index++) - 63;
      if (isNaN(b) || b < 0) break;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && shift < 32 && index < cleanStr.length);

    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    const finalLat = lat / factor;
    const finalLng = lng / factor;

    // Basic geographic sanity check
    if (
      Number.isFinite(finalLat) &&
      Number.isFinite(finalLng) &&
      finalLat >= -90 &&
      finalLat <= 90 &&
      finalLng >= -180 &&
      finalLng <= 180
    ) {
      coordinates.push([finalLng, finalLat]);
    }
  }

  return coordinates;
}

/**
 * Simplify a route's coordinates using Douglas-Peucker (turf.simplify).
 */
export function simplifyCoordinates(
  coordinates: LngLat[],
  options: { tolerance?: number; highQuality?: boolean } = {},
): LngLat[] {
  if (!coordinates || coordinates.length <= 2) {
    return coordinates ?? [];
  }

  const line = turf.lineString(coordinates);
  const simplified = turf.simplify(line, {
    tolerance: options.tolerance ?? 0.00005,
    highQuality: options.highQuality ?? true,
    mutate: false,
  });

  const simplifiedCoords = simplified.geometry.coordinates as LngLat[];

  // Ensure start and end points remain identical
  if (simplifiedCoords.length >= 2) {
    simplifiedCoords[0] = coordinates[0];
    simplifiedCoords[simplifiedCoords.length - 1] = coordinates[coordinates.length - 1];
  }

  return simplifiedCoords;
}

/**
 * Prepare a route for static map rendering:
 * 1. Simplifies coordinates if points > maxPoints (default 300).
 * 2. Iteratively increases simplification tolerance if the URL-safe encoded polyline
 *    would exceed maxUrlLength (default 7,500 chars, well below the 8,192 limit).
 */
export function simplifyForStaticMap(
  coordinates: LngLat[],
  maxPoints = 300,
  maxUrlLength = 7500,
): {
  coordinates: LngLat[];
  encodedPolyline: string;
  urlSafePolyline: string;
} {
  if (!coordinates || coordinates.length === 0) {
    return { coordinates: [], encodedPolyline: "", urlSafePolyline: "" };
  }

  let current = coordinates;
  let tolerance = 0.00003;

  // Initial simplification if > maxPoints
  if (current.length > maxPoints) {
    current = simplifyCoordinates(current, { tolerance, highQuality: true });
  }

  let encoded = encodePolyline(current);
  let urlSafe = encodeURIComponent(encoded);

  // Iteratively simplify until under maxPoints AND under maxUrlLength
  let iterations = 0;
  while (
    (current.length > maxPoints || urlSafe.length > maxUrlLength) &&
    current.length > 4 &&
    iterations < 10
  ) {
    tolerance *= 2.0;
    current = simplifyCoordinates(current, { tolerance, highQuality: true });
    encoded = encodePolyline(current);
    urlSafe = encodeURIComponent(encoded);
    iterations++;
  }

  return {
    coordinates: current,
    encodedPolyline: encoded,
    urlSafePolyline: urlSafe,
  };
}

/**
 * Calculate total route distance in kilometers.
 */
export function calculateRouteDistance(coordinates: LngLat[]): number {
  if (!coordinates || coordinates.length < 2) return 0;
  const line = turf.lineString(coordinates);
  return turf.length(line, { units: "kilometers" });
}

/**
 * Calculate route bounding box: [minLng, minLat, maxLng, maxLat].
 */
export function calculateRouteBounds(coordinates: LngLat[]): RouteBBox {
  if (!coordinates || coordinates.length === 0) {
    return [0, 0, 0, 0];
  }
  if (coordinates.length === 1) {
    const [lng, lat] = coordinates[0];
    return [lng - 0.005, lat - 0.005, lng + 0.005, lat + 0.005];
  }
  const line = turf.lineString(coordinates);
  return turf.bbox(line) as RouteBBox;
}

/**
 * Find point along route at a given distance in kilometers.
 */
export function getPointAlongRoute(
  coordinates: LngLat[],
  distanceKm: number,
): LngLat {
  if (!coordinates || coordinates.length === 0) return [0, 0];
  if (coordinates.length === 1 || distanceKm <= 0) return coordinates[0];

  const line = turf.lineString(coordinates);
  const total = turf.length(line, { units: "kilometers" });
  const clampedDist = Math.max(0, Math.min(distanceKm, total));

  const pointAlong = turf.along(line, clampedDist, { units: "kilometers" });
  return pointAlong.geometry.coordinates as LngLat;
}

/**
 * Calculate compass bearing between two points in degrees (-180 to 180).
 */
export function getBearingBetweenPoints(start: LngLat, end: LngLat): number {
  const p1 = turf.point(start);
  const p2 = turf.point(end);
  return turf.bearing(p1, p2);
}

/**
 * Shortest angular difference from fromDeg to toDeg in degrees (-180 to 180).
 * Prevents camera spinning 350 degrees when crossing 0/360 or -180/180.
 */
export function shortestAngleDiff(fromDeg: number, toDeg: number): number {
  return ((((toDeg - fromDeg) % 360) + 540) % 360) - 180;
}

/**
 * Linear interpolation between numbers.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linear interpolation between angles in degrees using shortest-arc path.
 */
export function lerpAngle(currentDeg: number, targetDeg: number, t: number): number {
  const diff = shortestAngleDiff(currentDeg, targetDeg);
  return (currentDeg + diff * t) % 360;
}

/**
 * Options for generating a Mapbox Static Images API URL.
 */
export interface StaticMapUrlOptions {
  coordinates: LngLat[] | string;
  width?: number; // default 600
  height?: number; // default 400
  mapStyle?: string; // e.g. 'mapbox/outdoors-v12'
  strokeColor?: string; // hex without # e.g. 'f7c948'
  strokeWidth?: number; // default 4
  strokeOpacity?: number; // default 0.9
  padding?: number; // default 40
  retina?: boolean; // default true (@2x)
  showStartEndPins?: boolean; // default true
  mapboxToken: string;
}

/**
 * Construct a Mapbox Static Images API URL with overlay path and pins.
 */
export function buildMapboxStaticImageUrl(options: StaticMapUrlOptions): string {
  const {
    coordinates,
    width = 600,
    height = 400,
    mapStyle = "mapbox/outdoors-v12",
    strokeColor = "f7c948",
    strokeWidth = 4,
    strokeOpacity = 0.9,
    padding = 40,
    retina = true,
    showStartEndPins = true,
    mapboxToken,
  } = options;

  let decodedCoords: LngLat[];
  let urlSafePolyline: string;

  if (typeof coordinates === "string") {
    // Input is encoded polyline string
    decodedCoords = decodePolyline(coordinates);
    const simplified = simplifyForStaticMap(decodedCoords);
    urlSafePolyline = simplified.urlSafePolyline;
  } else {
    decodedCoords = coordinates || [];
    const simplified = simplifyForStaticMap(decodedCoords);
    urlSafePolyline = simplified.urlSafePolyline;
  }

  if (!mapboxToken || !decodedCoords || decodedCoords.length < 2 || !urlSafePolyline) {
    return "";
  }

  const overlays: string[] = [];

  // 1. Path overlay: path-{strokeWidth}+{strokeColor}-{strokeOpacity}({encodedPolyline})
  const cleanColor = strokeColor.trim().replace("#", "");
  overlays.push(`path-${strokeWidth}+${cleanColor}-${strokeOpacity}(${urlSafePolyline})`);

  // 2. Start / Finish pin markers if requested
  if (showStartEndPins && decodedCoords.length >= 2) {
    const start = decodedCoords[0];
    const end = decodedCoords[decodedCoords.length - 1];

    // Green / Navy Start pin, Action Gold End pin
    const startLng = Number(start[0].toFixed(5));
    const startLat = Number(start[1].toFixed(5));
    const endLng = Number(end[0].toFixed(5));
    const endLat = Number(end[1].toFixed(5));

    overlays.push(`pin-s-a+142b3b(${startLng},${startLat})`);
    overlays.push(`pin-s-b+f7c948(${endLng},${endLat})`);
  }

  const overlayString = overlays.join(",");
  const retinaSuffix = retina ? "@2x" : "";
  const cleanStyle = mapStyle.replace(/^\//, "");

  return `https://api.mapbox.com/styles/v1/${cleanStyle}/static/${overlayString}/auto/${width}x${height}${retinaSuffix}?access_token=${mapboxToken}&padding=${padding}`;
}
