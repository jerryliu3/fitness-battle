import { after, NextResponse } from "next/server";
import { syncConnectedProviderForUser } from "@/lib/background-fitness-sync";
import { serverEnv } from "@/lib/env";
import { userIdForAthlete } from "@/lib/fitness-store";
import { secretMatches } from "@/lib/garmin-inbox";

/** Strava webhook subscription verification challenge. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode !== "subscribe" ||
    !challenge ||
    !secretMatches(token, serverEnv.stravaWebhookVerifyToken)
  ) {
    return new Response(null, { status: 403 });
  }

  return NextResponse.json({ "hub.challenge": challenge });
}

interface StravaWebhookEvent {
  object_type?: string;
  aspect_type?: string;
  owner_id?: number | string;
}

/** Strava activity create/update webhook — triggers an async sync for that athlete. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as StravaWebhookEvent | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (
    body.object_type === "activity" &&
    (body.aspect_type === "create" || body.aspect_type === "update") &&
    body.owner_id != null
  ) {
    const ownerId = String(body.owner_id);
    after(async () => {
      try {
        const userId = await userIdForAthlete("strava", ownerId);
        if (userId) {
          await syncConnectedProviderForUser(userId, "strava");
        }
      } catch {
        // Hourly cron will catch up if the immediate webhook sync fails.
      }
    });
  }

  return NextResponse.json({ ok: true });
}
