import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { CREW_CONTRACT_METRICS, crewPassportError } from "@fitness-battle/shared";

const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function GET(request: Request) {
  if (!await resolveRequestUserId(request)) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const crewId = new URL(request.url).searchParams.get("crewId");
  if (!uuid(crewId)) return NextResponse.json({ error: "invalid_crew" }, { status: 400 });
  const db = await createRequestClient(request);
  const { data, error } = await db.rpc("crew_passport", { p_crew_id: crewId });
  if (error) {
    const missing = ["PGRST202", "42883", "42P01"].includes(error.code);
    return NextResponse.json({ error: missing ? "Crew programs are not available on this server yet." : "Could not load crew programs. Try again." }, { status: error.message.includes("not_a_member") ? 403 : 503 });
  }
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  if (!await resolveRequestUserId(request)) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !uuid(body.crewId) || typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 80)
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const db = await createRequestClient(request);
  let result;
  if (body.action === "contract" && CREW_CONTRACT_METRICS.some(m => m.id === body.metric)
    && typeof body.target === "number" && Number.isFinite(body.target) && body.target > 0
    && (body.expectedId === null || uuid(body.expectedId))) {
    result = await db.rpc("set_crew_contract", { p_crew_id: body.crewId, p_title: body.title.trim(), p_metric: body.metric, p_target: body.target, p_expected_id: body.expectedId });
  } else if (body.action === "season" && typeof body.startsAt === "string" && typeof body.endsAt === "string"
    && Number.isFinite(Date.parse(body.startsAt)) && Number.isFinite(Date.parse(body.endsAt))) {
    result = await db.rpc("create_crew_season", { p_crew_id: body.crewId, p_title: body.title.trim(), p_starts_at: body.startsAt, p_ends_at: body.endsAt });
  } else return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  if (result.error) return NextResponse.json({ error: crewPassportError(result.error.message) }, { status: result.error.message.includes("contract_changed") ? 409 : 400 });
  return NextResponse.json({ id: result.data, persisted: true });
}
