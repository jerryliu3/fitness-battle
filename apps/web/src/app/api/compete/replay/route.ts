import { NextResponse } from "next/server";
import { SPORT_IDS, activityEffort, addSimulatedReplay, type CompetitionReplay } from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";

/** Cookies on web, Bearer auth on native; membership is enforced again in SQL. */
export async function GET(request: Request) {
  if (!(await resolveRequestUserId(request))) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const sport = params.get("sport"), track = params.get("track"), start = params.get("start"), end = params.get("end");
  if (!SPORT_IDS.includes(sport as (typeof SPORT_IDS)[number]) || !["open", "verified"].includes(track ?? "") || !start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start)) return NextResponse.json({ error: "invalid_replay" }, { status: 400 });
  const db = await createRequestClient(request);
  const { data, error } = await db.rpc("competition_replay", { p_sport: sport, p_track: track, p_start: start, p_end: end });
  if (error || !data) return NextResponse.json({ error: "Competition replay is unavailable. Please try again." }, { status: error?.code === "42501" ? 404 : 503 });
  const ledger = data as Omit<CompetitionReplay, "events"> & { syntheticIds: string[]; events: { id: string; athleteId: string; at: string; distanceM: number; movingSec: number; avgHr: number | null }[] };
  // Only read portraits for the roster already authorized by the replay RPC.
  const ids = ledger.athletes.filter(athlete => !athlete.synthetic).map(athlete => athlete.id);
  const { data: portraits } = ids.length ? await db.from("profiles").select("id, avatar_url").in("id", ids) : { data: [] };
  const photos = new Map((portraits ?? []).map(row => [row.id, row.avatar_url]));
  const replay: CompetitionReplay = {
    sport: ledger.sport, track: ledger.track, periodStart: ledger.periodStart, periodEnd: ledger.periodEnd, through: ledger.through, scope: "field", athletes: ledger.athletes.map(athlete => ({ ...athlete, avatarUrl: photos.get(athlete.id) ?? null })),
    events: ledger.events.map(e => ({ id: e.id, athleteId: e.athleteId, at: e.at, distanceM: Number(e.distanceM), movingSec: Number(e.movingSec), effort: activityEffort({ id: e.id, sport: ledger.sport, startedAt: e.at, distanceM: Number(e.distanceM), movingSec: Number(e.movingSec), avgHr: e.avgHr == null ? null : Number(e.avgHr), verified: ledger.track === "verified", source: "manual" }) })),
  };
  return NextResponse.json(addSimulatedReplay(replay, ledger.syntheticIds), { headers: { "Cache-Control": "private, no-store" } });
}
