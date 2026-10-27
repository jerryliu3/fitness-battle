"use client";
import { PortraitField } from "@/features/club/portrait-field";
import { PolishedRacer } from "@/features/brand/polished-racer";
import { UserAvatar } from "@/ui/user-avatar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playCue } from "@/lib/haptics";
import { usePathname } from "next/navigation";
import {
  fieldFlightDuration, fieldFlightEase,
  arenaFieldHigh,
  competePeriodWindow,
  competeNow,
  type CompeteState,
  effortRankBadge,
  fieldDefaultSpan,
  clampCourseCenter,
  ordinalPlace,
  selfLaneLabel,
  shellTabFromPath,
  resolveArenaSelectedId,
  type ArenaSceneLane,
  type ArenaViewWindow,
  type BoardRow,
} from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { ExpandingField } from "./expanding-field";
import { ArenaLanes } from "@/features/focus/arena-lanes";
import {
  useFieldAppearance,
} from "./field-course";
import { placeAt, valueAt, type SceneRunner } from "../geometry";
import { CompetitionReplayButton } from "@/features/replay/competition-replay";
import type { FieldModel } from "../model";

export function FieldStage({
  model,
  boardRows,
  sportTitle,
  tabActive = true,
  replayState,
}: {
  model: FieldModel;
  boardRows?: BoardRow[];
  sportTitle?: string;
  tabActive?: boolean;
  replayState?: CompeteState;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const accountKey = user?.id ?? "guest";
  const [appearance] = useFieldAppearance(
    accountKey,
    model.sport,
  );
  const unit = model.unit;
  const runners = useMemo<SceneRunner[]>(
    () =>
      model.runners.map((r) => ({
        id: r.id,
        name: r.name,
        avatarUrl: r.avatarUrl,
        initials: r.initials,
        series: [0, ...r.km],
        you: r.you,
      })),
    [model.runners],
  );
  const time = Math.max(
    0,
    (runners.find((r) => r.you)?.series.length ?? 1) - 1,
  );
  const you = runners.find((r) => r.you);
  const total = you ? valueAt(you, time) : 0;
  const ghost: SceneRunner | null = model.ghost
    ? {
        id: model.ghost.id,
        name: model.ghost.name,
        initials: model.ghost.initials,
        series: [0, ...model.ghost.km],
        ghost: true,
      }
    : null;

  const [viewDimension, setViewDimension] = useState<"2d" | "3d">("2d");
  const [standingsOpen, setStandingsOpen] = useState(false);
  const [lanesImmersive, setLanesImmersive] = useState(false);
  const [intervalsCollapsed, setIntervalsCollapsed] = useState(false);
  const [spotlightCollapsed, setSpotlightCollapsed] = useState(false);
  const toggleDimension = () => {
    void playCue("selection");
    setViewDimension((prev) => (prev === "2d" ? "3d" : "2d"));
  };

  useEffect(() => {
    if (tabActive && shellTabFromPath(pathname)?.id === "arena") return;
    setLanesImmersive(false);
  }, [pathname, tabActive]);
  const [span, setSpan] = useState(fieldDefaultSpan(unit));
  const [center, setCenter] = useState<number | null>(null);
  const [centerTween, setCenterTween] = useState<number | null>(null);
  const centerTweenRef = useRef<{
    from: number;
    to: number;
    start: number;
    raf: number;
    fromSpan: number;
    toSpan: number;
  } | null>(null);
  const liveCenterRef = useRef(0);
  const showGhost = true;
  const [selected, setSelected] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const toggleSelect = (id: string) => {
    const runner =
      runners.find((item) => item.id === id) ??
      (ghost?.id === id ? ghost : null);
    if (!runner) return;
    setSelected(id);
    setFocusRequest(value => value + 1);
    tweenCenterTo(valueAt(runner, time));
  };

  const fieldLanes: ArenaSceneLane[] = useMemo(
    () =>
      runners.map((r) => ({
        id: r.id,
        name: r.name,
        initials: r.initials,
        value: valueAt(r, time),
        avatarUrl: r.avatarUrl,
        lastUpdated: model.runners.find((runner) => runner.id === r.id)
          ?.lastUpdated,
        you: r.you,
      })),
    [runners, time, model.runners],
  );
  const fieldHigh = useMemo(() => arenaFieldHigh(fieldLanes), [fieldLanes]);
  const clampViewCenter = useCallback(
    (value: number, viewSpan: number) =>
      clampCourseCenter(value, viewSpan, fieldHigh, unit, appearance.ground),
    [fieldHigh, unit, appearance.ground],
  );

  const sceneLanes: ArenaSceneLane[] = useMemo(
    () =>
      showGhost && ghost
        ? [
            ...fieldLanes,
            {
              id: ghost.id,
              name: ghost.name,
              initials: ghost.initials,
              value: valueAt(ghost, time),
              ghost: true,
            },
          ]
        : fieldLanes,
    [fieldLanes, ghost, showGhost, time],
  );

  const displayPlace = you ? placeAt(runners, you.id, time, 0) : 0;
  const followCenter = total;
  const resolvedCenter = clampViewCenter(center ?? followCenter, span);
  const displaySpan =
    centerTween !== null && centerTweenRef.current
      ? centerTweenRef.current.fromSpan +
        (centerTweenRef.current.toSpan - centerTweenRef.current.fromSpan) *
          centerTween
      : span;
  const displayCenter =
    centerTween !== null && centerTweenRef.current
      ? clampViewCenter(
          centerTweenRef.current.from +
            (centerTweenRef.current.to - centerTweenRef.current.from) *
              centerTween,
          displaySpan,
        )
      : resolvedCenter;
  liveCenterRef.current = displayCenter;

  const view: ArenaViewWindow = {
    center: displayCenter,
    span: displaySpan,
  };

  const cancelCenterTween = () => {
    if (centerTweenRef.current?.raf) {
      cancelAnimationFrame(centerTweenRef.current.raf);
    }
    if (centerTweenRef.current) { setCenter(liveCenterRef.current); setSpan(displaySpan); }
    centerTweenRef.current = null;
    setCenterTween(null);
  };

  const tweenCenterTo = (
    target: number,
    nextSpan = view.span,
    follow = false,
  ) => {
    const clamped = clampViewCenter(target, nextSpan);
    const fromSpan = view.span;
    const from = liveCenterRef.current;
    if (
      Math.abs(from - clamped) < 1e-6 &&
      Math.abs(fromSpan - nextSpan) < 1e-6
    ) {
      cancelCenterTween();
      setCenter(follow ? null : clamped);
      setSpan(nextSpan);
      return;
    }
    cancelCenterTween();
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCenter(follow ? null : clamped);
      setSpan(nextSpan);
      return;
    }
    const start = performance.now();
    const duration = fieldFlightDuration({ center: from, span: fromSpan }, { center: clamped, span: nextSpan });
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = fieldFlightEase(t);
      setCenterTween(eased);
      if (t < 1) {
        const raf = requestAnimationFrame(tick);
        if (centerTweenRef.current) centerTweenRef.current.raf = raf;
      } else {
        centerTweenRef.current = null;
        setCenterTween(null);
        setCenter(follow ? null : clamped);
        setSpan(nextSpan);
      }
    };
    centerTweenRef.current = {
      from,
      to: clamped,
      start,
      raf: 0,
      fromSpan,
      toSpan: nextSpan,
    };
    setCenterTween(0);
    centerTweenRef.current.raf = requestAnimationFrame(tick);
  };

  useEffect(
    () => () => {
      if (centerTweenRef.current)
        cancelAnimationFrame(centerTweenRef.current.raf);
    },
    [],
  );

  const trackSelected = resolveArenaSelectedId(
    selected,
    [...runners, ...(ghost ? [ghost] : [])],
    showGhost,
  );

  const ranked = useMemo(
    () => [...fieldLanes].sort((a, b) => b.value - a.value),
    [fieldLanes],
  );
  const placeOf = (value: number) =>
    1 + ranked.filter((lane) => lane.value > value + 0.000001).length;
  const scoreMap = useMemo(
    () => Object.fromEntries((boardRows ?? []).map((row) => [row.id, row.elo])),
    [boardRows],
  );
  const leader = ranked[0];
  const leaderValue = Math.max(leader?.value ?? 0, 0.0001);
  const myRankIndex = ranked.findIndex((lane) => lane.you);
  const aheadPeer = myRankIndex > 0 ? ranked[myRankIndex - 1] : null;
  const behindPeer =
    myRankIndex >= 0 && myRankIndex < ranked.length - 1
      ? ranked[myRankIndex + 1]
      : null;
  const focusedLane =
    ranked.find((lane) => lane.id === (trackSelected || you?.id)) ??
    ranked.find((lane) => lane.you) ??
    ranked[0];
  const focusedRank = focusedLane ? placeOf(focusedLane.value) : 1;
  const focusedElo = focusedLane ? scoreMap[focusedLane.id] : undefined;
  const focusedDeltaToYou = focusedLane ? focusedLane.value - total : 0;
  const focusedDeltaToLeader =
    focusedLane && leader ? focusedLane.value - leader.value : 0;

  if (!you) return <p className="fb-copy">Join a field to see your lanes.</p>;

  const broadcastHud = lanesImmersive ? (
    <div className="focus-broadcast-hud" aria-label="Broadcast race controls">
      <div className="focus-broadcast-top">
        <button
          type="button"
          className="focus-broadcast-back"
          aria-label="Close full screen field"
          onClick={() => setLanesImmersive(false)}
        >
          ← Back
        </button>
        <div className="focus-broadcast-title">
          {sportTitle ?? model.sport} · {displayPlace} / {runners.length}
        </div>
        <button
          type="button"
          className="focus-broadcast-dim-btn"
          aria-label={
            viewDimension === "2d" ? "Switch to 3D field" : "Switch to 2D map"
          }
          onClick={toggleDimension}
        >
          {viewDimension === "2d" ? "2D" : "3D"}
        </button>
      </div>

      <div className={`focus-broadcast-tower${intervalsCollapsed ? " is-collapsed" : ""}`} aria-label="Live intervals">
        <button type="button" className="focus-panel-toggle" aria-label={intervalsCollapsed ? "Expand live intervals" : "Collapse live intervals"} aria-expanded={!intervalsCollapsed} onClick={() => setIntervalsCollapsed(value => !value)}><span className="focus-panel-grip" aria-hidden="true" /></button>
        <div className="focus-panel-content" inert={intervalsCollapsed} aria-hidden={intervalsCollapsed}>
          <span className="focus-broadcast-tower-kicker">LIVE INTERVALS</span>
          {ranked.slice(0, 4).map((peer, idx) => {
            const delta = peer.value - leaderValue;
            const isSelected = (trackSelected || you.id) === peer.id;
            return (
              <button
                key={peer.id}
                type="button"
                className={
                  isSelected
                    ? "focus-broadcast-tower-row is-selected"
                    : peer.you
                      ? "focus-broadcast-tower-row is-you"
                      : "focus-broadcast-tower-row"
                }
                onClick={() => {
                  void playCue("selection");
                  toggleSelect(peer.id);
                }}
              >
                <span className="focus-broadcast-tower-rank">{idx + 1}</span>
                <span className="focus-broadcast-tower-name">
                  {peer.you ? "YOU" : peer.name.split(" ")[0]}
                </span>
                <span className="focus-broadcast-tower-val">
                  {idx === 0 ? peer.value.toFixed(1) : delta.toFixed(1)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="focus-broadcast-rail" aria-label="Quick jump rivals">
        {replayState && <CompetitionReplayButton state={replayState} selection={{ sport: model.sport, track: model.track, periodStart: model.periodStart, periodEnd: competePeriodWindow(replayState, competeNow(replayState), model.sport).endsAt.toISOString() }} dimension={viewDimension} label="Replay" />}
        {aheadPeer ? (
          <button
            type="button"
            className="focus-broadcast-rail-btn"
            onClick={() => {
              void playCue("selection");
              toggleSelect(aheadPeer.id);
            }}
          >
            ↑ Ahead
          </button>
        ) : null}
        <button
          type="button"
          className="focus-broadcast-rail-btn is-you"
          onClick={() => {
            void playCue("selection");
            toggleSelect(you.id);
          }}
        >
          YOU
        </button>
        {behindPeer ? (
          <button
            type="button"
            className="focus-broadcast-rail-btn"
            onClick={() => {
              void playCue("selection");
              toggleSelect(behindPeer.id);
            }}
          >
            ↓ Behind
          </button>
        ) : null}
      </div>

      {focusedLane ? (
        <div
          className={`focus-broadcast-spotlight${spotlightCollapsed ? " is-collapsed" : ""}`}
          aria-label="Focused athlete spotlight"
        >
          <button type="button" className="focus-panel-toggle" aria-label={spotlightCollapsed ? "Expand athlete panel" : "Collapse athlete panel"} aria-expanded={!spotlightCollapsed} onClick={() => setSpotlightCollapsed(value => !value)}><span className="focus-panel-grip" aria-hidden="true" /></button>
          <div className="focus-panel-content" inert={spotlightCollapsed} aria-hidden={spotlightCollapsed}>
            <div className="focus-broadcast-spotlight-head">
              <div className="focus-broadcast-spotlight-meta">
                <span className="focus-broadcast-spotlight-kicker">
                  {ordinalPlace(focusedRank).toUpperCase()} PLACE
                  {focusedLane.you ? " · YOU" : ""}
                  {focusedElo ? ` · ${focusedElo} ELO` : ""}
                </span>
                <strong className="focus-broadcast-spotlight-name">
                  {focusedLane.you
                    ? selfLaneLabel(focusedLane.name)
                    : focusedLane.name}
                </strong>
              </div>
              <div className="focus-broadcast-spotlight-stat">
                <strong>
                  {focusedLane.value.toFixed(1)} {unit}
                </strong>
                <span>
                  {focusedLane.you
                    ? focusedRank === 1
                      ? "Leading the field"
                      : `${Math.abs(focusedDeltaToLeader).toFixed(1)} ${unit} to 1st`
                    : `${focusedDeltaToYou > 0 ? "+" : ""}${focusedDeltaToYou.toFixed(1)} ${unit} vs you`}
                </span>
              </div>
            </div>

            <div
              className="focus-broadcast-chips"
              role="group"
              aria-label="Field athletes"
            >
              {ranked.map((peer, idx) => {
                const activeChip = focusedLane.id === peer.id;
                return (
                  <button
                    key={peer.id}
                    type="button"
                    className={
                      activeChip
                        ? "focus-broadcast-chip is-active"
                        : peer.you
                          ? "focus-broadcast-chip is-you"
                          : "focus-broadcast-chip"
                    }
                    onClick={() => {
                      void playCue("selection");
                      toggleSelect(peer.id);
                    }}
                  >
                    <span>#{idx + 1}</span>
                    <b>{peer.you ? "You" : peer.name.split(" ")[0]}</b>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <section
      className="focus-arena-stage"
      hidden={!tabActive}
      aria-hidden={!tabActive}
    >
      <div style={{ display: "flow-root" }}>
        <ExpandingField
          open={lanesImmersive && tabActive}
          tabActive={tabActive}
          onClose={() => setLanesImmersive(false)}
          hud={broadcastHud}
        >
          {viewDimension === "3d" && tabActive ? (
            <PortraitField
              lanes={sceneLanes.map((l) => ({
                ...l,
                value: l.value,
              }))}
              view={view}
              unit={unit}
              focusRequest={focusRequest}
              onGestureStart={cancelCenterTween}
              onViewChange={next => { cancelCenterTween(); setSpan(next.span); setCenter(clampViewCenter(next.center, next.span)); }}
              selectedId={trackSelected || you.id}
              immersive={lanesImmersive}
              onExpand={() => {
                void playCue("light");
                setLanesImmersive(true);
              }}
              onToggleDimension={toggleDimension}
              onZoom={(value) => {
                cancelCenterTween();
                setSpan(value);
              }}
              onPan={(value) => {
                cancelCenterTween();
                setSpan(view.span);
                setCenter(clampViewCenter(value, view.span));
              }}
              onSelect={toggleSelect}
            />
          ) : null}

          <div hidden={viewDimension === "3d"}>
            <div className="focus-track-frame focus-portal-frame">
              {!lanesImmersive ? (
                <div className="focus-portal-actions">
                  <button
                    type="button"
                    className="focus-portal-pill"
                    aria-label="Switch to 3D field"
                    onClick={toggleDimension}
                  >
                    2D
                  </button>
                  <button
                    type="button"
                    className="focus-portal-pill is-accent"
                    aria-label="Expand 2D map to full screen"
                    onClick={() => {
                      void playCue("light");
                      setLanesImmersive(true);
                    }}
                  >
                    Full Arena ⤢
                  </button>
                </div>
              ) : null}

              <ArenaLanes
                appearance={appearance}
                presentation="lanes"
                scores={scoreMap}
                immersive={lanesImmersive}
                lanes={sceneLanes}
                view={view}
                unit={unit}
                focusRequest={focusRequest}
                onGestureStart={cancelCenterTween}
                onViewChange={next => { cancelCenterTween(); setSpan(next.span); setCenter(clampViewCenter(next.center, next.span)); }}
                selected={trackSelected || you.id}
                onSelect={toggleSelect}
                onBackgroundTap={() => {
                  void playCue("light");
                  setLanesImmersive(true);
                }}
                onPan={(v) => {
                  cancelCenterTween();
                  setSpan(view.span);
                  setCenter(clampViewCenter(v, view.span));
                }}
              />

              <div className="focus-portal-zoom-pill">
                <button
                  type="button"
                  aria-label="Zoom out"
                  disabled={view.span >= (unit === "pts" ? 100 : 40)}
                  onClick={() => {
                    cancelCenterTween();
                    setSpan(Math.min(unit === "pts" ? 100 : 40, view.span * 1.5));
                  }}
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label="Zoom in"
                  disabled={view.span <= (unit === "pts" ? 2 : 0.5)}
                  onClick={() => {
                    cancelCenterTween();
                    setSpan(Math.max(unit === "pts" ? 2 : 0.5, view.span / 1.5));
                  }}
                >
                  ＋
                </button>
              </div>
            </div>
          </div>
        </ExpandingField>
      </div>

      {/* Collapsed-by-default Standings Disclosure */}
      <div className="focus-standings-collapsible">
        <button
          type="button"
          className="focus-standings-toggle"
          aria-expanded={standingsOpen}
          onClick={() => {
            void playCue("selection");
            setStandingsOpen((prev) => !prev);
          }}
        >
          <div className="focus-standings-toggle-copy">
            <strong>
              {standingsOpen ? "Hide standings" : "Show standings"}
            </strong>
            <span>
              {ordinalPlace(displayPlace)} of {runners.length} ·{" "}
              {total.toFixed(1)} {unit}
              {leader
                ? ` · Leader ${leader.you ? "You" : leader.name.split(" ")[0]} (${leader.value.toFixed(1)} ${unit})`
                : ""}
            </span>
          </div>
          <span className="focus-standings-toggle-chevron" aria-hidden="true">
            {standingsOpen ? "▴" : "▾"}
          </span>
        </button>

        {standingsOpen ? (
          <div className="focus-standings-body">
            {leader ? (
              <button
                type="button"
                className="focus-leader-stage"
                onClick={() => toggleSelect(leader.id)}
              >
                <div className="focus-leader-stage-top">
                  <span className="focus-leader-crown">
                    1ST PLACE · FIELD LEADER
                  </span>
                  <span className="focus-leader-elo">
                    {scoreMap[leader.id] ?? "—"} ELO
                  </span>
                </div>
                <div className="focus-leader-stage-main">
                  <UserAvatar
                    src={leader.avatarUrl}
                    name={leader.name}
                    size={42}
                    fallback={
                      <svg
                        width="32"
                        height="42"
                        viewBox="-40 -50 80 100"
                        aria-hidden="true"
                      >
                        <PolishedRacer
                          x={0}
                          y={0}
                          you={Boolean(leader.you)}
                          gold
                          showWake={false}
                        />
                      </svg>
                    }
                  />
                  <div className="focus-leader-stage-copy">
                    <strong>
                      {leader.you ? selfLaneLabel(leader.name) : leader.name}
                    </strong>
                    <span>
                      {leader.you
                        ? "You hold the crown this week"
                        : `${(leader.value - total).toFixed(1)} ${unit} ahead of you`}
                    </span>
                  </div>
                  <strong className="focus-leader-stage-val">
                    {leader.value.toFixed(1)} {unit}
                  </strong>
                </div>
              </button>
            ) : null}

            <div className="focus-standings-bars" role="list">
              {ranked.map((lane) => {
                const r = placeOf(lane.value);
                const pct = Math.max(
                  6,
                  Math.min(100, Math.round((lane.value / leaderValue) * 100)),
                );
                const elo = scoreMap[lane.id];
                return (
                  <button
                    key={lane.id}
                    type="button"
                    role="listitem"
                    className={
                      lane.you
                        ? "focus-standing-bar-row is-you"
                        : "focus-standing-bar-row"
                    }
                    onClick={() => toggleSelect(lane.id)}
                  >
                    <span className="focus-standing-rank">{r}</span>
                    <UserAvatar
                      src={lane.avatarUrl}
                      name={lane.name}
                      size={36}
                      fallback={
                        <svg
                          className="focus-standing-avatar"
                          width="26"
                          height="36"
                          viewBox="-40 -50 80 100"
                          aria-hidden="true"
                        >
                          <PolishedRacer
                            x={0}
                            y={0}
                            you={Boolean(lane.you)}
                            gold={r === 1}
                            showWake={false}
                          />
                        </svg>
                      }
                    />
                    <div className="focus-standing-bar-content">
                      <div className="focus-standing-bar-top">
                        <strong className="focus-standing-name">
                          {lane.you ? selfLaneLabel(lane.name) : lane.name}
                          {elo != null
                            ? ` ${effortRankBadge(elo).symbol}`
                            : ""}
                        </strong>
                        <div className="focus-standing-metrics">
                          <strong>
                            {lane.value.toFixed(1)} {unit}
                          </strong>
                          <small>{elo ?? "—"} effort score</small>
                        </div>
                      </div>
                      <div className="focus-standing-bar-track" aria-hidden="true">
                        <div
                          className={
                            r === 1
                              ? "focus-standing-bar-fill is-leader"
                              : lane.you
                                ? "focus-standing-bar-fill is-you"
                                : "focus-standing-bar-fill"
                          }
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
              {ghost ? (
                <div className="club-past-self">
                  <span>Past you · unranked</span>
                  <strong>
                    {valueAt(ghost, time).toFixed(1)} {unit}
                  </strong>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
