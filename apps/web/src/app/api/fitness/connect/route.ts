import { NextResponse } from "next/server";
import { getServerFitnessProvider } from "@/lib/fitness";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
  };
  const userId = body.userId ?? "demo-user";
  const provider = getServerFitnessProvider();
  const result = await provider.connect(userId);
  return NextResponse.json(result);
}
