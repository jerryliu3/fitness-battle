"use client";

import { isOwnerEmail } from "@/lib/auth/design-access";
import { ReportIssue } from "@/components/report-issue";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { NotificationSettings } from "@/components/notification-settings";
import { requestAccountPush } from "@/lib/request-push";
import type { SyncIdentity } from "@/lib/push-notifications";
import { WeekRecords } from "@/features/split/components/athlete-card";
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
  sleepRenewal,
  sportById,
  sportRenewal,
  SPORTS,
  STARTING_FREEZES,
  type ActivitySample,
  type ProviderId,
  type ReadinessMark,
  type ReadinessSample,
} from "@fitness-battle/shared";
import { AuthPrompt } from "@/components/auth-gate";
import { Sheet } from "@/ui/sheet";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { playCue } from "@/lib/haptics";

const OAUTH_PROVIDERS = new Set<ProviderId>([
  "strava",
  "garmin",
  "whoop",
  "oura",
]);
const DEVICE_PROVIDERS = new Set<ProviderId>(["apple_health", "google_health"]);

type AthletePanel =
  | "connections"
  | "preferences"
  | "notifications"
  | "account"
  | "scoring";

const PANEL_TITLES: Record<AthletePanel, string> = {
  connections: "Data Sync",
  preferences: "Preferences",
  notifications: "Notifications",
  account: "Account",
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

function YouContent({ surface }: { surface: "progress" | "athlete" }) {
  const reduced = useReducedMotion();
  const { user, signOut, demoMode } = useAuth();
  const { state, dispatch, loadStatus } = useCompete();
  const [panel, setPanel] = useState<AthletePanel | null>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const settingsFocus = useRef<HTMLElement | null>(null);
  const [settingsPresent, setSettingsPresent] = useState(false);
  const [settingsScrollRoot, setSettingsScrollRoot] =
    useState<HTMLElement | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [authPrompt, setAuthPrompt] = useState<{ open: boolean; reason: string } | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<ProviderId | null>(null);
  const [primaryNote, setPrimaryNote] = useState<string | null>(null);
  const [confirmFreeze, setConfirmFreeze] = useState(false);
  const searchParams = useSearchParams();
  const accountKey = user?.id ?? "guest";
  const pushIdentity: SyncIdentity | null = user
    ? { userId: user.id, localOnly: demoMode || user.mode === "demo" }
    : null;
  const router = useRouter();
  const requestedPanel = searchParams.get("panel");
  const requestedEdit = searchParams.get("edit");
  useEffect(() => {
    if (requestedPanel === "progress") {
      router.replace("/you");
      return;
    }
    if (
      surface === "progress" &&
      requestedPanel &&
      requestedPanel in PANEL_TITLES
    ) {
      router.replace(`/athlete?panel=${encodeURIComponent(requestedPanel)}`);
      return;
    }
    if (requestedPanel && requestedPanel in PANEL_TITLES) {
      setPanel(requestedPanel as AthletePanel);
    }
  }, [requestedPanel, router, surface]);
  const tracker = searchParams.get("tracker");
  const trackerProvider = searchParams.get("provider");
  const appliedTracker = useRef<string | null>(null);
  const accountBound = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const accountReady =
    loadStatus === "ready" || loadStatus === "local" || loadStatus === "failed";

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function requireAuth(reason: string, action: () => void) {
    if (!user) {
      setAuthPrompt({ open: true, reason });
      return;
    }
    action();
  }

  async function handleDeleteAccount() {
    if (deletingAccount) return;
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || "Could not delete account. Please try again.",
        );
      }
      if (user?.id) {
        try {
          localStorage.removeItem(`fb-compete-v1:${user.id}`);
          localStorage.removeItem(`fb-compete-v1:${user.id}:device-only`);
          localStorage.removeItem(`fb:field-seen:v1:${user.id}`);
        } catch {
          // ignore
        }
      }
      await signOut();
      setDeleteConfirmOpen(false);
      setPanel(null);
      router.push("/");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete account",
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  const deleteAccountSheet = (
    <Sheet
      open={deleteConfirmOpen}
      title="Delete account"
      body="Are you sure you want to permanently delete your account? All of your saved workouts, effort scores, rankings, and profile data will be permanently removed. This action cannot be undone."
      onClose={() => {
        if (!deletingAccount) setDeleteConfirmOpen(false);
      }}
    >
      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {deleteError ? (
          <p className="fb-error" role="alert">
            {deleteError}
          </p>
        ) : null}
        <button
          type="button"
          className="fb-btn"
          style={{
            background: "var(--red, #b83a38)",
            borderColor: "var(--red, #b83a38)",
            color: "#fff",
          }}
          disabled={deletingAccount}
          onClick={() => void handleDeleteAccount()}
        >
          {deletingAccount ? "Deleting account…" : "Permanently delete account"}
        </button>
      </div>
    </Sheet>
  );

  useEffect(() => {
    if (loadStatus === "loading" || !state) {
      if (loadStatus === "loading") {
        accountBound.current = null;
        appliedTracker.current = null;
      }
      return;
    }
    if (accountBound.current === accountKey) return;
    accountBound.current = accountKey;
    appliedTracker.current = null;
  }, [accountKey, loadStatus, state]);

  useLayoutEffect(() => {
    setSettingsScrollRoot(overviewRef.current?.closest<HTMLElement>(".phone-scroll") ?? null);
  }, [loadStatus, user]);

  useLayoutEffect(() => {
    if (!panel || !settingsScrollRoot) return;
    setSettingsPresent(true);
    settingsScrollRoot.querySelector<HTMLButtonElement>(".focus-settings-stack-panel button")?.focus({ preventScroll: true });
  }, [panel, settingsScrollRoot]);

  useLayoutEffect(() => {
    if (panel || settingsPresent) return;
    settingsFocus.current?.focus({ preventScroll: true });
    settingsFocus.current = null;
  }, [panel, settingsPresent]);

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
  const sleep = sleepRenewal(state);
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
    const provenance = body.usedMock
      ? "demo"
      : body.source === "file"
        ? "imported"
        : "recorded";
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

  if (!user && surface === "progress") {
    const guestBoard = buildSplitBoard(state, state.primary, "open", now);
    return (
      <div className="focus-athlete">
        <AthleteOverview state={state} sections="progress" />
        <WeekRecords
          sport={state.primary}
          you={guestBoard.you}
          units={state.units}
        />
        <SeasonHistory
          results={state.periodResults}
          primary={state.primary}
        />
        <section className="focus-card fb-stack">
          <p className="fb-kicker">Account</p>
          <h2>Sign in to save progress</h2>
          <p className="fb-copy">
            Create an account or sign in to keep lifetime totals and season
            history with you.
          </p>
          <div className="fb-row" style={{ width: "100%", gap: 10 }}>
            <Link
              href="/signup?next=/you"
              className="fb-btn"
              style={{ flex: 1, textAlign: "center" }}
            >
              Create account
            </Link>
            <Link
              href="/login?next=/you"
              className="fb-btn-line"
              style={{ flex: 1, textAlign: "center" }}
            >
              Sign in
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!user && surface === "athlete") {
    return (
      <div className="focus-athlete">
        <AthleteOverview state={state} sections="profile" />
        <section className="focus-card fb-stack">
          <p className="fb-kicker">Account</p>
          <h2>Sign in to sync your athlete</h2>
          <p className="fb-copy">
            Create an account or sign in to connect trackers and keep progress
            with you.
          </p>
          <div className="fb-row" style={{ width: "100%", gap: 10 }}>
            <Link
              href="/signup?next=/you"
              className="fb-btn"
              style={{ flex: 1, textAlign: "center" }}
            >
              Create account
            </Link>
            <Link
              href="/login?next=/you"
              className="fb-btn-line"
              style={{ flex: 1, textAlign: "center" }}
            >
              Sign in
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const settingsPanel = surface === "athlete" && panel ? (
      <motion.aside
        key={panel}
        className="focus-settings-stack-panel"
        aria-label={PANEL_TITLES[panel]}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); setPanel(null); }
        }}
        initial={reduced ? false : { x: "100%" }}
        animate={{ x: 0 }}
        exit={
          reduced
            ? { x: "100%" }
            : {
                x: "100%",
                transition: { duration: 0.26, ease: [0.4, 0, 1, 1] },
              }
        }
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 380, damping: 34 }
        }
      >
        <button
          type="button"
          className="focus-expand-back"
          onClick={() => setPanel(null)}
        >
          ← Back
        </button>
        <header className="focus-heading">
          <p className="fb-kicker">Settings</p>
          <h1>{PANEL_TITLES[panel]}</h1>
        </header>
        <div className="focus-settings-panel">
          {panel === "connections" ? (
            <>
              <section className="fb-card">
                <h2>Data Sync</h2>
                <p className="fb-copy" style={{ color: "var(--muted)", marginBottom: 16 }}>
                  Connect fitness trackers and wearables to sync your activities automatically.
                  Workouts and recovery data contribute directly to your weekly effort score.
                </p>
                {PROVIDERS.map((provider) => {
                  const link = state.links.find(
                    (item) => item.provider === provider.id,
                  );
                  const status = link?.status ?? "disconnected";
                  const device = DEVICE_PROVIDERS.has(provider.id);
                  return (
                    <div
                      key={provider.id}
                      className="fb-row"
                      style={{ alignItems: "center", gap: 12 }}
                    >
                      <div className="fb-grow">
                        <strong style={{ fontSize: 14 }}>{provider.name}</strong>
                        <small style={{ color: "var(--muted)", fontSize: 13, display: "block", marginTop: 2 }}>
                          {provider.blurb}
                          {link?.linked
                            ? ` · ${evidenceLabel(status === "stub" ? "stub" : status === "connected" ? "receiving_data" : "disconnected")}`
                            : ""}
                        </small>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          className="fb-btn-line"
                          style={{
                            width: "auto",
                            fontSize: 12,
                            padding: "5px 12px",
                            minHeight: "auto",
                            borderRadius: 8,
                          }}
                          disabled={connectingProvider === provider.id}
                          onClick={() => void syncProvider(provider.id)}
                        >
                          {device ? "Phone" : link?.linked ? "Sync" : "Link"}
                        </button>
                        {link?.linked && !device ? (
                          <button
                            type="button"
                            className="fb-btn-ghost"
                            style={{
                              width: "auto",
                              fontSize: 12,
                              padding: "5px 8px",
                              minHeight: "auto",
                              color: "var(--red, #b83a38)",
                            }}
                            onClick={() => void disconnectProvider(provider.id)}
                          >
                            Disconnect
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                <div
                  className="fb-row"
                  style={{ alignItems: "center", gap: 12, marginTop: 12 }}
                >
                  <div className="fb-grow">
                    <strong style={{ fontSize: 14 }}>Sleep & recovery</strong>
                    <small style={{ color: "var(--muted)", fontSize: 13, display: "block", marginTop: 2 }}>
                      Nightly recovery metrics and sleep score
                    </small>
                  </div>
                  <button
                    type="button"
                    className="fb-btn-line"
                    style={{
                      width: "auto",
                      fontSize: 12,
                      padding: "5px 12px",
                      minHeight: "auto",
                      borderRadius: 8,
                      flexShrink: 0,
                    }}
                    onClick={() => dispatch({ type: "log-sleep" })}
                  >
                    Sync sleep
                  </button>
                </div>
                <label className="fb-field" style={{ marginTop: 16 }}>
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
                <h2>Import fitness history</h2>
                {state.calibrated ? (
                  <p className="fb-copy">
                    History is locked in. This one-time calibration cannot run
                    again.
                  </p>
                ) : (
                  <>
                    <p className="fb-copy">
                      Import your recent activity history to calibrate your starting effort score
                      and leave the baseline.
                    </p>
                    <button
                      type="button"
                      className="fb-btn"
                      onClick={() => dispatch({ type: "import-history" })}
                    >
                      Import fitness history
                    </button>
                  </>
                )}
              </section>
            </>
          ) : null}
          {panel === "preferences" ? (
            <>
              <section className="fb-card">
                <h2>Units</h2>
                <p className="fb-copy">
                  Imperial vs metric for distances across Compete, Crew, and
                  Progress. Home shows hours only.
                </p>
                <div className="focus-segments" role="group" aria-label="Unit system">
                  <button
                    type="button"
                    aria-pressed={state.units === "us"}
                    onClick={() => dispatch({ type: "set-units", units: "us" })}
                  >
                    Imperial
                  </button>
                  <button
                    type="button"
                    aria-pressed={state.units === "metric"}
                    onClick={() =>
                      dispatch({ type: "set-units", units: "metric" })
                    }
                  >
                    Metric
                  </button>
                </div>
              </section>

              <section className="fb-card">
                <h2>Sports</h2>
                <p className="fb-copy" style={{ color: "var(--muted)", marginBottom: 16 }}>
                  Choose your primary sport and toggle which events you actively compete in this week.
                </p>
                {primaryNote ? (
                  <p className="fb-note" style={{ color: "var(--green, #2f6f4e)", marginBottom: 12 }}>
                    {primaryNote}
                  </p>
                ) : null}
                {SPORTS.map((sport) => {
                  const rating = state.ratings.find(
                    (item) => item.sport === sport.id,
                  );
                  const primary = state.primary === sport.id;
                  const isActive = Boolean(rating?.optedIn);
                  const elo =
                    rating?.openElo && rating.openElo > 0
                      ? rating.openElo
                      : user
                        ? 1000
                        : 500;
                  return (
                    <div
                      key={sport.id}
                      className="fb-row"
                      style={{ alignItems: "center", gap: 12 }}
                    >
                      <div className="fb-grow">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong style={{ fontSize: 14 }}>{sport.name}</strong>
                          {primary ? (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "2px 8px",
                                borderRadius: 999,
                                background: "var(--accent-soft, #eef4e6)",
                                color: "var(--ink, #282f2c)",
                                fontWeight: 600,
                              }}
                            >
                              Primary
                            </span>
                          ) : null}
                        </div>
                        <small style={{ color: "var(--muted)", fontSize: 13, display: "block", marginTop: 2 }}>
                          Effort Score {elo} · {rankForElo(elo).name}
                        </small>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          flexShrink: 0,
                        }}
                      >
                        {!primary ? (
                          <button
                            type="button"
                            className="fb-btn-line"
                            style={{
                              width: "auto",
                              fontSize: 12,
                              padding: "4px 10px",
                              minHeight: "auto",
                              borderRadius: 8,
                            }}
                            onClick={() => {
                              dispatch({ type: "set-primary", sport: sport.id });
                              setPrimaryNote(`${sport.name} is now your primary sport.`);
                              setTimeout(() => setPrimaryNote(null), 3000);
                            }}
                          >
                            Make primary
                          </button>
                        ) : null}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>Active</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            aria-label={`Toggle ${sport.name} active status`}
                            className={isActive ? "fb-switch on" : "fb-switch"}
                            onClick={() => {
                              if (isActive) {
                                dispatch({ type: "opt-out", sport: sport.id });
                              } else {
                                requireAuth(`Sign in to activate ${sport.name}.`, () => {
                                  dispatch({ type: "opt-in", sport: sport.id, crewBoard: null });
                                });
                              }
                            }}
                          >
                            <span className="fb-switch-knob" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>

              <section className="fb-card">
                <h2>Week freezes</h2>
                <p className="fb-copy">
                  {state.freezesLeft} of {STARTING_FREEZES} left. A freeze holds
                  effort score for a taper or a vacation. It does not pause the lesson.
                </p>
                {frozen ? (
                  <div className="fb-stack">
                    <p className="fb-note" style={{ color: "var(--green, #2f6f4e)" }}>
                      ❄ This week is frozen. Your effort score will hold through next Monday.
                    </p>
                    <button
                      type="button"
                      className="fb-btn-ghost"
                      onClick={() => dispatch({ type: "unfreeze" })}
                    >
                      Undo freeze
                    </button>
                  </div>
                ) : confirmFreeze ? (
                  <div className="fb-stack">
                    <p className="fb-note">
                      Freeze this week? You will have {state.freezesLeft - 1} freezes left.
                      Your effort score will hold steady until next Monday.
                    </p>
                    <div className="fb-row">
                      <button
                        type="button"
                        className="fb-btn"
                        onClick={() => {
                          dispatch({ type: "freeze" });
                          setConfirmFreeze(false);
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
              </section>
            </>
          ) : null}
          {panel === "account" ? (
            <>
              <section className="fb-card fb-stack">
                <h2>Your account</h2>
                <button type="button" className="fb-btn-line" onClick={() => void signOut()}>Sign out</button>
                <ReportIssue />
              </section>
              {user ? (
                <section className="fb-card" style={{ borderColor: "#f3d1cc" }}>
                  <h2 style={{ color: "var(--red, #b83a38)" }}>Danger Zone</h2>
                  <p className="fb-copy">
                    Permanently delete your account and all associated workout history, rankings, and effort scores. This action cannot be undone.
                  </p>
                  <button
                    type="button"
                    className="fb-btn-ghost"
                    style={{
                      color: "var(--red, #b83a38)",
                      border: "1px solid #f3d1cc",
                      borderRadius: 8,
                      padding: "8px 16px",
                      width: "auto",
                      fontWeight: 600,
                    }}
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    Delete account
                  </button>
                </section>
              ) : null}
            </>
          ) : null}
          {panel === "notifications" ? <NotificationSettings /> : null}
          {panel === "scoring" ? (
            <section className="fb-card">
              <h2>Levels</h2>
              <p className="fb-copy">
                Your level is a band on the weekly effort score ladder. It rises
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
                rate can add a little. Pace adds less. Effort score never falls below
                500.
              </p>
              <p className="fb-note">
                Competition weeks run Monday 00:00 to next Monday 00:00 Eastern
                Time (ET / New York). New fields open Monday midnight Eastern Time.
              </p>
            </section>
          ) : null}
        </div>
      </motion.aside>
  ) : null;

  const settingsPortal = settingsScrollRoot
    ? createPortal(
        (panel || settingsPresent) ? <div className="focus-settings-stack">
        <AnimatePresence mode="wait" onExitComplete={() => {
          setSettingsPresent(false);
        }}>{settingsPanel}</AnimatePresence>
        </div> : null,
        settingsScrollRoot,
      )
    : null;

  return (
    <>
    <div className="focus-athlete" ref={overviewRef} inert={Boolean(panel) || settingsPresent}>
      {surface === "progress" ? (
        <>
          <AthleteOverview
            state={state}
            email={user?.email}
            demoMode={demoMode}
            sections="progress"
          />
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
      ) : (
        <>
      <AthleteOverview
        state={state}
        email={user.email}
        demoMode={demoMode}
        openProfileEdit={requestedEdit === "profile"}
        sections="profile"
      />
      {isOwnerEmail(user.email) && <Link href="/admin" className="fb-btn-line">Round lab</Link>}
      <nav className="focus-settings-list" aria-label="Athlete settings">
        {(
          [
            ["connections", "Trackers & history"],
            ["preferences", "Units, sports & freezes"],
            ["notifications", "Your updates, your choice"],
            ["scoring", "Levels & eligibility"],
            ["account", "Sign out, report an issue & delete account"],
          ] as const
        ).map(([id, detail]) => (
          <button
            key={id}
            type="button"
            className="focus-settings-row"
            onClick={(event) => {
              settingsFocus.current = event.currentTarget;
              void playCue("selection");
              setPanel(id);
            }}
          >
            <span>
              <b>{PANEL_TITLES[id]}</b>
              <small>{detail}</small>
            </span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </nav>
        </>
      )}
      {!state.onboardingCompleted ? (
        <section className="fb-card">
          <h2>Finish setup</h2>
          <p className="fb-copy">
            {user
              ? `Preferences and the optional ${BACKFILL_DAYS}-day calibration live in onboarding.`
              : "Create an account to lock in preferences, link trackers, and calibrate your effort score."}
          </p>
          <Link
            href={user ? "/onboarding" : "/signup?next=%2Fonboarding"}
            className="fb-btn"
          >
            {user ? "Continue onboarding" : "Create account to finish setup"}
          </Link>
        </section>
      ) : null}
      {!user ? (
        <div className="fb-stack">
          <p className="fb-note">Browsing as a guest</p>
          <div className="fb-row" style={{ gap: 10 }}>
            <Link href="/signup" className="fb-btn" style={{ flex: 1, justifyContent: "center" }}>
              Create account
            </Link>
            <Link href="/login" className="fb-btn-line" style={{ flex: 1, justifyContent: "center" }}>
              Sign in
            </Link>
          </div>
        </div>
      ) : null}
      <AuthPrompt
        open={Boolean(authPrompt?.open)}
        reason={authPrompt?.reason ?? "Sign in to compete."}
        onClose={() => setAuthPrompt(null)}
      />
      {deleteAccountSheet}
    </div>
    {surface === "athlete" ? settingsPortal : null}
    </>
  );
}

export function ProgressPage() {
  return (
    <Suspense fallback={<p className="fb-copy">Loading…</p>}>
      <YouContent surface="progress" />
    </Suspense>
  );
}

export function AthletePage() {
  return (
    <Suspense fallback={<p className="fb-copy">Loading…</p>}>
      <YouContent surface="athlete" />
    </Suspense>
  );
}

export default function YouPage() {
  return <ProgressPage />;
}
