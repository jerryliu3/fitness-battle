"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  APP_TIMEZONE,
  buildTodayRoute,
  competeNow,
  countsOnTrack,
  dayKey,
  formatVolume,
  primaryFreezePeriodStart,
  shellTabFromPath,
  sportById,
  type Activity,
} from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { LatestActivity } from "@/features/club/latest-activity";
import { playCue } from "@/lib/haptics";
import { AppParagraph } from "@/ui/section";
import { Sheet } from "@/ui/sheet";
import { ActivityActions } from "./activity-actions";
import { DailyHealth } from "./daily-health";
import { HomeDeck } from "./home-deck";
import { SessionStage } from "./session-stage";
import { WeekChart } from "./week-chart";

type SessionSheetState =
  | { kind: "closed" }
  | { kind: "today" }
  | { kind: "activities"; items: Activity[]; title: string };

export function TodayScreen() {
  const onHome = shellTabFromPath(usePathname())?.id === "today";
  const { user } = useAuth();
  const { state, dispatch, lastDebugEvent, loadStatus } = useCompete();
  const [removed, setRemoved] = useState<Activity | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [session, setSession] = useState<SessionSheetState>({ kind: "closed" });
  const lastSyncNonceRef = useRef<number>(0);
  const sessionReturnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!onHome) setSession({ kind: "closed" });
  }, [onHome]);

  const now = state ? competeNow(state) : new Date();
  const counted = state
    ? state.activities.filter(
        (a) => countsOnTrack(a, "open") && new Date(a.startedAt) <= now,
      )
    : [];
  const units = state?.units ?? "metric";

  useEffect(() => {
    if (
      !state ||
      !lastDebugEvent ||
      lastDebugEvent.id !== "sync-activity" ||
      lastDebugEvent.nonce === lastSyncNonceRef.current
    )
      return;
    lastSyncNonceRef.current = lastDebugEvent.nonce;
    const newest = counted[counted.length - 1];
    if (newest) {
      setSyncNotice(
        `↻ Synced ${sportById(newest.sport).name} · ${formatVolume(
          newest.sport,
          newest.distanceM,
          newest.movingSec,
          units,
        )}`,
      );
    }
  }, [counted, lastDebugEvent, state, units]);

  useEffect(() => {
    if (!removed) return;
    const timer = window.setTimeout(() => setRemoved(null), 10000);
    return () => window.clearTimeout(timer);
  }, [removed]);

  useEffect(() => {
    if (!syncNotice) return;
    const timer = window.setTimeout(() => setSyncNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [syncNotice]);

  if (!state) {
    return (
      <AppParagraph typographyRole="body" className="fb-copy">
        Loading your week…
      </AppParagraph>
    );
  }

  const route = buildTodayRoute(state);
  const frozen = state.frozenPeriods.includes(primaryFreezePeriodStart(state));
  const todayKey = dayKey(now, APP_TIMEZONE);
  const todayActivities = counted.filter(
    (a) => dayKey(new Date(a.startedAt), APP_TIMEZONE) === todayKey,
  );
  const accountKey = user?.id ?? state.name ?? "guest";
  const ready = loadStatus === "ready" || loadStatus === "local";

  function openTodaySession() {
    if (document.activeElement instanceof HTMLElement) {
      sessionReturnFocus.current = document.activeElement;
    }
    void playCue("light");
    setSession({ kind: "today" });
  }

  function openActivities(items: Activity[], title = "Your activity") {
    if (document.activeElement instanceof HTMLElement) {
      sessionReturnFocus.current = document.activeElement;
    }
    void playCue("light");
    setSession({ kind: "activities", items, title });
  }

  function closeSession() {
    void playCue("soft");
    setSession({ kind: "closed" });
  }

  const detailActivities =
    session.kind === "today"
      ? todayActivities
      : session.kind === "activities"
        ? session.items
        : [];
  const sheetTitle =
    session.kind === "today"
      ? "Today"
      : session.kind === "activities"
        ? session.title
        : "Your activity";

  return (
    <div className="focus-home-stage">
      <Sheet
        fullScreen={detailActivities.length > 0}
        body=""
        returnFocusTo={sessionReturnFocus}
        open={session.kind !== "closed"}
        title={sheetTitle}
        onClose={closeSession}
      >
        <SessionStage
          state={state}
          activities={detailActivities}
          suggestion={session.kind === "today" ? route.suggestion : undefined}
          actions={session.kind === "today" ? <ActivityActions /> : undefined}
          onRemove={(activityId) => {
            setRemoved(
              detailActivities.find((a) => a.id === activityId) ?? null,
            );
            dispatch({
              type: "set-disposition",
              activityId,
              disposition: "excluded",
            });
            if (detailActivities.length <= 1) closeSession();
          }}
        />
      </Sheet>

      <div className="focus-home-overlay">
        {syncNotice ? (
          <div className="fb-note" role="status" aria-live="polite">
            <b>{syncNotice}</b>
          </div>
        ) : null}

        {removed ? (
          <div className="fb-note" role="status">
            Session removed.{" "}
            <button
              type="button"
              aria-label="Dismiss session removed message"
              onClick={() => setRemoved(null)}
            >
              ×
            </button>{" "}
            <button
              type="button"
              className="fb-btn-ghost"
              onClick={() => {
                dispatch({
                  type: "set-disposition",
                  activityId: removed.id,
                  disposition: removed.disposition,
                });
                setRemoved(null);
              }}
            >
              Undo
            </button>
          </div>
        ) : null}

        {frozen && (
          <div className="fb-pill" style={{ marginBottom: "16px" }}>
            <b>❄ Week frozen</b>
            <span>Your effort score is protected through next Monday.</span>
          </div>
        )}

        <WeekChart state={state} ready={ready} />
      </div>

      <HomeDeck
        accountKey={accountKey}
        state={state}
        onOpenTodaySession={openTodaySession}
        onOpenActivities={openActivities}
      />

      {ready && <DailyHealth state={state} />}

      <LatestActivity
        state={state}
        onOpen={(activity) => openActivities([activity], "Your activity")}
      />
    </div>
  );
}
