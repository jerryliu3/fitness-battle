import { NextResponse } from "next/server";
import {
  evidenceFromConnection,
  evidenceLabel,
  INTEGRATIONS,
} from "@fitness-battle/shared";
import { resolveUserId } from "@/lib/auth/request-user";
import { getServerFitnessProvider } from "@/lib/fitness";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = await resolveUserId(url.searchParams.get("userId"));
  if (!userId) {
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401 },
    );
  }

  const provider = getServerFitnessProvider();
  const connection = await provider.getConnection(userId);
  const evidence = evidenceFromConnection({
    status: connection.status,
    lastSyncAt: connection.lastSyncAt,
    lastActivityAt: connection.lastActivityAt,
  });
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
