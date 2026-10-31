import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { createRequestClient } from "@/lib/supabase/request";
import { GARMIN_FEEDS } from "@/lib/garmin-feeds";

/** Owner-only access to retained provider metrics; no OAuth tokens or file cache. */
export async function GET(request: Request) {
  if (!await resolveRequestUserId(request)) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const query = new URL(request.url).searchParams, feed = query.get("feed"), before = query.get("before");
  if (!feed || !(GARMIN_FEEDS as readonly string[]).includes(feed) || (before && !Number.isFinite(Date.parse(before)))) return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  const db = await createRequestClient(request);
  const { data, error } = await db.rpc("garmin_records_page", { p_feed: feed, p_before: before });
  if (error) return NextResponse.json({ error: "records_unavailable" }, { status: 503 });
  return NextResponse.json({ records: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
