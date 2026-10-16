"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { NotificationSettings } from "@/components/notification-settings";
import { requestAccountPush } from "@/lib/request-push";
import type { SyncIdentity } from "@/lib/push-notifications";
import { WeekRecords } from "@/features/split/components/athlete-card";
import { SleepPanel } from "@/features/health/sleep-panel";
import { AthleteOverview } from "@/features/focus/athlete-overview";
import { SeasonHistory } from "@/features/split/components/season-history";
import { buildSplitBoard } from "@/features/split/model";
import {
  activityFromSample,
  BACKFILL_DAYS,
  competeNow,
  evidenceLabel,
  primaryFreezePeriodStart,
  PROVIDERS,
  RANK_BANDS,
  rankForElo,
  sportById,
  SPORTS,
  STARTING_FREEZES,
  type ActivitySample,
  type ProviderId,
  type ReadinessMark,
  type ReadinessSample,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const OAUTH_PROVIDERS = new Set<ProviderId>([
  "strava",
  "garmin",
  "whoop",
  "oura",
]);
const DEVICE_PROVIDERS = new Set<ProviderId>(["apple_health", "google_health"]);

function YouContent() {
  const { user, signOut, demoMode } = useAuth();
  const { state, dispatch, loadStatus } = useCompete();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  /** Tracks which account the form fields were seeded from (resets on switch). */
  const seededFor = useRef<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const accountKey = user?.id ?? "guest";
  const pushIdentity: SyncIdentity | null = user
    ? { userId: user.id, localOnly: demoMode || user.mode === "demo" }
    : null;
  const tracker = searchParams.get("tracker");
  const trackerProvider = searchParams.get("provider");
  const appliedTracker = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const accountReady =
    loadStatus === "ready" || loadStatus === "local" || loadStatus === "failed";

  useEffect(() => {
    if (loadStatus === "loading" || !state) {
      if (loadStatus === "loading") {
        seededFor.current = null;
        appliedTracker.current = null;
      }
      return;
    }
    if (seededFor.current === accountKey) return;
    seededFor.current = accountKey;
    appliedTracker.current = null;
    setName(state.name);
    setCity(state.city);
  }, [accountKey, loadStatus, state]);

  useEffect(() => {
    // Only apply OAuth return params after this account's compete load settled.
    if (!accountReady || !state || !tracker) return;
    const key = `${accountKey}:${tracker}:${trackerProvider ?? "strava"}`;
    if (appliedTracker.current === key) return;
    appliedTracker.current = key;
    const provider = (trackerProvider ?? "strava") as ProviderId;
    if (!OAUTH_PROVIDERS.has(provider)) return;
    if (tracker === "connected") {
      dispatch({
        type: "apply-sync",
        provider,
        activities: [],
        linkStatus: "connected",
      });
      setSyncNote(`${provider} connected. Sync to pull activities.`);
    } else if (tracker === "stub") {
      dispatch({ type: "link", provider });
      setSyncNote("Credentials are not set, so this link is a demo stub.");
    } else if (tracker === "error") {
      setSyncNote(
        "That tracker did not connect. Sign in and try the link again.",
      );
    }
  }, [
    accountKey,
    accountReady,
    dispatch,
    state,
    tracker,
    trackerProvider,
  ]);

  if (!state || loadStatus === "loading") {
    return <p className="fb-copy">Loading…</p>;
  }

  const now = competeNow(state);
  const board = buildSplitBoard(state, state.primary, "open", now);
  const frozen = state.frozenPeriods.includes(primaryFreezePeriodStart(state));
  const spec = sportById(state.primary);

  function applyRemote(body: {
    provider: ProviderId;
    usedMock?: boolean;
    persisted?: boolean;
    activities?: ActivitySample[];
    readiness?: ReadinessSample[];
    windowKind?: string;
    source?: string;
  }) {
    const provenance = body.source === "file" ? "imported" : "recorded";
    const activities = (body.activities ?? [])
      .map((sample) => activityFromSample(sample, provenance))
      .filter((activity) => activity != null);
    const readiness: ReadinessMark[] = (body.readiness ?? []).flatMap(
      (sample) => {
        if (
          !OAUTH_PROVIDERS.has(sample.provider as ProviderId) &&
          !DEVICE_PROVIDERS.has(sample.provider as ProviderId)
        ) {
          return [];
        }
        if (sample.provider === "mock") return [];
        return [
          {
            id: sample.id,
            provider: sample.provider as ProviderId,
            day: sample.day,
            score: sample.score,
          },
        ];
      },
    );
    dispatch({
      type: "apply-sync",
      provider: body.provider,
      activities,
      readiness,
      linkStatus: body.usedMock ? "stub" : "connected",
    });
    if (body.usedMock) {
      setSyncNote(
        `Stub sync (${body.windowKind ?? "recent"}): ${activities.length} sample activities. Not a live connection.`,
      );
      return;
    }
    const ready = readiness.length
      ? `, ${readiness.length} readiness marks`
      : "";
    const saved =
      body.persisted === false
        ? " Fetched on this device only — they were not saved to your account."
        : "";
    setSyncNote(
      body.source === "file"
        ? `Imported ${activities.length} activities. File imports stay pending until you count them.${saved}`
        : `Synced ${activities.length} activities${ready}.${saved}`,
    );
  }

  async function syncProvider(providerId: ProviderId) {
    setSyncNote(null);
    if (DEVICE_PROVIDERS.has(providerId)) {
      setSyncNote(
        providerId === "apple_health"
          ? "Apple Health syncs from the iOS app. The web app cannot read it."
          : "Health Connect syncs from the Android app. The web app cannot read it.",
      );
      return;
    }
    const link = state!.links.find((item) => item.provider === providerId);
    if (!OAUTH_PROVIDERS.has(providerId)) return;

    if (!link?.linked || link.status === "disconnected") {
      try {
        const response = await fetch("/api/fitness/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id, provider: providerId }),
        });
        const body = (await response.json()) as {
          authorizeUrl?: string;
          message?: string;
          error?: string;
        };
        if (!response.ok) {
          setSyncNote(body.error ?? "Could not start connect.");
          return;
        }
        if (body.authorizeUrl) {
          window.location.href = body.authorizeUrl;
          return;
        }
        dispatch({ type: "link", provider: providerId });
        setSyncNote(
          body.message ?? "Demo tracker linked. This is not a live connection.",
        );
      } catch {
        if (demoMode) {
          dispatch({ type: "link", provider: providerId });
          setSyncNote("Offline demo link only.");
          return;
        }
        setSyncNote("Could not reach the connect route. Nothing was linked.");
      }
      return;
    }

    try {
      const response = await fetch("/api/fitness/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, provider: providerId }),
      });
      const body = (await response.json()) as {
        usedMock?: boolean;
        persisted?: boolean;
        activities?: ActivitySample[];
        readiness?: ReadinessSample[];
        error?: string;
        windowKind?: string;
      };
      if (!response.ok) {
        setSyncNote(body.error ?? "Sync failed. Nothing new was counted.");
        void requestAccountPush("connection_alerts", pushIdentity, {
          provider: providerId,
        });
        return;
      }
      applyRemote({ ...body, provider: providerId });
    } catch {
      if (demoMode) {
        dispatch({ type: "sync", provider: providerId, allowSample: true });
        setSyncNote(
          "Offline demo sync applied locally. These are sample sessions.",
        );
        return;
      }
      setSyncNote("Sync failed. No sample session was added.");
      void requestAccountPush("connection_alerts", pushIdentity, {
        provider: providerId,
      });
    }
  }

  async function importGarminFile(file: File) {
    setSyncNote(null);
    const form = new FormData();
    form.set("file", file);
    if (user?.id) form.set("userId", user.id);
    try {
      const response = await fetch("/api/fitness/import", {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as {
        activities?: ActivitySample[];
        error?: string;
        usedMock?: boolean;
        persisted?: boolean;
      };
      if (!response.ok) {
        setSyncNote(body.error ?? "Import failed");
        return;
      }
      applyRemote({
        provider: "garmin",
        activities: body.activities,
        usedMock: false,
        persisted: body.persisted,
        source: "file",
      });
    } catch {
      setSyncNote("Could not read that file.");
    }
  }

  async function disconnectProvider(providerId: ProviderId) {
    setSyncNote(null);
    try {
      const response = await fetch("/api/fitness/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, provider: providerId }),
      });
      if (!response.ok && !demoMode) {
        setSyncNote("Could not disconnect that tracker.");
        return;
      }
    } catch {
      if (!demoMode) {
        setSyncNote("Could not reach disconnect.");
        return;
      }
    }
    dispatch({ type: "unlink", provider: providerId });
    setSyncNote(`${providerId} disconnected on this account.`);
  }

  return (
    <div className="focus-athlete">
      <AthleteOverview state={state} />
      <details className="focus-disclosure">
        <summary>
          Progress <span>Statistics, records & season history ↗</span>
        </summary>
        <div className="focus-details-body">
          <WeekRecords sport={state.primary} you={board.you} />
          <SeasonHistory
            results={state.periodResults}
            primary={state.primary}
          />
        </div>
      </details>
      <details className="focus-disclosure" id="connections">
        <summary>
          Connections <span>Trackers & history ↗</span>
        </summary>
        <div className="focus-details-body">
          <section className="fb-card">
            <h2>Connections</h2>
            <p className="fb-note">
              Cloud trackers open their own authorize page when API keys are
              set. Without keys the link stays a stub. Garmin files stay pending
              until you count them. Apple Health syncs from iOS; Health Connect
              from Android. Sleep shown here is a sample. WHOOP and Oura do not
              import nights yet.
            </p>
            {PROVIDERS.map((provider) => {
              const link = state.links.find(
                (item) => item.provider === provider.id,
              );
              const status = link?.status ?? "disconnected";
              const device = DEVICE_PROVIDERS.has(provider.id);
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
                  <button
                    type="button"
                    className="fb-btn-ghost"
                    onClick={() => void syncProvider(provider.id)}
                  >
                    {device ? "Phone" : link?.linked ? "Sync" : "Link"}
                  </button>
                  {link?.linked && !device ? (
                    <button
                      type="button"
                      className="fb-btn-ghost"
                      onClick={() => void disconnectProvider(provider.id)}
                    >
                      Disconnect
                    </button>
                  ) : null}
                </div>
              );
            })}
            <label className="fb-field">
              Garmin file (.fit, .gpx, .tcx, .zip)
              <input
                ref={fileRef}
                type="file"
                accept=".fit,.gpx,.tcx,.zip,application/zip"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importGarminFile(file);
                  event.target.value = "";
                }}
              />
            </label>
            {syncNote ? <p className="fb-note">{syncNote}</p> : null}
          </section>

          <section className="fb-card">
            <h2>{BACKFILL_DAYS}-day calibration</h2>
            {state.calibrated ? (
              <p className="fb-copy">
                History is locked in. This one-time calibration cannot run
                again.
              </p>
            ) : (
              <>
                <p className="fb-copy">
                  Import a sample of the last {BACKFILL_DAYS} days once to leave
                  the 1000 baseline. The rows are labeled sample history and do
                  not count as workouts. This can only be done once.
                </p>
                <div className="fb-stack">
                  {(["light", "steady", "heavy"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      className="fb-btn-line"
                      onClick={() =>
                        dispatch({ type: "import-history", level })
                      }
                    >
                      Import {level} history
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </details>
      <details className="focus-disclosure">
        <summary>
          Preferences <span>Profile, sports & week freezes ↗</span>
        </summary>
        <div className="focus-details-body">
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
              const rating = state.ratings.find(
                (item) => item.sport === sport.id,
              );
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


        </div>
      </details>
      <details className="focus-disclosure">
        <summary>
          Notifications <span>Your updates, your choice ↗</span>
        </summary>
        <div className="focus-details-body">
          <NotificationSettings />
        </div>
      </details>
      <details className="focus-disclosure">
        <summary>
          Health <span>Sleep and recovery ↗</span>
        </summary>
        <div className="focus-details-body">
          <SleepPanel
            state={state}
            now={now}
            onJoin={() => dispatch({ type: "opt-in-health", metric: "sleep" })}
            onSample={() => dispatch({ type: "log-sleep" })}
            onLeave={() =>
              dispatch({ type: "opt-out-health", metric: "sleep" })
            }
          />
        </div>
      </details>
      <details className="focus-disclosure">
        <summary>
          How scoring works <span>Levels & eligibility ↗</span>
        </summary>
        <div className="focus-details-body">
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
        </div>
      </details>
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

      <p className="fb-note">
        {user?.email}
        {demoMode ? " · demo account" : ""}
      </p>
      <button className="fb-btn-line" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}

export default function YouPage() {
  return (
    <Suspense fallback={<p className="fb-copy">Loading…</p>}>
      <YouContent />
    </Suspense>
  );
}
