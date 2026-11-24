import { NextResponse } from "next/server";
import {
  athleteCardModel,
  awardCards,
  clubAchievements,
  clubLifetimeTotals,
  competeNow,
  featuredClubAchievements,
  formatClockTime,
  formatMemberSince,
  personalRecordHistory,
  RECORD_DISTANCES,
  weeklyActivityStreak,
  accountTimeZone,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { competitionAuthorityDatabase } from "@/lib/competition-authority";
import { loadCompeteAccount } from "@/lib/compete-persist";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewerId = await resolveRequestUserId(request);
  const targetId = (await params).id;
  if (!UUID.test(targetId)) {
    return NextResponse.json({ error: "invalid_athlete" }, { status: 400 });
  }
  if (viewerId && targetId === viewerId) {
    return NextResponse.json({ error: "use_own_athlete_page" }, { status: 400 });
  }

  let db;
  try {
    db = competitionAuthorityDatabase();
  } catch {
    return NextResponse.json({ error: "profile_unavailable" }, { status: 503 });
  }

  if (viewerId) {
    const client = await createRequestClient(request);
    const { data: block } = await client
      .from("athlete_blocks")
      .select("blocked_id")
      .eq("blocker_id", viewerId)
      .eq("blocked_id", targetId)
      .maybeSingle();
    if (block) {
      return NextResponse.json({ error: "athlete_unavailable" }, { status: 404 });
    }
  }

  const { data: profile } = await db
    .from("profiles")
    .select("created_at")
    .eq("id", targetId)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "athlete_unavailable" }, { status: 404 });
  }

  let loaded;
  try {
    loaded = await loadCompeteAccount(db, targetId);
  } catch {
    return NextResponse.json({ error: "profile_unavailable" }, { status: 503 });
  }
  if (!loaded) {
    return NextResponse.json({ error: "athlete_unavailable" }, { status: 404 });
  }

  const now = competeNow(loaded.state);
  const memberSince =
    typeof profile.created_at === "string"
      ? formatMemberSince(profile.created_at, accountTimeZone(loaded.state))
      : null;
  const card = { ...athleteCardModel(loaded.state, now), memberSince };
  const awards = awardCards(loaded.state);
  const achievements = featuredClubAchievements(clubAchievements(loaded.state));
  const season = clubLifetimeTotals(loaded.state, now);
  const records = personalRecordHistory(loaded.state, now);
  const topRecord = records[0];
  const streak = weeklyActivityStreak(loaded.state.activities, now, loaded.state.dailyHealth);
  const proudMoments: { id: string; label: string; detail: string }[] = [];
  if (streak.count >= 4) {
    proudMoments.push({
      id: "streak",
      label: "Four weeks strong",
      detail: `${streak.count} active weeks in a row`,
    });
  }
  if (topRecord) {
    proudMoments.push({
      id: `${topRecord.sport}:${topRecord.distanceId}:${topRecord.activityId}`,
      label: "A new best",
      detail: `${formatClockTime(topRecord.seconds)} · Fastest ${
        RECORD_DISTANCES[topRecord.sport]?.find((d) => d.id === topRecord.distanceId)?.label ??
        topRecord.distanceId
      }`,
    });
  }

  return NextResponse.json(
    {
      card,
      awards,
      achievements,
      season,
      units: loaded.state.units,
      proudMoments,
      memberSince,
    },
    {
      headers: {
        "Cache-Control": viewerId ? "private, no-store" : "public, max-age=60, stale-while-revalidate=120",
      },
    },
  );
}