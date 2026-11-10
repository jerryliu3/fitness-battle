import {NextResponse} from "next/server";
import {RACE_DISTANCES,raceQuery} from "@fitness-battle/shared";
import {loadEditionHistory} from "@/lib/race-results";
export async function GET(request:Request) {
  const params=new URL(request.url).searchParams;
  const query=raceQuery(params),distance=RACE_DISTANCES.find(d=>d.slug===params.get("distance"));
  if(!distance || !query.editionId || query.editionError) return NextResponse.json({error:"Choose an event edition and distance."},{status:400});
  try {return NextResponse.json(await loadEditionHistory(query.editionId,distance.stored,query.sex),{headers:{"Cache-Control":"no-store"}});}
  catch {return NextResponse.json({error:"History unavailable"},{status:503});}
}
