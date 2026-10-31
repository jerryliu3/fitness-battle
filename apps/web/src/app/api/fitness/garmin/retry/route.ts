export const maxDuration = 60;

import { serviceDb } from "@/lib/fitness-store";
import { serverEnv } from "@/lib/env";
import { drainGarminPush, secretMatches } from "@/lib/garmin-inbox";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  let authorized = secretMatches(token, serverEnv.cronSecret);
  if (!authorized && token && token.length >= 32 && token.length <= 512) {
    const result = await serviceDb()?.rpc("authorize_garmin_retry", { p_secret: token });
    authorized = !result?.error && result?.data === true;
  }
  if (!authorized) {
    return new Response(null, { status: 401 });
  }
  try { const result = await drainGarminPush(100); return Response.json(result, { status: result.failed ? 503 : 200 }); }
  catch { return Response.json({ error: "retry_failed" }, { status: 503 }); }
}
