"use client";

import { AuthPrompt } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { HomeConcept } from "@/app/design/_studies/home-lab/home-concepts";
import {
  PRODUCT_SEEN_PREFIX,
  homeSnapshot,
  progressGain,
  readSnapshot,
  seenKey,
  type ProgressSnapshot,
} from "@/app/design/_studies/home-lab/model";
import { HomeSecondaryView } from "@/app/design/_studies/home-lab/secondary-views";
import { AthleteSettings } from "@/features/home/athlete-settings";
import { FieldTools } from "@/features/home/field-tools";
import { SessionLedger } from "@/features/home/session-ledger";
import { defaultLook } from "@/features/field/avatar";
import { LaneTrack } from "@/features/field/components/lane-track";
import { buildFieldModel } from "@/features/field/model";
import { stableLanes, type SceneRunner } from "@/features/field/geometry";
import { SleepPanel } from "@/features/health/sleep-panel";
import { Ace } from "@/features/rally/ace";
import { WeekReveal } from "@/features/split/components/week-reveal";
import { buildSplitBoard } from "@/features/split/model";
import {
  activityEffort,
  competeNow,
  countsOnTrack,
  formatEffort,
  formatVolume,
  HEALTH_METRICS,
  initialsFromName,
  lessonFor,
  SPORTS,
  sportById,
  suggestionForState,
  type Activity,
  type SportId,
} from "@fitness-battle/shared";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import "@/app/design/_studies/home-lab/home-lab.css";
import "@/app/design/_studies/home-lab/home-concepts.css";

const Pursuit = dynamic(
  () => import("@/features/field/components/live-pursuit").then((mod) => mod.LivePursuit),
  { ssr: false, loading: () => <div className="ah-scene-loading">Opening the track…</div> },
);

export type HomeView = "today" | "arena" | "progress" | "athlete";

export function viewFromPath(path: string): HomeView {
  if (path.startsWith("/board")) return "arena";
  if (path.startsWith("/progress") || path.startsWith("/splits") || path.startsWith("/pace")) return "progress";
  if (path.startsWith("/you")) return "athlete";
  return "today";
}

const VIEW_HREF: Record<HomeView, string> = {
  today: "/",
  arena: "/board",
  progress: "/progress",
  athlete: "/you",
};
type Detail = { title: string; body: ReactNode } | null;
type View = HomeView;

function formatDay(at: string) {
  return new Date(at).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function valueLabel(value: number, unit: string) {
  return `${value.toFixed(1)} ${unit}`;
}

function DetailSheet({ detail, onClose }: { detail: Detail; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (detail && !ref.current?.open) ref.current?.showModal();
    if (!detail && ref.current?.open) ref.current.close();
  }, [detail]);
  return (
    <dialog
      ref={ref}
      className="ah-sheet"
      aria-labelledby="ah-detail-title"
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <header>
        <h2 id="ah-detail-title">{detail?.title}</h2>
        <button type="button" onClick={onClose} aria-label="Close detail">
          ×
        </button>
      </header>
      <div className="ah-sheet-body">{detail?.body}</div>
    </dialog>
  );
}

/** Checkpoints home for the signed-in and guest play shell. */
export function ProductHome() {
  const { state, dispatch, loadStatus } = useCompete();
  const { user, loading } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const view = viewFromPath(path);
  const [detail, setDetail] = useState<Detail>(null);
  const [scene, setScene] = useState<"2d" | "3d">("2d");
  const [sceneUnavailable, setSceneUnavailable] = useState(false);
  const [progress, setProgress] = useState(1);
  const [replay, setReplay] = useState(0);
  const [finished, setFinished] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState("Create an account to compete this week.");
  const [arrival, setArrival] = useState<{
    previous: ProgressSnapshot;
    current: ProgressSnapshot;
    reveal: boolean;
  } | null>(null);
  const handled = useRef("");
  const inMemory = useRef<ProgressSnapshot | null>(null);
  const accountId = user?.id ?? "guest";
  const persist = loadStatus !== "failed";

  const snapshot = useMemo(() => (state ? homeSnapshot(state) : null), [state]);

  const saveSeen = useCallback(
    (value: ProgressSnapshot) => {
      inMemory.current = value;
      if (!persist) return;
      try {
        localStorage.setItem(seenKey(accountId, value, PRODUCT_SEEN_PREFIX), JSON.stringify(value));
      } catch {
        /* Session memory covers a blocked store. */
      }
    },
    [persist, accountId],
  );

  const go = useCallback((next: View) => {
    const href = VIEW_HREF[next];
    if (viewFromPath(path) === next && (next === "today" ? path === "/" : path.startsWith(href))) return;
    router.push(href);
  }, [path, router]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);

  useEffect(() => {
    if (!snapshot) return;
    const signature = JSON.stringify(snapshot);
    if (handled.current === signature) return;
    handled.current = signature;
    let previous = inMemory.current;
    if (persist) {
      try {
        previous = readSnapshot(localStorage.getItem(seenKey(accountId, snapshot, PRODUCT_SEEN_PREFIX))) ?? previous;
      } catch {
        /* Storage is optional. */
      }
    }
    const reveal = loadStatus !== "failed" && Boolean(progressGain(previous, snapshot));
    setArrival({
      previous: previous?.scope === snapshot.scope ? previous : snapshot,
      current: snapshot,
      reveal,
    });
    setFinished(!reveal);
    setProgress(reveal ? 0 : 1);
    if (reveal) {
      setScene("2d");
      setDetail(null);
      if (viewFromPath(path) !== "arena") router.push("/board");
    } else saveSeen(snapshot);
  }, [snapshot, persist, accountId, saveSeen, loadStatus, path, router]);

  useEffect(() => {
    if (!arrival?.reveal && replay === 0) return;
    let frame = 0;
    let start: number | null = null;
    setProgress(0);
    setFinished(false);
    function finish() {
      setProgress(1);
      setFinished(true);
      saveSeen(arrival!.current);
    }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    const tick = (time: number) => {
      start ??= time;
      const elapsed = Math.max(0, time - start - 400);
      const fraction = Math.min(1, elapsed / 1800);
      setProgress(1 - Math.pow(1 - fraction, 3));
      if (fraction < 1) frame = requestAnimationFrame(tick);
      else finish();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [arrival, replay, saveSeen]);

  if (loading || !state || !snapshot || !arrival) {
    return <p className="ah-small">Loading your movement…</p>;
  }

  const now = competeNow(state);
  const sport = sportById(state.primary);
  const unit = sport.gps ? "km" : "pts";
  const showingSleep = state.focus.family === "health" && state.focus.id === "sleep";
  const today = state.primary === "running" ? suggestionForState(state, now) : lessonFor(state.primary, now);
  const lesson = lessonFor(state.primary, now);
  const done = state.lessonDoneOn === now.toISOString().slice(0, 10);
  const board = buildSplitBoard(state, state.primary, "open", now);
  const activities = board.weekActivities.filter(
    (activity) => countsOnTrack(activity, "open") && new Date(activity.startedAt) <= now,
  );
  const gain = arrival.reveal ? progressGain(arrival.previous, arrival.current) : null;
  const you = snapshot.lanes.find((lane) => lane.you)!;
  const oldYou = arrival.previous.lanes.find((lane) => lane.you)?.value ?? you.value;
  const shownYou = oldYou + (you.value - oldYou) * progress;
  const rank = 1 + snapshot.lanes.filter((lane) => !lane.you && lane.value > you.value).length;
  const oldRank = 1 + arrival.previous.lanes.filter((lane) => !lane.you && lane.value > oldYou).length;
  const currentRank =
    1 +
    snapshot.lanes.filter((lane) => {
      if (lane.you) return false;
      const old = arrival.previous.lanes.find((previous) => previous.id === lane.id)?.value ?? lane.value;
      return old + (lane.value - old) * progress > shownYou;
    }).length;
  const field = buildFieldModel(state, state.primary, "open", now);
  const trackRunners: SceneRunner[] = stableLanes(
    (field.runners.length
      ? field.runners.map((runner) => ({
          id: runner.id,
          name: runner.name,
          initials: runner.initials,
          you: runner.you,
          series: [0, ...runner.km],
        }))
      : [
          {
            id: you.id,
            name: you.name,
            initials: initialsFromName(you.name),
            you: true,
            series: [0, you.value],
          },
        ]),
  );
  const ghost = field.ghost
    ? {
        id: field.ghost.id,
        name: field.ghost.name,
        initials: field.ghost.initials,
        ghost: true,
        series: [0, ...field.ghost.km],
      }
    : null;
  const trackTime = Math.max(0, (trackRunners[0]?.series.length ?? 1) - 1);
  const showArrival = Boolean(gain) && !finished;
  const optedIn = state.ratings.find((row) => row.sport === state.primary)?.optedIn ?? false;
  const connected = state.links.some((link) => link.status === "connected");

  function requireParticipate(reason: string, action: () => void) {
    if (!user) {
      setAuthReason(reason);
      setAuthOpen(true);
      return;
    }
    if (!state!.onboardingCompleted) {
      window.location.href = "/onboarding";
      return;
    }
    action();
  }

  function openActivity(activity: Activity) {
    const elapsed = activities.filter((item) => item.startedAt <= activity.startedAt);
    setDetail({
      title: `${formatDay(activity.startedAt)}’s ${sport.name.toLowerCase()}`,
      body: (
        <>
          <p className="ah-eyebrow">{activity.source.toUpperCase()} · COUNTED</p>
          <strong className="ah-sheet-number">
            {formatVolume(state!.primary, activity.distanceM, activity.movingSec)}
          </strong>
          <div className="ah-stat-row">
            <div>
              <b>{Math.round(activity.movingSec / 60)} min</b>
              <span>Moving time</span>
            </div>
            <div>
              <b>{formatEffort(activityEffort(activity))}</b>
              <span>Effort points</span>
            </div>
          </div>
          <p>
            This brought your week to{" "}
            <b>
              {formatVolume(
                state!.primary,
                elapsed.reduce((sum, item) => sum + item.distanceM, 0),
                elapsed.reduce((sum, item) => sum + item.movingSec, 0),
              )}
            </b>
            .
          </p>
          <button
            type="button"
            className="ah-primary"
            onClick={() => {
              setDetail(null);
              go("arena");
            }}
          >
            See it on the track
          </button>
          <button type="button" className="ah-text-link" onClick={() => { setDetail(null); go("progress"); }}>
            All moves
          </button>
        </>
      ),
    });
  }

  function openWeek() {
    setDetail({
      title: "Your week, move by move.",
      body: (
        <>
          <p className="ah-eyebrow">
            {board.periodLabel} · {activities.length} COUNTED ACTIVITIES
          </p>
          <strong className="ah-sheet-number">
            {formatVolume(state!.primary, snapshot!.distanceM, snapshot!.movingSec)}
          </strong>
          <div className="ah-week-moves">
            {activities.map((activity) => (
              <button type="button" key={activity.id} onClick={() => openActivity(activity)}>
                <span>{formatDay(activity.startedAt)}</span>
                <b>{formatVolume(state!.primary, activity.distanceM, activity.movingSec)}</b>
                <small>{Math.round(activity.movingSec / 60)} min</small>
              </button>
            ))}
          </div>
          {!activities.length ? <p>Your counted activities will appear here after an import.</p> : null}
          <button type="button" className="ah-text-link" onClick={() => { setDetail(null); go("progress"); }}>
            History
          </button>
        </>
      ),
    });
  }

  function openCoach() {
    setDetail({
      title: today.title,
      body: (
        <>
          <Ace />
          <p>{today.detail}</p>
          <h3>{lesson.title}</h3>
          <p>{lesson.detail}</p>
          <button
            type="button"
            className="ah-primary"
            disabled={done || !user || loadStatus === "failed"}
            onClick={() => {
              dispatch({ type: "complete-lesson" });
              setDetail(null);
            }}
          >
            {done ? "Tip completed" : "Got it"}
          </button>
          {!user ? (
            <Link href="/login" className="ah-text-link">
              Sign in to save lesson progress
            </Link>
          ) : null}
          <p className="ah-small">This completes the tip, not a workout.</p>
        </>
      ),
    });
  }

  function openAthlete(laneId: string) {
    if (laneId === you.id) {
      openWeek();
      return;
    }
    const lane = snapshot!.lanes.find((item) => item.id === laneId);
    if (!lane) return;
    const gap = lane.value - you.value;
    setDetail({
      title: lane.name,
      body: (
        <>
          <p className="ah-eyebrow">THIS WEEK · {sport.name.toUpperCase()}</p>
          <strong className="ah-sheet-number">{valueLabel(lane.value, unit)}</strong>
          <p>
            {Math.abs(gap).toFixed(1)} {unit} {gap > 0 ? "ahead of you" : "behind you"}.
          </p>
          <div className="ah-comparison">
            <span>
              You <b>{valueLabel(you.value, unit)}</b>
            </span>
            <span>
              {lane.name.split(" ")[0]} <b>{valueLabel(lane.value, unit)}</b>
            </span>
          </div>
          <button type="button" className="ah-primary" onClick={() => { setDetail(null); go("arena"); }}>
            Open the field
          </button>
        </>
      ),
    });
  }

  function openProfile() {
    const rating = state!.ratings.find((row) => row.sport === state!.primary);
    setDetail({
      title: state!.name,
      body: (
        <>
          <p className="ah-eyebrow">
            {state!.city} · {sport.name}
          </p>
          <strong className="ah-sheet-number">{rating?.openElo ?? 1000}</strong>
          <p className="ah-small">{connected ? "A tracker is connected." : "No live tracker connected."}</p>
          <button type="button" className="ah-primary" onClick={() => { setDetail(null); go("athlete"); }}>
            Settings
          </button>
        </>
      ),
    });
  }

  function openFocus() {
    setDetail({
      title: "This week",
      body: (
        <>
          <p className="ah-eyebrow">SPORT</p>
          <div className="ah-choice-list">
            {SPORTS.map((item) => {
              const joined = state!.ratings.find((row) => row.sport === item.id)?.optedIn;
              const on = !showingSleep && item.id === state!.primary;
              return (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={on}
                  onClick={() =>
                    requireParticipate(`Sign in to compete in ${item.name} this week.`, () => {
                      dispatch({
                        type: joined ? "set-primary" : "opt-in",
                        sport: item.id as SportId,
                      });
                      if (joined) dispatch({ type: "set-focus", focus: { family: "sport", id: item.id } });
                      setDetail(null);
                    })
                  }
                >
                  <b>{item.name}</b>
                  <small>{on ? "Current" : joined ? "Switch" : "Join"}</small>
                </button>
              );
            })}
          </div>
          <p className="ah-eyebrow">HEALTH</p>
          <div className="ah-choice-list">
            {HEALTH_METRICS.map((item) => {
              const joined = state!.healthRatings.find((row) => row.metric === item.id)?.optedIn;
              return (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={showingSleep && item.id === "sleep"}
                  onClick={() =>
                    requireParticipate(`Sign in to compete on ${item.name} this week.`, () => {
                      dispatch(
                        joined
                          ? { type: "set-focus", focus: { family: "health", id: item.id } }
                          : { type: "opt-in-health", metric: item.id },
                      );
                      setDetail(null);
                    })
                  }
                >
                  <b>{item.name}</b>
                  <small>{joined ? "Open" : "Join"}</small>
                </button>
              );
            })}
          </div>
        </>
      ),
    });
  }

  const nearby = snapshot.lanes
    .filter((lane) => !lane.you)
    .sort((a, b) => Math.abs(a.value - you.value) - Math.abs(b.value - you.value))
    .slice(0, 2);
  const visibleLanes = stableLanes([...nearby, you]);
  const peak = Math.max(5, ...snapshot.lanes.map((lane) => lane.value), ...arrival.previous.lanes.map((lane) => lane.value));
  const scale = Math.ceil(peak / 5) * 5;

  return (
    <div data-view={view} data-reveal={arrival.reveal && !finished ? "playing" : "settled"}>
        <header className="ah-app-header">
          <button type="button" className="ah-sport-name" onClick={openFocus}>
            {showingSleep ? "Sleep" : sport.name}
          </button>
          {view === "today" && !showingSleep ? (
            <button type="button" className="ah-week-header" aria-label="Open your week’s activities" onClick={openWeek}>
              {formatVolume(state.primary, snapshot.distanceM, snapshot.movingSec)}
            </button>
          ) : null}
        </header>
        <main className="ah-app-main">
          {state.pendingRevealIds.length > 0 && view === "today" ? (
            <WeekReveal state={state} onDismiss={() => dispatch({ type: "acknowledge-reveal" })} />
          ) : null}
          {view === "today" ? (
            showingSleep ? (
              <SleepPanel
                state={state}
                now={now}
                onJoin={() =>
                  requireParticipate("Sign in to compete on sleep this week.", () =>
                    dispatch({ type: "opt-in-health", metric: "sleep" }),
                  )
                }
                onSample={() =>
                  requireParticipate("Sign in to record a sample night.", () => dispatch({ type: "log-sleep" }))
                }
                onLeave={() => dispatch({ type: "opt-out-health", metric: "sleep" })}
              />
            ) : (
              <>
                <HomeConcept
                  layout="trail"
                  activities={activities}
                  sport={state.primary}
                  now={now}
                  periodStart={board.periodStart}
                  recommendation={today}
                  onActivity={openActivity}
                  onCoach={openCoach}
                />
                {!optedIn ? (
                  <p className="ah-small ah-join-note">
                    <button type="button" className="ah-text-link" onClick={() => go("arena")}>
                      Join this week’s field
                    </button>
                  </p>
                ) : null}
              </>
            )
          ) : view === "progress" || view === "athlete" ? (
            <>
            <HomeSecondaryView
              view={view}
              state={state}
              snapshot={snapshot}
              sampleMode={false}
              unsynced={!connected}
              onActivity={openActivity}
              onProfile={openProfile}
              embedded
            />
            {view === "progress" ? <SessionLedger /> : user ? (
              <Suspense fallback={<p className="ah-small">Loading settings…</p>}>
                <AthleteSettings />
              </Suspense>
            ) : (
              <p className="ah-small">Sign in to manage trackers and settings.</p>
            )}
            </>
          ) : (
            <section className="ah-arena" aria-label="Weekly track">
              <div className="ah-arena-heading">
                <h1>Arena</h1>
                <button
                  type="button"
                  onClick={() => {
                    setScene((current) => (current === "2d" ? "3d" : "2d"));
                    setSceneUnavailable(false);
                  }}
                  aria-label={scene === "2d" ? "Show 3D track" : "Show 2D track"}
                >
                  {scene === "2d" ? "3D" : "2D"}
                </button>
              </div>
              <div className="ah-arrival-stats">
                <button type="button" onClick={openWeek}>
                  <strong>{valueLabel(showArrival ? shownYou : you.value, unit)}</strong>
                  {gain ? (
                    <span>
                      {valueLabel(oldYou, unit)} → {valueLabel(you.value, unit)}
                    </span>
                  ) : null}
                </button>
                {snapshot.lanes.length > 1 ? (
                  <div>
                    <b>#{showArrival ? currentRank : rank}</b>
                    {gain && oldRank > rank ? (
                      <span>
                        #{oldRank} → #{rank}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="ah-arena-track">
                {showArrival ? (
                  <>
                    <div className="ah-scale">
                      <span>0 {unit}</span>
                      <span>
                        {scale} {unit}
                      </span>
                    </div>
                    {visibleLanes.map((lane) => {
                      const old = arrival.previous.lanes.find((item) => item.id === lane.id)?.value ?? lane.value;
                      const value = old + (lane.value - old) * progress;
                      return (
                        <button
                          className={`ah-runner ${lane.you ? "ah-runner-you" : ""}`}
                          key={lane.id}
                          type="button"
                          onClick={() => openAthlete(lane.id)}
                          aria-label={`${lane.you ? "You" : lane.name}, ${valueLabel(value, unit)}. Open details`}
                        >
                          <span className="ah-runner-label">{lane.you ? "YOU" : lane.name.split(" ")[0]}</span>
                          <span className="ah-runner-lane">
                            <span className="ah-runner-fill" style={{ width: `${(value / scale) * 100}%` }} />
                            <span className="ah-runner-dot" style={{ left: `${(value / scale) * 100}%` }}>
                              {initialsFromName(lane.name)}
                            </span>
                          </span>
                          <span className="ah-runner-value">{value.toFixed(1)}</span>
                        </button>
                      );
                    })}
                  </>
                ) : scene === "3d" && !sceneUnavailable ? (
                  <Pursuit
                    runners={trackRunners}
                    ghost={ghost}
                    time={trackTime}
                    extra={0}
                    selected={field.you?.id ?? you.id}
                    showGhost={Boolean(ghost)}
                    camera="follow"
                    look={defaultLook}
                    unit={unit}
                    onSelect={openAthlete}
                    onUnavailable={() => setSceneUnavailable(true)}
                  />
                ) : (
                  <>
                    {sceneUnavailable ? (
                      <p className="ah-small">3D isn’t available on this device. Your 2D track is ready.</p>
                    ) : null}
                    <LaneTrack
                      runners={trackRunners}
                      ghost={ghost}
                      time={trackTime}
                      extra={0}
                      selected={field.you?.id ?? you.id}
                      showGhost={Boolean(ghost)}
                      unit={unit}
                      onSelect={openAthlete}
                    />
                  </>
                )}
              </div>
              {gain ? (
                <div className="ah-arena-verdict" aria-live="polite">
                  <Ace />
                  <b>+{valueLabel(unit === "km" ? gain.distanceM / 1000 : gain.effort, unit)}</b>
                  <button
                    type="button"
                    className="ah-replay"
                    aria-label="Replay your movement"
                    onClick={() => setReplay((count) => count + 1)}
                  >
                    ↺
                  </button>
                </div>
              ) : null}
              <FieldTools
                sport={state.primary}
                sportName={sport.name}
                optedIn={optedIn}
                duels={board.duels}
                requireParticipate={requireParticipate}
              />
              {gain ? (
                <button
                  type="button"
                  className="ah-primary ah-continue"
                  onClick={() => {
                    saveSeen(snapshot);
                    go("today");
                  }}
                >
                  Today
                </button>
              ) : null}
            </section>
          )}
        </main>
        <DetailSheet detail={detail} onClose={() => setDetail(null)} />
        <AuthPrompt open={authOpen} reason={authReason} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
