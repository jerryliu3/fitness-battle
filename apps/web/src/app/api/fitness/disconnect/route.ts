import { NextResponse } from "next/server";
import { getServerFitnessProvider } from "@/lib/fitness";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { webEnv } from "@/lib/env";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  const { configured } = getSupabaseConfig();
  let userId: string | null = null;
  if (configured && !webEnv.useDemoData) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } else {
    userId = body.userId ?? null;
  }
  if (!userId) {
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401 },
    );
  }
  const provider = getServerFitnessProvider();
  await provider.disconnect(userId);
  return NextResponse.json({ ok: true, provider: provider.id });
}
