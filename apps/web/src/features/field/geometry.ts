export interface SceneRunner {
  id: string;
  name: string;
  initials: string;
  /** Cumulative values. Index 0 is the shared zero origin. */
  series: number[];
  you?: boolean;
  ghost?: boolean;
}

/** Presentation interpolation. Does not score fitness. */
export function valueAt(
  runner: SceneRunner,
  time: number,
  extra = 0,
): number {
  const values = runner.series;
  if (values.length === 0) return runner.you ? Math.max(0, extra) : 0;
  const max = Math.max(0, values.length - 1);
  const t = Math.max(0, Math.min(max, time));
  const i = Math.min(Math.max(0, max - 1), Math.floor(t));
  const fraction = values.length === 1 ? 0 : t - i;
  const base =
    values.length === 1
      ? values[0]!
      : values[i]! + (values[i + 1]! - values[i]!) * fraction;
  return (
    Math.round((base + (runner.you ? Math.max(0, extra) : 0)) * 1000) / 1000
  );
}

export function worldZ(value: number): number {
  return value === 0 ? 0 : -value * 9;
}

export function trackWindow(
  distance: number,
  span: number,
  pan: number | null,
  overviewPeak?: number,
): { min: number; max: number } {
  if (overviewPeak !== undefined) {
    return { min: 0, max: Math.max(5, Math.ceil(overviewPeak / 5) * 5) };
  }
  const min =
    pan === null ? Math.max(0, distance - span * 0.28) : Math.max(0, pan);
  return { min, max: min + span };
}

export function trackY(
  distance: number,
  min: number,
  max: number,
  height: number,
): number {
  const span = Math.max(0.001, max - min);
  return height - 54 - ((distance - min) / span) * (height - 132);
}

/** Lane index is identity, never rank. You stays in the middle. */
export function stableLanes<T extends { id: string; you?: boolean }>(
  runners: readonly T[],
): T[] {
  const you = runners.find((runner) => runner.you);
  const others = runners
    .filter((runner) => !runner.you)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!you) return others;
  const mid = Math.floor(others.length / 2);
  return [...others.slice(0, mid), you, ...others.slice(mid)];
}

export function gapLabel(
  runner: SceneRunner,
  you: SceneRunner,
  time: number,
  extra: number,
  unit: string,
): string {
  const gap =
    Math.round((valueAt(runner, time, extra) - valueAt(you, time, extra)) * 1000) /
    1000;
  if (runner.you) return "Your position";
  if (runner.ghost) {
    return `${Math.abs(gap).toFixed(1)} ${unit} ${gap > 0 ? "ahead of you then" : "behind this week"}`;
  }
  if (Math.abs(gap) < 0.001) return "Level with you";
  return `${Math.abs(gap).toFixed(Math.abs(gap) < 1 ? 2 : 1)} ${unit} ${gap > 0 ? "ahead" : "behind"}`;
}

export function placeAt(
  runners: readonly SceneRunner[],
  id: string,
  time: number,
  extra: number,
): number {
  const runner = runners.find((item) => item.id === id);
  if (!runner || runner.ghost) return 0;
  const mine = valueAt(runner, time, extra);
  return (
    1 +
    runners.filter(
      (item) => !item.ghost && valueAt(item, time, extra) > mine + 0.000001,
    ).length
  );
}
