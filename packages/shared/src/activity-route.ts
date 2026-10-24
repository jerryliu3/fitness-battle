import type { Activity } from "./compete/sports";
import { decodePolyline, encodePolyline, type LngLat } from "./routeGeoUtils";

/** Select actual usable GPS geometry, falling back to the summary if needed. */
export function activityRoute(activity?: Pick<Activity, "summaryPolyline" | "detailedPolyline">): LngLat[] | null {
  for (const encoded of [activity?.detailedPolyline, activity?.summaryPolyline]) {
    if (!encoded) continue;
    const points = decodePolyline(encoded);
    // Reject truncated or malformed encoded pairs instead of drawing invented points.
    if (encodePolyline(points) !== encoded) continue;
    if (points.length >= 2 && points.every(([lng, lat]) =>
      Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 85.051129,
    ) && points.some(([lng, lat]) => lng !== points[0][0] || lat !== points[0][1])) return points;
  }
  return null;
}
