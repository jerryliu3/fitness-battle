import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prepareCompeteStateForAccount, reduceCompete, rollClock } from "@fitness-battle/shared";
import { serverEnv, webEnv } from "@/lib/env";
import { isOwnerEmail } from "@/lib/auth/design-access";
import { createRequestClient } from "@/lib/supabase/request";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { hydrateFieldBoard, loadCompeteAccount, persistCompeteAccount } from "@/lib/compete-persist";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function authorize(request: Request) {
  const config = getSupabaseConfig();
  if (!config.configured || webEnv.useDemoData) return null;
  const client = await createRequestClient(request);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at || !isOwnerEmail(data.user.email)) return null;
  return data.user.id;
}
function database() {
  const config = getSupabaseConfig();
  if (!serverEnv.supabaseServiceRoleKey) return null;
  return createClient(config.supabaseUrl, serverEnv.supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function GET(request: Request) {
  if (!await authorize(request)) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const target = new URL(request.url).searchParams.get("target") ?? "";
  if (!UUID.test(target)) return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  const db = database();
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
  const actorId = await authorize(request);
  if (!actorId) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const body = await request.json().catch(() => null) as { target?: string; action?: string; reason?: string; confirmation?: string; updatedAt?: string; actionId?: string } | null;
  if (!body || typeof body.target !== "string" || typeof body.actionId !== "string" || !UUID.test(body.target) || !UUID.test(body.actionId) ||
      !["settle-due", "close-round"].includes(body.action ?? "") || typeof body.reason !== "string" || body.reason.trim().length < 8 || body.reason.length > 1000 ||
      body.confirmation !== `SETTLE ${body.target}` || typeof body.updatedAt !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const db = database();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  const target = body.target!;
  try {
    const loaded = await loadCompeteAccount(db, target);
    if (!loaded) return NextResponse.json({ error: "account_not_found" }, { status: 404 });
    if (loaded.updatedAt !== body.updatedAt) return NextResponse.json({ error: "account_changed_reload_preview" }, { status: 409 });
    // Hydrate real peer values before settling; never substitute sandbox fixtures.
    const state = await hydrateFieldBoard(db, target, { ...loaded.state, demoNow: null });
    const after = prepareCompeteStateForAccount(body.action === "close-round"
      ? reduceCompete(state, { type: "debug-close-week", now: new Date().toISOString() })
      : rollClock(state, new Date()));
    const { error: auditError } = await db.from("admin_compete_actions").insert({ id: body.actionId, actor_id: actorId, target_id: target, action: body.action, reason: body.reason.trim(), before_state: loaded.state, after_state: after });
    if (auditError) return NextResponse.json({ error: "audit_not_saved_or_action_already_started" }, { status: 409 });
    try {
      const updatedAt = await persistCompeteAccount(db, target, after);
      const { error: completionError } = await db.from("admin_compete_actions").update({ outcome: "succeeded", completed_at: new Date().toISOString() }).eq("id", body.actionId);
      if (completionError) return NextResponse.json({ error: "saved_but_audit_completion_failed_reload", persisted: true }, { status: 500 });
      return NextResponse.json({ persisted: true, updatedAt, actionId: body.actionId, results: after.periodResults.slice(0, 8) });
    } catch {
      await db.from("admin_compete_actions").update({ outcome: "failed", completed_at: new Date().toISOString() }).eq("id", body.actionId);
      return NextResponse.json({ error: "settlement_failed_reload_before_retry" }, { status: 500 });
    }
  } catch { return NextResponse.json({ error: "account_unavailable" }, { status: 500 }); }
}
