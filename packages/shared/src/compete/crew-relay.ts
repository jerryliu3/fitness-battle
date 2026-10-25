export const RELAY_COLORS = [
  "#f1c75b",
  "#819486",
  "#b8c8c0",
  "#d8bc8d",
  "#a5b7c9",
  "#c2b6cc",
];
export function crewRelay(
  members: readonly {
    id: string;
    name: string;
    value: number;
    sessions: number;
  }[],
  target: number | null,
) {
  target =
    typeof target === "number" && Number.isFinite(target) && target > 0
      ? target
      : null;
  const rows = [...members]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => ({
      ...m,
      value: Number.isFinite(m.value) ? Math.max(0, m.value) : 0,
    }));
  const total = rows.reduce((sum, m) => sum + m.value, 0),
    // Leave runway after both the finish and the current crew, including over-goal weeks.
    scale = Math.max(1, total, target ?? 0) * 1.2;
  let offset = 0;
  return {
    total,
    target,
    remaining: target == null ? null : Math.max(0, target - total),
    finish: target == null ? null : Math.min(1, target / scale),
    segments: rows.map((m, i) => {
      const start = offset / scale;
      offset += m.value;
      return {
        ...m,
        start,
        fraction: m.value / scale,
        share: total ? m.value / total : 0,
        color: RELAY_COLORS[i % RELAY_COLORS.length]!,
      };
    }),
  };
}

export interface CrewWeekRelayInput {
  members: {
    user_id: string;
    display_name: string;
    avatar_url?: string | null;
  }[];
  entries: {
    user_id: string;
    distance_m: number;
    moving_sec: number;
    session_count?: number;
  }[];
  sport: string;
  format: string;
  targetSessions: number;
  targetDistanceM?: number | null;
  previousDistanceM?: number | null;
}
/** An explicit distance goal and a previous-week comparison are distinct, labeled baselines. */
export function crewWeekRelay(input: CrewWeekRelayInput) {
  const sessions =
    input.format === "personal_target" || input.sport === "strength";
  const distanceTarget =
    Number.isFinite(input.targetDistanceM) && Number(input.targetDistanceM) > 0
      ? Number(input.targetDistanceM)
      : null;
  const baseline =
    Number.isFinite(input.previousDistanceM) &&
    Number(input.previousDistanceM) > 0
      ? Number(input.previousDistanceM)
      : null;
  const target = sessions
    ? input.targetSessions * input.members.length
    : (distanceTarget ?? baseline);
  const kind = sessions
    ? "sessions"
    : distanceTarget
      ? "distance"
      : baseline
        ? "baseline"
        : "unknown";
  const model = crewRelay(
    input.members
      .map((m) => {
        const rows = input.entries.filter((e) => e.user_id === m.user_id);
        return {
          id: m.user_id,
          name: m.display_name,
          value: rows.reduce(
            (n, e) =>
              n + Number(sessions ? (e.session_count ?? 1) : e.distance_m),
            0,
          ),
          sessions: rows.reduce((n, e) => n + Number(e.session_count ?? 1), 0),
        };
      })
      .filter((m) => m.value > 0),
    target,
  );
  return {
    model,
    sessions,
    kind,
    target: model.target,
    label:
      kind === "sessions"
        ? "Shared session target"
        : kind === "distance"
          ? "Shared distance target"
          : kind === "baseline"
            ? "Last week’s distance"
            : input.previousDistanceM === 0
              ? "No distance recorded last week"
              : "Last-week comparison unavailable",
  };
}
