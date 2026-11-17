import { NextResponse } from "next/server";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import { beginFitnessHistory, finishFitnessHistory, fitnessHistoryStatus, fitnessSyncWindow } from "@/lib/fitness-history";
import type { FitnessProviderId } from "@fitness-battle/shared";

const providers = new Set(["apple_health", "google_health", "strava", "whoop", "oura"]);

function failure(error: unknown) {
  const locked = error instanceof Error && error.message === "history_locked";
  return NextResponse.json({ error: locked ? "history_locked" : "history_unavailable", message: locked ? "History import is already complete or in progress." : "History import is unavailable. Please try again." }, { status: locked ? 409 : 503 });
}

export async function GET(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const provider = new URL(request.url).searchParams.get("provider");
  if (provider && !providers.has(provider)) return NextResponse.json({ error: "unsupported_provider" }, { status: 400 });
  try {
    return NextResponse.json({ ...await fitnessHistoryStatus(userId), ...(provider ? { window: await fitnessSyncWindow(userId, provider as FitnessProviderId) } : {}) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!providers.has(body.provider) || !Number.isInteger(body.days) || body.days < 1 || body.days > 90) return NextResponse.json({ error: "invalid_history_import" }, { status: 400 });
  try {
    return NextResponse.json(await beginFitnessHistory(userId, body.provider, body.days));
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.lease !== "string") return NextResponse.json({ error: "invalid_history_import" }, { status: 400 });
  try {
    await finishFitnessHistory(userId, body.lease, false);
    return NextResponse.json({ released: true });
  } catch (error) { return failure(error); }
}
