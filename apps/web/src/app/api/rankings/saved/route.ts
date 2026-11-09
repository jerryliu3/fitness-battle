import { NextResponse } from "next/server";
import { raceResultIds } from "@fitness-battle/shared";
import { createRankingsClient } from "@/lib/rankings";
export async function GET(request: Request) {
  const ids = raceResultIds((new URL(request.url).searchParams.get("ids") ?? "").split(",").map(Number));
  const client = createRankingsClient();
  if (!client) return NextResponse.json({error:"Results unavailable"}, {status:503});
  try {
    const {data,error} = await client.rpc("rankings_saved", {p_ids:ids});
    if (error) throw error;
    return NextResponse.json(data, {headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"Results unavailable"}, {status:503}); }
}
