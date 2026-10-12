import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/auth/request-user";
import { serverEnv, webEnv } from "@/lib/env";
import { getServerFitnessProvider } from "@/lib/fitness";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Strava OAuth callback.
 * Live mode exchanges the code only for the signed-in user, and only when
 * `state` matches that user. Demo mode never stores tokens from this URL.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const hasCreds = Boolean(
    serverEnv.stravaClientId &&
      serverEnv.stravaClientSecret &&
      serverEnv.stravaRedirectUri,
  );
  const { configured } = getSupabaseConfig();
  const liveAuth = configured && !webEnv.useDemoData;

  if (!hasCreds || !code) {
    return NextResponse.redirect(new URL("/you?tracker=stub", url.origin));
  }

  if (!liveAuth) {
    return NextResponse.redirect(new URL("/you?tracker=stub", url.origin));
  }

  const userId = await resolveSessionUserId();
  if (!userId || !state || state !== userId) {
    return NextResponse.redirect(new URL("/you?tracker=error", url.origin));
  }

  const provider = getServerFitnessProvider();
  if (!provider.completeOAuth) {
    return NextResponse.redirect(new URL("/you?tracker=error", url.origin));
  }

  try {
    await provider.completeOAuth(userId, code);
    return NextResponse.redirect(new URL("/you?tracker=connected", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/you?tracker=error", url.origin));
  }
}
