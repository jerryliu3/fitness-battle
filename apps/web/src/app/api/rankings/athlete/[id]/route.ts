import {NextResponse} from "next/server";
import {raceQuery} from "@fitness-battle/shared";
import {loadAthleteHistory} from "@/lib/race-results";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const id=Number((await params).id),page=raceQuery(new URL(request.url).searchParams).page;
  if(!Number.isSafeInteger(id) || id<1) return NextResponse.json({error:"Invalid athlete"},{status:400});
  try {const data=await loadAthleteHistory(id,page);return NextResponse.json(data ?? {error:"Athlete unavailable"},{status:data ? 200 : 404,headers:{"Cache-Control":"no-store"}});}
  catch {return NextResponse.json({error:"Athlete history unavailable"},{status:503});}
}
