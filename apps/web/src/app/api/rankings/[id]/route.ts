import { NextResponse } from "next/server";
import { loadRaceReport } from "@/lib/race-results";
const cacheHeaders = {
  "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
  "CDN-Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  try {
    const report = await loadRaceReport(id);
    if (!report) return NextResponse.json({ error: "Result not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(report, { status: 200, headers: cacheHeaders });
  } catch { return NextResponse.json({ error: "Result unavailable" }, { status: 503 }); }
}
