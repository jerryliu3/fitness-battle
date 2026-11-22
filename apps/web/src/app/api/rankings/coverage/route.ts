import { NextResponse } from "next/server";
import { loadRaceCoverage } from "@/lib/race-results";
export async function GET() {
  try { return NextResponse.json(await loadRaceCoverage(),{headers:{"Cache-Control":"public, max-age=300, stale-while-revalidate=600"}}); }
  catch { return NextResponse.json({error:"Coverage unavailable"},{status:503}); }
}
