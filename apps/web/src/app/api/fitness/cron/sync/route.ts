export const maxDuration = 60;

import { runBackgroundProviderSync } from "@/lib/background-fitness-sync";
import { serverEnv } from "@/lib/env";
import { secretMatches } from "@/lib/garmin-inbox";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;
  if (!secretMatches(token, serverEnv.cronSecret)) {
    return new Response(null, { status: 401 });
  }
  try {
    const summary = await runBackgroundProviderSync();
    return Response.json(summary);
  } catch {
    return Response.json({ error: "background_sync_failed" }, { status: 503 });
  }
}
