import { NextResponse } from "next/server";
import {
  evidenceFromConnection,
  evidenceLabel,
  INTEGRATIONS,
} from "@fitness-battle/shared";
import { getServerFitnessProvider } from "@/lib/fitness";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { webEnv } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { configured } = getSupabaseConfig();
  let userId: string | null = null;
  if (configured && !webEnv.useDemoData) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } else {
    userId = url.searchParams.get("userId");
  }
  if (!userId) {
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401 },
    );
  }

  const provider = getServerFitnessProvider();
  const connection = await provider.getConnection(userId);
  const evidence = evidenceFromConnection(connection);
  return NextResponse.json({
    connection,
    evidence,
    evidenceLabel: evidenceLabel(evidence),
    integrations: INTEGRATIONS.map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      maturity: item.maturity,
      blurb: item.blurb,
      offlineCapability: item.offlineCapability,
      setupSteps: item.setupSteps,
    })),
  });
}
