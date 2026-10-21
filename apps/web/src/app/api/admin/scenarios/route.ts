import { NextResponse } from "next/server";
import { authorizeAdmin, adminDatabase } from "@/lib/admin-auth";
import { loadCompeteAccount } from "@/lib/compete-persist";
import { activityPayload, isUuid, overtakeActivity, registrationPlan, SCENARIO_ACTIONS, scenarioSport } from "@/lib/admin-scenario";

export async function GET(request: Request) {
  if (!await authorizeAdmin(request)) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const target = new URL(request.url).searchParams.get("target");
  if (!isUuid(target)) return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  try {
    const account = await loadCompeteAccount(db, target);
    if (!account) return NextResponse.json({ error: "account_not_found" }, { status: 404 });
    const now = new Date().toISOString();
    const [fields, generated] = await Promise.all([
      db.from("week_fields").select("id,name,sport,member_ids,wave_start,week_end").contains("member_ids", [target]).gt("week_end", now),
      db.from("admin_scenario_activities").select("activity_id").eq("user_id", target),
    ]);
    if (fields.error || generated.error) throw new Error("scenario_data_unavailable_apply_migration");
    return NextResponse.json({ name: account.state.name, updatedAt: account.updatedAt, enrollments: account.state.enrollments, results: account.state.periodResults.slice(0, 12), fields: fields.data, generatedCount: generated.data.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "account_unavailable" }, { status: 500 }); }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const actor = await authorizeAdmin(request);
  if (!actor) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || !isUuid(body.target) || !isUuid(body.actionId) || !SCENARIO_ACTIONS.includes(body.action) || !scenarioSport(body.sport) || typeof body.updatedAt !== "string" || typeof body.reason !== "string" || body.reason.trim().length < 8 || body.reason.length > 1000 || body.confirmation !== `SCENARIO ${body.target}`) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  try {
    const selected = await loadCompeteAccount(db, body.target);
    if (!selected) return NextResponse.json({ error: "account_not_found" }, { status: 404 });
    if (selected.updatedAt !== body.updatedAt) return NextResponse.json({ error: "account_changed_reload_preview" }, { status: 409 });
    let target = body.target, account = selected;
    let payload: Record<string, unknown> = {};
    const now = new Date();
    if (body.action === "register") payload = registrationPlan(selected.state, body.sport, body.target, now);
    if (body.action === "add-activity") {
      payload = activityPayload({ ...body, distanceM: body.sport === "strength" ? 0 : body.distanceM }, now);
      if (body.sport === "strength" && payload.verified) throw new Error("strength_has_no_verified_track");
    }
    if (body.action === "join-field" || body.action === "overtake") {
      if (!isUuid(body.opponent) || body.opponent === body.target) throw new Error("different_opponent_required");
      const opponent = await loadCompeteAccount(db, body.opponent);
      if (!opponent) throw new Error("opponent_not_found");
      const { data: fields, error } = await db.from("week_fields").select("*").eq("sport", body.sport).contains("member_ids", [body.opponent]).lte("wave_start", now.toISOString()).gt("week_end", now.toISOString());
      if (error || fields?.length !== 1) throw new Error("opponent_needs_one_active_field");
      const field = fields[0];
      payload = { fieldId: field.id, fieldUpdatedAt: field.updated_at, peerId: body.opponent, peerUpdatedAt: opponent.updatedAt };
      if (body.action === "overtake") {
        if (!field.member_ids.includes(body.target)) throw new Error("join_opponents_field_first");
        if (typeof body.verified !== "boolean" || !["pass", "be-passed"].includes(body.direction)) throw new Error("invalid_overtake_options");
        if (body.direction === "be-passed") {
          target = body.opponent; account = opponent;
          payload.peerId = body.target; payload.peerUpdatedAt = selected.updatedAt;
        }
        payload = { ...payload, ...overtakeActivity(account.state, target === body.target ? opponent.state : selected.state, body.sport, body.verified, now) };
      }
    }
    const { data: updatedAt, error } = await db.rpc("admin_apply_compete_scenario", { p_action_id: body.actionId, p_actor_id: actor, p_target_id: target, p_expected_updated_at: account.updatedAt, p_action: body.action, p_sport: body.sport, p_reason: body.reason.trim(), p_payload: payload, p_before: account.state });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ persisted: true, actionId: body.actionId, affectedAthlete: target, updatedAt });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "scenario_failed" }, { status: 400 }); }
}
