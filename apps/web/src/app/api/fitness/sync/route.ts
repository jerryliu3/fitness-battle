import { NextResponse } from "next/server";
import type { CategorySlug } from "@fitness-battle/shared";
import { getServerFitnessProvider } from "@/lib/fitness";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    categorySlug?: CategorySlug;
  };
  const userId = body.userId ?? "demo-user";
  const provider = getServerFitnessProvider();
  const result = await provider.syncActivities(userId, {
    categorySlug: body.categorySlug ?? "running",
  });
  return NextResponse.json(result);
}
