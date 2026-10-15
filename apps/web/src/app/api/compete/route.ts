import { NextResponse } from "next/server";
import {
  isCompeteState,
  migrateCompeteState,
  prepareCompeteStateForAccount,
  sanitizeCompeteStateForAccount,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  hydrateCrewBoard,
  persistCompeteCore,
} from "@/lib/compete-persist";
import { createClient } from "@/lib/supabase/server";

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
  // Strip demoNow; leave crewBoard for hydrate (or clear on hydrate failure).
  const base = sanitizeCompeteStateForAccount(migrateCompeteState(data.state));
  try {
    const state = await hydrateCrewBoard(supabase, userId, base);
    return NextResponse.json({ state, updatedAt: data.updated_at });
  } catch {
    return NextResponse.json({
      state: prepareCompeteStateForAccount(base),
      updatedAt: data.updated_at,
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
  const state = prepareCompeteStateForAccount(migrateCompeteState(body.state));
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
