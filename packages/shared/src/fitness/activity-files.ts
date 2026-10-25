import { normalizeRouteReplay } from "../route-replay";
import type { ActivitySample, CategorySlug, FitnessProviderId } from "../types";
import { calculateRouteBounds, encodePolyline, simplifyCoordinates, type LngLat } from "../routeGeoUtils";
import { mapSportToCategory } from "./strava-provider";

const FIT_EPOCH_MS = Date.UTC(1989, 11, 31);

export interface ParsedActivityFile {
  activities: ActivitySample[];
  format: "gpx" | "tcx" | "fit";
}

function haversine(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const radius = 6_371_000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

interface TrackPoint {
  lat: number;
  lon: number;
  time?: string;
  elevation?: number;
  speedMps?: number;
  heartRate?: number;
  cadence?: number;
  cadenceUnit?: "spm" | "rpm";
}

function routeMetadata(points: TrackPoint[], sport: CategorySlug): Partial<ActivitySample> {
  const valid = points.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180);
  if (valid.length < 2) return {};
  const coordinates: LngLat[] = valid.map(p => [p.lon, p.lat]);
  let elevationGainM = 0;
  let hasElevation = false;
  for (let i = 1; i < valid.length; i++) {
    const before = valid[i - 1].elevation, after = valid[i].elevation;
    if (before != null && after != null && Number.isFinite(before) && Number.isFinite(after)) {
      hasElevation = true;
      elevationGainM += Math.max(0, after - before);
    }
  }
  const distances = [0];
  for (let i = 1; i < valid.length; i++) distances.push(distances[i-1] + haversine(valid[i-1].lat, valid[i-1].lon, valid[i].lat, valid[i].lon));
  const total = distances.at(-1)!;
  const start = valid.find(p => p.time && Number.isFinite(Date.parse(p.time)))?.time;
  const replay = start && total > 0 ? normalizeRouteReplay(valid.flatMap((p, i) => {
    const elapsedSec = p.time ? (Date.parse(p.time) - Date.parse(start)) / 1000 : NaN;
    if (!Number.isFinite(elapsedSec) || elapsedSec < 0) return [];
    const dt = i > 0 && valid[i-1].time ? (Date.parse(p.time!) - Date.parse(valid[i-1].time!)) / 1000 : 0;
    const derivedSpeed = dt > 0 && dt <= 30 ? (distances[i] - distances[i-1]) / dt : undefined;
    return [{ progress: distances[i] / total, elapsedSec, speedMps: p.speedMps ?? derivedSpeed, heartRate: p.heartRate,
      cadence: p.cadence, cadenceUnit: p.cadenceUnit }];
  })) : [];
  return {
    detailedPolyline: encodePolyline(coordinates),
    routeReplay: replay.length ? replay : undefined,
    summaryPolyline: encodePolyline(simplifyCoordinates(coordinates, { tolerance: 0.00003, highQuality: true })),
    routeBounds: calculateRouteBounds(coordinates),
    elevationGainM: hasElevation ? Math.round(elevationGainM) : null,
  };
}

function summarizeTrack(
  points: TrackPoint[],
  sport: CategorySlug,
  name: string,
  provider: FitnessProviderId,
): ActivitySample | null {
  points = points.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180);
  if (points.length < 2) return null;
  let distance = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const next = points[i]!;
    distance += haversine(prev.lat, prev.lon, next.lat, next.lon);
  }
  const times = points
    .map((point) => (point.time ? new Date(point.time).getTime() : NaN))
    .filter((value) => !Number.isNaN(value));
  const started = times.length ? new Date(Math.min(...times)) : new Date();
  const movingSec = times.length
    ? Math.max(1, Math.round((Math.max(...times) - Math.min(...times)) / 1000))
    : 0;
  const externalId = `file-${started.toISOString()}:${Math.round(distance)}:${movingSec}`;
  const gps = sport !== "strength";
  return {
    id: `${provider}-${externalId}`,
    provider,
    externalId,
    categorySlug: sport,
    startedAt: started.toISOString(),
    metricValue: gps ? Math.round(distance) : movingSec,
    movingSec,
    avgHr: null,
    rawName: name,
    ...(gps ? routeMetadata(points, sport) : {}),
  };
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function tagText(block: string, tag: string): string | null {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  return match?.[1] ? decodeXml(match[1].trim()) : null;
}

function extensionNumber(block: string, tag: string): number | undefined {
  const match = new RegExp(`<(?:[\\w-]+:)?${tag}\\b[^>]*>([^<]+)</(?:[\\w-]+:)?${tag}>`, "i").exec(block);
  const number = match ? Number(match[1]) : NaN;
  return Number.isFinite(number) ? number : undefined;
}
function pointMetrics(block: string, sport: CategorySlug, tcx = false): Partial<TrackPoint> {
  const rawCadence = !tcx && sport !== "cycling" ? undefined : extensionNumber(block, tcx && sport !== "cycling" ? "RunCadence" : tcx ? "Cadence" : "cad");
  const heartBlock = tagText(block, "HeartRateBpm");
  return { speedMps: extensionNumber(block, "speed"),
    heartRate: tcx ? (heartBlock ? extensionNumber(heartBlock, "Value") : undefined) : extensionNumber(block, "hr"),
    cadence: rawCadence == null ? undefined : rawCadence * (sport === "cycling" ? 1 : 2),
    cadenceUnit: sport === "cycling" ? "rpm" : "spm" };
}

export function parseGpx(xml: string, provider: FitnessProviderId): ActivitySample[] {
  const tracks = xml.split(/<trk\b/i).slice(1);
  const chunks = tracks.length ? tracks : [xml];
  const activities: ActivitySample[] = [];
  for (const chunk of chunks) {
    const name = tagText(chunk, "name") ?? "GPX activity";
    const type = tagText(chunk, "type") ?? name;
    const sport = mapSportToCategory(type) ?? "running";
    const points: TrackPoint[] = [];
    const pattern = /<trkpt\b([^>]*?)(?:\/\s*>|>([\s\S]*?)<\/trkpt>)/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(chunk))) {
      const attrs = match[1] ?? "";
      const lat = /lat=["']([^"']+)["']/i.exec(attrs)?.[1];
      const lon = /lon=["']([^"']+)["']/i.exec(attrs)?.[1];
      if (!lat || !lon) continue;
      points.push({
        ...pointMetrics(match[2] ?? "", sport),
        lat: Number(lat),
        lon: Number(lon),
        time: tagText(match[2] ?? "", "time") ?? undefined,
        elevation: tagText(match[2] ?? "", "ele") == null ? undefined : Number(tagText(match[2] ?? "", "ele")),
      });
    }
    const sample = summarizeTrack(points, sport, name, provider);
    if (sample) activities.push(sample);
  }
  return activities;
}

export function parseTcx(xml: string, provider: FitnessProviderId): ActivitySample[] {
  const blocks = xml.split(/<Activity\b/i).slice(1);
  const activities: ActivitySample[] = [];
  for (const block of blocks) {
    const sportAttr = /Sport="([^"]+)"/i.exec(block)?.[1] ?? "";
    const sport = mapSportToCategory(sportAttr);
    if (!sport) continue;
    const startedAt = tagText(block, "Id") ?? "";
    const lapDistance = [...block.matchAll(/<DistanceMeters>([^<]+)<\/DistanceMeters>/gi)]
      .reduce((sum, item) => sum + Number(item[1] ?? 0), 0);
    const lapSeconds = [...block.matchAll(/<TotalTimeSeconds>([^<]+)<\/TotalTimeSeconds>/gi)]
      .reduce((sum, item) => sum + Number(item[1] ?? 0), 0);
    const hrValues = [...block.matchAll(/<HeartRateBpm>\s*<Value>([^<]+)<\/Value>/gi)].map(
      (item) => Number(item[1]),
    );
    const avgHr = hrValues.length
      ? Math.round(hrValues.reduce((sum, value) => sum + value, 0) / hrValues.length)
      : null;
    const start = new Date(startedAt);
    if (Number.isNaN(start.getTime())) continue;
    const movingSec = Math.max(0, Math.round(lapSeconds));
    const distance = Math.max(0, Math.round(lapDistance));
    const externalId = `file-${start.toISOString()}:${distance}:${movingSec}`;
    const gps = sport !== "strength";
    const points: TrackPoint[] = [...block.matchAll(/<Trackpoint\b[^>]*>([\s\S]*?)<\/Trackpoint>/gi)].flatMap(match => {
      const lat = tagText(match[1], "LatitudeDegrees"), lon = tagText(match[1], "LongitudeDegrees");
      return lat == null || lon == null ? [] : [{ ...pointMetrics(match[1], sport, true), lat: Number(lat), lon: Number(lon), time: tagText(match[1], "Time") ?? undefined, elevation: tagText(match[1], "AltitudeMeters") == null ? undefined : Number(tagText(match[1], "AltitudeMeters")) }];
    });
    activities.push({
      id: `${provider}-${externalId}`,
      provider,
      externalId,
      categorySlug: sport,
      startedAt: start.toISOString(),
      metricValue: gps ? distance : movingSec,
      movingSec,
      avgHr,
      rawName: sportAttr || sport,
      ...(gps ? routeMetadata(points, sport) : {}),
    });
  }
  return activities;
}

function readUInt(view: DataView, offset: number, size: number, little: boolean): number {
  if (size === 1) return view.getUint8(offset);
  if (size === 2) return little ? view.getUint16(offset, true) : view.getUint16(offset, false);
  if (size === 4) return little ? view.getUint32(offset, true) : view.getUint32(offset, false);
  return 0;
}

const FIT_SPORT: Record<number, CategorySlug | null> = {
  1: "running",
  2: "cycling",
  4: "strength",
  10: "strength",
  11: "walking",
  17: "walking",
};

interface FitSession {
  sport?: number;
  start?: number;
  timer?: number;
  distance?: number;
  hr?: number;
  end?: number;
}

/** Parse session messages from a FIT activity file. */
export function parseFit(bytes: Uint8Array, provider: FitnessProviderId): ActivitySample[] {
  if (bytes.length < 12) return [];
  const headerSize = bytes[0] ?? 0;
  if (headerSize < 12 || bytes.length < headerSize + 4) return [];
  const signature = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
  if (signature !== ".FIT") return [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dataSize = view.getUint32(4, true);
  const end = Math.min(bytes.length, headerSize + dataSize);
  let offset = headerSize;
  const definitions = new Map<
    number,
    { little: boolean; global: number; fields: { num: number; size: number }[]; devSize: number }
  >();
  const sessions: FitSession[] = [];
  const records: TrackPoint[] = [];
  let lastTimestamp: number | undefined;

  while (offset < end) {
    const header = bytes[offset];
    if (header == null) break;
    offset += 1;
    const compressed = (header & 0x80) !== 0;
    const local = compressed ? (header >> 5) & 0x03 : header & 0x0f;
    if (!compressed && (header & 0x40) !== 0) {
      if (offset + 5 > end) break;
      offset += 1;
      const little = bytes[offset] === 0;
      offset += 1;
      const global = little ? view.getUint16(offset, true) : view.getUint16(offset, false);
      offset += 2;
      const count = bytes[offset] ?? 0;
      offset += 1;
      const fields: { num: number; size: number }[] = [];
      for (let i = 0; i < count; i += 1) {
        if (offset + 3 > end) break;
        fields.push({ num: bytes[offset]!, size: bytes[offset + 1]! });
        offset += 3;
      }
      let devSize = 0;
      if ((header & 0x20) !== 0 && offset < end) {
        const devCount = bytes[offset] ?? 0;
        offset += 1;
        for (let i = 0; i < devCount; i += 1) {
          if (offset + 3 > end) break;
          devSize += bytes[offset + 1] ?? 0;
          offset += 3;
        }
      }
      definitions.set(local, { little, global, fields, devSize });
      continue;
    }
    const definition = definitions.get(local);
    if (!definition) break;
    const session: FitSession = {};
    const record: { lat?: number; lon?: number; elevation?: number; speedMps?: number; heartRate?: number; cadence?: number; fractionalCadence?: number; timestamp?: number } = {};
    if (compressed && lastTimestamp != null) {
      const timeOffset = header & 0x1f;
      record.timestamp = (lastTimestamp & ~0x1f) + timeOffset + (timeOffset < (lastTimestamp & 0x1f) ? 32 : 0);
    }
    for (const field of definition.fields) {
      if (compressed && field.num === 253 && field.size === 4) continue;
      if (offset + field.size > end) {
        offset = end;
        break;
      }
      const value =
        field.size <= 4 ? readUInt(view, offset, field.size, definition.little) : 0;
      if (field.num === 253 && field.size === 4 && value !== 0xffffffff) record.timestamp = value;
      if (definition.global === 20) {
        if ((field.num === 0 || field.num === 1) && field.size === 4 && value !== 0x7fffffff) {
          const degrees = view.getInt32(offset, definition.little) * (180 / 2147483648);
          if (field.num === 0) record.lat = degrees;
          else record.lon = degrees;
        }
        if (field.num === 3 && field.size === 1 && value !== 255) record.heartRate = value;
        if (field.num === 53 && field.size === 1 && value !== 255) record.fractionalCadence = value / 128;
        if (field.num === 4 && field.size === 1 && value !== 255) record.cadence = value;
        if (field.num === 6 && field.size === 2 && value !== 65535) record.speedMps = value / 1000;
        if (field.num === 73 && field.size === 4 && value !== 0xffffffff) record.speedMps = value / 1000;
        if (field.num === 2 && field.size === 2 && value !== 0xffff) record.elevation = value / 5 - 500;
        if (field.num === 78 && field.size === 4 && value !== 0xffffffff) record.elevation = value / 5 - 500;
      }
      if (definition.global === 18) {
        if (field.num === 5 && field.size === 1) session.sport = value;
        if (field.num === 2 && field.size === 4) session.start = value;
        if (field.num === 8 && field.size === 4) session.timer = value;
        if (field.num === 9 && field.size === 4) session.distance = value;
        if (field.num === 16 && field.size === 1) session.hr = value;
      }
      offset += field.size;
    }
    if (definition.devSize) offset += definition.devSize;
    if (record.timestamp != null) lastTimestamp = record.timestamp;
    if (definition.global === 18 && session.start != null) sessions.push({ ...session, end: record.timestamp });
    if (definition.global === 20 && record.lat != null && record.lon != null) records.push({ speedMps: record.speedMps, heartRate: record.heartRate, cadence: record.cadence == null ? undefined : record.cadence + (record.fractionalCadence ?? 0), lat: record.lat, lon: record.lon, elevation: record.elevation, time: record.timestamp == null ? undefined : new Date(FIT_EPOCH_MS + record.timestamp * 1000).toISOString() });
  }

  return sessions.flatMap((session, index) => {
    const sport = FIT_SPORT[session.sport ?? -1] ?? null;
    if (!sport || session.start == null) return [];
    const started = new Date(FIT_EPOCH_MS + session.start * 1000);
    const movingSec = Math.max(0, Math.round((session.timer ?? 0) / 1000));
    const distance = Math.max(0, Math.round((session.distance ?? 0) / 100));
    const externalId = `fit:${session.start}:${distance}:${movingSec}`;
    const gps = sport !== "strength";
    const sample: ActivitySample = {
      id: `${provider}-${externalId}`,
      provider,
      externalId,
      categorySlug: sport,
      startedAt: started.toISOString(),
      metricValue: gps ? distance : movingSec,
      movingSec,
      avgHr: session.hr ?? null,
      rawName: sport,
      ...(gps ? routeMetadata(records.map(p => ({ ...p, cadence: p.cadence == null ? undefined : p.cadence * (sport === "cycling" ? 1 : 2), cadenceUnit: sport === "cycling" ? "rpm" as const : "spm" as const })).filter(p => {
        if (!p.time) return sessions.length === 1;
        const at = (Date.parse(p.time) - FIT_EPOCH_MS) / 1000;
        return at >= session.start! && at <= (session.end ?? sessions[index + 1]?.start ?? Infinity);
      }), sport) : {}),
    };
    return [sample];
  });
}

export function parseActivityFile(
  filename: string,
  bytes: Uint8Array,
  provider: FitnessProviderId = "garmin",
): ParsedActivityFile {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".fit")) {
    return { format: "fit", activities: parseFit(bytes, provider) };
  }
  const text = new TextDecoder().decode(bytes);
  if (lower.endsWith(".gpx") || text.includes("<gpx")) {
    return { format: "gpx", activities: parseGpx(text, provider) };
  }
  if (lower.endsWith(".tcx") || text.includes("<TrainingCenterDatabase")) {
    return { format: "tcx", activities: parseTcx(text, provider) };
  }
  throw new Error("unsupported_activity_file");
}
