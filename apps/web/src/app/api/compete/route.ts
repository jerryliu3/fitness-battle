import { NextResponse } from "next/server";
import {
  isCompeteState,
  migrateCompeteState,
  prepareCompeteStateForAccount,
  rollClock,
  sanitizeCompeteStateForAccount,
  snapshotCarriesActivities,
  stripSnapshotActivities,
  withDerivedPendingReveals,
  type CompeteState,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  hydrateCompeteCollections,
  hydrateCrewBoard,
  persistCompeteActivities,
  persistCompeteCore,
} from "@/lib/compete-persist";
import { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

function sameLiveDocument(left: CompeteState, right: CompeteState): boolean {
  return (
    JSON.stringify(prepareCompeteStateForAccount(left)) ===
    JSON.stringify(prepareCompeteStateForAccount(right))
  );
}

/** Persist relational rows, then store snapshot with activities always stripped. */
async function saveAccountSnapshot(
  supabase: Db,
  userId: string,
  live: CompeteState,
  updatedAt: string,
): Promise<"ok" | "activities_only" | "failed"> {
  const stored = stripSnapshotActivities(live);
  try {
    await persistCompeteCore(supabase, userId, live);
    const { error } = await supabase.from("compete_snapshots").upsert({
      user_id: userId,
      state: stored,
      updated_at: updatedAt,
    });
    return error ? "failed" : "ok";
  } catch {
    // Other dual-writes may have failed — still get activities into the table.
    try {
      await persistCompeteActivities(supabase, userId, live);
      const { error } = await supabase.from("compete_snapshots").upsert({
        user_id: userId,
        state: stored,
        updated_at: updatedAt,
      });
      return error ? "failed" : "activities_only";
    } catch {
      return "failed";
    }
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
  const legacyActivities = snapshotCarriesActivities(base);

  let hydrated: CompeteState;
  try {
    hydrated = await hydrateCompeteCollections(supabase, userId, base);
  } catch {
    // After activities leave the blob, empty snapshot.activities is normal —
    // hydrate failure would blank the board.
    if (!legacyActivities) {
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
  if (settled || legacyActivities) {
    const live = prepareCompeteStateForAccount(state);
    const updatedAt = new Date().toISOString();
    const saved = await saveAccountSnapshot(supabase, userId, live, updatedAt);
    if (saved !== "failed") {
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
  const saved = await saveAccountSnapshot(supabase, userId, live, updatedAt);

  if (saved === "failed") {
    return NextResponse.json(
      { error: "snapshot_not_saved", persisted: false },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    persisted: true,
    updatedAt,
    relational: saved === "ok",
    activities: true,
  });
}
