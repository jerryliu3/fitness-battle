import { NextResponse } from "next/server";
import { authorizeAdmin, adminDatabase } from "@/lib/admin-auth";
import { loadCompeteAccount } from "@/lib/compete-persist";
import { readAdminSettlementFields } from "@/lib/admin-settlement";
import { planAdminFieldWave } from "@/lib/admin-field-wave";
import type { WeekFieldRow } from "@/lib/week-field";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request: Request) {
  if (!await authorizeAdmin(request)) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const target = new URL(request.url).searchParams.get("target") ?? "";
  if (!UUID.test(target)) return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  const now = new Date().toISOString();
  const { data, error } = await db.from("week_fields").select("*").contains("member_ids", [target]).lt("wave_start", now).gt("week_end", now);
  if (error) return NextResponse.json({ error: "fields_unavailable" }, { status: 500 });
  return NextResponse.json({ fields: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const actor = await authorizeAdmin(request);
  if (!actor) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.fieldId !== "string" || typeof body.target !== "string" || typeof body.actionId !== "string" || !UUID.test(body.fieldId) || !UUID.test(body.target) || !UUID.test(body.actionId) ||
    !["close-field", "restart-field"].includes(body.action) || typeof body.updatedAt !== "string" || typeof body.reason !== "string" || body.reason.trim().length < 8 || body.reason.length > 1000 || body.confirmation !== `WAVE ${body.fieldId}`)
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  try {
    const { data: field, error } = await db.from("week_fields").select("*").eq("id", body.fieldId).single();
    if (error || !field || !field.member_ids.includes(body.target)) return NextResponse.json({ error: "field_not_found" }, { status: 404 });
    if (field.updated_at !== body.updatedAt) return NextResponse.json({ error: "field_changed_reload" }, { status: 409 });
    const accounts = await Promise.all((field.member_ids as string[]).map(async (userId) => {
      const account = await loadCompeteAccount(db, userId);
      if (!account) throw new Error("field_account_unavailable");
      return { userId, ...account };
    }));
    const boards = await Promise.all(accounts.map(async (account) => {
      const enrollment = account.state.enrollments.find((row) => row.sport === field.sport && Date.parse(row.waveStart) === Date.parse(field.wave_start));
      if (!enrollment) return undefined;
      const [board] = await readAdminSettlementFields(db, account.userId, { ...account.state, enrollments: [enrollment] });
      return board;
    }));
    const now = new Date();
    const plan = planAdminFieldWave(field as WeekFieldRow, accounts, boards, now, body.action === "restart-field");
    const { error: commitError } = await db.rpc("admin_commit_field_wave", {
      p_action_id: body.actionId, p_actor_id: actor, p_field_id: body.fieldId, p_expected_updated_at: body.updatedAt,
      p_target_id: body.target, p_reason: body.reason.trim(), p_action: body.action, p_now: now.toISOString(),
      p_next_field: plan.nextField, p_accounts: plan.snapshots,
    });
    if (commitError) return NextResponse.json({ error: "field_not_committed_reload", detail: commitError.message }, { status: 409 });
    return NextResponse.json({ persisted: true, actionId: body.actionId, affectedAthletes: accounts.length, nextStartsAt: plan.nextField.wave_start, nextEndsAt: plan.nextField.week_end });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "field_unavailable" }, { status: 500 });
  }
}
