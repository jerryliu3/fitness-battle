import { NextResponse } from "next/server";
import { getServerFitnessProvider } from "@/lib/fitness";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { webEnv } from "@/lib/env";

async function resolveUserId(request: Request): Promise<string | null> {
  const { configured } = getSupabaseConfig();
  if (configured && !webEnv.useDemoData) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }
  const body = (await request.clone().json().catch(() => ({}))) as {
    userId?: string;
  };
  return body.userId ?? null;
}

export async function POST(request: Request) {
  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401 },
    );
  }
  const provider = getServerFitnessProvider();
  const result = await provider.connect(userId);
  return NextResponse.json(result);
}
