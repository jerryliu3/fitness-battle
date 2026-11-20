import { NextResponse } from "next/server";
import { authorizeAdmin, adminDatabase } from "@/lib/admin-auth";
import {
  specialEventError,
  validateSpecialEventEditionInput,
  validateSpecialEventTemplateInput,
} from "@fitness-battle/shared";

type Row = Record<string, unknown>;

const mapEdition = (row: Row, entrantCount = 0) => ({
  id: row.id, slug: row.slug, seriesKey: row.series_key, sport: row.sport,
  title: row.title, subtitle: row.subtitle, rulesVersion: row.rules_version, config: row.config,
  registrationOpensAt: row.registration_opens_at, registrationClosesAt: row.registration_closes_at,
  startsAt: row.starts_at, endsAt: row.ends_at, published: row.published,
  finalizedAt: row.finalized_at, settledAt: row.settled_at,
  entrantCount, entry: null, receipts: [],
});

const mapTemplate = (row: Row) => ({
  id: row.id, seriesKey: row.series_key, sport: row.sport,
  title: row.title, subtitle: row.subtitle, config: row.config,
  cadenceWeeks: row.cadence_weeks, active: row.active, nextStartAt: row.next_start_at,
});

export async function GET(request: Request) {
  if (!await authorizeAdmin(request)) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  try {
    const [edRes, tplRes] = await Promise.all([
      db
        .from("special_event_editions")
        .select("id,slug,series_key,sport,title,subtitle,rules_version,config,registration_opens_at,registration_closes_at,starts_at,ends_at,published,finalized_at,settled_at")
        .order("starts_at", { ascending: false })
        .limit(100),
      db
        .from("special_event_templates")
        .select("id,series_key,sport,title,subtitle,config,cadence_weeks,active,next_start_at")
        .order("next_start_at", { ascending: true })
        .limit(50),
    ]);
    if (edRes.error) throw edRes.error;
    if (tplRes.error && !["42P01", "PGRST205"].includes(tplRes.error.code ?? "")) throw tplRes.error;
    const list = (edRes.data ?? []) as Row[];
    const counts = new Map<string, number>();
    if (list.length) {
      const { data: entries, error: entryError } = await db
        .from("special_event_entries")
        .select("edition_id,status")
        .in("edition_id", list.map((r) => String(r.id)));
      if (entryError) throw entryError;
      for (const e of (entries ?? []) as { edition_id: string; status: string }[]) {
        if (e.status !== "cancelled") counts.set(e.edition_id, (counts.get(e.edition_id) ?? 0) + 1);
      }
    }
    return NextResponse.json(
      {
        editions: list.map((r) => mapEdition(r, counts.get(String(r.id)) ?? 0)),
        templates: ((tplRes.data ?? []) as Row[]).map(mapTemplate),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Special events catalog is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const actor = await authorizeAdmin(request);
  if (!actor) return NextResponse.json({ error: "admin_required" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const isTemplate = Boolean(body && typeof body === "object" && (body as Row).kind === "template");

  const db = adminDatabase();
  if (isTemplate) {
    let input: ReturnType<typeof validateSpecialEventTemplateInput>;
    try { input = validateSpecialEventTemplateInput(body); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid template." }, { status: 400 }); }
    if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
    try {
      const { data, error } = await db.rpc("admin_save_special_event_template", {
        p_actor_id: actor, p_template_id: input.id, p_series_key: input.seriesKey,
        p_sport: input.sport, p_title: input.title, p_subtitle: input.subtitle,
        p_config: input.config, p_cadence_weeks: input.cadenceWeeks,
        p_active: input.active, p_next_start_at: input.nextStartAt,
      });
      if (error) {
        if (error.code === "23505") return NextResponse.json({ error: "That template series key is already in use." }, { status: 409 });
        throw error;
      }
      return NextResponse.json({ template: mapTemplate(data as Row) }, { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      return NextResponse.json({ error: "Template was not saved. Please reload and try again." }, { status: 503 });
    }
  }

  let input: ReturnType<typeof validateSpecialEventEditionInput>;
  try { input = validateSpecialEventEditionInput(body); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid edition." }, { status: 400 }); }
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  try {
    const { data, error } = await db.rpc("admin_save_special_event_edition", {
      p_actor_id: actor, p_edition_id: input.id, p_slug: input.slug, p_series_key: input.seriesKey,
      p_sport: input.sport, p_title: input.title, p_subtitle: input.subtitle, p_config: input.config,
      p_registration_opens_at: input.registrationOpensAt, p_registration_closes_at: input.registrationClosesAt,
      p_starts_at: input.startsAt, p_ends_at: input.endsAt, p_published: input.published,
    });
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "That edition slug is already in use." }, { status: 409 });
      if ((error.message ?? "").includes("edition_already_started")) return NextResponse.json({ error: specialEventError(error.message) }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ edition: mapEdition(data as Row) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Edition was not saved. Please reload and try again." }, { status: 503 });
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const actor = await authorizeAdmin(request);
  if (!actor) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const db = adminDatabase();
  if (body?.action === "materialize_templates") {
    if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
    const { data, error } = await db.rpc("admin_run_special_event_templates", { p_actor_id: actor });
    if (error) return NextResponse.json({ error: "Could not run template scheduler." }, { status: 503 });
    return NextResponse.json({ created: Number(data ?? 0) }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (!body || !UUID_RE.test(String(body.editionId ?? "")) || (body.action !== "finalize" && body.action !== "settle_round")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  const { data, error } = await db.rpc("admin_advance_special_event", {
    p_actor_id: actor, p_edition_id: body.editionId, p_action: body.action,
  });
  if (error) return NextResponse.json({ error: "Could not advance special event." }, { status: 503 });
  return NextResponse.json({ edition: data }, { headers: { "Cache-Control": "private, no-store" } });
}
