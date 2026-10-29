import { serverEnv } from "@/lib/env";
import { resolveRequestUser } from "@/lib/auth/request-user";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Please submit your report from the app." }, { status: 403 });
  }
  const user = await resolveRequestUser(request);
  if (!user?.id) return Response.json({ error: "Sign in to report an issue." }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 16000) {
    return Response.json({ error: "Your report is too long." }, { status: 413 });
  }
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (message.length < 10 || message.length > 5000) {
    return Response.json({ error: "Describe the issue in 10–5,000 characters." }, { status: 400 });
  }
  if (!serverEnv.resendApiKey || !serverEnv.issueReportFrom) {
    return Response.json({ error: "Issue reporting is temporarily unavailable. Please try again later." }, { status: 503 });
  }
  try {
    const accountLines = [
      `Account: ${user.id}`,
      user.email ? `Email: ${user.email}` : null,
    ].filter(Boolean).join("\n");

    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serverEnv.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: serverEnv.issueReportFrom,
        to: [serverEnv.issueReportTo],
        reply_to: user.email ? user.email : undefined,
        subject: "Overtaek issue report",
        text: `${accountLines}\n\n${message}`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!result.ok) throw new Error("delivery_failed");
    return Response.json({ sent: true });
  } catch {
    return Response.json({ error: "We couldn't send your report. Please try again." }, { status: 502 });
  }
}
