import { NextResponse } from "next/server";
import {
  isCompeteState,
  isFatCompeteSnapshot,
  migrateCompeteState,
  prepareCompeteStateForAccount,
  rollClock,
  sanitizeCompeteStateForAccount,
  thinCompeteStateForAccount,
  withDerivedPendingReveals,
  type CompeteState,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  hydrateCompeteCollections,
  hydrateCrewBoard,
  persistCompeteCore,
} from "@/lib/compete-persist";
import { createClient } from "@/lib/supabase/server";

function sameLiveDocument(left: CompeteState, right: CompeteState): boolean {
  // Compare prepared (full) documents — thin compare would miss settlement.
  return (
    JSON.stringify(prepareCompeteStateForAccount(left)) ===
    JSON.stringify(prepareCompeteStateForAccount(right))
  );
}

async function saveThinSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  live: CompeteState,
  updatedAt: string,
): Promise<boolean> {
  try {
    await persistCompeteCore(supabase, userId, live);
    const { error } = await supabase.from("compete_snapshots").upsert({
      user_id: userId,
      state: thinCompeteStateForAccount(live),
      updated_at: updatedAt,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compete_snapshots")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "snapshot_unavailable" }, { status: 500 });
  }
  if (!data || !isCompeteState(data.state)) {
    return NextResponse.json({ state: null, updatedAt: null });
  }

  const base = withDerivedPendingReveals(
    sanitizeCompeteStateForAccount(migrateCompeteState(data.state)),
  );
  const fatSnapshot = isFatCompeteSnapshot(base);

  let hydrated: CompeteState;
  try {
    hydrated = await hydrateCompeteCollections(supabase, userId, base);
  } catch {
    // Thin snapshots have empty collections — falling back to base would blank the UI.
    if (!fatSnapshot) {
      return NextResponse.json({ error: "hydrate_failed" }, { status: 500 });
    }
    hydrated = base;
  }

  const rolled = withDerivedPendingReveals(rollClock(hydrated));
  let state = rolled;
  try {
    state = await hydrateCrewBoard(supabase, userId, rolled);
  } catch {
    state = { ...rolled, crewBoard: null };
  }

  const settled = !sameLiveDocument(hydrated, state);
  if (settled || fatSnapshot) {
    const live = prepareCompeteStateForAccount(state);
    const updatedAt = new Date().toISOString();
    const thinned = await saveThinSnapshot(supabase, userId, live, updatedAt);
    if (thinned) {
      return NextResponse.json({ state, updatedAt, settled: true });
    }
  }

  return NextResponse.json({
    state,
    updatedAt: data.updated_at,
    settled: false,
  });
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    state?: unknown;
    accountId?: unknown;
  } | null;
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  if (body?.accountId !== userId) {
    return NextResponse.json({ error: "account_mismatch" }, { status: 409 });
  }
  if (!body || !isCompeteState(body.state)) {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  const live = prepareCompeteStateForAccount(
    rollClock(migrateCompeteState(body.state)),
  );
  if (JSON.stringify(live).length > 500_000) {
    return NextResponse.json({ error: "state_too_large" }, { status: 413 });
  }
  const supabase = await createClient();
  const updatedAt = new Date().toISOString();

  if (await saveThinSnapshot(supabase, userId, live, updatedAt)) {
    return NextResponse.json({
      ok: true,
      persisted: true,
      updatedAt,
      relational: true,
    });
  }

  // Relational failed — keep a full document so client data is not lost.
  const { error } = await supabase.from("compete_snapshots").upsert({
    user_id: userId,
    state: live,
    updated_at: updatedAt,
  });
  if (error) {
    return NextResponse.json(
      { error: "snapshot_not_saved", persisted: false },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    persisted: true,
    updatedAt,
    relational: false,
  });
}
