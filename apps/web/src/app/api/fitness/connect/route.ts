import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider } from "@/lib/fitness";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  const userId = await resolveUserId(body.userId);
  if (!userId) {
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401 },
    );
  }
  const provider = getServerFitnessProvider();
  const result = await provider.connect(userId);
  return NextResponse.json(result);
}
