import {NextResponse} from "next/server";
import {RACE_DISTANCES,raceQuery} from "@fitness-battle/shared";
import {loadReplayPage} from "@/lib/race-results";
export async function GET(request:Request) {
  const params=new URL(request.url).searchParams,query=raceQuery(params),distance=RACE_DISTANCES.find(d=>d.slug===params.get("distance")),clock=params.get("clock") ?? "chip";
  const raw=params.get("ids"),ids=raw===null ? null : raw==="" ? [] : raw.split(",").map(Number),after=Number(params.get("after") ?? 0);
  if(!distance || !query.editionId || query.editionError || !["chip","gun"].includes(clock) || !Number.isSafeInteger(after) || after<0
    || (ids && (ids.length>100 || ids.some(id=>!Number.isSafeInteger(id) || id<1)))) return NextResponse.json({error:"Invalid replay scope"},{status:400});
  try {const data=await loadReplayPage(query.editionId,distance.stored,params.get("sex")==="all" ? "all" : query.sex,clock,ids,after);return NextResponse.json(data ?? {error:"Reviewed course and timing profiles unavailable"},{status:data ? 200 : 404,headers:{"Cache-Control":"no-store"}});}
  catch {return NextResponse.json({error:"Replay unavailable"},{status:503});}
}
