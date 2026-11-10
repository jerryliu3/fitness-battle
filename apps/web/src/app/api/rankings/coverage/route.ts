import { NextResponse } from "next/server";
import { loadRaceCoverage } from "@/lib/race-results";
export async function GET() {
  try { return NextResponse.json(await loadRaceCoverage(),{headers:{"Cache-Control":"no-store"}}); }
  catch { return NextResponse.json({error:"Coverage unavailable"},{status:503}); }
}
