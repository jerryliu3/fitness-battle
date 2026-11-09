import { NextResponse } from "next/server";
import { loadRaceResults } from "@/lib/race-results";
import { raceQuery, RACE_DISTANCES } from "@fitness-battle/shared";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const distance = RACE_DISTANCES.find(d => d.slug === params.get("distance"));
  if (!distance) return NextResponse.json({ error: "Invalid distance" }, { status: 400 });
  const query = raceQuery(params);
  if (query.dateError) return NextResponse.json({error:query.dateError},{status:400});
  try {
    const data = await loadRaceResults(distance.stored, query);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Race results are unavailable. Please try again." }, { status: 503 });
  }
}
