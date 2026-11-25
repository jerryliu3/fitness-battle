import { NextResponse } from "next/server";
import { loadRaceCoverage } from "@/lib/race-results";
export async function GET() {
  try {
    return NextResponse.json(await loadRaceCoverage(), {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
        "CDN-Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  }
  catch { return NextResponse.json({error:"Coverage unavailable"},{status:503}); }
}
