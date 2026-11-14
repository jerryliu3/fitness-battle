import { APP_TIMEZONE, weeklyPeriodBounds } from "./period";
import { crewWeekRelay, type CrewWeekRelayInput } from "./compete/crew-relay";
import { formatCrewRelayVolume } from "./crew-relay-presentation";
import type { CrewActivityPage } from "./crew-activity";
import { distanceUnitLabel, formatDistanceM } from "./compete/engine";
import type { CrewContractMetric } from "./crew-passport";
import type { SportId, UnitSystem } from "./compete/sports";

export type CrewOverviewInput = Omit<CrewWeekRelayInput, "entries"> & {
  entries: (CrewWeekRelayInput["entries"][number] & { started_at: string })[];
  units?: UnitSystem;
  now: string;
  replayEntries?: CrewOverviewInput["entries"];
};

export type CrewHighlight = {
  id: string;
  icon: "trophy" | "crew";
  title: string;
  detail: string;
  at: string;
};

export function crewLineup<T extends { user_id: string; display_name: string }>(
  members: readonly T[],
  entries: CrewOverviewInput["entries"],
  sport: string,
  metric?: CrewContractMetric,
) {
  const activeMetric = metric ?? (sport === "strength" ? "sessions" : "distance_m");
  const totals = new Map<string, number>();
  for (const e of entries) {
    const add = activeMetric === "sessions"
      ? Number(e.session_count ?? 1)
      : activeMetric === "moving_sec"
        ? Number(e.moving_sec || 0)
        : activeMetric === "contributors"
          ? (Number(e.session_count ?? 1) > 0 ? 1 : 0)
          : Number(e.distance_m);
    totals.set(
      e.user_id,
      activeMetric === "contributors"
        ? Math.max(totals.get(e.user_id) ?? 0, add)
        : (totals.get(e.user_id) ?? 0) + add,
    );
  }
  return members.slice().sort((a, b) => (totals.get(b.user_id) ?? 0) - (totals.get(a.user_id) ?? 0) || a.display_name.localeCompare(b.display_name) || a.user_id.localeCompare(b.user_id));
}

function crewMetricReading(metric: CrewContractMetric, value: number, units?: UnitSystem): string {
  if (metric === "moving_sec") return String(Number((value / 3600).toFixed(1)));
  if (metric === "sessions" || metric === "contributors") return String(Math.floor(value + 1e-9));
  return formatDistanceM(value, units);
}

function crewMetricUnit(metric: CrewContractMetric, units?: UnitSystem): string {
  if (metric === "moving_sec") return "hours";
  if (metric === "sessions") return "sessions";
  if (metric === "contributors") return "teammates";
  return distanceUnitLabel(units);
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
  const discrete = relay.metric === "sessions" || relay.metric === "contributors";
  const volume = (value: number) =>
    formatCrewRelayVolume(relay.sessions, input.sport as SportId, discrete ? Math.floor(value + 1e-9) : value, input.units, relay.metric);
  const contributors = full.model.segments.filter(s => s.value > 0).length;
  const complete = full.target != null && full.model.total >= full.target;
  const fullCrew = input.members.length > 0 && contributors === input.members.length;
  const lineup = crewLineup(input.members, input.entries, input.sport, full.metric);
  const event = events[Math.min(events.length - 1, step)];
  const replayLabel = progress >= 1 ? "Now" : progress <= 0 ? "Start" : event ? new Date(event.started_at).toLocaleDateString("en-US", { weekday: "short", timeZone: APP_TIMEZONE }) : "Start";
  const reading = crewMetricReading(relay.metric, relay.model.total, input.units);
  const targetReading = relay.target == null ? null : crewMetricReading(relay.metric, relay.target, input.units);
  const unit = crewMetricUnit(relay.metric, input.units);
  const fullTargetReading = full.target == null ? null : crewMetricReading(full.metric, full.target, input.units);
  const fullUnit = crewMetricUnit(full.metric, input.units);
  const timeline = crewReplayEvents(input, events.length ? events : input.entries);
  const entryValue = (e: CrewOverviewInput["entries"][number]) =>
    full.metric === "sessions"
      ? Number(e.session_count ?? 1)
      : full.metric === "moving_sec"
        ? Number(e.moving_sec || 0)
        : Number(e.distance_m);
  const actorName = (userId?: string) => input.members.find((m) => m.user_id === userId)?.display_name.split(" ")[0];
  const fallbackAt = timeline[timeline.length - 1]?.started_at ?? input.now;
  let runningTotal = 0;
  const targetMembers = new Set<string>();
  const targetEvent = complete
    ? timeline.find((e) => {
        if (full.metric === "contributors") {
          if (Number(e.session_count ?? 1) > 0) targetMembers.add(e.user_id);
          return targetMembers.size >= (full.target ?? 0);
        }
        runningTotal += entryValue(e);
        return runningTotal >= (full.target ?? 0);
      })
    : undefined;
  const activeMembers = new Set<string>();
  const fullCrewEvent = fullCrew ? timeline.find((e) => { if (entryValue(e) > 0) activeMembers.add(e.user_id); return activeMembers.size === input.members.length; }) : undefined;
  const highlightItems: CrewHighlight[] = [
    complete ? {
      id: "target-reached",
      icon: "trophy",
      title: "Shared target reached",
      detail: `${fullTargetReading ? `${fullTargetReading} ${fullUnit}` : "Weekly goal"}${actorName(targetEvent?.user_id) ? ` · ${actorName(targetEvent?.user_id)} sealed it` : ""}`,
      at: targetEvent?.started_at ?? fallbackAt,
    } : null,
    fullCrew ? {
      id: "full-crew",
      icon: "crew",
      title: "Every teammate contributed",
      detail: `${input.members.length} of ${input.members.length} teammates active${actorName(fullCrewEvent?.user_id) ? ` · ${actorName(fullCrewEvent?.user_id)} checked in` : ""}`,
      at: fullCrewEvent?.started_at ?? fallbackAt,
    } : null,
  ].filter((h): h is CrewHighlight => h !== null).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return { relay, entries, volume, contributors, complete, fullCrew, lineup, replayLabel,
    reading,
    targetReading,
    unit,
    highlights: highlightItems.map((h) => h.title),
    highlightItems,
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
