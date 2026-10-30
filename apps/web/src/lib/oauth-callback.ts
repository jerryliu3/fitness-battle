import { webProductPath } from "@fitness-battle/shared";
import { NextResponse } from "next/server";
import { verifyOAuthState, type OAuthStateChannel } from "./oauth-state";

/**
 * Return to the surface that started OAuth. Only authenticated mobile state
 * may launch the native scheme; web and invalid states stay in the browser.
 */
export function trackerRedirect(
  origin: string,
  provider: string,
  outcome: "connected" | "stub" | "error",
  channel: OAuthStateChannel = "session",
): NextResponse {
  const webUrl = new URL(webProductPath("/athlete"), origin);
  webUrl.searchParams.set("panel", "connections");
  webUrl.searchParams.set("tracker", outcome);
  webUrl.searchParams.set("provider", provider);
  if (channel === "session") return NextResponse.redirect(webUrl, { status: 303, headers: { "Cache-Control": "no-store" } });
  // Three slashes so Expo Router treats `you` as a path, not a host.
  const deep = `overtaek:///you?tracker=${encodeURIComponent(outcome)}&provider=${encodeURIComponent(provider)}&panel=connections`;
  const web = webUrl.toString();
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connecting…</title>
  <script>
    (function () {
      var deep = ${JSON.stringify(deep)};
      var web = ${JSON.stringify(web)};
      window.location.href = deep;
      setTimeout(function () { window.location.replace(web); }, 900);
    })();
  </script>
</head>
<body style="font-family: system-ui, sans-serif; padding: 2rem;">
  <p>Returning to Overtaek…</p>
  <p><a href="${web.replace(/"/g, "&quot;")}">Continue in browser</a></p>
</body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function trackerRedirectForRequest(request: Request, provider: string, outcome: "connected" | "stub" | "error"): NextResponse {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const channel = state && verifyOAuthState(state, provider)?.c === "bearer" ? "bearer" : "session";
  return trackerRedirect(url.origin, provider, outcome, channel);
}
