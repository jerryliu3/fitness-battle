"use client";
import { AppParagraph, AppText, typographyStyle, SectionHeader, Section, AppHeading } from "@/ui/section";

import { isOwnerEmail } from "@/lib/auth/design-access";
import { ReportIssue } from "@/components/report-issue";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { NotificationSettings } from "@/components/notification-settings";
import { requestAccountPush } from "@/lib/request-push";
import type { SyncIdentity } from "@/lib/push-notifications";
import { Achievements } from "@/features/club/achievements";
import { ProgressHub } from "@/features/club/progress-hub";
import { WeekRecap } from "@/features/club/week-recap";
import { TrainingHistory } from "@/features/progress/training-history";
import { WeekRecords } from "@/features/split/components/athlete-card";
import { AthleteOverview } from "@/features/focus/athlete-overview";
import { SeasonHistory } from "@/features/split/components/season-history";
import { AwardShelf } from "./award-shelf";
import { buildSplitBoard } from "@/features/split/model";
import { SPORT_ICON_PATHS, SETTINGS_ICON_PATHS, activityFromSample, INTEGRATION_ICONS, awardCards, BACKFILL_DAYS, competeNow, competitionTrack, evidenceLabel, primaryFreezePeriodStart, PROVIDERS, RANK_BANDS, sleepRenewal, SPORTS, type SportId, type ActivitySample, type ProviderId, type ReadinessMark, type ReadinessSample } from "@fitness-battle/shared";
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
  const { user, signOut, offlineMode, legacyBackup } = useAuth();
  const { state, dispatch, loadStatus, previewSyncReview } = useCompete();
  const [panel, setPanel] = useState<AthletePanel | null>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const settingsFocus = useRef<HTMLElement | null>(null);
  const [settingsPresent, setSettingsPresent] = useState(false);
  const [settingsScrollRoot, setSettingsScrollRoot] =
    useState<HTMLElement | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [authPrompt, setAuthPrompt] = useState<{ open: boolean; reason: string } | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<ProviderId | null>(null);
  const [confirmFreeze, setConfirmFreeze] = useState(false);
  const searchParams = useSearchParams();
  const accountKey = user?.id ?? "guest";
  const pushIdentity: SyncIdentity | null = user
    ? { userId: user.id, localOnly: offlineMode }
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
          localStorage.removeItem(`fb-compete-v1:${user.id}:revision`);
          localStorage.removeItem(`fb-compete-v1:${user.id}:recovery`);
          localStorage.removeItem(`fb:field-seen:v1:${user.id}`);
          for (const key of Object.keys(localStorage)) {
            if (key.startsWith(`moment:v1:fb-arena-baseline:${user.id}:`)) localStorage.removeItem(key);
          }
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
          <AppParagraph typographyRole="body" className="fb-error" role="alert">
            {deleteError}
          </AppParagraph>
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
    return <AppParagraph typographyRole="body" className="fb-copy">Loading…</AppParagraph>;
  }

  const now = competeNow(state);
  const sleep = sleepRenewal(state);
  const board = buildSplitBoard(state, state.primary, competitionTrack(state.primary), now);
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
    setSyncNote(null);
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
        if (offlineMode) {
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
        setSyncNote("Sync failed");
        void requestAccountPush("connection_alerts", pushIdentity, {
          provider: providerId,
        });
        return;
      }
      applyRemote({ ...body, provider: providerId });
    } catch {
      if (offlineMode) {
        dispatch({ type: "sync", provider: providerId, allowSample: true });
        setSyncNote(null);
        return;
      }
      setSyncNote("Sync failed");
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
      if (!response.ok && !offlineMode) {
        setSyncNote("Could not disconnect that tracker.");
        return;
      }
    } catch {
      if (!offlineMode) {
        setSyncNote("Could not reach disconnect.");
        return;
      }
    }
    dispatch({ type: "unlink", provider: providerId });
    setSyncNote(`${providerId} disconnected on this account.`);
  }

  if (!user && surface === "progress") {
    const guestBoard = buildSplitBoard(state, state.primary, competitionTrack(state.primary), now);
    return (
      <div className="focus-athlete">
        <AthleteOverview state={state} sections="progress" />
        <WeekRecords
          sport={state.primary}
          you={guestBoard.you}
          fieldSize={guestBoard.rows.length}
          units={state.units}
        />
        <SeasonHistory
          results={state.periodResults}
          primary={state.primary}
        />
        <section className="focus-card fb-stack">
          <AppParagraph typographyRole="label" className="fb-kicker">Account</AppParagraph>
          <SectionHeader title="Sign in to save progress"/>
          <AppParagraph typographyRole="body" className="fb-copy">
            Create an account or sign in to keep lifetime totals and season
            history with you.
          </AppParagraph>
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
          <AppParagraph typographyRole="label" className="fb-kicker">Account</AppParagraph>
          <SectionHeader title="Sign in to sync your athlete"/>
          <AppParagraph typographyRole="body" className="fb-copy">
            Create an account or sign in to connect trackers and keep progress
            with you.
          </AppParagraph>
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
          className="club-icon-button"
          aria-label="Return to Athlete"
          onClick={() => setPanel(null)}
        >
          ‹
        </button>
        <header className="focus-heading">
                    <AppHeading level={1} role="heading">{PANEL_TITLES[panel]}</AppHeading>
        </header>
        <div className="focus-settings-panel">
          {panel === "connections" ? (
            <>
              <Section className="fb-card" title="Data Sync">

                <AppParagraph typographyRole="body" className="fb-copy" style={{ color: "var(--muted)", marginBottom: 16 }}>
                  Connect fitness trackers and wearables to sync your activities automatically.
                  Eligible workouts count toward your registered events. Sleep and recovery have their own views; samples do not earn competition points.
                </AppParagraph>
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
                      <span className="club-integration-icon" style={{ background: INTEGRATION_ICONS[provider.id].background }}><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d={INTEGRATION_ICONS[provider.id].path} fill={INTEGRATION_ICONS[provider.id].color} fillRule="evenodd" /></svg></span>
                      <div className="fb-grow">
                        <strong style={{ ...typographyStyle("label") }}>{provider.name}</strong>
                        <AppText as="small" role="body" secondary style={{ ...typographyStyle("caption"), color: "var(--muted)", display: "block", marginTop: 2 }}>
                          {provider.blurb}
                          {link?.linked
                            ? ` · ${offlineMode ? "Demo · sample data" : evidenceLabel(status === "stub" ? "stub" : status === "connected" ? "receiving_data" : "disconnected")}`
                            : ""}
                        </AppText>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        <button type="button" className="fb-btn-ghost" disabled={connectingProvider === provider.id}
                          style={{ width: "auto", minHeight: 44, color: link?.linked && !device ? "#b83a38" : "var(--ink)" }}
                          onClick={() => void (link?.linked && !device ? disconnectProvider(provider.id) : syncProvider(provider.id))}>
                          {device ? "Phone" : link?.linked ? "Disconnect" : "Connect"}
                        </button>
                      </div>
                    </div>
                  );
                })}

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
                {syncNote === "Sync failed" ? (
                  <button
                    type="button"
                    className="fb-btn-ghost"
                    style={{
    ...typographyStyle("label"),
    width: "auto",
    padding: 0,
    color: "var(--red, #b83a38)",
    textDecoration: "underline",
    cursor: "pointer",
    textAlign: "left"
}}
                    onClick={() => setPanel("connections")}
                  >
                    Sync failed · check Data Sync
                  </button>
                ) : syncNote ? (
                  <AppParagraph typographyRole="caption" className="fb-note">{syncNote}</AppParagraph>
                ) : null}
              </Section>
              <section className="fb-card">
                {(offlineMode) && previewSyncReview ? (
                  <button className="fb-btn-line" onClick={previewSyncReview}>
                    Preview today’s sync recap
                  </button>
                ) : null}
                <SectionHeader title="Import fitness history"/>
                {state.calibrated ? (
                  <AppParagraph typographyRole="body" className="fb-copy">
                    History is locked in. This one-time calibration cannot run
                    again.
                  </AppParagraph>
                ) : (
                  <>
                    <AppParagraph typographyRole="body" className="fb-copy">
                      Import your recent activity history to calibrate your starting effort score
                      and leave the baseline.
                    </AppParagraph>
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
          {panel === "preferences" ? <section className="fb-card club-preferences">
            <div className="club-preference-row"><strong>Units</strong><div className="focus-segments" role="group" aria-label="Unit system">
              {(["us", "metric"] as const).map(units => <button key={units} type="button" aria-pressed={state.units === units} onClick={() => dispatch({ type: "set-units", units })}>{units === "us" ? "Imperial" : "Metric"}</button>)}
            </div></div>
            <label className="club-preference-row"><strong>Primary sport</strong><select className="fb-input" value={state.primary} onChange={event => dispatch({ type: "set-primary", sport: event.target.value as SportId })}>
              {SPORTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></label>
            <div className="club-preference-row"><span><strong>Freeze this week</strong><AppText as="small" role="caption" secondary>{state.freezesLeft} remaining</AppText></span>
              <button type="button" role="switch" aria-label="Freeze this week" aria-checked={frozen} className={frozen ? "fb-switch on" : "fb-switch"} disabled={!frozen && state.freezesLeft <= 0}
                onClick={() => frozen ? dispatch({ type: "unfreeze" }) : setConfirmFreeze(true)}><span className="fb-switch-knob" /></button>
            </div>
            {confirmFreeze && !frozen && <div className="fb-stack"><AppParagraph typographyRole="caption" className="fb-note">A freeze holds this week's placement bonus. Activity milestones still count.</AppParagraph>
              <button type="button" className="fb-btn" onClick={() => { dispatch({ type: "freeze" }); setConfirmFreeze(false); }}>Confirm freeze</button>
              <button type="button" className="fb-btn-ghost" onClick={() => setConfirmFreeze(false)}>Cancel</button></div>}
            <SectionHeader title="Active Sports"/>
            {SPORTS.map(sport => { const active = Boolean(state.ratings.find(r => r.sport === sport.id)?.optedIn); return <div key={sport.id} className="club-preference-row">
              <strong className="club-sport-label"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={SPORT_ICON_PATHS[sport.id]} /></svg>{sport.name}</strong><button type="button" role="switch" aria-label={`Toggle ${sport.name} active status`} aria-checked={active} className={active ? "fb-switch on" : "fb-switch"}
                onClick={() => requireAuth(`Sign in to activate ${sport.name}.`, () => dispatch(active ? { type: "opt-out", sport: sport.id } : { type: "opt-in", sport: sport.id, crewBoard: null }))}><span className="fb-switch-knob" /></button>
            </div>; })}
          </section> : null}
          {panel === "account" ? (
            <>
              <section className="fb-card fb-stack">
                <SectionHeader title="Your account"/>
                <button type="button" className="fb-btn-line" onClick={() => void signOut()}>Sign out</button>
                <ReportIssue />
                {legacyBackup && <button type="button" className="fb-btn-line" onClick={() => {
                  const url = URL.createObjectURL(new Blob([legacyBackup], { type: "application/json" }));
                  const link = document.createElement("a"); link.href = url; link.download = "overtaek-local-demo-backup.json"; link.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}>Download local demo backup</button>}
              </section>
              {user ? (
                <Section className="fb-card" style={{ borderColor: "#f3d1cc" }} title="Danger Zone">

                  <AppParagraph typographyRole="body" className="fb-copy">
                    Permanently delete your account and all associated workout history, rankings, and effort scores. This action cannot be undone.
                  </AppParagraph>
                  <button
                    type="button"
                    className="fb-btn-ghost"
                    style={{
    ...typographyStyle("label"),
    color: "var(--red, #b83a38)",
    border: "1px solid #f3d1cc",
    borderRadius: 8,
    padding: "8px 16px",
    width: "auto"
}}
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    Delete account
                  </button>
                </Section>
              ) : null}
            </>
          ) : null}
          {panel === "notifications" ? <NotificationSettings /> : null}
          {panel === "scoring" ? (
            <Section className="fb-card" title="Levels">

              <AppParagraph typographyRole="body" className="fb-copy">
                Your level is a band on the weekly effort score ladder. It rises
                immediately at weekly activity milestones in active sports.
                Your rank sets the milestone size. Weekly placement can raise or lower your score. A week without counted activity decays toward the score floor. Activity milestone points already earned are kept.
              </AppParagraph>
              {RANK_BANDS.map((band) => (
                <div key={band.name} className="fb-row">
                  <span className="fb-grow">
                    {band.name}
                    <AppText as="small" role="body" secondary>
                      {band.min}+ · {band.blurb}
                    </AppText>
                  </span>
                </div>
              ))}
              <AppParagraph typographyRole="caption" className="fb-note">
                Score is mostly distance, or time when there is no GPS. Heart
                rate can add a little. Pace adds less. Effort score never falls below
                500.
              </AppParagraph>
              <AppParagraph typographyRole="caption" className="fb-note">
                Competition weeks run Monday 00:00 to next Monday 00:00 Eastern
                Time (ET / New York). New fields open Monday midnight Eastern Time.
              </AppParagraph>
            </Section>
          ) : null}
        </div>
      </motion.aside>
  ) : null;

  const settingsPortal = settingsScrollRoot
    ? createPortal(
        panel || settingsPresent ? (
          <div className="focus-settings-stack">
        <AnimatePresence mode="wait" onExitComplete={() => {
          setSettingsPresent(false);
        }}>{settingsPanel}</AnimatePresence>
        </div>
        ) : null,
        settingsScrollRoot,
      )
    : null;

  return (
    <>
    <div className="focus-athlete" ref={overviewRef} inert={Boolean(panel) || settingsPresent}>
      {surface === "progress" ? (
        <ProgressHub overview={<><TrainingHistory state={state}><Achievements state={state}/></TrainingHistory><WeekRecap state={state}/>
        <Link href="/you/history" className="fb-card club-history-preview">
          <SectionHeader title="Past weeks & awards"/>
          <AppParagraph typographyRole="body" className="fb-copy">Closed competition weeks, chapter history, and your award shelf.</AppParagraph>
        </Link></>} effort={<>
          <AthleteOverview
            state={state}
            email={user?.email}
            offlineMode={offlineMode}
            sections="progress"
          />
          <WeekRecords
            sport={state.primary}
            you={board.you}
            fieldSize={board.rows.length}
            units={state.units}
          />
        </>} history={null}/>
      ) : user ? (
        <>
      <header className="club-detail-heading"><Link href="/today" className="club-icon-button" aria-label="Return to Home">‹</Link><AppHeading level={1} role="heading">Athlete</AppHeading></header>
      <AthleteOverview
        state={state}
        email={user.email}
        offlineMode={offlineMode}
        openProfileEdit={requestedEdit === "profile"}
        sections="profile"
      />
      {isOwnerEmail(user.email) && (
              <Link href="/admin" className="fb-btn-line">Round lab</Link>
            )}
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={SETTINGS_ICON_PATHS[PANEL_TITLES[id] as keyof typeof SETTINGS_ICON_PATHS]} /></svg>
            <span>
              <b>{PANEL_TITLES[id]}</b>
              <AppText as="small" role="body" secondary>{detail}</AppText>
            </span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </nav>
        </>
      ) : null}
      {!state.onboardingCompleted ? (
        <Section className="fb-card" title="Finish setup">

          <AppParagraph typographyRole="body" className="fb-copy">
            {user
              ? `Preferences and the optional ${BACKFILL_DAYS}-day calibration live in onboarding.`
              : "Create an account to lock in preferences, link trackers, and calibrate your effort score."}
          </AppParagraph>
          <Link
            href={user ? "/onboarding" : "/signup?next=%2Fonboarding"}
            className="fb-btn"
          >
            {user ? "Continue onboarding" : "Create account to finish setup"}
          </Link>
        </Section>
      ) : null}
      {!user ? (
        <div className="fb-stack">
          <AppParagraph typographyRole="caption" className="fb-note">Browsing as a guest</AppParagraph>
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
    <Suspense fallback={<AppParagraph typographyRole="body" className="fb-copy">Loading…</AppParagraph>}>
      <YouContent surface="progress" />
    </Suspense>
  );
}

export function AthletePage() {
  return (
    <Suspense fallback={<AppParagraph typographyRole="body" className="fb-copy">Loading…</AppParagraph>}>
      <YouContent surface="athlete" />
    </Suspense>
  );
}

export default function YouPage() {
  return <ProgressPage />;
}
