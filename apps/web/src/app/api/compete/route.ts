import { NextResponse } from "next/server";
import {
  isCompeteState,
  migrateCompeteState,
  openEnrollmentRemoved,
  prepareCompeteStateForAccount,
  withDerivedPendingReveals,
  type CompeteState,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  settleAccountFields,
  loadCompeteAccount,
  loadEffortScoreEvents,
  persistCompeteAccount,
} from "@/lib/compete-persist";
import { deriveCompetitionIntents } from "@/lib/competition-intents";
import { competitionAuthorityDatabase } from "@/lib/competition-authority";
import { createRequestClient } from "@/lib/supabase/request";

/** History reload failure must not turn an already committed save into a failure. */
async function committedScoreHistory(db: Parameters<typeof loadEffortScoreEvents>[0], userId: string, state: CompeteState): Promise<CompeteState> {
  try {
    return { ...state, effortScoreEvents: await loadEffortScoreEvents(db, userId) };
  } catch (error) {
    console.error("Committed score history reload failed:", error instanceof Error ? error.message : "unknown");
    return state; // Keep the acknowledged score; the next account refresh retries history.
  }
}

function sameLiveDocument(left: CompeteState, right: CompeteState): boolean {
  return (
    JSON.stringify(prepareCompeteStateForAccount(left)) ===
    JSON.stringify(prepareCompeteStateForAccount(right))
  );
}

export async function GET(request: Request): Promise<Response> {
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const supabase = await createRequestClient(request);

  let loaded: { state: CompeteState; updatedAt: string } | null;
  let receipts: number;
  try {
    const revision = await supabase.rpc("competition_input_revision");
    if (revision.error) throw new Error("revision_unavailable");
    receipts = Number(revision.data);
    loaded = await loadCompeteAccount(supabase, userId);
  } catch {
    return NextResponse.json({ error: "account_unavailable" }, { status: 500 });
  }
  if (!loaded) {
    return NextResponse.json({ state: null, updatedAt: null });
  }

  const now = new Date();
  const hydrated = withDerivedPendingReveals(loaded.state);
  let state;
  try {
    state = withDerivedPendingReveals(await settleAccountFields(supabase, userId, hydrated, now, true));
  } catch {
    return NextResponse.json({ error: "field_unavailable" }, { status: 503 });
  }

  const settled = !sameLiveDocument(hydrated, state);
  if (settled) {
    try {
      const updatedAt = await persistCompeteAccount(
        supabase,
        userId,
        prepareCompeteStateForAccount(state),
        loaded.updatedAt,
        { db: competitionAuthorityDatabase(), receipts, computedAt: now },
      );
      state = await committedScoreHistory(supabase, userId, state);
      return NextResponse.json({ state, updatedAt, settled: true });
    } catch (error) {
      console.error("GET /api/compete commit failed:", error instanceof Error ? error.message : "unknown");
      return NextResponse.json({ error: "account_not_saved" }, { status: 503 });
    }
  }

  return NextResponse.json({
    state,
    updatedAt: loaded.updatedAt,
    settled: false,
  });
}

export async function PUT(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    state?: unknown;
    accountId?: unknown;
    updatedAt?: unknown;
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

  if (body.updatedAt !== null && typeof body.updatedAt !== "string") {
    return NextResponse.json({ error: "account_version_required" }, { status: 409 });
  }

  const incoming = migrateCompeteState(body.state);
  let live = incoming;
  if (JSON.stringify(live).length > 500_000) {
    return NextResponse.json({ error: "state_too_large" }, { status: 413 });
  }

  const supabase = await createRequestClient(request);
  const now = new Date();
  let receipts = 0;
  try {
    const revision = await supabase.rpc("competition_input_revision");
    if (revision.error) throw new Error("revision_unavailable");
    receipts = Number(revision.data);
    const existing = await loadCompeteAccount(supabase, userId);
    if (
      existing &&
      openEnrollmentRemoved(
        migrateCompeteState(existing.state),
        live,
        new Date(),
      )
    ) {
      return NextResponse.json({ error: "week_still_open" }, { status: 409 });
    }
    const baseline = existing ? await settleAccountFields(supabase, userId, existing.state, now, true) : null;
    live = deriveCompetitionIntents(baseline, incoming, userId, now);
  } catch (error) {
    if (error instanceof Error && error.message === "week_still_open") return NextResponse.json({ error: "week_still_open", persisted: false }, { status: 409 });
    if (error instanceof Error && /^invalid_/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "account_unavailable" }, { status: 503 });
  }

  try {
    const updatedAt = await persistCompeteAccount(supabase, userId, live, body.updatedAt as string | null, { db: competitionAuthorityDatabase(), receipts, computedAt: now });
    live = await committedScoreHistory(supabase, userId, live);
    return NextResponse.json({
      ok: true,
      persisted: true,
      updatedAt,
      state: { ...live, requiresCanonicalFields: true, enrollments: live.enrollments.map(e => ({ ...e, awaitingField: e.awaitingField ?? !e.fieldBoard })) },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("account_changed_reload")) {
      return NextResponse.json({ error: "account_changed_reload", persisted: false }, { status: 409 });
    }
    if (error instanceof Error && /competition_inputs_changed|competition_clock_changed/.test(error.message)) return NextResponse.json({ error: "account_changed_reload", persisted: false }, { status: 409 });
    if (error instanceof Error && /week_still_open|registration_window_changed/.test(error.message)) {
      return NextResponse.json({ error: error.message.includes("week_still_open") ? "week_still_open" : "registration_window_changed", persisted: false }, { status: 409 });
    }
    console.error("PUT /api/compete save failed:", error);
    return NextResponse.json(
      { error: "account_not_saved", persisted: false },
      { status: 500 },
    );
  }
}
