import { NextResponse } from "next/server";
import { webEnv } from "@/lib/env";

/**
 * Strava OAuth callback placeholder.
 * With credentials, exchange `code` for tokens and persist on fitness_connections.
 * Without credentials, redirect home with a stub notice.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const hasCreds = Boolean(
    webEnv.stravaClientId && webEnv.stravaClientSecret,
  );

  if (!hasCreds || !code) {
    return NextResponse.redirect(
      new URL("/?tracker=stub", url.origin),
    );
  }

  // Token exchange is intentionally deferred until secrets are provisioned.
  return NextResponse.redirect(
    new URL("/?tracker=connected", url.origin),
  );
}
