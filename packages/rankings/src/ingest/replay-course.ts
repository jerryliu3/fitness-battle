import type { RoadDistance } from "../fingerprint";

export type ReplayCoursePoint = readonly [longitude: number, latitude: number, metres: number];

export const REPLAY_DISTANCE_METRES: Record<RoadDistance, number> = {
  "5k": 5000,
  "10k": 10000,
  half_marathon: 21097.5,
  marathon: 42195,
};

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radius = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a1 = (lat1 * Math.PI) / 180;
  const a2 = (lat2 * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a1) * Math.cos(a2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function parseGpxTrkpts(xml: string): { lat: number; lon: number }[] {
  const points: { lat: number; lon: number }[] = [];
  for (const match of xml.matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/gi)) {
    const lat = Number(match[1]);
    const lon = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    points.push({ lat, lon });
  }
  return points;
}

export function parseMapMyRunRouteHtml(html: string): {
  name: string;
  distanceM: number;
  points: { lat: number; lon: number; metres: number }[];
} {
  const marker = html.indexOf("window.__STATE__");
  if (marker === -1) throw new Error("MapMyRun page missing __STATE__.");
  const start = html.indexOf("{", marker);
  const end = html.indexOf("window.__APP_VERSION__", start);
  if (start === -1 || end === -1) throw new Error("MapMyRun __STATE__ block not found.");
  const jsonText = html.slice(start, end).trim().replace(/;\s*$/, "");
  const state = JSON.parse(jsonText) as {
    routes?: { route?: { name?: string; distance?: number; points?: { lat: number; lng: number; dis?: number }[] } };
  };
  const route = state.routes?.route;
  const raw = route?.points;
  if (!route?.name || !Array.isArray(raw) || raw.length < 2) {
    throw new Error("MapMyRun route payload missing points.");
  }
  const points = raw
    .map((row) => ({
      lat: row.lat,
      lon: row.lng,
      metres: typeof row.dis === "number" && Number.isFinite(row.dis) ? row.dis : NaN,
    }))
  .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lon));
  if (points.length < 2) throw new Error("MapMyRun route has too few coordinates.");
  let cumulative = 0;
  for (let i = 0; i < points.length; i += 1) {
    if (i === 0) {
      points[i] = { ...points[i], metres: 0 };
      continue;
    }
    if (!Number.isFinite(points[i].metres)) {
      cumulative += haversineM(
        points[i - 1].lat,
        points[i - 1].lon,
        points[i].lat,
        points[i].lon,
      );
      points[i] = { ...points[i], metres: cumulative };
    } else {
      cumulative = points[i].metres;
    }
  }
  return {
    name: route.name,
    distanceM: route.distance ?? cumulative,
    points,
  };
}

/** Normalise lat/lon track to monotonic [lon, lat, metres] ending exactly at the race distance. */
export function buildReplayCoursePoints(
  input: { lon: number; lat: number; metres?: number }[],
  distance: RoadDistance,
): ReplayCoursePoint[] {
  const target = REPLAY_DISTANCE_METRES[distance];
  if (input.length < 2) throw new Error("Course needs at least two points.");
  const raw: { lon: number; lat: number; metres: number }[] = [];
  let cumulative = 0;
  for (let i = 0; i < input.length; i += 1) {
    const { lon, lat } = input[i]!;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) throw new Error("Invalid course coordinate.");
    if (i === 0) {
      raw.push({ lon, lat, metres: 0 });
      continue;
    }
    const prior = input[i - 1]!;
    const provided = input[i]!.metres;
    if (provided != null && Number.isFinite(provided)) {
      cumulative = provided;
    } else {
      cumulative += haversineM(prior.lat, prior.lon, lat, lon);
    }
    if (cumulative <= raw[raw.length - 1]!.metres) {
      cumulative = raw[raw.length - 1]!.metres + 0.01;
    }
    raw.push({ lon, lat, metres: cumulative });
  }
  const lastMetres = raw[raw.length - 1]!.metres;
  if (lastMetres <= 0) throw new Error("Course length is zero.");
  const scale = target / lastMetres;
  const scaled: ReplayCoursePoint[] = raw.map((row, index) => {
    const metres = index === raw.length - 1 ? target : row.metres * scale;
    return [row.lon, row.lat, metres] as const;
  });
  scaled[scaled.length - 1] = [scaled[scaled.length - 1]![0], scaled[scaled.length - 1]![1], target];
  return scaled;
}

export function replayCourseFromGpx(xml: string, distance: RoadDistance): ReplayCoursePoint[] {
  const trkpts = parseGpxTrkpts(xml);
  return buildReplayCoursePoints(
    trkpts.map((row) => ({ lon: row.lon, lat: row.lat })),
    distance,
  );
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function replayCourseImportSql(input: {
  sourceSlug: string;
  externalEventId: string;
  editionYear: number;
  distanceSlug: RoadDistance;
  points: ReplayCoursePoint[];
  sourceUrl: string;
  attribution: string;
  reviewNotes: string;
  displayAllowed?: boolean;
  reviewedAt?: string;
  /** When ledger keys differ from catalog (e.g. off-catalog finisher ingest). */
  eventEditionId?: number;
}): string {
  const payload = JSON.stringify(input.points);
  const display = input.displayAllowed ?? false;
  const reviewed = input.reviewedAt ?? new Date().toISOString();
  const editionResolve =
    typeof input.eventEditionId === "number"
      ? `select ed.id into v_edition
  from public.event_editions ed
  where ed.id = ${input.eventEditionId}
  limit 1;
  if v_edition is null then
    raise exception 'Edition not found for event_edition_id %', ${input.eventEditionId};
  end if;`
      : `select ed.id into v_edition
  from public.event_editions ed
  join public.events e on e.id = ed.event_id
  join public.sources s on s.id = e.source_id
  where s.slug = ${quote(input.sourceSlug)}
    and e.external_event_id = ${quote(input.externalEventId)}
    and ed.edition_year = ${input.editionYear}
  limit 1;
  if v_edition is null then
    raise exception 'Edition not found for % / % / %', ${quote(input.sourceSlug)}, ${quote(input.externalEventId)}, ${input.editionYear};
  end if;`;
  return `do $$
declare
  v_edition bigint;
begin
  ${editionResolve}
  insert into public.rankings_replay_courses (
    event_edition_id,
    distance_slug,
    points,
    source_url,
    attribution,
    review_notes,
    reviewed_at,
    display_allowed
  ) values (
    v_edition,
    ${quote(input.distanceSlug)},
    ${quote(payload)}::jsonb,
    ${quote(input.sourceUrl)},
    ${quote(input.attribution)},
    ${quote(input.reviewNotes)},
    ${quote(reviewed)}::timestamptz,
    ${display ? "true" : "false"}
  )
  on conflict (event_edition_id, distance_slug) do update set
    points = excluded.points,
    source_url = excluded.source_url,
    attribution = excluded.attribution,
    review_notes = excluded.review_notes,
    reviewed_at = excluded.reviewed_at,
    display_allowed = excluded.display_allowed;
end;
$$;
`;
}