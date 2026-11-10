import Link from "next/link";
import {AppHeading} from "@/ui/section";
import {RACE_DISTANCES,raceQuery} from "@fitness-battle/shared";
import {ReplayPlayer} from "./replay-player";
export const dynamic="force-dynamic";
export default async function ReplayPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const raw=await searchParams,params=new URLSearchParams();for(const [key,value] of Object.entries(raw)) if(typeof value==="string") params.set(key,value);
  const query=raceQuery(params),distance=RACE_DISTANCES.find(d=>d.slug===params.get("distance")),clock=params.get("clock") ?? "chip";
  if(!distance || !query.editionId || query.editionError || !["chip","gun"].includes(clock)) return <main className="rankings-wrap"><AppHeading level={1} role="display">Choose a race to replay</AppHeading><Link href="/pace">Race rankings</Link></main>;
  return <main className="rankings-wrap race-explorer"><Link href={`/pace?distance=${distance.slug}&edition=${query.editionId}&sex=${query.sex}`}>← Edition results</Link><AppHeading level={1} role="display">Race replay</AppHeading><ReplayPlayer scope={{edition:String(query.editionId),distance:distance.slug,sex:params.get("sex")==="all" ? "all" : query.sex,clock}} initialIds={params.get("ids") ?? ""} /></main>;
}
