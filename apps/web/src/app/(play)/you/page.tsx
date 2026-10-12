"use client";

import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import {
  BACKFILL_DAYS,
  currentPeriodBounds,
  evidenceLabel,
  PROVIDERS,
  RANK_BANDS,
  rankForElo,
  SPORTS,
  STARTING_FREEZES,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useState } from "react";

function YouContent() {
  const { user, signOut, demoMode } = useAuth();
  const { state, dispatch } = useCompete();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [syncNote, setSyncNote] = useState<string | null>(null);
  if (!state) return <p className="fb-copy">Loading…</p>;

  const period = currentPeriodBounds(state.clock.kind, new Date());
  const frozen = state.frozenPeriods.includes(period.startsAt.toISOString());

  async function syncProvider(providerId: (typeof PROVIDERS)[number]["id"]) {
    setSyncNote(null);
    const link = state!.links.find((item) => item.provider === providerId);
    if (!link?.linked) {
      dispatch({ type: "link", provider: providerId });
      setSyncNote(
        `${providerId}: demo link only (stub). Live OAuth uses /api/fitness/connect.`,
      );
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
        activities?: unknown[];
        error?: string;
        windowKind?: string;
      };
      if (!response.ok) {
        setSyncNote(body.error ?? "Sync failed");
        return;
      }
      dispatch({ type: "sync", provider: providerId });
      setSyncNote(
        body.usedMock
          ? `Stub sync (${body.windowKind ?? "recent"}): ${body.activities?.length ?? 0} sample activities. Not a live connection.`
          : `Synced ${body.activities?.length ?? 0} activities.`,
      );
    } catch {
      dispatch({ type: "sync", provider: providerId });
      setSyncNote("Offline demo sync applied locally.");
    }
  }

  return (
    <>
      <header>
        <p className="fb-kicker">You</p>
        <h1 className="fb-title">{state.name}</h1>
        <p className="fb-copy">
          {state.city}. {user?.email}
          {demoMode ? " · demo account" : ""}.
        </p>
      </header>

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
            defaultValue={state.name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="fb-field">
          City
          <input
            defaultValue={state.city}
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

      <section className="fb-card">
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
      <YouContent />
    </AuthGate>
  );
}
