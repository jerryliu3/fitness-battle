import { APP_TIMEZONE, dayKey, weeklyPeriodBounds } from "./period";
import { crewWeekRelay, type CrewWeekRelayInput } from "./compete/crew-relay";
import { formatCrewRelayVolume } from "./crew-relay-presentation";
import type { CrewActivityPage } from "./crew-activity";
import { distanceUnitLabel, formatDistanceM } from "./compete/engine";
import type { SportId, UnitSystem } from "./compete/sports";

export type CrewOverviewInput = CrewWeekRelayInput & {
  entries: (CrewWeekRelayInput["entries"][number] & { started_at: string })[];
  units?: UnitSystem;
  now: string;
  replayEntries?: CrewOverviewInput["entries"];
};

/** Presentation only: replay uses recorded Eastern days, never interpolated credit. */
export function crewOverview(input: CrewOverviewInput, frame = 7) {
  const start = weeklyPeriodBounds(new Date(input.now)).startsAt;
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start.getTime() + (i * 24 + 12) * 3600000);
    return dayKey(date, APP_TIMEZONE);
  });
  const lastFrame = days.indexOf(dayKey(new Date(input.now), APP_TIMEZONE)) + 1;
  const entries = frame >= lastFrame ? input.entries : (input.replayEntries ?? []).filter(e => days.slice(0, frame).includes(dayKey(new Date(e.started_at), APP_TIMEZONE)));
  const relay = crewWeekRelay({ ...input, entries });
  const full = crewWeekRelay(input);
  const volume = (value: number) => formatCrewRelayVolume(relay.sessions, input.sport as SportId, value, input.units);
  const contributors = full.model.segments.filter(s => s.value > 0).length;
  const complete = full.target != null && full.model.total >= full.target;
  const fullCrew = input.members.length > 0 && contributors === input.members.length;
  return { relay, entries, volume, contributors, complete, fullCrew, lastFrame,
    reading: relay.sessions ? String(relay.model.total) : formatDistanceM(relay.model.total, input.units),
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
