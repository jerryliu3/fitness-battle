import { resolveRequestUser } from "@/lib/auth/request-user";
import {
  checkSupportRateLimit,
  isHoneypotTriggered,
  isSupportEmailConfigured,
  resolveSurface,
  sendSupportEmail,
  validateOptionalContact,
  validateSameOrigin,
  type SupportEmailAttachment,
} from "@/lib/rankings/support-submission";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_IMAGE_BASE64_LENGTH = 3_500_000;
const MAX_REQUEST_BYTES = 4_500_000;
const rateBuckets = new Map<string, number[]>();

function validateHttpUrl(raw: unknown): string | null | "invalid" {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > 1000) return "invalid";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "invalid";
    return parsed.toString();
  } catch {
    return "invalid";
  }
}

function validateImageAttachment(
  raw: unknown,
): { attachment: SupportEmailAttachment; contentType: string } | null | { error: string } {
  if (raw == null) return null;
  if (typeof raw !== "object") return { error: "Invalid image attachment." };

  const record = raw as Record<string, unknown>;
  const contentType = typeof record.contentType === "string" ? record.contentType.trim().toLowerCase() : "";
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return { error: "Upload a PNG, JPEG, WebP, or GIF image." };
  }

  const rawBase64 = typeof record.contentBase64 === "string" ? record.contentBase64.replace(/\s+/g, "") : "";
  if (!rawBase64 || rawBase64.length > MAX_IMAGE_BASE64_LENGTH || !BASE64_RE.test(rawBase64)) {
    return { error: "Image must be a valid image under 2.5 MB." };
  }

  const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1] || "png";
  const rawName = typeof record.filename === "string" ? record.filename.trim() : "";
  const cleaned = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const filename = cleaned && /\.[a-zA-Z0-9]+$/.test(cleaned) ? cleaned : `missing-result.${ext}`;

  return {
    attachment: {
      filename,
      content: rawBase64,
      content_type: contentType,
    },
    contentType,
  };
}

export async function POST(request: Request) {
  const originError = validateSameOrigin(request);
  if (originError) return originError;

  if (Number(request.headers.get("content-length")) > MAX_REQUEST_BYTES) {
    return Response.json({ error: "Your submission is too large. Keep images under 2.5 MB." }, { status: 413 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  if (isHoneypotTriggered(payload)) {
    return Response.json({ sent: true });
  }

  const athleteName = typeof payload.athleteName === "string" ? payload.athleteName.trim() : "";
  if (athleteName.length < 2 || athleteName.length > 120) {
    return Response.json({ error: "Enter the athlete's name (2–120 characters)." }, { status: 400 });
  }

  const race = typeof payload.race === "string" ? payload.race.trim() : "";
  if (race.length < 2 || race.length > 200) {
    return Response.json({ error: "Enter the race name and year (2–200 characters)." }, { status: 400 });
  }

  const details = typeof payload.details === "string" ? payload.details.trim() : "";
  if (details.length > 1500) {
    return Response.json({ error: "Details must be 1,500 characters or fewer." }, { status: 400 });
  }

  const link = validateHttpUrl(payload.link);
  if (link === "invalid") {
    return Response.json({ error: "Enter a valid http:// or https:// results link." }, { status: 400 });
  }

  const image = validateImageAttachment(payload.image);
  if (image && "error" in image) {
    return Response.json({ error: image.error }, { status: 400 });
  }

  if (!link && !image) {
    return Response.json(
      { error: "Provide a results link or upload an image of the result." },
      { status: 400 },
    );
  }

  const contact = validateOptionalContact(payload.name, payload.email);
  if ("error" in contact) {
    return Response.json({ error: contact.error }, { status: 400 });
  }

  const surface = resolveSurface(payload.surface);
  const user = await resolveRequestUser(request).catch(() => null);

  if (checkSupportRateLimit(rateBuckets, request, user?.id)) {
    return Response.json({ error: "Too many reports. Please try again in a few minutes." }, { status: 429 });
  }

  if (!isSupportEmailConfigured()) {
    return Response.json(
      { error: "Missing result reports are temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const replyTo = contact.email || user?.email || undefined;
  const lines = [
    `Surface: ${surface}`,
    user?.id ? `Account: ${user.id}` : "Account: Guest",
    contact.name ? `Reporter name: ${contact.name}` : null,
    contact.email ? `Reporter email: ${contact.email}` : user?.email ? `Account email: ${user.email}` : null,
    `Athlete: ${athleteName}`,
    `Race: ${race}`,
    link ? `Results link: ${link}` : null,
    image ? `Image attached: ${image.attachment.filename} (${image.contentType})` : null,
    details ? `\nDetails:\n${details}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const subjectTarget = `${athleteName} (${race})`.replace(/\s+/g, " ").slice(0, 80);

  try {
    const ok = await sendSupportEmail({
      replyTo,
      subject: `Overtaek missing result: ${subjectTarget}`,
      text: lines,
      attachments: image ? [image.attachment] : undefined,
    });
    if (!ok) throw new Error("delivery_failed");
    return Response.json({ sent: true });
  } catch {
    return Response.json({ error: "We couldn't send your report. Please try again." }, { status: 502 });
  }
}
