import { NextResponse } from "next/server";
import {
  isCompeteState,
  migrateCompeteState,
  prepareCompeteStateForAccount,
  rollClock,
  withDerivedPendingReveals,
  type CompeteState,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  hydrateCrewBoard,
  loadCompeteAccount,
  persistCompeteAccount,
} from "@/lib/compete-persist";
import { createRequestClient } from "@/lib/supabase/request";

function sameLiveDocument(left: CompeteState, right: CompeteState): boolean {
  return (
    JSON.stringify(prepareCompeteStateForAccount(left)) ===
    JSON.stringify(prepareCompeteStateForAccount(right))
  );
}

export async function GET(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const supabase = await createRequestClient(request);

  let loaded: { state: CompeteState; updatedAt: string } | null;
  try {
    loaded = await loadCompeteAccount(supabase, userId);
  } catch {
    return NextResponse.json({ error: "account_unavailable" }, { status: 500 });
  }
  if (!loaded) {
    return NextResponse.json({ state: null, updatedAt: null });
  }

  const hydrated = withDerivedPendingReveals(loaded.state);
  const rolled = withDerivedPendingReveals(rollClock(hydrated));
  let state = rolled;
  try {
    state = await hydrateCrewBoard(supabase, userId, rolled);
  } catch {
    state = { ...rolled, crewBoard: null };
  }

  const settled = !sameLiveDocument(hydrated, state);
  if (settled) {
    try {
      const updatedAt = await persistCompeteAccount(
        supabase,
        userId,
        prepareCompeteStateForAccount(state),
      );
      return NextResponse.json({ state, updatedAt, settled: true });
    } catch {
      return NextResponse.json({
        state,
        updatedAt: loaded.updatedAt,
        settled: false,
      });
    }
  }

  return NextResponse.json({
    state,
    updatedAt: loaded.updatedAt,
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

  const supabase = await createRequestClient(request);
  try {
    const updatedAt = await persistCompeteAccount(supabase, userId, live);
    return NextResponse.json({
      ok: true,
      persisted: true,
      updatedAt,
    });
  } catch {
    return NextResponse.json(
      { error: "account_not_saved", persisted: false },
      { status: 500 },
    );
  }
}
