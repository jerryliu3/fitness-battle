import { serverEnv } from "@/lib/env";
import { resolveRequestUser } from "@/lib/auth/request-user";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const rateBuckets = new Map<string, number[]>();

function clientKey(request: Request, userId?: string): string {
  if (userId) return `u:${userId}`;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return `ip:${forwarded || realIp || "unknown"}`;
}

function isRateLimited(key: string, now = Date.now()): boolean {
  const cutoff = now - RATE_WINDOW_MS;
  const recent = (rateBuckets.get(key) ?? []).filter((ts) => ts > cutoff);
  if (recent.length >= RATE_MAX) {
    rateBuckets.set(key, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(key, recent);
  if (rateBuckets.size > 500) {
    for (const [k, list] of rateBuckets) {
      if (list.every((ts) => ts <= cutoff)) rateBuckets.delete(k);
    }
  }
  return false;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Please submit your request from the app." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length")) > 16000) {
    return Response.json({ error: "Your request is too long." }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request payload." }, { status: 400 });
  }

  // Honeypot for automated bots
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return Response.json({ sent: true });
  }

  const race = typeof body.race === "string" ? body.race.trim() : "";
  if (race.length < 2 || race.length > 2000) {
    return Response.json({ error: "Enter the race name or details in 2–2,000 characters." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length > 120) {
    return Response.json({ error: "Name must be 120 characters or fewer." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) {
    return Response.json({ error: "Enter a valid email address or leave it blank." }, { status: 400 });
  }

  const surface = body.surface === "observatory" || body.surface === "replay" ? body.surface : "pace";
  const user = await resolveRequestUser(request).catch(() => null);

  if (isRateLimited(clientKey(request, user?.id))) {
    return Response.json({ error: "Too many race requests. Please try again in a few minutes." }, { status: 429 });
  }

  if (!serverEnv.resendApiKey || !serverEnv.issueReportFrom) {
    return Response.json(
      { error: "Race requests are temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const replyTo = email || user?.email || undefined;
  const metaLines = [
    `Surface: ${surface}`,
    user?.id ? `Account: ${user.id}` : "Account: Guest",
    name ? `Name: ${name}` : null,
    email ? `Email: ${email}` : user?.email ? `Account email: ${user.email}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const subjectRace = race.replace(/\s+/g, " ").slice(0, 80);

  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: serverEnv.issueReportFrom,
        to: [serverEnv.issueReportTo],
        reply_to: replyTo,
        subject: `Overtaek race request: ${subjectRace}`,
        text: `${metaLines}\n\n${race}`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!result.ok) throw new Error("delivery_failed");
    return Response.json({ sent: true });
  } catch {
    return Response.json({ error: "We couldn't send your request. Please try again." }, { status: 502 });
  }
}
