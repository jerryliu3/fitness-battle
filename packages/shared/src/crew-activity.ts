import { competeNow } from "./compete/engine";
import { countsOnTrack } from "./compete/ledger";
import type { Activity, CompeteState, SportId } from "./compete/sports";
import { dailyPeriodBounds, shiftAppDay } from "./period";

export interface CrewActivity {
  id: string; userId: string; name: string; avatarUrl: string | null; sport: SportId;
  startedAt: string; distanceM: number; movingSec: number; verified: boolean; source: string;
}
export interface CrewActivityPage {
  activities: CrewActivity[]; next: { before: string; beforeId: string } | null;
}
export interface HomeActivity extends CrewActivity { ownActivity?: Activity }
/** Eastern yesterday 00:00, including 23/25-hour days. */
export function recentActivityStart(now: Date): string {
  return dailyPeriodBounds(shiftAppDay(now, -1)).startsAt.toISOString();
}
/** Shared presentation selector; the read API remains reusable as a complete Crew feed. */
export function homeRecentActivities(state: CompeteState, viewerId: string | undefined, peers: readonly CrewActivity[], now = competeNow(state)): HomeActivity[] {
  const since = Date.parse(recentActivityStart(now)), until = now.getTime();
  const recent = (startedAt: string) => { const at = Date.parse(startedAt); return at >= since && at <= until; };
  const own = state.activities.filter(a => countsOnTrack(a, "open") && recent(a.startedAt)).sort((a,b) => b.startedAt.localeCompare(a.startedAt))[0];
  const latest = new Map<string, HomeActivity>();
  for (const row of [...peers].filter(row => row.userId !== viewerId && recent(row.startedAt)).sort((a,b) => b.startedAt.localeCompare(a.startedAt))) {
    if (!latest.has(row.userId)) latest.set(row.userId, row);
  }
  if (own) latest.set(viewerId ?? "self", { ...own, userId: viewerId ?? "self", name: state.name, avatarUrl: state.avatarUrl ?? null, ownActivity: own });
  return [...latest.values()].sort((a,b) => b.startedAt.localeCompare(a.startedAt));
}
