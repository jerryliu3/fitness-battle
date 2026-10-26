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

export type CrewRelayModel = ReturnType<typeof crewRelay>;

export function crewRelayIsEmpty(model: CrewRelayModel): boolean {
  return model.segments.length === 0;
}

export function crewRelayRosterFootnote(
  sessions: boolean,
  inactiveCount: number,
  rosterSize: number,
): string | null {
  if (!sessions || inactiveCount <= 0 || rosterSize <= 0) return null;
  const noun = inactiveCount === 1 ? "member hasn’t" : "members haven’t";
  return `Target counts all ${rosterSize} members; ${inactiveCount} ${noun} logged yet.`;
}

export function crewEntryTotals(entries: CrewWeekRelayInput["entries"]) {
  const byUser = new Map<string, { distance: number; sessions: number }>();
  for (const entry of entries) {
    const row = byUser.get(entry.user_id) ?? { distance: 0, sessions: 0 };
    row.distance += Number(entry.distance_m);
    row.sessions += Number(entry.session_count ?? 1);
    byUser.set(entry.user_id, row);
  }
  return byUser;
}

export function crewMemberWeekValue(
  entries: CrewWeekRelayInput["entries"],
  userId: string,
  sessions: boolean,
): number {
  const row = crewEntryTotals(entries).get(userId);
  if (!row) return 0;
  return sessions ? row.sessions : row.distance;
}

export function filterCrewMembersWithPeriodActivity<
  T extends { user_id: string },
>(
  members: readonly T[],
  entries: CrewWeekRelayInput["entries"],
  sessions: boolean,
): T[] {
  const totals = crewEntryTotals(entries);
  return members.filter((m) => {
    const row = totals.get(m.user_id);
    if (!row) return false;
    return (sessions ? row.sessions : row.distance) > 0;
  });
}

function crewMemberContributions(
  input: CrewWeekRelayInput,
  sessions: boolean,
) {
  const byUser = crewEntryTotals(input.entries);
  return input.members.map((m) => {
    const totals = byUser.get(m.user_id) ?? { distance: 0, sessions: 0 };
    return {
      id: m.user_id,
      name: m.display_name,
      value: sessions ? totals.sessions : totals.distance,
      sessions: totals.sessions,
    };
  });
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
  const contributions = crewMemberContributions(input, sessions);
  const active = contributions.filter((m) => m.value > 0);
  const model = crewRelay(active, target);
  const rosterSize = input.members.length;
  const inactiveCount = Math.max(0, rosterSize - active.length);
  return {
    model,
    sessions,
    kind,
    target: model.target,
    rosterSize,
    activeCount: active.length,
    inactiveCount,
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
