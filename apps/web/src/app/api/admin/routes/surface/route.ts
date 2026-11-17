import { NextResponse } from "next/server";
import { authorizeAdmin, adminDatabase } from "@/lib/admin-auth";
import { ROUTE_ID } from "@/lib/admin-route-input";
import { ONBOARDING_OVERTAKE_SURFACE_ID } from "@fitness-battle/shared";

const SURFACE_ID = /^[a-z0-9-]{3,80}$/;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const actor = await authorizeAdmin(request);
  if (!actor) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  let body: { surfaceId?: unknown; routeId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid assignment JSON." }, { status: 400 }); }
  if (typeof body.surfaceId !== "string" || !SURFACE_ID.test(body.surfaceId)) {
    return NextResponse.json({ error: "Enter a valid surface ID." }, { status: 400 });
  }
  if (body.surfaceId !== ONBOARDING_OVERTAKE_SURFACE_ID) {
    return NextResponse.json({ error: "That surface is not editable yet." }, { status: 400 });
  }
  if (typeof body.routeId !== "string" || !ROUTE_ID.test(body.routeId)) {
    return NextResponse.json({ error: "Enter a valid route ID." }, { status: 400 });
  }
  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  try {
    const { data, error } = await db.rpc("admin_assign_route_surface", {
      p_actor_id: actor,
      p_surface_id: body.surfaceId,
      p_route_id: body.routeId,
    });
    if (error) {
      if (error.code === "23503") return NextResponse.json({ error: "Route not found. Reload the catalog." }, { status: 404 });
      throw error;
    }
    if (!data) throw new Error("missing_surface");
    return NextResponse.json({ surface: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Surface assignment was not saved." }, { status: 503 }); }
}