import { NextResponse } from "next/server";
import { authorizeAdmin, adminDatabase } from "@/lib/admin-auth";
import { specialEventError, validateSpecialEventEditionInput } from "@fitness-battle/shared";

type EditionRow = Record<string, unknown>;

const mapEdition = (row: EditionRow, entrantCount = 0) => ({
  id: row.id, slug: row.slug, seriesKey: row.series_key, sport: row.sport,
  title: row.title, subtitle: row.subtitle, rulesVersion: row.rules_version, config: row.config,
  registrationOpensAt: row.registration_opens_at, registrationClosesAt: row.registration_closes_at,
  startsAt: row.starts_at, endsAt: row.ends_at, published: row.published,
  finalizedAt: row.finalized_at, settledAt: row.settled_at,
  entrantCount, entry: null, receipts: [],
});

export async function GET(request: Request) {
  if (!await authorizeAdmin(request)) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  try {
    const { data: rows, error } = await db
      .from("special_event_editions")
      .select("id,slug,series_key,sport,title,subtitle,rules_version,config,registration_opens_at,registration_closes_at,starts_at,ends_at,published,finalized_at,settled_at")
      .order("starts_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const list = (rows ?? []) as EditionRow[];
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
      { editions: list.map((r) => mapEdition(r, counts.get(String(r.id)) ?? 0)) },
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

  let input: ReturnType<typeof validateSpecialEventEditionInput>;
  try { input = validateSpecialEventEditionInput(await request.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid edition." }, { status: 400 }); }

  const db = adminDatabase();
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
    return NextResponse.json({ edition: mapEdition(data as EditionRow) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Edition was not saved. Please reload and try again." }, { status: 503 });
  }
}
