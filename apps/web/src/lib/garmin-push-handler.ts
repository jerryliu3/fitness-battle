import { after, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { drainGarminPush, enqueueGarminPush, secretMatches } from "@/lib/garmin-inbox";

export async function receiveGarminPush(request: Request, secret: string | null) {
  if (!secretMatches(secret, serverEnv.garminWebhookSecret)) {
    return new Response(null, { status: 401 });
  }
  const length = Number(request.headers.get("content-length"));
  if (length > 4_000_000) return new Response(null, { status: 413 });
  let raw: string;
  try {
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400 });
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4_000_000) { await reader.cancel(); return new Response(null, { status: 413 }); }
      chunks.push(value);
    }
    raw = Buffer.concat(chunks).toString("utf8");
    await enqueueGarminPush(raw);
  } catch (error) {
    return new Response(null, { status: error instanceof SyntaxError || (error instanceof Error && error.message === "invalid_payload") ? 400 : 503 });
  }
  after(async () => { try { await drainGarminPush(); } catch { /* Retry via cron. */ } });
  return NextResponse.json({ ok: true });
}
