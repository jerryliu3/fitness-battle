import { NextResponse } from "next/server";
import { loadReplayCoursePreviews } from "@/lib/race-results";

export async function GET() {
  try {
    return NextResponse.json(await loadReplayCoursePreviews(), {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
        "CDN-Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({}, { status: 503 });
  }
}
