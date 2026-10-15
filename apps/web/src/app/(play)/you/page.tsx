"use client";

import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { NotificationSettings } from "@/components/notification-settings";
import { requestAccountPush } from "@/lib/request-push";
import type { SyncIdentity } from "@/lib/push-notifications";
import { useTheme } from "@/theme/theme-provider";
import { THEME_OPTIONS } from "@/theme/catalog";
import {
  AthleteCard,
  WeekRecords,
} from "@/features/split/components/athlete-card";
import {
  ProductHeader,
  sourceFromLinks,
} from "@/features/split/components/product-header";
import { AwardShelf } from "@/features/play/award-shelf";
import { SeasonHistory } from "@/features/split/components/season-history";
import { buildSplitBoard } from "@/features/split/model";
import {
  activityFromSample,
  BACKFILL_DAYS,
  competeNow,
  evidenceLabel,
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

const OAUTH_PROVIDERS = new Set<ProviderId>(["strava", "garmin", "whoop", "oura"]);
const DEVICE_PROVIDERS = new Set<ProviderId>(["apple_health", "google_health"]);

function YouContent() {
  const { user, signOut, demoMode } = useAuth();
  const { state, dispatch } = useCompete();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const pushIdentity: SyncIdentity | null = user
    ? { userId: user.id, localOnly: demoMode || user.mode === "demo" }
    : null;
  const tracker = searchParams.get("tracker");
  const trackerProvider = searchParams.get("provider");
  const appliedTracker = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (state && !seeded) {
    setSeeded(true);
    setName(state.name);
    setCity(state.city);
  }

  useEffect(() => {
    const key = `${tracker}:${trackerProvider ?? "strava"}`;
    if (!state || !tracker || appliedTracker.current === key) return;
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
      setSyncNote("That tracker did not connect. Sign in and try the link again.");
    }
  }, [dispatch, state, tracker, trackerProvider]);

  if (!state) return <p className="fb-copy">Loading…</p>;

  const now = competeNow(state);
  const board = buildSplitBoard(state, state.primary, "open", now);
  const frozen = state.frozenPeriods.includes(
    board.periodStart.toISOString(),
  );
  const source = sourceFromLinks(state.links);
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
    const readiness: ReadinessMark[] = (body.readiness ?? []).flatMap((sample) => {
      if (!OAUTH_PROVIDERS.has(sample.provider as ProviderId) && !DEVICE_PROVIDERS.has(sample.provider as ProviderId)) {
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
    });
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
    const ready = readiness.length ? `, ${readiness.length} readiness marks` : "";
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
      setSyncNote("Apple Health and Health Connect sync from the phone app. The web app cannot read them.");
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
        setSyncNote(body.message ?? "Demo tracker linked. This is not a live connection.");
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
        setSyncNote("Offline demo sync applied locally. These are sample sessions.");
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
      const response = await fetch("/api/fitness/import", { method: "POST", body: form });
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
    <>
      <AwardShelf />
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

      {(() => {
        const last = [...state.sleepNights].sort((a, b) => a.day.localeCompare(b.day)).at(-1);
        if (!last) return null;
        return (
          <section className="fb-card">
            <p className="fb-kicker">Last night</p>
            <h2>Sleep {last.score}</h2>
            <p className="fb-copy">
              Open My track and choose Sleep for the night and the weekly board.
            </p>
            <Link href="/" className="fb-btn-ghost">
              Open sleep
            </Link>
          </section>
        );
      })()}

      <p className="fb-copy">
        {user?.email}
        {demoMode ? " · demo account" : ""}.
      </p>

      <SeasonHistory results={state.periodResults} primary={state.primary} />

      {demoMode ? (
        <section className="fb-card">
          <h2>Demo week close</h2>
          <p className="fb-copy">
            Settlement runs when you open the app after Monday 00:00 UTC.
            This advances the clock so you can preview the week-complete
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

      <section className="fb-card" id="theme">
        <h2>Theme</h2>
        <p className="fb-copy">
          Rally is the default skin — plum, tennis yellow, and Star Ember accents. Form
          and Ink keep their earlier chrome. The same week, 2D/3D field, and
          imports stay underneath every theme.
        </p>
        <div className="fm-themes">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="fb-btn-line"
              aria-pressed={theme.id === option.id}
              onClick={() => setTheme(option.id)}
            >
              {option.label} · {option.mood}
            </button>
          ))}
        </div>
      </section>

      <NotificationSettings />

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
              1000 baseline. The rows are labeled sample history and do not
              count as workouts. This can only be done once.
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
          Cloud trackers open their own authorize page when API keys are set.
          Without keys the link stays a stub. Garmin files stay pending until you
          count them. Apple Health and Health Connect sync from the phone.
          Sleep shown here is a sample. WHOOP and Oura do not import nights yet.
        </p>
        {PROVIDERS.map((provider) => {
          const link = state.links.find((item) => item.provider === provider.id);
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
