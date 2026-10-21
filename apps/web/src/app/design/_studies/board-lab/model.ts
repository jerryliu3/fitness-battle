import { arenaWindow, clampArenaLaneCenter, type ArenaSceneLane, type ArenaViewWindow } from "@fitness-battle/shared";
import type { ZoomId } from "./field-directions";

export type BoardConcept = "tapestry" | "ribbon" | "horizon";
export type BoardOrientation = "vertical" | "horizontal";
export type BoardUnit = "km" | "mi" | "pts";
/** Presentation values use the same unit as ArenaSceneLane.value. No tracker or scoring logic. */
export interface BoardSession {
  id: string;
  athleteId: string;
  title: string;
  recordedAt: string;
  start: number;
  end: number;
}
export interface BoardData {
  lanes: ArenaSceneLane[];
  sessions: BoardSession[];
  unit: BoardUnit;
  gps: boolean;
  sport: string;
  gain: number;
}
export const concepts = {
  tapestry: { name: "Session Tapestry", medium: "2D", line: "Every effort becomes part of your field.", detail: "Satin distance strips, quiet session seams and a permanent trace of the work you put in." },
  ribbon: { name: "Distance Ribbon", medium: "2D", line: "A little further. Clearly.", detail: "A warm, tactile measure with precise marks, glass racers and room to see the gap." },
  horizon: { name: "Horizon Pursuit", medium: "3D", line: "A field you move through.", detail: "A sunlit athletics course with sculpted trees, measured ground and a camera that travels with you." },
} as const;

/** Absolute 1/2/5 marks. Panning changes their screen positions, never their identity. */
export function boardTicks(view: ArenaViewWindow, target = 6, minimumStep = 0) {
  const { min, max, span } = arenaWindow(view.center, view.span);
  const rough = span / target;
  const base = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(minimumStep, [1, 2, 5, 10].map(n => n * base).find(n => n >= rough) ?? base * 10);
  const first = Math.max(0, Math.ceil((min - step * 1e-6) / step) * step);
  const values: number[] = [];
  for (let value = first; value <= max + step * 1e-6 && values.length < 80; value += step) values.push(Number(value.toFixed(6)));
  return { values, step };
}

/** Both map lenses share one geometric scale in x/y. Atlas changes only marker legibility. */
export function fieldZoom(span: number, mode: ZoomId) {
  const worldScale = mode === "distance" ? 1 : 6 / Math.max(.5, span);
  return { worldScale, markerScale: mode === "atlas" ? Math.max(.34, worldScale ** .72) : worldScale };
}

/** Small repeats may be decorative objects, never fractional cross-track distance rules. */
export function fieldSamples(view: ArenaViewWindow, spacing = 1, budget = 80) {
  const { min, max, span } = arenaWindow(view.center, view.span);
  const stride = 2 ** Math.max(0, Math.ceil(Math.log2(span / spacing / budget)));
  const step = spacing * stride;
  const values: number[] = [];
  for (let d = Math.max(0, Math.floor(min / step) * step); d <= max + step && values.length <= budget + 2; d += step) values.push(Number(d.toFixed(5)));
  return values;
}

export function progressClearance(markerScale: number) {
  // Blend envelope for the canonical echoes (~86 px at scale 1), not a trail cutoff.
  return 104 * markerScale;
}

export function overviewWindow(view: ArenaViewWindow, highest: number) {
  const total = Math.max(1, highest), bounds = arenaWindow(view.center, view.span);
  const low = Math.max(0, Math.min(total, bounds.min)), high = Math.max(low, Math.min(total, bounds.max));
  return { left: low / total * 100, width: (high - low) / total * 100 };
}

export function boardFraction(value: number, view: ArenaViewWindow) {
  const bounds = arenaWindow(view.center, view.span);
  return (value - bounds.min) / bounds.span;
}

/** Sourced intervals only. Unavailable session history stays an unsegmented lane. */
export function visibleSessions(sessions: readonly BoardSession[], lane: ArenaSceneLane) {
  return sessions.filter(s => s.athleteId === lane.id && Number.isFinite(s.start) && Number.isFinite(s.end) && s.start >= 0 && s.end > s.start && s.start < lane.value)
    .map(s => ({ ...s, end: Math.min(s.end, lane.value) }));
}

export function defaultBoardView(value: number, unit: BoardUnit): ArenaViewWindow {
  const span = unit === "pts" ? 20 : unit === "mi" ? 6 / 1.609344 : 6;
  return { center: clampArenaLaneCenter(value, span), span };
}

export function fitBoardView(lanes: readonly ArenaSceneLane[], unit: BoardUnit): ArenaViewWindow {
  const high = Math.max(1, ...lanes.filter(l => !l.ghost).map(l => l.value));
  const span = Math.max(defaultBoardView(0, unit).span, high * 1.12);
  return { center: clampArenaLaneCenter(high / 2, span), span };
}

export function formatBoardValue(value: number, unit: BoardUnit) {
  return unit === "pts" ? Number(value.toFixed(1)).toString() : value.toFixed(1);
}
export function boardGap(value: number, you: number, unit: BoardUnit) {
  const delta = value - you;
  if (Math.abs(delta) < 0.00001) return "Level with you";
  return `${formatBoardValue(Math.abs(delta), unit)} ${unit} ${delta > 0 ? "ahead" : "behind"}`;
}
