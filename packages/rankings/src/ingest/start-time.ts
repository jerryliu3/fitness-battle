import type { CompetitionClass } from "./competition-class";

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

/** Parse a wall-clock time string (`07:30:01`, `07:43:59AM`, `11:30:15 PM`) to seconds since midnight. */
export function parseWallClockSeconds(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase();
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/.exec(cleaned);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] != null ? Number(match[3]) : 0;
  const meridiem = match[4] ?? null;
  if (minutes > 59 || seconds > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "AM" && hours === 12) hours = 0;
    else if (meridiem === "PM" && hours !== 12) hours += 12;
  } else if (hours > 23) {
    return null;
  }
  return hours * 3600 + minutes * 60 + seconds;
}

function tzOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcMs));
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour === 24 ? 0 : map.hour,
    map.minute,
    map.second,
  );
  return asUtc - utcMs;
}

/**
 * Convert an edition local date (`YYYY-MM-DD`) and local wall-clock time (`HH:MM:SS` or seconds since midnight)
 * in an IANA timezone to a UTC ISO-8601 timestamp string.
 */
export function localWallClockToIso(
  startsOn: string,
  timeTextOrSeconds: string | number,
  timeZone: string,
): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startsOn.trim());
  if (!dateMatch) return null;
  const secs =
    typeof timeTextOrSeconds === "number"
      ? Math.round(timeTextOrSeconds)
      : parseWallClockSeconds(timeTextOrSeconds);
  if (secs == null || !Number.isFinite(secs) || secs < 0 || secs >= 86_400) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const naiveUtcMs = Date.UTC(year, month - 1, day, hours, minutes, seconds);

  // Two-pass offset refinement handles DST transitions cleanly.
  const offset1 = tzOffsetMs(naiveUtcMs, timeZone);
  const guess1 = naiveUtcMs - offset1;
  const offset2 = tzOffsetMs(guess1, timeZone);
  return new Date(naiveUtcMs - offset2).toISOString();
}

export type NyrrStartAtInput = {
  startsOn: string;
  timeZone?: string;
  chipTimeMs: number | null;
  gunTimeMs: number | null;
  bib?: string | null;
  sex?: string;
  competitionClass?: CompetitionClass;
  wave1StartLocal?: string;
  proMenStartLocal?: string;
  proWomenStartLocal?: string;
  wheelchairStartLocal?: string;
};

/**
 * Derive an athlete's actual wall-clock start timestamp for NYRR's NYC Marathon from
 * `gunTime - chipTime` plus the official division/wave gun anchor.
 */
export function deriveNyrrStartAtIso(input: NyrrStartAtInput): string | null {
  if (input.chipTimeMs == null || input.gunTimeMs == null) return null;
  const offsetMs = input.gunTimeMs - input.chipTimeMs;
  if (!Number.isFinite(offsetMs) || offsetMs < 0 || offsetMs > 5 * 3_600_000) return null;

  const tz = input.timeZone ?? "America/New_York";
  const bibNum = input.bib && /^\d+$/.test(input.bib.trim()) ? Number(input.bib.trim()) : null;

  let anchorLocal = input.wave1StartLocal ?? "09:10:00";
  if (input.competitionClass === "wheelchair") {
    anchorLocal = input.wheelchairStartLocal ?? "08:00:00";
  } else if (offsetMs < 120_000 && bibNum != null) {
    if (input.sex === "female" && bibNum >= 100 && bibNum <= 199) {
      anchorLocal = input.proWomenStartLocal ?? "08:35:00";
    } else if (input.sex === "male" && bibNum >= 1 && bibNum <= 99) {
      anchorLocal = input.proMenStartLocal ?? "09:05:00";
    }
  }

  const anchorIso = localWallClockToIso(input.startsOn, anchorLocal, tz);
  if (!anchorIso) return null;
  return new Date(Date.parse(anchorIso) + offsetMs).toISOString();
}

export type GunOffsetBackfillTarget = {
  sourceSlug: string;
  externalEventId: string;
  editionYear: number;
  distance: string;
  /** First-gun timestamp with timezone offset or UTC (e.g. `2026-07-26T05:15:00-07:00`). */
  gunStartIso: string;
};

/** SQL backfill deriving `performances.start_at` from stored `gun_time_ms - chip_time_ms`. */
export function gunOffsetBackfillSql(target: GunOffsetBackfillTarget): string {
  return `
do $$
declare
  target_edition_id bigint;
begin
  select ed.id into target_edition_id
  from public.event_editions ed
  join public.events e on e.id = ed.event_id
  join public.sources s on s.id = e.source_id
  where s.slug = ${quote(target.sourceSlug)}
    and e.external_event_id = ${quote(target.externalEventId)}
    and ed.edition_year = ${target.editionYear}
  limit 1;

  if target_edition_id is null then
    raise exception ${quote(`Edition not found for ${target.sourceSlug} ${target.editionYear}`)};
  end if;

  update public.performances p
  set start_at = ${quote(target.gunStartIso)}::timestamptz
    + make_interval(secs => (p.gun_time_ms - p.chip_time_ms)::numeric / 1000.0)
  where p.event_edition_id = target_edition_id
    and p.distance_slug = ${quote(target.distance)}
    and p.chip_time_ms is not null
    and p.gun_time_ms is not null
    and p.gun_time_ms >= p.chip_time_ms
    and (p.gun_time_ms - p.chip_time_ms) <= 18000000;
end;
$$;
`.trim();
}

export type PerformanceStartTimeRow = {
  externalResultId: string;
  gunTimeMs?: number | null;
  startAt: string;
};

/** Batch SQL update for setting `performances.start_at` (and optionally `gun_time_ms`) by external result id. */
export function performanceStartTimesUpdateSql(
  target: { sourceSlug: string; externalEventId: string; editionYear: number; distance: string },
  rows: PerformanceStartTimeRow[],
): string {
  const values = rows
    .map((row) => {
      const gunSql = row.gunTimeMs != null ? `${Math.round(row.gunTimeMs)}::bigint` : "null::bigint";
      return `(${quote(row.externalResultId)}, ${gunSql}, ${quote(row.startAt)}::timestamptz)`;
    })
    .join(",\n    ");

  return `
do $$
declare
  target_edition_id bigint;
begin
  select ed.id into target_edition_id
  from public.event_editions ed
  join public.events e on e.id = ed.event_id
  join public.sources s on s.id = e.source_id
  where s.slug = ${quote(target.sourceSlug)}
    and e.external_event_id = ${quote(target.externalEventId)}
    and ed.edition_year = ${target.editionYear}
  limit 1;

  if target_edition_id is null then
    raise exception ${quote(`Edition not found for ${target.sourceSlug} ${target.editionYear}`)};
  end if;

  update public.performances p
  set
    gun_time_ms = coalesce(v.gun_time_ms, p.gun_time_ms),
    start_at = v.start_at
  from (values
    ${values}
  ) as v(external_result_id, gun_time_ms, start_at)
  join public.source_records sr
    on sr.external_result_id = v.external_result_id
    and sr.event_edition_id = target_edition_id
  where p.source_record_id = sr.id
    and p.event_edition_id = target_edition_id
    and p.distance_slug = ${quote(target.distance)};
end;
$$;
`.trim();
}
