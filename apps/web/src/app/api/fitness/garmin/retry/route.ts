import { serverEnv } from "@/lib/env";
import { drainGarminPush, secretMatches } from "@/lib/garmin-inbox";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!secretMatches(authorization?.startsWith("Bearer ") ? authorization.slice(7) : null, serverEnv.cronSecret)) {
    return new Response(null, { status: 401 });
  }
  try { const result = await drainGarminPush(); return Response.json(result, { status: result.failed ? 503 : 200 }); }
  catch { return Response.json({ error: "retry_failed" }, { status: 503 }); }
}
