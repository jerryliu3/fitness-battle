import { APP_TIMEZONE } from "./period";
import { activityEffort } from "./compete/effort";
import { countsOnTrack } from "./compete/ledger";
import { competeNow } from "./compete/engine";
import { sportById, type CompeteState, type ScoreTrack, type SportId, type UnitSystem } from "./compete/sports";
import { findSynthetic, syntheticVolumeInWindow } from "./matching/synthetic-bank";
import { fieldDefaultSpan } from "./field-course";
import type { CourseReplayFrame } from "./race-course";

export interface CompetitionReplaySelection {
  sport: SportId;
  track: ScoreTrack;
  periodStart: string;
  periodEnd: string;
}
export interface CompetitionReplayAthlete {
  avatarUrl?: string | null;
  id: string;
  name: string;
  you: boolean;
  synthetic?: boolean;
}
/** Minimal presentation ledger. No routes, sensor samples, provider IDs or credentials. */
export interface CompetitionReplayEvent {
  id: string;
  athleteId: string;
  at: string;
  distanceM: number;
  movingSec: number;
  effort: number;
  simulated?: boolean;
}
export interface CompetitionReplay extends CompetitionReplaySelection {
  through: string;
  athletes: CompetitionReplayAthlete[];
  events: CompetitionReplayEvent[];
  scope: "field" | "local";
}

/** Use the same deterministic daily volume model as the live simulated field. */
export function addSimulatedReplay(replay: CompetitionReplay, ids: readonly string[]): CompetitionReplay {
  const athletes = [...replay.athletes], events = [...replay.events];
  const start = new Date(replay.periodStart), end = new Date(replay.periodEnd);
  const through = Math.min(Date.parse(replay.through), end.getTime());
  for (const id of new Set(ids)) {
    if (athletes.some(a => a.id === id)) continue;
    const rival = findSynthetic(replay.sport, id);
    if (!rival) continue;
    athletes.push({ id, name: rival.name, you: false, synthetic: true });
    let previous = { distanceM: 0, movingSec: 0, effort: 0 };
    for (let at = start.getTime(); at < through; at += 86_400_000) {
      const volume = syntheticVolumeInWindow(rival, replay.sport, start, end, replay.track, new Date(Math.min(through, at + 1)), sportById(replay.sport).gps);
      const event = { id: `simulated:${id}:${at}`, athleteId: id, at: new Date(at).toISOString(), distanceM: volume.distanceM - previous.distanceM, movingSec: volume.movingSec - previous.movingSec, effort: volume.effort - previous.effort, simulated: true };
      if (event.distanceM > 0 || event.movingSec > 0 || event.effort > 0) events.push(event);
      previous = volume;
    }
  }
  return { ...replay, athletes, events };
}

/** Offline preview only. Never infer real opponents' workout histories from totals. */
export function localCompetitionReplay(state: CompeteState, selection: CompetitionReplaySelection): CompetitionReplay {
  const through = new Date(Math.min(competeNow(state).getTime(), Date.parse(selection.periodEnd))).toISOString();
  const events = state.activities.filter(a => a.sport === selection.sport && countsOnTrack(a, selection.track) && Date.parse(a.startedAt) >= Date.parse(selection.periodStart) && Date.parse(a.startedAt) < Math.min(Date.parse(selection.periodEnd), Date.parse(through))).map(a => ({
    id: a.id, athleteId: "you", at: a.startedAt, distanceM: a.distanceM, movingSec: a.movingSec, effort: activityEffort(a),
  }));
  return { ...selection, through, athletes: [{ id: "you", name: state.name, avatarUrl: state.avatarUrl, you: true }], events, scope: "local" };
}

interface AthleteSeries { steps: number[]; values: number[]; efforts: number[] }
export interface CompetitionReplayIndex {
  replay: CompetitionReplay;
  unit: "km" | "mi" | "pts";
  series: Map<string, AthleteSeries>;
}
/** O(events + athletes) memory; no full leaderboard snapshot for every event. */
export function indexCompetitionReplay(input: CompetitionReplay, units: UnitSystem): CompetitionReplayIndex {
  const allowed = new Set(input.athletes.map(a => a.id));
  const seen = new Set<string>();
  const events = input.events.filter(e => {
    const key = `${e.athleteId}:${e.id}`;
    if (!allowed.has(e.athleteId) || seen.has(key) || !Number.isFinite(Date.parse(e.at)) || Date.parse(e.at) < Date.parse(input.periodStart) || Date.parse(e.at) >= Date.parse(input.periodEnd) || Date.parse(e.at) > Date.parse(input.through) || ![e.distanceM, e.movingSec, e.effort].every(v => Number.isFinite(v) && v >= 0)) return false;
    seen.add(key);
    return e.distanceM > 0 || e.movingSec > 0 || e.effort > 0;
  }).sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.athleteId.localeCompare(b.athleteId) || a.id.localeCompare(b.id));
  const gps = sportById(input.sport).gps;
  const divisor = units === "metric" ? 1000 : 1609.344;
  const series = new Map<string, AthleteSeries>(input.athletes.map(a => [a.id, { steps: [0], values: [0], efforts: [0] }]));
  events.forEach((event, i) => {
    const s = series.get(event.athleteId)!;
    s.steps.push(i + 1);
    s.values.push(s.values[s.values.length - 1]! + (gps ? event.distanceM / divisor : event.effort));
    s.efforts.push(s.efforts[s.efforts.length - 1]! + event.effort);
  });
  return { replay: { ...input, events }, series, unit: gps ? units === "metric" ? "km" : "mi" : "pts" };
}

function atStep(series: AthleteSeries, step: number) {
  let low = 0, high = series.steps.length;
  while (low < high) { const mid = (low + high) >>> 1; if (series.steps[mid]! <= step) low = mid + 1; else high = mid; }
  const i = Math.max(0, low - 1);
  return { value: series.values[i]!, effort: series.efforts[i]! };
}
export function competitionReplayFrame(index: CompetitionReplayIndex, cursor: number) {
  const position = Math.max(0, Math.min(index.replay.events.length, Number.isFinite(cursor) ? cursor : 0));
  const step = Math.floor(position), fraction = position - step;
  const afterStep = Math.min(step + 1, index.replay.events.length);
  const rows = index.replay.athletes.map(athlete => {
    const s = index.series.get(athlete.id)!;
    const before = atStep(s, step);
    const after = atStep(s, afterStep);
    return { ...athlete, value: before.value + (after.value - before.value) * fraction, effort: before.effort + (after.effort - before.effort) * fraction };
  });
  // Match the 2D/portrait field: GPS distance, or effort points for strength.
  // Equal values share a place, including everyone at the starting line.
  rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  let place = 1;
  return { position, step, rows: rows.map((row, i) => {
    if (i === 0 || row.value !== rows[i - 1]!.value) place = i + 1;
    return { ...row, place };
  }), event: index.replay.events[Math.ceil(position) - 1] ?? null };
}

export function competitionReplayCaption(index: CompetitionReplayIndex, cursor: number): string {
  const frame = competitionReplayFrame(index, cursor);
  const event = frame.event;
  if (!event) return "The starting line";
  const athlete = index.replay.athletes.find(a => a.id === event.athleteId)!;
  const before = competitionReplayFrame(index, Math.ceil(frame.position) - 1).rows.find(a => a.id === event.athleteId)!;
  const after = competitionReplayFrame(index, Math.ceil(frame.position)).rows.find(a => a.id === event.athleteId)!;
  const delta = after.value - before.value;
  return `${athlete.name} +${delta.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${index.unit} · ${before.place === after.place ? `#${after.place}` : `#${before.place} → #${after.place}`}`;
}
export function competitionReplayDate(index: CompetitionReplayIndex, cursor: number, live = false): string {
  const position = Math.max(0, Math.min(index.replay.events.length, Number.isFinite(cursor) ? cursor : 0));
  const step = Math.floor(position), fraction = position - step;
  const before = Date.parse(step ? index.replay.events[step - 1]!.at : index.replay.periodStart);
  const after = Date.parse(index.replay.events[step]?.at ?? index.replay.through);
  return new Date(live ? Date.parse(index.replay.through) : before + (after - before) * fraction).toLocaleString("en-US", { timeZone: APP_TIMEZONE, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

export function competitionReplayTimeMs(index: CompetitionReplayIndex, cursor: number): number {
  const count = index.replay.events.length;
  if (!count) return Date.parse(index.replay.periodStart);
  const position = Math.max(0, Math.min(count, Number.isFinite(cursor) ? cursor : 0));
  const step = Math.floor(position), fraction = position - step;
  const before = Date.parse(step ? index.replay.events[step - 1]!.at : index.replay.periodStart);
  const after = Date.parse(index.replay.events[step]?.at ?? index.replay.through);
  return before + (after - before) * fraction;
}

/** Timestamp label for feed rows relative to the timeline scrubber; falls back to absolute after 24h. */
export function formatCompetitionFeedTimestamp(at: string, referenceMs: number): string {
  const eventMs = Date.parse(at);
  const diffMs = referenceMs - eventMs;
  if (!Number.isFinite(diffMs) || diffMs < 0 || diffMs >= 86_400_000) {
    return new Date(at).toLocaleString("en-US", {
      timeZone: APP_TIMEZONE,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }
  const totalMinutes = Math.floor(diffMs / 60_000);
  if (totalMinutes < 60) return `${Math.max(totalMinutes, 0)}m ago`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
}

export function competitionReplayCursorFromTimeMs(index: CompetitionReplayIndex, targetTimeMs: number): number {
  const events = index.replay.events;
  const count = events.length;
  if (!count) return 0;
  const startMs = Date.parse(index.replay.periodStart);
  if (targetTimeMs <= startMs) return 0;
  const endMs = Date.parse(events[count - 1]!.at);
  if (targetTimeMs >= endMs) return count;

  let prevMs = startMs;
  for (let i = 0; i < count; i++) {
    const curMs = Date.parse(events[i]!.at);
    if (targetTimeMs <= curMs) {
      const span = curMs - prevMs;
      const fraction = span > 0 ? (targetTimeMs - prevMs) / span : 0;
      return i + fraction;
    }
    prevMs = curMs;
  }
  return count;
}

/** Camera framing for geographic replay/timeline scrubbing on the course map. */
export function competitionCourseReplayFrame(
  index: CompetitionReplayIndex,
  cursor: number,
  athleteId: string,
): CourseReplayFrame {
  const frame = competitionReplayFrame(index, cursor);
  const focus =
    frame.rows.find((row) => row.id === athleteId) ?? frame.rows.find((row) => row.you);
  const focusValue = focus?.value ?? 0;
  const nearest = frame.rows
    .filter((row) => row.id !== focus?.id)
    .sort(
      (a, b) =>
        Math.abs(a.value - focusValue) - Math.abs(b.value - focusValue),
    )[0];
  const gap = nearest ? Math.abs(nearest.value - focusValue) : 0;
  const span = Math.max(fieldDefaultSpan(index.unit) * 0.35, gap + 0.001);
  return {
    nearestId: nearest?.id,
    focus: Math.max(0, Math.min(1, 1 - gap / span)),
    passEffects: [],
  };
}

export function competitionReplayDimension(sport: SportId, requested: "2d" | "3d" | "4d" | "graph" = "4d"): "2d" | "3d" | "4d" | "graph" {
  return requested === "4d" && !sportById(sport).gps ? "2d" : requested;
}
export function nextCompetitionReplaySpeed(speed: number) {
  const speeds = [.25, .5, 1, 2, 4];
  return speeds[(speeds.indexOf(speed) + 1) % speeds.length]!;
}
