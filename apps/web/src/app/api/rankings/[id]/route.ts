import { NextResponse } from "next/server";
import { loadRaceReport } from "@/lib/race-results";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  try {
    const report = await loadRaceReport(id);
    return NextResponse.json(report ?? { error: "Result not found" }, { status: report ? 200 : 404, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Result unavailable" }, { status: 503 }); }
}
