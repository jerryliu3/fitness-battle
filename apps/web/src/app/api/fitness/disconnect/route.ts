import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider, isOAuthProvider } from "@/lib/fitness";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    provider?: string;
  };
  const userId = await resolveRequestUserId(request, body.userId);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const providerId = body.provider && isOAuthProvider(body.provider) ? body.provider : "strava";
  const provider = getServerFitnessProvider(providerId);
  await provider.disconnect(userId);
  return NextResponse.json({ ok: true, provider: provider.id });
}
