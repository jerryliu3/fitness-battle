import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "fitness-battle-web",
    time: new Date().toISOString(),
  });
}
