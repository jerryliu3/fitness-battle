import { NextResponse } from "next/server";
import {
  isCompeteState,
  isFatCompeteSnapshot,
  migrateCompeteState,
  prepareCompeteStateForAccount,
  rollClock,
  sanitizeCompeteStateForAccount,
  stripDurableCrewBoard,
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

/** In-memory account shape used for rollClock + dual-write. */
function accountLiveState(state: CompeteState): CompeteState {
  return prepareCompeteStateForAccount(state);
}

function sameThinDocument(left: CompeteState, right: CompeteState): boolean {
  return (
    JSON.stringify(thinCompeteStateForAccount(left)) ===
    JSON.stringify(thinCompeteStateForAccount(right))
  );
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

  try {
    const hydrated = await hydrateCompeteCollections(supabase, userId, base);
    const rolled = withDerivedPendingReveals(rollClock(hydrated));
    const state = await hydrateCrewBoard(supabase, userId, rolled);
    const settled = !sameThinDocument(hydrated, state);

    if (settled || fatSnapshot) {
      const live = accountLiveState(state);
      const updatedAt = new Date().toISOString();
      try {
        await persistCompeteCore(supabase, userId, live);
        const { error: saveError } = await supabase
          .from("compete_snapshots")
          .upsert({
            user_id: userId,
            state: thinCompeteStateForAccount(live),
            updated_at: updatedAt,
          });
        if (saveError) throw new Error(saveError.message);
        return NextResponse.json({
          state,
          updatedAt,
          settled,
          thinned: true,
        });
      } catch {
        // Relational/thin rewrite failed — still return live state to the client.
        return NextResponse.json({
          state,
          updatedAt: data.updated_at,
          settled,
          thinned: false,
        });
      }
    }

    return NextResponse.json({
      state,
      updatedAt: data.updated_at,
      settled: false,
      thinned: false,
    });
  } catch {
    const state = withDerivedPendingReveals(
      rollClock(stripDurableCrewBoard(base)),
    );
    return NextResponse.json({
      state,
      updatedAt: data.updated_at,
      settled: false,
      thinned: false,
    });
  }
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

  const live = accountLiveState(
    rollClock(prepareCompeteStateForAccount(migrateCompeteState(body.state))),
  );
  const encoded = JSON.stringify(live);
  if (encoded.length > 500_000) {
    return NextResponse.json({ error: "state_too_large" }, { status: 413 });
  }
  const supabase = await createClient();
  const updatedAt = new Date().toISOString();

  try {
    await persistCompeteCore(supabase, userId, live);
    const { error } = await supabase.from("compete_snapshots").upsert({
      user_id: userId,
      state: thinCompeteStateForAccount(live),
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
      relational: true,
      thinned: true,
    });
  } catch {
    // Keep a full prepared document so client data is not lost when tables lag.
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
      thinned: false,
    });
  }
}
