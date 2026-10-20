import { authorizeAdmin, adminDatabase } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { prepareCompeteStateForAccount, settleCompetition, competeNow, weeklyPeriodBounds } from "@fitness-battle/shared";
import { readAdminSettlementFields } from "@/lib/admin-settlement";
import { loadCompeteAccount } from "@/lib/compete-persist";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request: Request) {
  if (!await authorizeAdmin(request)) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const target = new URL(request.url).searchParams.get("target") ?? "";
  if (!UUID.test(target)) return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  try {
    const loaded = await loadCompeteAccount(db, target);
    if (!loaded) return NextResponse.json({ error: "account_not_found" }, { status: 404 });
    return NextResponse.json({ name: loaded.state.name, updatedAt: loaded.updatedAt, enrollments: loaded.state.enrollments, results: loaded.state.periodResults.slice(0, 8) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "account_unavailable" }, { status: 500 }); }
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const actorId = await authorizeAdmin(request);
  if (!actorId) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const body = await request.json().catch(() => null) as { target?: string; action?: string; reason?: string; confirmation?: string; updatedAt?: string; actionId?: string } | null;
  if (!body || typeof body.target !== "string" || typeof body.actionId !== "string" || !UUID.test(body.target) || !UUID.test(body.actionId) ||
      !["settle-due", "close-round"].includes(body.action ?? "") || typeof body.reason !== "string" || body.reason.trim().length < 8 || body.reason.length > 1000 ||
      body.confirmation !== `SETTLE ${body.target}` || typeof body.updatedAt !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  const target = body.target!;
  try {
    const loaded = await loadCompeteAccount(db, target);
    if (!loaded) return NextResponse.json({ error: "account_not_found" }, { status: 404 });
    if (loaded.updatedAt !== body.updatedAt) return NextResponse.json({ error: "account_changed_reload_preview" }, { status: 409 });
    const state = { ...loaded.state, demoNow: null };
    const fields = await readAdminSettlementFields(db, target, state);
    const now = new Date();
    const closeAt = Math.max(...state.enrollments.map((row) => Date.parse(row.weekEnd)), weeklyPeriodBounds(competeNow(state, now)).endsAt.getTime());
    const settlementTime = body.action === "close-round" ? new Date(closeAt) : now;
    const after = prepareCompeteStateForAccount(settleCompetition(state, settlementTime, fields));
    const { data: updatedAt, error: commitError } = await db.rpc("admin_commit_round", {
      p_action_id: body.actionId, p_actor_id: actorId, p_target_id: target, p_action: body.action,
      p_reason: body.reason.trim(), p_expected_updated_at: body.updatedAt, p_before: loaded.state, p_after: after,
    });
    if (commitError) {
      const conflict = commitError.message.includes("account_changed_reload_preview") || commitError.code === "23505";
      return NextResponse.json({ error: conflict ? "account_changed_or_action_used_reload_preview" : "settlement_not_committed" }, { status: conflict ? 409 : 500 });
    }
    return NextResponse.json({ persisted: true, updatedAt, actionId: body.actionId, results: after.periodResults.slice(0, 8) });
  } catch { return NextResponse.json({ error: "account_unavailable" }, { status: 500 }); }
}
