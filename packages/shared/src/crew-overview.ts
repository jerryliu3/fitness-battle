import { APP_TIMEZONE, weeklyPeriodBounds } from "./period";
import { crewWeekRelay, type CrewWeekRelayInput } from "./compete/crew-relay";
import { formatCrewRelayVolume } from "./crew-relay-presentation";
import type { CrewActivityPage } from "./crew-activity";
import { distanceUnitLabel, formatDistanceM } from "./compete/engine";
import type { SportId, UnitSystem } from "./compete/sports";

export type CrewOverviewInput = Omit<CrewWeekRelayInput, "entries"> & {
  entries: (CrewWeekRelayInput["entries"][number] & { started_at: string })[];
  units?: UnitSystem;
  now: string;
  replayEntries?: CrewOverviewInput["entries"];
};

export function crewLineup<T extends { user_id: string; display_name: string }>(members: readonly T[], entries: CrewOverviewInput["entries"], sport: string) {
  const totals = new Map<string, number>();
  for (const e of entries) totals.set(e.user_id, (totals.get(e.user_id) ?? 0) + (sport === "strength" ? Number(e.session_count ?? 1) : Number(e.distance_m)));
  return members.slice().sort((a, b) => (totals.get(b.user_id) ?? 0) - (totals.get(a.user_id) ?? 0) || a.display_name.localeCompare(b.display_name) || a.user_id.localeCompare(b.user_id));
}

/** Chronological activity events; equal timestamps still replay one event at a time. */
export function crewReplayEvents(input: CrewOverviewInput, entries: CrewOverviewInput["entries"]) {
  const week = weeklyPeriodBounds(new Date(input.now));
  const members = new Set(input.members.map(m => m.user_id));
  return entries.filter(e => {
    const at = Date.parse(e.started_at);
    return members.has(e.user_id) && at >= week.startsAt.getTime() && at < week.endsAt.getTime() && at <= Date.parse(input.now);
  }).slice().sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at) || a.user_id.localeCompare(b.user_id));
}

/** Fractional event cursors are display-only, matching competition replay. */
export function crewOverview(input: CrewOverviewInput, progress = 1, events: CrewOverviewInput["entries"] = []) {
  const cursor = Math.max(0, Math.min(1, progress)) * events.length;
  const step = Math.floor(cursor), fraction = cursor - step;
  const entries = progress >= 1 ? input.entries : events.slice(0, step + (fraction > 0 ? 1 : 0)).map((e, i) => {
    const weight = i < step ? 1 : fraction;
    return { ...e, distance_m: e.distance_m * weight, moving_sec: e.moving_sec * weight, session_count: (e.session_count ?? 1) * weight };
  });
  const relay = crewWeekRelay({ ...input, entries });
  const full = crewWeekRelay(input);
  const scale = Math.max(1, full.model.total, full.target ?? 0) * 1.2;
  let offset = 0;
  const partial = new Map(relay.model.segments.map(s => [s.id, s]));
  // Keep scale, avatar positions and teammate colors stable while a block grows.
  relay.model = { ...relay.model, finish: full.model.finish, segments: full.model.segments.map(s => {
    const row = partial.get(s.id), value = row?.value ?? 0, start = offset / scale;
    offset += value;
    return { ...s, value, sessions: row?.sessions ?? 0, start, fraction: value / scale, share: relay.model.total ? value / relay.model.total : 0 };
  }) };
  const volume = (value: number) => formatCrewRelayVolume(relay.sessions, input.sport as SportId, relay.sessions ? Math.floor(value + 1e-9) : value, input.units);
  const contributors = full.model.segments.filter(s => s.value > 0).length;
  const complete = full.target != null && full.model.total >= full.target;
  const fullCrew = input.members.length > 0 && contributors === input.members.length;
  const lineup = crewLineup(input.members, input.entries, input.sport);
  const event = events[Math.min(events.length - 1, step)];
  const replayLabel = progress >= 1 ? "Now" : progress <= 0 ? "Start" : event ? new Date(event.started_at).toLocaleDateString("en-US", { weekday: "short", timeZone: APP_TIMEZONE }) : "Start";
  return { relay, entries, volume, contributors, complete, fullCrew, lineup, replayLabel,
    reading: relay.sessions ? String(Math.floor(relay.model.total + 1e-9)) : formatDistanceM(relay.model.total, input.units),
    targetReading: relay.target == null ? null : relay.sessions ? String(relay.target) : formatDistanceM(relay.target, input.units),
    unit: relay.sessions ? "sessions" : distanceUnitLabel(input.units),
    highlights: [complete ? "Shared target reached" : null, fullCrew ? "Every teammate contributed" : null].filter((s): s is string => s !== null),
  };
}

/** Exhaust the existing scoped activity reader so replay is never a partial week. */
export async function readCrewReplay(read: (cursor: CrewActivityPage["next"]) => Promise<CrewActivityPage>, sport: string) {
  const entries: CrewOverviewInput["entries"] = [];
  let cursor: CrewActivityPage["next"] = null;
  do {
    const page = await read(cursor);
    entries.push(...page.activities.filter(a => a.sport === sport).map(a => ({ user_id: a.userId, distance_m: a.distanceM, moving_sec: a.movingSec, started_at: a.startedAt })));
    cursor = page.next;
  } while (cursor);
  return entries;
}
