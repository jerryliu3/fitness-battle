import { NextResponse } from "next/server";

/**
 * After OAuth, try the mobile deep link first, then fall back to the web Athlete page.
 * Installed apps intercept `fitnessbattle://`; browsers continue to `/you`.
 */
export function trackerRedirect(
  origin: string,
  provider: string,
  outcome: "connected" | "stub" | "error",
): NextResponse {
  const webUrl = new URL("/you", origin);
  webUrl.searchParams.set("tracker", outcome);
  webUrl.searchParams.set("provider", provider);
  const deep = `fitnessbattle://you?tracker=${encodeURIComponent(outcome)}&provider=${encodeURIComponent(provider)}`;
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
  <p>Returning to Fitness Battle…</p>
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
