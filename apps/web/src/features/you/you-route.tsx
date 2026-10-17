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
  SPORTS,
  STARTING_FREEZES,
  type ActivitySample,
  type ProviderId,
  type ReadinessMark,
  type ReadinessSample,
} from "@fitness-battle/shared";
import { AuthPrompt } from "@/components/auth-gate";
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

type AthletePanel =
  | "progress"
  | "connections"
  | "preferences"
  | "notifications"
  | "health"
  | "scoring";

const PANEL_TITLES: Record<AthletePanel, string> = {
  progress: "Progress",
  connections: "Connections",
  preferences: "Preferences",
  notifications: "Notifications",
  health: "Health",
  scoring: "How scoring works",
};

function humanError(code?: string): string {
  if (!code) return "Something went wrong.";
  if (code === "authentication_required") return "Sign in to connect trackers and sync activities.";
  if (code === "unknown_provider") return "That provider is not supported.";
  if (code === "file_required") return "Please select a file to import.";
  if (code === "file_too_large") return "That file exceeds the maximum 8 MB limit.";
  if (code === "unsupported_activity_file") return "Could not parse that file. Use .fit, .gpx, or .tcx.";
  if (code === "no_activities") return "No valid activities found in that file.";
  return code;
}

function YouContent() {
  const { user, signOut, demoMode } = useAuth();
  const { state, dispatch, loadStatus } = useCompete();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  /** Tracks which account the form fields were seeded from (resets on switch). */
  const seededFor = useRef<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [panel, setPanel] = useState<AthletePanel | null>(null);
  const [authPrompt, setAuthPrompt] = useState<{ open: boolean; reason: string } | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<ProviderId | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [primaryNote, setPrimaryNote] = useState<string | null>(null);
  const [confirmFreeze, setConfirmFreeze] = useState(false);
  const [freezeNote, setFreezeNote] = useState<string | null>(null);
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
    setPanel("connections");
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

    if (!user) {
      const spec = PROVIDERS.find((p) => p.id === providerId);
      setAuthPrompt({
        open: true,
        reason: `Sign in to connect ${spec?.name ?? "a tracker"} and sync workouts.`,
      });
      setSyncNote(`Sign in to connect ${spec?.name ?? "a tracker"} and sync workouts.`);
      return;
    }

    setConnectingProvider(providerId);
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
          setSyncNote(humanError(body.error) ?? "Could not start connect.");
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
      } finally {
        setConnectingProvider(null);
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
        setSyncNote(humanError(body.error) ?? "Sync failed. Nothing new was counted.");
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
    } finally {
      setConnectingProvider(null);
    }
  }

  async function importGarminFile(file: File) {
    setSyncNote(null);
    if (!user) {
      setAuthPrompt({
        open: true,
        reason: "Sign in to import Garmin activity files.",
      });
      setSyncNote("Sign in to import activity files.");
      return;
    }
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
        setSyncNote(humanError(body.error) ?? "Import failed");
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

  if (!user) {
    return (
      <div className="focus-athlete">
        <AthleteOverview state={state} />
        <section className="focus-card fb-stack">
          <p className="fb-kicker">Account</p>
          <h2>Sign in to sync your athlete</h2>
          <p className="fb-copy">
            Create an account or sign in to connect trackers and keep progress
            with you.
          </p>
          <Link href="/signup?next=/you" className="fb-btn">
            Create account
          </Link>
          <Link href="/login?next=/you" className="fb-btn-line">
            Sign in
          </Link>
        </section>
      </div>
    );
  }

  if (panel) {
    return (
      <div className="focus-athlete">
        <button
          type="button"
          className="focus-expand-back"
          onClick={() => setPanel(null)}
        >
          ← Athlete
        </button>
        <header className="focus-heading">
          <p className="fb-kicker">Settings</p>
          <h1>{PANEL_TITLES[panel]}</h1>
        </header>
        <div className="focus-settings-panel">
          {panel === "progress" ? (
            <>
              <WeekRecords
                sport={state.primary}
                you={board.you}
                units={state.units}
              />
              <SeasonHistory
                results={state.periodResults}
                primary={state.primary}
              />
            </>
          ) : null}
          {panel === "connections" ? (
            <>
              <section className="fb-card">
                <p className="fb-note">
                  Cloud trackers open their own authorize page when API keys are
                  set. Without keys the link stays a stub. Garmin files stay
                  pending until you count them. Apple Health syncs from iOS;
                  Health Connect from Android.
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
                      Import a sample of the last {BACKFILL_DAYS} days once to
                      leave the 1000 baseline. This can only be done once.
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
            </>
          ) : null}
          {panel === "preferences" ? (
            <>
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
                    setProfileSaved(true);
                    setTimeout(() => setProfileSaved(false), 3000);
                  }}
                >
                  {profileSaved ? "Saved ✓" : "Save"}
                </button>
                {profileSaved ? (
                  <p className="fb-note" style={{ color: "var(--green, #2f6f4e)" }}>
                    Profile saved.
                  </p>
                ) : null}
              </section>
              <section className="fb-card">
                <h2>Units</h2>
                <p className="fb-copy">
                  Distance display for Home, Compete, and Athlete.
                </p>
                <div className="focus-segments" role="group" aria-label="Units">
                  <button
                    type="button"
                    aria-pressed={state.units === "us"}
                    onClick={() => dispatch({ type: "set-units", units: "us" })}
                  >
                    Miles (US)
                  </button>
                  <button
                    type="button"
                    aria-pressed={state.units === "metric"}
                    onClick={() =>
                      dispatch({ type: "set-units", units: "metric" })
                    }
                  >
                    Kilometres
                  </button>
                </div>
              </section>
              <section className="fb-card">
                <h2>Sports</h2>
                {primaryNote ? (
                  <p className="fb-note" style={{ color: "var(--green, #2f6f4e)" }}>
                    {primaryNote}
                  </p>
                ) : null}
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
                          Verified {rating?.verifiedElo} · Open{" "}
                          {rating?.openElo} ·{" "}
                          {rankForElo(rating?.openElo ?? 1000).name}
                        </small>
                      </span>
                      <button
                        type="button"
                        className="fb-btn-ghost"
                        onClick={() => {
                          dispatch({ type: "set-primary", sport: sport.id });
                          setPrimaryNote(`${sport.name} is now your primary sport.`);
                          setTimeout(() => setPrimaryNote(null), 3000);
                        }}
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
                  {state.freezesLeft} of {STARTING_FREEZES} left. A freeze holds
                  Elo for a taper or a vacation. It does not pause the lesson.
                </p>
                {frozen ? (
                  <div className="fb-stack">
                    <p className="fb-note" style={{ color: "var(--green, #2f6f4e)" }}>
                      ❄ This week is frozen. Your Elo will hold through next Monday.
                    </p>
                    <button
                      type="button"
                      className="fb-btn-ghost"
                      onClick={() => {
                        dispatch({ type: "unfreeze" });
                        setFreezeNote("Freeze removed. Normal scoring resumed for this week.");
                        setTimeout(() => setFreezeNote(null), 4000);
                      }}
                    >
                      Undo freeze
                    </button>
                  </div>
                ) : confirmFreeze ? (
                  <div className="fb-stack">
                    <p className="fb-note">
                      Freeze this week? You will have {state.freezesLeft - 1} freezes left.
                      Your Elo rating will hold steady until next Monday.
                    </p>
                    <div className="fb-row">
                      <button
                        type="button"
                        className="fb-btn"
                        onClick={() => {
                          dispatch({ type: "freeze" });
                          setConfirmFreeze(false);
                          setFreezeNote("This week is frozen. Your Elo will hold through next Monday.");
                          setTimeout(() => setFreezeNote(null), 4000);
                        }}
                      >
                        Confirm freeze
                      </button>
                      <button
                        type="button"
                        className="fb-btn-ghost"
                        onClick={() => setConfirmFreeze(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="fb-btn"
                    disabled={state.freezesLeft <= 0}
                    onClick={() => setConfirmFreeze(true)}
                  >
                    {state.freezesLeft <= 0 ? "No freezes left" : "Freeze this week"}
                  </button>
                )}
                {freezeNote ? <p className="fb-note">{freezeNote}</p> : null}
              </section>
            </>
          ) : null}
          {panel === "notifications" ? <NotificationSettings /> : null}
          {panel === "health" ? (
            <SleepPanel
              state={state}
              now={now}
              onJoin={() => {
                if (!user) {
                  setAuthPrompt({
                    open: true,
                    reason: "Sign in to join the weekly sleep leaderboard and track recovery.",
                  });
                  return;
                }
                dispatch({ type: "opt-in-health", metric: "sleep" });
              }}
              onSample={() => dispatch({ type: "log-sleep" })}
              onLeave={() =>
                dispatch({ type: "opt-out-health", metric: "sleep" })
              }
            />
          ) : null}
          {panel === "scoring" ? (
            <section className="fb-card">
              <h2>Levels</h2>
              <p className="fb-copy">
                Your level is a band on the weekly effort Elo ladder. It rises
                when you accumulate counted volume against peers on your field,
                and drifts down slightly after empty weeks.
              </p>
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
                Score is mostly distance, or time when there is no GPS. Heart
                rate can add a little. Pace adds less. Rating never falls below
                500.
              </p>
              <p className="fb-note">
                Competition weeks run Monday 00:00 UTC to next Monday 00:00 UTC.
                Depending on your local timezone, new fields open Sunday evening
                or Monday morning.
              </p>
            </section>
          ) : null}
        </div>
        <AuthPrompt
          open={Boolean(authPrompt?.open)}
          reason={authPrompt?.reason ?? "Sign in to compete."}
          onClose={() => setAuthPrompt(null)}
        />
      </div>
    );
  }

  return (
    <div className="focus-athlete">
      <AthleteOverview state={state} email={user.email} demoMode={demoMode} />
      <nav className="focus-settings-list" aria-label="Athlete settings">
        {(
          [
            ["progress", "Statistics, records & season history"],
            ["connections", "Trackers & history"],
            ["preferences", "Profile, units, sports & freezes"],
            ["notifications", "Your updates, your choice"],
            ["health", "Sleep and recovery"],
            ["scoring", "Levels & eligibility"],
          ] as const
        ).map(([id, detail]) => (
          <button
            key={id}
            type="button"
            className="focus-settings-row"
            onClick={() => setPanel(id)}
          >
            <span>
              <b>{PANEL_TITLES[id]}</b>
              <small>{detail}</small>
            </span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </nav>
      {!state.onboardingCompleted ? (
        <section className="fb-card">
          <h2>Finish setup</h2>
          <p className="fb-copy">
            {user
              ? `Preferences and the optional ${BACKFILL_DAYS}-day calibration live in onboarding.`
              : "Create an account to lock in preferences, link trackers, and calibrate your rating."}
          </p>
          <Link
            href={user ? "/onboarding" : "/signup?next=%2Fonboarding"}
            className="fb-btn"
          >
            {user ? "Continue onboarding" : "Create account to finish setup"}
          </Link>
        </section>
      ) : null}
      {user ? (
        <>
          <p className="fb-note">
            {user.email}
            {demoMode ? " · demo account" : ""}
          </p>
          <button
            type="button"
            className="fb-btn-line"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </>
      ) : (
        <div className="fb-stack">
          <p className="fb-note">Browsing as a guest</p>
          <Link href="/signup" className="fb-btn">
            Create account
          </Link>
          <Link href="/login" className="fb-btn-line">
            Sign in
          </Link>
        </div>
      )}
      <AuthPrompt
        open={Boolean(authPrompt?.open)}
        reason={authPrompt?.reason ?? "Sign in to compete."}
        onClose={() => setAuthPrompt(null)}
      />
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
