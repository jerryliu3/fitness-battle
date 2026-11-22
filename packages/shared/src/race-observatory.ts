import { RACE_DISTANCES, type RaceEditionAnalytics } from "./race-rankings";
import type { RaceSplitAnalysis } from "./race-splits";

export type ObservatorySportId = "running" | "ironman" | "hyrox" | "cycling";

export const OBSERVATORY_SPORTS: Array<{
  id: ObservatorySportId;
  label: string;
  formats: Array<{ value: string; label: string }>;
}> = [
  {
    id: "running",
    label: "Running",
    formats: [...RACE_DISTANCES].reverse().map(d => ({ value: d.slug, label: d.label })),
  },
  {
    id: "ironman",
    label: "Ironman",
    formats: [
      { value: "full-140-6", label: "Full 140.6" },
      { value: "half-70-3", label: "70.3 Half" },
    ],
  },
  {
    id: "hyrox",
    label: "Hyrox",
    formats: [
      { value: "open", label: "Open" },
      { value: "pro", label: "Pro" },
      { value: "doubles", label: "Doubles" },
    ],
  },
  {
    id: "cycling",
    label: "Cycling",
    formats: [
      { value: "gran-fondo", label: "Gran Fondo" },
      { value: "100k", label: "100K" },
      { value: "tt", label: "Time Trial" },
    ],
  },
];

export const OBSERVATORY_OVERLAY_COLORS = ["#637482", "#142b3b", "#24765c"] as const;

export function formatEditionDisplay(eventName: string, year: number): string {
  const trimmed = eventName.trim();
  return trimmed.includes(String(year)) ? trimmed : `${trimmed} ${year}`;
}

export function inferEditionDate(eventName: string, year: number): string {
  const lower = eventName.toLowerCase();
  if (lower.includes("boston")) return `Apr 21, ${year}`;
  if (lower.includes("london")) return `Apr 27, ${year}`;
  if (lower.includes("eesti")) return `Sep 7, ${year}`;
  if (lower.includes("berlin")) return `Sep 21, ${year}`;
  if (lower.includes("chicago")) return `Oct 12, ${year}`;
  return String(year);
}

export function cityCodeForEvent(eventName: string): string {
  const lower = eventName.toLowerCase();
  if (lower.includes("chicago")) return "CHICAGO";
  if (lower.includes("berlin")) return "BERLIN";
  if (lower.includes("london")) return "LONDON";
  if (lower.includes("boston")) return "BOSTON";
  if (lower.includes("eesti")) return "TALLINN";
  return eventName.replace(/\b20\d\d\b/g, "").trim().split(/\s+/).slice(0, 2).join(" ").toUpperCase();
}

export function gaussianSmooth(values: number[]): number[] {
  return values.map((_, i) => {
    let sum = 0;
    let weightSum = 0;
    for (let k = -2; k <= 2; k++) {
      const idx = Math.max(0, Math.min(values.length - 1, i + k));
      const w = Math.exp((-0.5 * k * k) / 1.8);
      sum += values[idx] * w;
      weightSum += w;
    }
    return weightSum > 0 ? sum / weightSum : 0;
  });
}

export function catmullRomPath(points: [number, number][]): string {
  if (!points.length) return "";
  if (points.length === 1) return `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  let out = `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    out += ` C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return out;
}

export function estimateAtTimeMs(analytics: RaceEditionAnalytics | null | undefined, targetMs: number) {
  if (!analytics || !analytics.bins.length || analytics.total <= 0) return null;
  const binMap = new Map(analytics.bins.map(b => [b.bucket, b.count]));
  const maxBucket = Math.max(...analytics.bins.map(b => b.bucket), 0);
  let fasterCount = 0;
  for (let b = 0; b <= maxBucket; b++) {
    const count = binMap.get(b) ?? 0;
    if (!count) continue;
    const binStart = analytics.minimumMs + b * analytics.binWidthMs;
    const binEnd = binStart + analytics.binWidthMs;
    if (targetMs >= binEnd) {
      fasterCount += count;
    } else if (targetMs > binStart) {
      fasterCount += count * ((targetMs - binStart) / Math.max(1, analytics.binWidthMs));
    }
  }
  const rank = Math.max(1, Math.min(analytics.total, Math.round(fasterCount) + 1));
  const fasterThan = Math.max(0, Math.min(100, ((analytics.total - fasterCount) / analytics.total) * 100));
  const bucket = Math.max(0, Math.min(maxBucket, Math.floor((targetMs - analytics.minimumMs) / Math.max(1, analytics.binWidthMs))));
  return { rank, fasterThan, total: analytics.total, bucket };
}

export function computeSplitMetrics(analysis: Extract<RaceSplitAnalysis, { status: "ready" }>, finishMs: number) {
  let pct: number | null = null;
  if (analysis.halfDeltaMs !== null && finishMs > 0) {
    const firstHalfMs = (finishMs - analysis.halfDeltaMs) / 2;
    if (firstHalfMs > 0) pct = (analysis.halfDeltaMs / firstHalfMs) * 100;
  } else {
    const validPaces = analysis.rows
      .map(r => r.paceMsPerKm)
      .filter((p): p is number => p !== null && Number.isFinite(p) && p > 0);
    if (validPaces.length >= 2) {
      const mid = Math.floor(validPaces.length / 2);
      const firstAvg = validPaces.slice(0, mid).reduce((a, b) => a + b, 0) / Math.max(1, mid);
      const secondAvg = validPaces.slice(mid).reduce((a, b) => a + b, 0) / Math.max(1, validPaces.length - mid);
      if (firstAvg > 0) pct = ((secondAvg - firstAvg) / firstAvg) * 100;
    }
  }

  if (pct === null || !Number.isFinite(pct)) {
    return { stroke: "#C88A00", badge: null as string | null, tone: "even" as const };
  }
  if (pct < -0.15) {
    return { stroke: "#16a34a", badge: `${pct.toFixed(1)}%`, tone: "negative" as const };
  }
  if (pct > 0.15) {
    return { stroke: "#dc2626", badge: `+${pct.toFixed(1)}%`, tone: "positive" as const };
  }
  return { stroke: "#C88A00", badge: "0.0%", tone: "even" as const };
}

export function projectCourseOutline(
  coursePoints: [number, number][] | null | undefined,
  width = 460,
  height = 180,
  padX = 54,
  padY = 26,
) {
  if (!coursePoints || coursePoints.length < 2) return null;
  const lons = coursePoints.map(p => p[0]);
  const lats = coursePoints.map(p => p[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const midLatRad = (((minLat + maxLat) / 2) * Math.PI) / 180;
  const cosLat = Math.max(0.2, Math.cos(midLatRad));
  const spanX = Math.max(1e-6, (maxLon - minLon) * cosLat);
  const spanY = Math.max(1e-6, maxLat - minLat);

  const scale = Math.min((width - padX * 2) / spanX, (height - padY * 2) / spanY);
  const drawW = spanX * scale;
  const drawH = spanY * scale;
  const offsetX = (width - drawW) / 2;
  const offsetY = (height - drawH) / 2;

  const pts: [number, number][] = coursePoints.map(([lon, lat]) => [
    offsetX + (lon - minLon) * cosLat * scale,
    offsetY + (maxLat - lat) * scale,
  ]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return { path, start: pts[0], end: pts[pts.length - 1] };
}
