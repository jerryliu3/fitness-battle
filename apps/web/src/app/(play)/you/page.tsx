"use client";

import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import {
  AthleteCard,
  WeekRecords,
} from "@/features/split/components/athlete-card";
import {
  ProductHeader,
  sourceFromLinks,
} from "@/features/split/components/product-header";
import { SeasonHistory } from "@/features/split/components/season-history";
import { buildSplitBoard } from "@/features/split/model";
import {
  activityFromSample,
  BACKFILL_DAYS,
  competeNow,
  currentPeriodBounds,
  evidenceLabel,
  PROVIDERS,
  RANK_BANDS,
  rankForElo,
  sportById,
  SPORTS,
  STARTING_FREEZES,
  type ActivitySample,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function YouContent() {
  const { user, signOut, demoMode } = useAuth();
  const { state, dispatch } = useCompete();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const tracker = searchParams.get("tracker");
  const appliedTracker = useRef<string | null>(null);

  if (state && !seeded) {
    setSeeded(true);
    setName(state.name);
    setCity(state.city);
  }

  useEffect(() => {
    if (!state || !tracker || appliedTracker.current === tracker) return;
    appliedTracker.current = tracker;
    if (tracker === "connected") {
      dispatch({
        type: "apply-sync",
        provider: "strava",
        activities: [],
        linkStatus: "connected",
      });
    } else if (tracker === "stub") {
      dispatch({ type: "link", provider: "strava" });
    } else if (tracker === "error") {
      setSyncNote("Strava did not connect. Sign in and try the link again.");
    }
  }, [dispatch, state, tracker]);

  if (!state) return <p className="fb-copy">Loading…</p>;

  const now = competeNow(state);
  const period = currentPeriodBounds(state.clock.kind, now);
  const frozen = state.frozenPeriods.includes(period.startsAt.toISOString());
  const board = buildSplitBoard(state, state.primary, "open", now);
  const source = sourceFromLinks(state.links);
  const spec = sportById(state.primary);

  async function syncProvider(providerId: (typeof PROVIDERS)[number]["id"]) {
    setSyncNote(null);
    const link = state!.links.find((item) => item.provider === providerId);
    if (providerId !== "strava") {
      if (!link?.linked) {
        dispatch({ type: "link", provider: providerId });
        setSyncNote(`${providerId} is a demo link. It is not a live connection.`);
        return;
      }
      dispatch({ type: "sync", provider: providerId });
      setSyncNote("Demo sync applied on this device.");
      return;
    }

    if (!link?.linked) {
      try {
        const response = await fetch("/api/fitness/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id }),
        });
        const body = (await response.json()) as {
          authorizeUrl?: string;
          status?: string;
          message?: string;
          error?: string;
        };
        if (!response.ok) {
          setSyncNote(body.error ?? "Could not start Strava connect.");
          return;
        }
        if (body.authorizeUrl) {
          window.location.href = body.authorizeUrl;
          return;
        }
        dispatch({ type: "link", provider: "strava" });
        setSyncNote(body.message ?? "Demo tracker linked. This is not a live connection.");
      } catch {
        dispatch({ type: "link", provider: "strava" });
        setSyncNote("Offline demo link only.");
      }
      return;
    }

    try {
      const response = await fetch("/api/fitness/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });
      const body = (await response.json()) as {
        usedMock?: boolean;
        activities?: ActivitySample[];
        error?: string;
        windowKind?: string;
      };
      if (!response.ok) {
        setSyncNote(body.error ?? "Sync failed");
        return;
      }
      const activities = (body.activities ?? [])
        .map((sample) => activityFromSample(sample))
        .filter((activity) => activity != null);
      dispatch({
        type: "apply-sync",
        provider: "strava",
        activities,
        linkStatus: body.usedMock ? "stub" : "connected",
      });
      setSyncNote(
        body.usedMock
          ? `Stub sync (${body.windowKind ?? "recent"}): ${activities.length} sample activities. Not a live connection.`
          : `Synced ${activities.length} activities.`,
      );
    } catch {
      dispatch({ type: "sync", provider: providerId });
      setSyncNote("Offline demo sync applied locally.");
    }
  }

  return (
    <>
      <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />

      <AthleteCard
        name={state.name}
        city={state.city}
        sportLabel={spec.name}
        you={board.you}
        placeLabel={
          board.you
            ? `${board.you.place} / ${board.rows.length}`
            : "Not on a field"
        }
      />
      <WeekRecords sport={state.primary} you={board.you} />

      <p className="fb-copy">
        {user?.email}
        {demoMode ? " · demo account" : ""}.
      </p>

      <SeasonHistory results={state.periodResults} primary={state.primary} />

      {demoMode ? (
        <section className="fb-card">
          <h2>Demo week close</h2>
          <p className="fb-copy">
            Settlement normally runs when you open the app after a UTC Monday
            rollover. This advances the clock so you can preview the week-complete
            reveal and season history.
          </p>
          <button
            type="button"
            className="fb-btn-line"
            onClick={() => dispatch({ type: "debug-close-week" })}
          >
            Close this week now
          </button>
          {state.demoNow ? (
            <p className="fb-note">
              Demo clock pinned to{" "}
              {new Date(state.demoNow).toLocaleString("en-US", {
                timeZone: "UTC",
              })}{" "}
              UTC so the new week stays open after reload.
            </p>
          ) : null}
        </section>
      ) : null}

      {!state.onboardingCompleted ? (
        <section className="fb-card">
          <h2>Finish setup</h2>
          <p className="fb-copy">
            Preferences and the optional {BACKFILL_DAYS}-day calibration live in
            onboarding.
          </p>
          <Link href="/onboarding" className="fb-btn">
            Continue onboarding
          </Link>
        </section>
      ) : null}

      <section className="fb-card">
        <label className="fb-field">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="fb-field">
          City
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="fb-btn"
          onClick={() => {
            if (name.trim()) dispatch({ type: "rename", name });
            if (city.trim()) dispatch({ type: "set-city", city });
          }}
        >
          Save
        </button>
      </section>

      <section className="fb-card">
        <h2>Sports</h2>
        {SPORTS.map((sport) => {
          const rating = state.ratings.find((item) => item.sport === sport.id);
          const primary = state.primary === sport.id;
          return (
            <div key={sport.id} className="fb-row">
              <span className="fb-grow">
                {sport.name}
                {primary ? " · primary" : ""}
                <small>
                  Verified {rating?.verifiedElo} · Open {rating?.openElo} ·{" "}
                  {rankForElo(rating?.openElo ?? 1000).name}
                </small>
              </span>
              <button
                type="button"
                className="fb-btn-ghost"
                onClick={() =>
                  dispatch({ type: "set-primary", sport: sport.id })
                }
              >
                {primary ? "Primary" : "Make primary"}
              </button>
            </div>
          );
        })}
      </section>

      <section className="fb-card">
        <h2>Week freezes</h2>
        <p className="fb-copy">
          {state.freezesLeft} of {STARTING_FREEZES} left. A freeze holds Elo
          for a taper or a vacation. It does not pause the lesson.
        </p>
        <button
          type="button"
          className="fb-btn"
          disabled={frozen || state.freezesLeft <= 0}
          onClick={() => dispatch({ type: "freeze" })}
        >
          {frozen ? "This week is frozen" : "Freeze this week"}
        </button>
      </section>

      <section className="fb-card">
        <h2>{BACKFILL_DAYS}-day calibration</h2>
        {state.calibrated ? (
          <p className="fb-copy">
            History is locked in. This one-time calibration cannot run again.
          </p>
        ) : (
          <>
            <p className="fb-copy">
              Import a sample of the last {BACKFILL_DAYS} days once to leave the
              1000 baseline. This can only be done once.
            </p>
            <div className="fb-stack">
              {(["light", "steady", "heavy"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  className="fb-btn-line"
                  onClick={() => dispatch({ type: "import-history", level })}
                >
                  Import {level} history
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="fb-card" id="connections">
        <h2>Connections</h2>
        <p className="fb-note">
          Link a source, then sync. Stub means demo data — never a live athlete
          connection. WHOOP and Oura add readiness marks when linked in demo.
        </p>
        {PROVIDERS.map((provider) => {
          const link = state.links.find((item) => item.provider === provider.id);
          const status = link?.status ?? "disconnected";
          return (
            <div key={provider.id} className="fb-row">
              <span className="fb-grow">
                {provider.name}
                <small>
                  {provider.blurb}
                  {link?.linked
                    ? ` · ${evidenceLabel(status === "stub" ? "stub" : status === "connected" ? "receiving_data" : "disconnected")}`
                    : ""}
                </small>
              </span>
              {link?.linked ? (
                <button
                  type="button"
                  className="fb-btn-ghost"
                  onClick={() => void syncProvider(provider.id)}
                >
                  Sync
                </button>
              ) : (
                <button
                  type="button"
                  className="fb-btn-ghost"
                  onClick={() => void syncProvider(provider.id)}
                >
                  Link
                </button>
              )}
            </div>
          );
        })}
        {syncNote ? <p className="fb-note">{syncNote}</p> : null}
      </section>

      <section className="fb-card">
        <h2>Levels</h2>
        {RANK_BANDS.map((band) => (
          <div key={band.name} className="fb-row">
            <span className="fb-grow">
              {band.name}
              <small>
                {band.min}+ · {band.blurb}
              </small>
            </span>
          </div>
        ))}
        <p className="fb-note">
          Score is mostly distance, or time when there is no GPS. Heart rate
          can add a little. Pace adds less. An empty week decays rating
          slightly, and it never falls below 500.
        </p>
      </section>

      <section className="fb-stack">
        <Link href="/pace" className="fb-btn-line">
          Pace board ↗
        </Link>
        <button type="button" className="fb-btn-line" onClick={() => void signOut()}>
          Sign out
        </button>
      </section>
    </>
  );
}

export default function YouPage() {
  return (
    <AuthGate reason="You is your profile, connections, and freezes. Sign in to open it.">
      <Suspense fallback={<p className="fb-copy">Loading…</p>}>
        <YouContent />
      </Suspense>
    </AuthGate>
  );
}
