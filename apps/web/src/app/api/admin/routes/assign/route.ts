import { NextResponse } from "next/server";
import { authorizeAdmin, adminDatabase } from "@/lib/admin-auth";
import { ROUTE_ID } from "@/lib/admin-route-input";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const actor = await authorizeAdmin(request);
  if (!actor) return NextResponse.json({ error: "admin_required" }, { status: 403 });
  let body: { waveStart?: unknown; routeId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid assignment JSON." }, { status: 400 }); }
  if (typeof body.waveStart !== "string" || !Number.isFinite(Date.parse(body.waveStart))) {
    return NextResponse.json({ error: "Enter a valid wave start timestamp." }, { status: 400 });
  }
  if (typeof body.routeId !== "string" || !ROUTE_ID.test(body.routeId)) {
    return NextResponse.json({ error: "Enter a valid route ID." }, { status: 400 });
  }
  const db = adminDatabase();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 503 });
  try {
    const { data, error } = await db.rpc("admin_assign_weekly_race_route", {
      p_actor_id: actor,
      p_wave_start: body.waveStart,
      p_route_id: body.routeId,
    });
    if (error) {
      if (error.code === "40001") return NextResponse.json({ error: "That competition wave has already started. Assignments are frozen." }, { status: 409 });
      if (error.code === "23503") return NextResponse.json({ error: "Route not found. Reload the catalog." }, { status: 404 });
      throw error;
    }
    if (!data) throw new Error("missing_assignment");
    return NextResponse.json({ assignment: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Assignment was not saved. Please reload and try again." }, { status: 503 }); }
}