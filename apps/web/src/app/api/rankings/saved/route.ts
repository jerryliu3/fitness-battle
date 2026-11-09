import { NextResponse } from "next/server";
import { raceResultIds } from "@fitness-battle/shared";
import { loadSavedRaceResults } from "@/lib/race-results";
export async function GET(request: Request) {
  const ids = raceResultIds((new URL(request.url).searchParams.get("ids") ?? "").split(",").map(Number));
  try {
    const data = await loadSavedRaceResults(ids);
    return NextResponse.json(data, {headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"Results unavailable"}, {status:503}); }
}
