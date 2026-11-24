import { NextResponse } from "next/server";
import type { CrewInvitePreviewPayload } from "@fitness-battle/shared";
import { competitionAuthorityDatabase } from "@/lib/competition-authority";

const CODE = /^[a-z0-9]{6,12}$/i;

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!CODE.test(code)) {
    return NextResponse.json({ error: "invalid_invite_code" }, { status: 400 });
  }

  let db;
  try {
    db = competitionAuthorityDatabase();
  } catch {
    return NextResponse.json({ error: "preview_unavailable" }, { status: 503 });
  }

  const normalized = code.toLowerCase();
  const { data: crew, error: crewError } = await db
    .from("crews")
    .select("id, name, sport, format, target_sessions, journey_km, invite_code")
    .ilike("invite_code", normalized)
    .maybeSingle();
  if (crewError) {
    return NextResponse.json({ error: "preview_unavailable" }, { status: 500 });
  }
  if (!crew) {
    return NextResponse.json({ error: "invite_not_found" }, { status: 404 });
  }

  const { data: rows, error: memberError } = await db
    .from("crew_members")
    .select("user_id, display_name")
    .eq("crew_id", crew.id)
    .eq("status", "active")
    .order("display_name");
  if (memberError) {
    return NextResponse.json({ error: "preview_unavailable" }, { status: 500 });
  }
  const memberRows = rows ?? [];
  const avatarByUser = new Map<string, string | null>();
  if (memberRows.length) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, avatar_url")
      .in(
        "id",
        memberRows.map((row) => row.user_id as string),
      );
    for (const profile of profiles ?? []) {
      avatarByUser.set(profile.id as string, (profile.avatar_url as string | null) ?? null);
    }
  }

  const members: CrewInvitePreviewPayload["members"] = memberRows.map((row) => ({
    user_id: row.user_id as string,
    display_name: row.display_name as string,
    avatar_url: avatarByUser.get(row.user_id as string) ?? null,
  }));

  const payload: CrewInvitePreviewPayload = {
    id: crew.id,
    name: crew.name,
    sport: crew.sport,
    format: crew.format,
    target_sessions: crew.target_sessions,
    journey_km: Number(crew.journey_km),
    invite_code: crew.invite_code,
    member_count: members.length,
    members,
  };

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
  });
}