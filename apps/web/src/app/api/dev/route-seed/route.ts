import { readFile } from "node:fs/promises";
import path from "node:path";
import { activityFromSample, findDemoAccount, type ActivitySample } from "@fitness-battle/shared";
import { isLocalHost } from "@/lib/auth/design-access";
import { getSupabaseConfig } from "@/lib/supabase/config";

/** Private, ignored fixtures for backend-unconfigured development previews only. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (process.env.NODE_ENV !== "development" || !isLocalHost(url.hostname) || getSupabaseConfig().configured) return new Response(null, { status: 404 });
  if (!findDemoAccount(url.searchParams.get("account"))) return new Response(null, { status: 404 });
  try {
    const fixture = JSON.parse(await readFile(path.resolve(process.cwd(), "../../.local/route-activities.json"), "utf8")) as { activities: ActivitySample[] };
    const activities = fixture.activities.flatMap(sample => {
      const activity = activityFromSample(sample, "imported");
      return activity ? [{ ...activity, disposition: "counted" as const }] : [];
    });
    return Response.json({ activities }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ activities: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
