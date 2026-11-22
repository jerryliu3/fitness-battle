import { NextResponse } from "next/server";
import { loadReplayCoursePreviews } from "@/lib/race-results";

export async function GET() {
  try {
    return NextResponse.json(await loadReplayCoursePreviews(), { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } });
  } catch {
    return NextResponse.json({}, { status: 503 });
  }
}
