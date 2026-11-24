"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  nextCompetitionReplaySpeed, competitionReplayFrame, competitionReplayDateForState, indexCompetitionReplay, localCompetitionReplay,
  competitionReplayTimeMs, competitionReplayCursorFromTimeMs, REPLAY_MINUTES_PER_REAL_SECOND_1X,
  type CompeteState, type CompetitionReplay, type CompetitionReplaySelection,
} from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { useReducedMotion } from "motion/react";

/** null cursor means live totals; historical frames never write competition state. */
export function useFieldTimeline(state: CompeteState | undefined, selection: CompetitionReplaySelection, active: boolean, replay = false) {
  const { user, offlineMode } = useAuth();
  const { debugActive } = useCompete();
  const reduced = useReducedMotion();
  const [ledger, setLedger] = useState<{ key: string; data: CompetitionReplay } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [cursor, setCursor] = useState<number | null>(replay ? 0 : null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const key = `${user?.id ?? "guest"}:${offlineMode}:${debugActive}:${selection.sport}:${selection.track}:${selection.periodStart}:${selection.periodEnd}`;
  const latest = useRef(state); latest.current = state;
  const autoStarted = useRef<string | null>(null);
  const [cursorKey, setCursorKey] = useState(key);
  // Scope changes must not paint even one frame from a different account or wave.
  const position = cursorKey === key ? cursor : replay ? 0 : null;
  useEffect(() => { autoStarted.current = null; setCursorKey(key); setCursor(replay ? 0 : null); setPlaying(false); setError(""); }, [key, replay]);
  useEffect(() => {
    if (!active || !latest.current) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    let cancelled = false;
    setError("");
    const load = async () => {
      if (!user || offlineMode || debugActive) return localCompetitionReplay(latest.current!, selection);
      const query = new URLSearchParams({ sport: selection.sport, track: selection.track, start: selection.periodStart, end: selection.periodEnd });
      const response = await fetch(`/api/compete/replay?${query}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Timeline unavailable");
      return response.json() as Promise<CompetitionReplay>;
    };
    void load().then(data => { if (!cancelled) setLedger({ key, data }); }).finally(() => clearTimeout(timeout)).catch(() => { if (!cancelled) setError("Timeline unavailable. Try again."); });
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [key, active, attempt, state?.activities, state?.enrollments]);
  const index = useMemo(() => ledger?.key === key && state ? indexCompetitionReplay(ledger.data, state.units) : null, [ledger, key, state?.units]);
  const count = index?.replay.events.length ?? 0;
  useEffect(() => {
    if (!replay || !active) { autoStarted.current = null; return; }
    if (!index || autoStarted.current === key) return;
    autoStarted.current = key;
    setCursorKey(key);
    setCursor(0);
    setPlaying(count > 0);
  }, [replay, active, index, count, key]);
  const bounded = position === null ? count : Math.max(0, Math.min(count, position));
  const cursorRef = useRef(bounded); cursorRef.current = bounded;
  useEffect(() => {
    if (!playing || !active || !count || cursorKey !== key || !index) return;
    let raf = 0;
    const from = cursorRef.current, start = Date.now();
    const fromTimeMs = competitionReplayTimeMs(index, from);
    const tick = () => {
      const now = Date.now();
      const targetTimeMs = fromTimeMs + (now - start) * (REPLAY_MINUTES_PER_REAL_SECOND_1X * 60) * speed;
      const next = competitionReplayCursorFromTimeMs(index, targetTimeMs);
      if (next >= count) {
        setCursor(replay ? count : null);
        setPlaying(false);
        return;
      }
      setCursor(reduced ? Math.floor(next) : next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, active, count, reduced, key, cursorKey, speed, index, replay]);
  useEffect(() => { if (!active) setPlaying(false); }, [active]);
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  const seek = (next: number) => { setPlaying(false); setCursorKey(key); setCursor(next >= count ? (replay ? count : null) : Math.max(0, next)); };
  const live = () => { setPlaying(false); setCursorKey(key); setCursor(replay ? count : null); };
  const toggle = () => {
    if (!count || error) return;
    setCursorKey(key);
    if (!playing && (position === null || bounded >= count)) setCursor(0);
    setPlaying(value => !value);
  };
  const frame = useMemo(() => index && position !== null ? competitionReplayFrame(index, bounded) : null, [index, position, bounded]);
  return {
    frame, index,
    cursor: bounded, count, playing, seek, live, toggle, error, speed,
    changeSpeed: () => setSpeed(nextCompetitionReplaySpeed),
    ready: Boolean(index) && !error, retry: () => setAttempt(value => value + 1),
    latestLabel: index && state ? competitionReplayDateForState(state, index, count, true) : "",
    label: index && state ? competitionReplayDateForState(state, index, bounded, position === null) : "Loading timeline…",
    preview: index?.replay.scope === "local", simulated: index?.replay.athletes.some(athlete => athlete.synthetic),
  };
}
export type FieldTimelineState = ReturnType<typeof useFieldTimeline>;
