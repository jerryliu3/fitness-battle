import { trackerRedirect } from "@/lib/oauth-callback";
import { resolveSessionUserId } from "@/lib/auth/request-user";
import { openWearablesWhoopPilotEnabled } from "@/lib/open-wearables/client";
import { createOwWhoopProvider } from "@/lib/open-wearables/whoop";

/**
 * Return URL after Open Wearables finishes provider OAuth.
 * WHOOP sends the code to OW; OW then redirects the browser here.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? "whoop";
  if (provider !== "whoop" || !openWearablesWhoopPilotEnabled()) {
    return trackerRedirect(url.origin, "whoop", "error");
  }
  const userId = await resolveSessionUserId();
  if (!userId) return trackerRedirect(url.origin, "whoop", "error");
  try {
    await createOwWhoopProvider().completeOAuth(userId);
    return trackerRedirect(url.origin, "whoop", "connected");
  } catch {
    return trackerRedirect(url.origin, "whoop", "error");
  }
}
