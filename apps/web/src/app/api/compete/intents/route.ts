import { NextResponse } from "next/server";
import {
  freshState,
  isCompeteBatchSaveType,
  migrateCompeteState,
  openEnrollmentRemoved,
  withAccountEloBaseline,
  type Action,
  type CompeteState,
} from "@fitness-battle/shared";
import { resolveRequestUserId } from "@/lib/auth/request-user";
import {
  loadCompeteAccount,
  persistCompeteAccount,
  settleAccountFields,
} from "@/lib/compete-persist";
import { applyAccountSaveInOrder } from "@/lib/apply-compete-intents";
import { competitionAuthorityDatabase } from "@/lib/competition-authority";
import { createRequestClient } from "@/lib/supabase/request";
import { committedScoreHistory, competeAccountJsonState } from "@/lib/compete-save-route";

function parseActions(raw: unknown): Action[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 32) return null;
  const actions: Action[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || typeof (item as Action).type !== "string") return null;
    if (!isCompeteBatchSaveType((item as Action).type)) return null;
    actions.push(item as Action);
  }
  return actions;
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    accountId?: unknown;
    updatedAt?: unknown;
    actions?: unknown;
  } | null;
  const userId = await resolveRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  if (body?.accountId !== userId) {
    return NextResponse.json({ error: "account_mismatch" }, { status: 409 });
  }
  if (body?.updatedAt !== null && typeof body?.updatedAt !== "string") {
    return NextResponse.json({ error: "account_version_required" }, { status: 409 });
  }
  const actions = parseActions(body?.actions);
  if (!actions) {
    return NextResponse.json({ error: "invalid_intent" }, { status: 400 });
  }

  const supabase = await createRequestClient(request);
  for (let attempt = 0; attempt < 2; attempt++) {
    const now = new Date();
    let receipts = 0;
    let live: CompeteState;
    try {
      const revision = await supabase.rpc("competition_input_revision");
      if (revision.error) throw new Error("revision_unavailable");
      receipts = Number(revision.data);
      const existing = await loadCompeteAccount(supabase, userId);
      const stored = existing
        ? migrateCompeteState(existing.state)
        : withAccountEloBaseline(freshState(now));
      live = await applyAccountSaveInOrder(stored, actions, userId, now, (state, scoreOpenPeriod) =>
        settleAccountFields(supabase, userId, state, now, true, scoreOpenPeriod),
      );
      if (
        existing &&
        openEnrollmentRemoved(migrateCompeteState(existing.state), live, now)
      ) {
        return NextResponse.json({ error: "week_still_open", persisted: false }, { status: 409 });
      }
    } catch (error) {
      if (attempt === 0 && error instanceof Error && /competition_inputs_changed|competition_clock_changed/.test(error.message)) continue;
      if (error instanceof Error && error.message === "week_still_open") {
        return NextResponse.json({ error: "week_still_open", persisted: false }, { status: 409 });
      }
      if (
        error instanceof Error &&
        (/^invalid_/.test(error.message) || error.message === "sync_batch_too_large")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: "account_unavailable" }, { status: 503 });
    }

    try {
      const updatedAt = await persistCompeteAccount(
        supabase,
        userId,
        live,
        body!.updatedAt as string | null,
        { db: competitionAuthorityDatabase(), receipts, computedAt: now },
      );
      live = await committedScoreHistory(supabase, userId, live);
      return NextResponse.json({
        ok: true,
        persisted: true,
        updatedAt,
        state: competeAccountJsonState(live),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("account_changed_reload")) {
        return NextResponse.json({ error: "account_changed_reload", persisted: false }, { status: 409 });
      }
      if (attempt === 0 && error instanceof Error && /competition_inputs_changed|competition_clock_changed/.test(error.message)) continue;
      if (error instanceof Error && /competition_inputs_changed|competition_clock_changed/.test(error.message)) {
        return NextResponse.json({ error: "competition_inputs_changed", persisted: false }, { status: 409 });
      }
      if (error instanceof Error && /week_still_open|registration_window_changed/.test(error.message)) {
        return NextResponse.json({
          error: error.message.includes("week_still_open") ? "week_still_open" : "registration_window_changed",
          persisted: false,
        }, { status: 409 });
      }
      console.error("POST /api/compete/intents save failed:", error);
      return NextResponse.json({ error: "account_not_saved", persisted: false }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "account_not_saved", persisted: false }, { status: 503 });
}