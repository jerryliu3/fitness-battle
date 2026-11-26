import {NextResponse} from "next/server";
import {raceQuery} from "@fitness-battle/shared";
import {loadAthleteHistory} from "@/lib/race-results";
const cacheHeaders = {
  "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
  "CDN-Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
};
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const id=Number((await params).id),page=raceQuery(new URL(request.url).searchParams).page;
  if(!Number.isSafeInteger(id) || id<1) return NextResponse.json({error:"Invalid athlete"},{status:400});
  try {const data=await loadAthleteHistory(id,page);return data ? NextResponse.json(data,{status:200,headers:cacheHeaders}) : NextResponse.json({error:"Athlete unavailable"},{status:404,headers:{"Cache-Control":"no-store"}});}
  catch {return NextResponse.json({error:"Athlete history unavailable"},{status:503});}
}
