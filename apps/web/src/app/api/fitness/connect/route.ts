import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider, isOAuthProvider } from "@/lib/fitness";
import { withSignedOAuthState, type OAuthStateChannel } from "@/lib/oauth-state";

function connectChannel(request: Request): OAuthStateChannel {
  const header = request.headers.get("authorization") ?? "";
  return /^Bearer\s+\S+/i.test(header) ? "bearer" : "session";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    provider?: string;
  };
  const userId = await resolveRequestUserId(request, body.userId);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const providerId = isOAuthProvider(body.provider ?? "") ? body.provider! : "strava";
  if (!isOAuthProvider(providerId)) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 400 });
  }
  const provider = getServerFitnessProvider(providerId);
  const result = await provider.connect(userId);
  if (result.authorizeUrl) {
    return NextResponse.json({
      ...result,
      authorizeUrl: withSignedOAuthState(
        result.authorizeUrl,
        userId,
        providerId,
        connectChannel(request),
      ),
    });
  }
  return NextResponse.json(result);
}
