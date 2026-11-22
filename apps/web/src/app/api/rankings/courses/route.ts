import { NextResponse } from "next/server";
import { loadReplayCoursePreviews } from "@/lib/race-results";

export async function GET() {
  try {
    return NextResponse.json(await loadReplayCoursePreviews(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({}, { status: 503 });
  }
}
