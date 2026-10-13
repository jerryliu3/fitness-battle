import { NextResponse } from "next/server";

export function trackerRedirect(
  origin: string,
  provider: string,
  outcome: "connected" | "stub" | "error",
): NextResponse {
  const url = new URL("/you", origin);
  url.searchParams.set("tracker", outcome);
  url.searchParams.set("provider", provider);
  return NextResponse.redirect(url);
}
