"use client";
import { useState } from "react";
import { useCompete } from "@/components/compete-context";
import { AnimatedEmber } from "@/components/mascot/animated-ember";
import type { EmberAction } from "@fitness-battle/shared/mascot";
import { Sheet } from "@/ui/sheet";
import {
  buildTodayRoute,
  competeNow,
  countsOnTrack,
  currentPeriodBounds,
  formatVolume,
  sportById,
  type Activity,
} from "@fitness-battle/shared";
export function TodayScreen() {
  const { state } = useCompete();
  const [detail, setDetail] = useState<{ title: string; body: string } | null>(
    null,
  );
  const [reaction, setReaction] = useState<{
    action: EmberAction;
    key: number;
  }>({ action: "wave", key: 0 });
  const react = (action: EmberAction) =>
    setReaction((value) => ({ action, key: value.key + 1 }));
  if (!state) return <p className="fb-copy">Loading your week…</p>;
  const route = buildTodayRoute(state);
  const now = competeNow(state);
  const period = currentPeriodBounds(state.clock.kind, now);
  const sessions = state.activities
    .filter((a) => countsOnTrack(a, "open") && new Date(a.startedAt) <= now)
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 10);
  const weekSessions = sessions.filter((a) => {
    const at = new Date(a.startedAt).getTime();
    return at >= period.startsAt.getTime() && at < period.endsAt.getTime();
  }).length;
  const openToday = () => {
    react("hop");
    setDetail({
      title: route.suggestion.title,
      body: `${route.suggestion.detail} ${route.suggestion.reason}`,
    });
  };
  const openSession = (a: Activity) =>
    setDetail({
      title: `${sportById(a.sport).name} · ${formatVolume(a.sport, a.distanceM, a.movingSec)}`,
      body: `${new Date(a.startedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })} · ${a.source} · ${a.verified ? "Verified" : "Open"} · counted toward your training.`,
    });
  return (
    <div className="focus-home">
      <header className="focus-heading">
        <p className="fb-kicker">Your daily starting point</p>
        <h1>Just one good move.</h1>
        <p className="fb-copy">Small steps. A week that adds up.</p>
      </header>
      <button
        className="focus-suggestion"
        onClick={openToday}
        onMouseEnter={() => react("wave")}
      >
        <span>
          <small>Today's suggestion</small>
          <strong>{route.suggestion.title}</strong>
          <em>
            {route.suggestion.minutes
              ? `${route.suggestion.minutes} min · `
              : ""}
            Your next move ↗
          </em>
        </span>
        <AnimatedEmber
          className="focus-suggestion-ember"
          expression="happy"
          action={reaction.action}
          restartKey={reaction.key}
          loop={false}
          playing={reaction.key > 0}
        />
      </button>
      <details className="focus-disclosure">
        <summary>
          Your week at a glance <span>＋</span>
        </summary>
        <div className="focus-details-body">
          <p className="fb-copy">
            {weekSessions} counted sessions in this competition period. Open
            Arena to see your competition totals.
          </p>
        </div>
      </details>
      <div className="focus-row">
        <h2>Your recent rhythm</h2>
        <span className="fb-note">Last {sessions.length} sessions</span>
      </div>
      <section className="focus-journey" aria-label="Activity journey">
        <div className="focus-future" aria-label="Future day, not interactive">
          ○ <small>Tomorrow · room for what's next</small>
        </div>
        <div className="focus-path-row is-current">
          <button
            onClick={openToday}
            onMouseEnter={() => react("wave")}
            aria-label="Ember: open today's recommendation"
          >
            <AnimatedEmber
              expression="happy"
              action={reaction.action}
              restartKey={reaction.key}
              loop={false}
              playing={reaction.key > 0}
            />
          </button>
          <span>
            <small>Today</small>
            <b>You are here</b>
            <em>Tap Ember for your next move ↗</em>
          </span>
        </div>
        {sessions.map((a, i) => (
          <div
            className={`focus-path-row ${i % 2 ? "is-left" : "is-right"}`}
            key={a.id}
          >
            <button
              onClick={() => openSession(a)}
              aria-label={`Open ${sportById(a.sport).name} session ${formatVolume(a.sport, a.distanceM, a.movingSec)}`}
            >
              <i>✓</i>
              <b>{formatVolume(a.sport, a.distanceM, a.movingSec)}</b>
              <small>
                {new Date(a.startedAt).toLocaleDateString("en-US", {
                  weekday: "short",
                  timeZone: "UTC",
                })}
              </small>
            </button>
            <span>
              <small>
                {new Date(a.startedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </small>
              <b>{sportById(a.sport).name}</b>
              <em>{a.verified ? "Verified" : "Open"} · counted</em>
            </span>
          </div>
        ))}
        {!sessions.length && (
          <p className="fb-copy focus-empty-copy">
            Your first counted session will start the path. Connect a tracker
            from Athlete.
          </p>
        )}
      </section>
      <Sheet
        open={!!detail}
        title={detail?.title ?? "Details"}
        body={detail?.body ?? ""}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}
