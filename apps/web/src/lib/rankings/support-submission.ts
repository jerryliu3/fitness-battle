import { serverEnv } from "@/lib/env";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

export interface SupportEmailAttachment {
  filename: string;
  content: string;
  content_type?: string;
}

export function validateSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Please submit your request from the app." }, { status: 403 });
  }
  return null;
}

export function isHoneypotTriggered(body: Record<string, unknown>): boolean {
  return typeof body.website === "string" && body.website.trim().length > 0;
}

export function validateOptionalContact(
  nameRaw: unknown,
  emailRaw: unknown,
): { name: string; email: string } | { error: string } {
  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  if (name.length > 120) {
    return { error: "Name must be 120 characters or fewer." };
  }
  const email = typeof emailRaw === "string" ? emailRaw.trim() : "";
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) {
    return { error: "Enter a valid email address or leave it blank." };
  }
  return { name, email };
}

export function resolveSurface(raw: unknown): "observatory" | "replay" | "pace" {
  return raw === "observatory" || raw === "replay" ? raw : "pace";
}

export function checkSupportRateLimit(
  buckets: Map<string, number[]>,
  request: Request,
  userId?: string,
  now = Date.now(),
): boolean {
  const key = userId
    ? `u:${userId}`
    : `ip:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown"}`;
  const cutoff = now - RATE_WINDOW_MS;
  const recent = (buckets.get(key) ?? []).filter((ts) => ts > cutoff);
  if (recent.length >= RATE_MAX) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 500) {
    for (const [k, list] of buckets) {
      if (list.every((ts) => ts <= cutoff)) buckets.delete(k);
    }
  }
  return false;
}

export function isSupportEmailConfigured(): boolean {
  return Boolean(serverEnv.resendApiKey && serverEnv.issueReportFrom);
}

export async function sendSupportEmail({
  subject,
  text,
  replyTo,
  attachments,
}: {
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: SupportEmailAttachment[];
}): Promise<boolean> {
  const payload: Record<string, unknown> = {
    from: serverEnv.issueReportFrom,
    to: [serverEnv.issueReportTo],
    reply_to: replyTo,
    subject,
    text,
  };
  if (attachments && attachments.length > 0) {
    payload.attachments = attachments;
  }
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  return result.ok;
}
