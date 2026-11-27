import { resolveRequestUser } from "@/lib/auth/request-user";
import {
  checkSupportRateLimit,
  isHoneypotTriggered,
  isSupportEmailConfigured,
  resolveSurface,
  sendSupportEmail,
  validateOptionalContact,
  validateSameOrigin,
} from "@/lib/rankings/support-submission";

const rateBuckets = new Map<string, number[]>();

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  if (Number(request.headers.get("content-length")) > 16000) {
    return Response.json({ error: "Your request is too long." }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if (isHoneypotTriggered(body as Record<string, unknown>)) {
    return Response.json({ sent: true });
  }

  const race = typeof body.race === "string" ? body.race.trim() : "";
  if (race.length < 2 || race.length > 2000) {
    return Response.json({ error: "Enter the race name or details in 2–2,000 characters." }, { status: 400 });
  }

  const contact = validateOptionalContact(body.name, body.email);
  if ("error" in contact) {
    return Response.json({ error: contact.error }, { status: 400 });
  }

  const surface = resolveSurface(body.surface);
  const user = await resolveRequestUser(request).catch(() => null);

  if (checkSupportRateLimit(rateBuckets, request, user?.id)) {
    return Response.json({ error: "Too many race requests. Please try again in a few minutes." }, { status: 429 });
  }

  if (!isSupportEmailConfigured()) {
    return Response.json(
      { error: "Race requests are temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const replyTo = contact.email || user?.email || undefined;
  const metaLines = [
    `Surface: ${surface}`,
    user?.id ? `Account: ${user.id}` : "Account: Guest",
    contact.name ? `Name: ${contact.name}` : null,
    contact.email ? `Email: ${contact.email}` : user?.email ? `Account email: ${user.email}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const subjectRace = race.replace(/\s+/g, " ").slice(0, 80);

  try {
    const ok = await sendSupportEmail({
      replyTo,
      subject: `Overtaek race request: ${subjectRace}`,
      text: `${metaLines}\n\n${race}`,
    });
    if (!ok) throw new Error("delivery_failed");
    return Response.json({ sent: true });
  } catch {
    return Response.json({ error: "We couldn't send your request. Please try again." }, { status: 502 });
  }
}
