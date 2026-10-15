import { NextResponse } from "next/server";
import {
  isCompeteState,
  migrateCompeteState,
  prepareCompeteStateForAccount,
  rollClock,
  sanitizeCompeteStateForAccount,
  stripDurableCrewBoard,
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

/** Durable account document: strip demoNow / crewBoard / pendingRevealIds. */
function accountWriteState(state: CompeteState): CompeteState {
  return prepareCompeteStateForAccount(state);
}

function sameCompeteDocument(left: CompeteState, right: CompeteState): boolean {
  return JSON.stringify(accountWriteState(left)) === JSON.stringify(accountWriteState(right));
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

  try {
    const hydrated = await hydrateCompeteCollections(supabase, userId, base);
    // Settle weeks on the server (wall clock — demoNow already stripped).
    const rolled = withDerivedPendingReveals(rollClock(hydrated));
    const state = await hydrateCrewBoard(supabase, userId, rolled);

    if (!sameCompeteDocument(hydrated, state)) {
      const stored = accountWriteState(state);
      const updatedAt = new Date().toISOString();
      const { error: saveError } = await supabase.from("compete_snapshots").upsert({
        user_id: userId,
        state: stored,
        updated_at: updatedAt,
      });
      if (!saveError) {
        try {
          await persistCompeteCore(supabase, userId, stored);
        } catch {
          // Snapshot advanced; relational can catch up on the next PUT.
        }
        return NextResponse.json({ state, updatedAt, settled: true });
      }
    }

    return NextResponse.json({
      state,
      updatedAt: data.updated_at,
      settled: false,
    });
  } catch {
    // Hydrate failed — still settle from the snapshot cache.
    const state = withDerivedPendingReveals(
      rollClock(stripDurableCrewBoard(base)),
    );
    return NextResponse.json({
      state,
      updatedAt: data.updated_at,
      settled: false,
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

  // Roll before store so a Monday-crossing save settles server-side.
  const state = accountWriteState(
    rollClock(prepareCompeteStateForAccount(migrateCompeteState(body.state))),
  );
  const encoded = JSON.stringify(state);
  if (encoded.length > 500_000) {
    return NextResponse.json({ error: "state_too_large" }, { status: 413 });
  }
  const supabase = await createClient();
  const updatedAt = new Date().toISOString();

  const { error } = await supabase.from("compete_snapshots").upsert({
    user_id: userId,
    state,
    updated_at: updatedAt,
  });
  if (error) {
    return NextResponse.json({ error: "snapshot_not_saved", persisted: false }, { status: 500 });
  }

  try {
    await persistCompeteCore(supabase, userId, state);
  } catch {
    return NextResponse.json({
      ok: true,
      persisted: true,
      updatedAt,
      relational: false,
    });
  }

  return NextResponse.json({
    ok: true,
    persisted: true,
    updatedAt,
    relational: true,
  });
}
