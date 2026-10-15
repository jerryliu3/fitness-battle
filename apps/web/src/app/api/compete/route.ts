import { NextResponse } from "next/server";
import {
  isCompeteState,
  migrateCompeteState,
  sanitizeCompeteStateForAccount,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  loadCompeteAccountState,
  saveCompeteAccountState,
} from "@/lib/compete-persist";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  try {
    const supabase = await createClient();
    const { state, updatedAt } = await loadCompeteAccountState(supabase, userId);
    return NextResponse.json({ state, updatedAt });
  } catch {
    return NextResponse.json({ error: "snapshot_unavailable" }, { status: 500 });
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
  // Phase 1: never persist QA demoNow on the account document.
  const incoming = sanitizeCompeteStateForAccount(migrateCompeteState(body.state));
  const encoded = JSON.stringify(incoming);
  if (encoded.length > 500_000) {
    return NextResponse.json({ error: "state_too_large" }, { status: 413 });
  }
  try {
    const supabase = await createClient();
    const { state, updatedAt } = await saveCompeteAccountState(
      supabase,
      userId,
      incoming,
      { roll: true },
    );
    return NextResponse.json({
      ok: true,
      persisted: true,
      updatedAt,
      state,
    });
  } catch {
    return NextResponse.json(
      { error: "snapshot_not_saved", persisted: false },
      { status: 500 },
    );
  }
}
