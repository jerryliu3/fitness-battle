"use client";

import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { useTheme } from "@/theme/theme-provider";
import { THEME_OPTIONS } from "@/theme/catalog";
import { Ace } from "@/features/rally/ace";
import { RallyHero } from "@/features/rally/hero";
import { buildRallyBoard, formatRallyValue } from "@/features/rally/model";
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
  const rally = buildRallyBoard(state, state.primary, "open", now);
  const frozen = state.frozenPeriods.includes(
    board.periodStart.toISOString(),
  );
  const source = sourceFromLinks(state.links);
  const spec = sportById(state.primary);
  const thisWeekTotal =
    rally.unit === "km"
      ? (board.you?.distanceM ?? 0) / 1000
      : (board.you?.effort ?? 0);
  const priorTotal = board.ghostSeries
    ? rally.unit === "km"
      ? board.ghostSeries.distanceM[2]! / 1000
      : board.ghostSeries.effort[2]!
    : 0;

  function applyRemote(body: {
    provider: ProviderId;
    usedMock?: boolean;
    activities?: ActivitySample[];
    readiness?: ReadinessSample[];
    windowKind?: string;
    source?: string;
  }) {
    const activities = (body.activities ?? [])
      .map((sample) => activityFromSample(sample))
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
    setSyncNote(
      body.source === "file"
        ? `Imported ${activities.length} activities from the file.`
        : `Synced ${activities.length} activities${ready}.`,
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
        dispatch({ type: "link", provider: providerId });
        setSyncNote("Offline demo link only.");
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
        activities?: ActivitySample[];
        readiness?: ReadinessSample[];
        error?: string;
        windowKind?: string;
      };
      if (!response.ok) {
        setSyncNote(body.error ?? "Sync failed");
        return;
      }
      applyRemote({ ...body, provider: providerId });
    } catch {
      dispatch({ type: "sync", provider: providerId });
      setSyncNote("Offline demo sync applied locally.");
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
      };
      if (!response.ok) {
        setSyncNote(body.error ?? "Import failed");
        return;
      }
      applyRemote({
        provider: "garmin",
        activities: body.activities,
        usedMock: false,
        source: "file",
      });
    } catch {
      setSyncNote("Could not read that file.");
    }
  }

  return (
    <main>
      <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />
      <div className="rf-demo-line">
        <span>
          {spec.name} · {rally.periodLabel}
        </span>
        <span>
          {user?.email}
          {demoMode ? " · demo" : ""}
        </span>
      </div>

      <RallyHero
        kicker={`YOUR ATHLETE CARD / ${rally.periodLabel}`}
        line1="YOUR GAME."
        line2="YOUR OWN PACE."
        copy="A record of the movement you already did."
      />

      <div className="rf-you-layout">
        <section className="rf-athlete-card">
          <span className="rf-kicker">
            YOUR ATHLETE CARD / {state.city || "Anywhere"}
          </span>
          <Ace decorative={false} />
          <div>
            <strong>{state.name || "YOU"}</strong>
            <span>YOUR OWN KIND OF ATHLETE.</span>
          </div>
          <dl>
            <div>
              <dt>{rally.unit === "km" ? "Distance" : "Effort"}</dt>
              <dd>
                {formatRallyValue(thisWeekTotal, rally.unit)}
                <small>{rally.unit}</small>
              </dd>
            </div>
            <div>
              <dt>Outings</dt>
              <dd>{rally.moves.length}</dd>
            </div>
            <div>
              <dt>Time moving</dt>
              <dd>
                {rally.movingMinutes}
                <small>min</small>
              </dd>
            </div>
          </dl>
        </section>
        <div className="rf-you-side">
          <section className="rf-week-record">
            <p className="rf-kicker">SAME POINT. TWO WEEKS.</p>
            <h2>
              {priorTotal > 0 && thisWeekTotal >= priorTotal
                ? "A little more of your own work."
                : "Your week, on your terms."}
            </h2>
            <div>
              <span>
                This week<small>{rally.periodLabel} · live snapshot</small>
              </span>
              <strong>
                {formatRallyValue(thisWeekTotal, rally.unit)}
                <small>{rally.unit}</small>
              </strong>
            </div>
            <div>
              <span>
                Previous week<small>Same cutoff when available</small>
              </span>
              <strong>
                {formatRallyValue(priorTotal, rally.unit)}
                <small>{rally.unit}</small>
              </strong>
            </div>
            <Link href="/">Replay the comparison ↗</Link>
          </section>
          <section className="rf-tracker-card">
            <span className="rf-kicker">TRACKER IMPORTS</span>
            <b className="rf-demo-badge">{source.label}</b>
            <h2>Your moves find their way here.</h2>
            <p>
              Connect a tracker below. Counted imports appear as rings on Moves
              and My week.
            </p>
            <Link href="/splits">View counted moves ↗</Link>
          </section>
        </div>
      </div>

      {(() => {
        const last = [...state.sleepNights]
          .sort((a, b) => a.day.localeCompare(b.day))
          .at(-1);
        if (!last) return null;
        return (
          <section className="fb-card">
            <p className="fb-kicker">Last night</p>
            <h2>Sleep {last.score}</h2>
            <p className="fb-copy">
              Open My week and choose Sleep for the night and the weekly board.
            </p>
            <Link href="/" className="fb-btn-ghost">
              Open sleep
            </Link>
          </section>
        );
      })()}

      <SeasonHistory results={state.periodResults} primary={state.primary} />

      {demoMode ? (
        <section className="fb-card">
          <h2>Demo week close</h2>
          <p className="fb-copy">
            Settlement normally runs when you open the app after the Sunday UTC
            wave reset. This advances the clock so you can preview the
            week-complete reveal and season history.
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
          Rally is the product default — plum, tennis yellow, and Ace. Form and
          Ink keep the earlier chrome shells. The same week, field, and imports
          stay underneath.
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
          Cloud trackers open their own authorize page when API keys are set.
          Without keys the link stays a stub. Garmin files import as real
          activities. Apple Health and Health Connect sync from the phone.
          WHOOP, Oura, Garmin, Apple Health, and Health Connect also send last
          night’s sleep score.
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
    </main>
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
