"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { requestAccountPush } from "@/lib/request-push";
import type { SyncIdentity } from "@/lib/push-notifications";
import { competeNow, weeklyBoard } from "@fitness-battle/shared";
import { useEffect, useMemo, useRef } from "react";

/**
 * Bridges compete lifecycle → notification send path.
 * Mount inside CompeteProvider.
 */
export function NotificationTriggers() {
  const { user, demoMode } = useAuth();
  const { state } = useCompete();
  const resultsBaseline = useRef<number | null>(null);
  const placeBaseline = useRef<number | null>(null);
  const volumeBaseline = useRef<string | null>(null);
  const lessonDay = useRef<string | null>(null);

  const identity = useMemo<SyncIdentity | null>(
    () =>
      user
        ? { userId: user.id, localOnly: demoMode || user.mode === "demo" }
        : null,
    [user, demoMode],
  );

  useEffect(() => {
    if (!state) return;
    const count = state.periodResults.length;
    if (resultsBaseline.current == null) {
      resultsBaseline.current = count;
      return;
    }
    if (count > resultsBaseline.current) {
      const latest = state.periodResults[count - 1];
      void requestAccountPush("week_summary", identity, {
        place: latest?.place,
      });
      resultsBaseline.current = count;
    }
  }, [state, identity]);

  useEffect(() => {
    if (!state) return;
    const rating = state.ratings.find((row) => row.sport === state.primary);
    if (!rating?.optedIn) return;
    const board = weeklyBoard(state, state.primary, "open", competeNow(state));
    const place = board.find((row) => row.id === "you")?.place;
    if (place == null) return;
    const volume = (state.crewBoard?.members ?? [])
      .map((member) => `${member.id}:${member.distanceM ?? 0}:${member.movingSec ?? 0}`)
      .join("|");
    if (placeBaseline.current == null || volumeBaseline.current == null) {
      placeBaseline.current = place;
      volumeBaseline.current = volume;
      return;
    }
    if (
      state.crewBoard &&
      place > placeBaseline.current &&
      volume !== volumeBaseline.current
    ) {
      void requestAccountPush("rival_moves", identity, { place });
    }
    placeBaseline.current = place;
    volumeBaseline.current = volume;
  }, [state, identity]);

  useEffect(() => {
    if (!state) return;
    const day = new Date().toISOString().slice(0, 10);
    if (lessonDay.current === day) return;
    lessonDay.current = day;
    if (typeof window === "undefined") return;
    const key = `fb-lesson-nudge-${day}`;
    if (window.localStorage.getItem(key)) return;
    if (state.lessonDoneOn === day) return;
    window.localStorage.setItem(key, "1");
    void requestAccountPush("lesson_reminder", identity, {
      sport: state.primary,
    });
  }, [state, identity]);

  return null;
}
