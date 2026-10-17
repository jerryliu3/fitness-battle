"use client";

import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import {
  BACKFILL_DAYS,
  PROVIDERS,
  SPORTS,
  HEALTH_METRICS,
  type SportId,
  type UnitSystem,
} from "@fitness-battle/shared";
import { resolveSafePostLoginPath } from "@/lib/auth/login-redirect";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

type Step = "prefs" | "connect" | "backfill" | "done";

function OnboardingFlow() {
  const { user } = useAuth();
  const { state, dispatch } = useCompete();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("prefs");
  const [name, setName] = useState(user?.displayName ?? "");
  const [city, setCity] = useState("Toronto");
  const [sport, setSport] = useState<SportId>("running");
  const [units, setUnits] = useState<UnitSystem>("us");
  const [trackSleep, setTrackSleep] = useState(false);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!state) return <p className="fb-copy">Loading…</p>;

  if (state.onboardingCompleted) {
    return (
      <section className="fb-card">
        <p className="fb-kicker">You are set</p>
        <h1 className="fb-title">Onboarding already finished</h1>
        <p className="fb-copy">
          {state.calibrated
            ? `Preferences and the one-time ${BACKFILL_DAYS}-day calibration cannot be run again.`
            : "Onboarding is complete. You can update preferences and run your one-time calibration anytime from Athlete."}
        </p>
        <button type="button" className="fb-btn" onClick={() => router.replace("/")}>
          Back to Today
        </button>
      </section>
    );
  }

  async function savePrefs() {
    if (name.trim()) dispatch({ type: "rename", name });
    if (city.trim()) dispatch({ type: "set-city", city });
    dispatch({ type: "set-units", units });
    dispatch({ type: "set-primary", sport });
    if (trackSleep) dispatch({ type: "opt-in-health", metric: "sleep" });
    if (trackSleep) dispatch({ type: "set-focus", focus: { family: "sport", id: sport } });
    setStep("connect");
  }

  async function connectTracker() {
    setBusy(true);
    setConnectMessage(null);
    try {
      const response = await fetch("/api/fitness/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, provider: "strava" }),
      });
      const body = (await response.json()) as {
        status?: string;
        message?: string;
        authorizeUrl?: string;
      };
      if (!response.ok) {
        setConnectMessage("Could not start Strava. You can skip for now.");
        return;
      }
      if (body.authorizeUrl) {
        window.location.href = body.authorizeUrl;
        return;
      }
      dispatch({ type: "link", provider: "strava" });
      setConnectMessage(
        body.message ??
          "Live Strava needs server API keys. Demo stub linked for testing.",
      );
    } catch {
      setConnectMessage("Could not reach the connect route. You can skip for now.");
    } finally {
      setBusy(false);
    }
  }

  function runBackfill() {
    dispatch({ type: "import-history", level: "steady" });
    setStep("done");
  }

  function finish() {
    dispatch({ type: "complete-onboarding" });
    router.replace(resolveSafePostLoginPath(searchParams.get("next")));
  }

  return (
    <>
      <header>
        <p className="fb-kicker">
          Setup · step{" "}
          {step === "prefs" ? "1" : step === "connect" ? "2" : step === "backfill" ? "3" : "4"}{" "}
          of 4
        </p>
        <h1 className="fb-title">
          {step === "prefs" && "Your training profile"}
          {step === "connect" && "Link a tracker"}
          {step === "backfill" && "Import fitness history"}
          {step === "done" && "You are ready"}
        </h1>
        <p className="fb-copy">
          {step === "prefs" &&
            "Name, city, units, and primary sport. You can change these later on Athlete."}
          {step === "connect" &&
            "Strava is the cloud default. Garmin, WHOOP, and Oura connect the same way on You once their keys are set. A Garmin file import works without API approval. Without keys this step stays an honest stub."}
          {step === "backfill" &&
            "Import your recent activity history to calibrate your starting rating and leave the baseline."}
          {step === "done" &&
            "Join a board when you want. Browsing Today and Pace stays open without competing."}
        </p>
      </header>

      {step === "prefs" ? (
        <section className="fb-card fb-stack">
          <label className="fb-field">
            Display name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
          </label>
          <label className="fb-field">
            City
            <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={40} />
          </label>
          <p className="fb-note">Units of measurement (required)</p>
          <div className="fb-chips" role="group" aria-label="Units">
            <button
              type="button"
              className={units === "us" ? "fb-chip on" : "fb-chip"}
              aria-pressed={units === "us"}
              onClick={() => setUnits("us")}
            >
              Miles (US)
            </button>
            <button
              type="button"
              className={units === "metric" ? "fb-chip on" : "fb-chip"}
              aria-pressed={units === "metric"}
              onClick={() => setUnits("metric")}
            >
              Kilometres
            </button>
          </div>
          <div className="fb-chips">
            {SPORTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={sport === item.id ? "fb-chip on" : "fb-chip"}
                onClick={() => setSport(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <p className="fb-note">Health metrics use last night, not distance.</p>
          <div className="fb-chips" aria-label="Health metrics">
            {HEALTH_METRICS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={trackSleep ? "fb-chip on" : "fb-chip"}
                aria-pressed={trackSleep}
                onClick={() => setTrackSleep((on) => !on)}
              >
                {item.name}
                {trackSleep ? "" : " · add"}
              </button>
            ))}
          </div>
          <button type="button" className="fb-btn" onClick={savePrefs}>
            Continue
          </button>
        </section>
      ) : null}

      {step === "connect" ? (
        <section className="fb-card fb-stack">
          {PROVIDERS.filter((p) => p.id === "strava").map((provider) => (
            <div key={provider.id} className="fb-row">
              <span className="fb-grow">
                {provider.name}
                <small>{provider.blurb}</small>
              </span>
            </div>
          ))}
          {connectMessage ? <p className="fb-note">{connectMessage}</p> : null}
          {state.links.find((l) => l.provider === "strava")?.linked ? (
            <button type="button" className="fb-btn" onClick={() => setStep("backfill")}>
              Continue to calibration
            </button>
          ) : (
            <button type="button" className="fb-btn" disabled={busy} onClick={connectTracker}>
              {busy ? "Connecting…" : "Link Strava"}
            </button>
          )}
          <button type="button" className="fb-btn-line" onClick={() => setStep("backfill")}>
            Skip for now
          </button>
        </section>
      ) : null}

      {step === "backfill" ? (
        <section className="fb-card fb-stack">
          {state.calibrated ? (
            <p className="fb-copy">Calibration already finished on this device.</p>
          ) : (
            <>
              <p className="fb-copy">
                Import your recent activity history to calibrate your starting rating
                and leave the baseline.
              </p>
              <button type="button" className="fb-btn" onClick={runBackfill}>
                Import fitness history
              </button>
            </>
          )}
          <button
            type="button"
            className="fb-btn-line"
            onClick={() => setStep("done")}
          >
            {state.calibrated ? "Continue" : "Skip calibration"}
          </button>
        </section>
      ) : null}

      {step === "done" ? (
        <section className="fb-card fb-stack">
          <p className="fb-copy">
            {state.calibrated
              ? `History imported. Levels start from your ${BACKFILL_DAYS}-day sample.`
              : `You can compete from the default baseline. You can still run the one-time ${BACKFILL_DAYS}-day calibration later from You, but only once.`}
          </p>
          <button type="button" className="fb-btn" onClick={finish}>
            Start competing
          </button>
          {!state.calibrated ? (
            <button
              type="button"
              className="fb-btn-ghost"
              onClick={() => setStep("backfill")}
            >
              Back to calibration
            </button>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

export default function OnboardingPage() {
  return (
    <AuthGate reason="Create an account to finish setup, link a tracker, and run the one-time calibration.">
      <Suspense fallback={<p className="fb-copy">Loading setup…</p>}>
        <OnboardingFlow />
      </Suspense>
    </AuthGate>
  );
}
