import { NextResponse } from "next/server";
import { createStravaProvider } from "@fitness-battle/shared";
import { serverEnv } from "@/lib/env";

/**
 * Strava OAuth callback.
 * With credentials: exchange code → tokens → mark connected.
 * Without credentials: redirect with tracker=stub (never claim connected).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const hasCreds = Boolean(
    serverEnv.stravaClientId && serverEnv.stravaClientSecret,
  );

  if (!hasCreds || !code) {
    return NextResponse.redirect(new URL("/you?tracker=stub", url.origin));
  }

  const userId = state || "unknown";
  const provider = createStravaProvider({
    clientId: serverEnv.stravaClientId,
    clientSecret: serverEnv.stravaClientSecret,
    redirectUri: serverEnv.stravaRedirectUri,
  });

  try {
    await provider.completeOAuth(userId, code);
    return NextResponse.redirect(
      new URL("/you?tracker=connected", url.origin),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/you?tracker=error", url.origin),
    );
  }
}
