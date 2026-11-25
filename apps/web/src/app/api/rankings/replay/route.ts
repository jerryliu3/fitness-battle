import {NextResponse} from "next/server";
import {RACE_DISTANCES,raceQuery} from "@fitness-battle/shared";
import {loadReplayCompactPage,loadReplayPage} from "@/lib/race-results";
export async function GET(request:Request) {
  const params=new URL(request.url).searchParams,query=raceQuery(params),distance=RACE_DISTANCES.find(d=>d.slug===params.get("distance")),clock=params.get("clock") ?? "chip";
  const raw=params.get("ids"),ids=raw===null ? null : raw==="" ? [] : raw.split(",").map(Number),after=Number(params.get("after") ?? 0);
  const compact=params.get("format")==="compact";
  if(!distance || !query.editionId || query.editionError || !["chip","gun"].includes(clock) || !Number.isSafeInteger(after) || after<0
    || (ids && (ids.length>100 || ids.some(id=>!Number.isSafeInteger(id) || id<1)))) return NextResponse.json({error:"Invalid replay scope"},{status:400});
  try {
    const sex=params.get("sex")==="all" ? "all" : query.sex;
    const data=compact
      ? await loadReplayCompactPage(query.editionId,distance.stored,sex,clock,ids,after,query.includeWheelchair)
      : await loadReplayPage(query.editionId,distance.stored,sex,clock,ids,after,query.includeWheelchair);
    return NextResponse.json(data ?? {error:"Reviewed course and timing profiles unavailable"},{status:data ? 200 : 404,headers:{
      "Cache-Control":"public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
      "CDN-Cache-Control":"public, s-maxage=600, stale-while-revalidate=86400",
    }});
  }
  catch {return NextResponse.json({error:"Replay unavailable"},{status:503});}
}
