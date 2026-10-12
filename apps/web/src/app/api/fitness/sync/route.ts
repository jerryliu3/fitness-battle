import { NextResponse } from "next/server";
import {
  syncWindow,
  type CategorySlug,
} from "@fitness-battle/shared";
import { getServerFitnessProvider } from "@/lib/fitness";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { webEnv } from "@/lib/env";

async function resolveUserId(body: {
  userId?: string;
}): Promise<string | null> {
  const { configured } = getSupabaseConfig();
  if (configured && !webEnv.useDemoData) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }
  return body.userId ?? null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    categorySlug?: CategorySlug;
    since?: string;
    backfill?: boolean;
  };
  const userId = await resolveUserId(body);
  if (!userId) {
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401 },
    );
  }

  const window = syncWindow({
    lastSyncAt: body.backfill ? null : body.since ?? null,
    forceBackfill: Boolean(body.backfill) || !body.since,
  });

  const provider = getServerFitnessProvider();
  const result = await provider.syncActivities(userId, {
    categorySlug: body.categorySlug,
    since: window.since,
  });

  return NextResponse.json({
    ...result,
    since: window.since,
    windowKind: window.kind,
    windowDays: window.days,
  });
}
