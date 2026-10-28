import { NextResponse } from "next/server";
import { authorizeAdmin, adminDatabase } from "@/lib/admin-auth";
import { MAX_ADMIN_ROUTE_BYTES, ROUTE_ID, validateAdminRoute } from "@/lib/admin-route-input";

export async function GET(request: Request) {
  if (!await authorizeAdmin(request)) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (id !== null && !ROUTE_ID.test(id)) return NextResponse.json({ error: "invalid_route_id" }, { status: 400 });
  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  try {
    const query = db.from("race_routes").select(id ? "id,name,location,coordinates,is_active,updated_at" : "id,name,location,is_active,updated_at");
    const { data, error } = id ? await query.eq("id", id).maybeSingle() : await query.order("id");
    if (error) throw error;
    if (id && !data) return NextResponse.json({ error: "Route not found. Reload the catalog." }, { status: 404 });
    return NextResponse.json(id ? { route: data } : { routes: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Route catalog is unavailable. Please try again." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const actor = await authorizeAdmin(request);
  if (!actor) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  let input: ReturnType<typeof validateAdminRoute>;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Enter a route.");
    const decoder = new TextDecoder(); let text = "", bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_ADMIN_ROUTE_BYTES) { await reader.cancel(); return NextResponse.json({ error: "Use a route under 4 MB." }, { status: 413 }); }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    input = validateAdminRoute(JSON.parse(text));
  } catch (error) { return NextResponse.json({ error: error instanceof SyntaxError ? "Enter valid route JSON." : error instanceof Error ? error.message : "Invalid route." }, { status: 400 }); }
  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  try {
    const { data, error } = await db.rpc("admin_save_race_route", {
      p_actor_id: actor, p_route_id: input.id, p_name: input.name, p_location: input.location,
      p_coordinates: input.coordinates, p_is_active: input.is_active, p_expected_updated_at: input.updatedAt,
    });
    if (error) {
      if (["40001", "23505"].includes(error.code)) return NextResponse.json({ error: "Route changed or its ID is already in use. Reload before saving." }, { status: 409 });
      throw error;
    }
    if (!data) throw new Error("missing_route");
    return NextResponse.json({ route: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Route was not saved. Please reload and try again." }, { status: 503 }); }
}
