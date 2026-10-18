"use client";
import { useRef, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import {
  APP_TIMEZONE,
  competeNow,
  countsOnTrack,
  dayKey,
  distanceUnitLabel,
  formatDistanceM,
  initialsFromName,
  rankForElo,
  type CompeteState,
} from "@fitness-battle/shared";
import {
  removeWebProfileAvatar,
  uploadWebProfileAvatar,
} from "@/lib/profile/avatar-upload";
import { createClient } from "@/lib/supabase/client";

function seasonSummary(state: CompeteState) {
  const counted = state.activities.filter((a) => countsOnTrack(a, "open"));
  const meters = counted.reduce((t, a) => t + a.distanceM, 0);
  const weeks = state.periodResults.filter(
    (r) => r.sport === state.primary && r.track === "open",
  ).length;
  return { meters, sessions: counted.length, weeks };
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 7l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AthleteOverview({
  state,
  email,
  demoMode,
}: {
  state: CompeteState;
  email?: string | null;
  demoMode?: boolean;
}) {
  const { user } = useAuth();
  const { dispatch } = useCompete();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.name);
  const [city, setCity] = useState(state.city);
  const [track, setTrack] = useState<"open" | "verified">("open");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const rating = state.ratings.find((r) => r.sport === state.primary);
  const openElo = rating?.openElo ?? 0;
  const verifiedElo = rating?.verifiedElo ?? 0;
  const currentElo = track === "open" ? openElo : verifiedElo;

  const season = seasonSummary(state);
  const unit = distanceUnitLabel(state.units);

  async function onAvatarChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      const newUrl = await uploadWebProfileAvatar({
        file,
        userId: user?.id,
        previousAvatarUrl: state.avatarUrl,
        supabase,
        // Signed-in athletes (email present) must use storage — never data URLs.
        requireStorage: Boolean(email),
      });
      dispatch({ type: "set-avatar", avatarUrl: newUrl });
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : "Failed to upload photo.",
      );
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onRemovePhoto() {
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      await removeWebProfileAvatar({
        userId: user?.id,
        previousAvatarUrl: state.avatarUrl,
        supabase,
      });
      dispatch({ type: "set-avatar", avatarUrl: null });
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : "Failed to remove photo.",
      );
    } finally {
      setAvatarBusy(false);
    }
  }

  // Elo chart calculation
  const today = competeNow(state);
  const todayIso = dayKey(today);

  const history = state.periodResults
    .filter((r) => r.sport === state.primary && r.track === track)
    .slice()
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));

  const isGuest = (!user && !email) || currentElo === 0;

  // Determine user's start anchor date (account creation or earliest activity/period)
  let earliestDate: Date;
  if (isGuest) {
    earliestDate = today;
  } else {
    const candidateTimestamps: number[] = [];
    if (user?.createdAt) {
      candidateTimestamps.push(new Date(user.createdAt).getTime());
    }
    if (history.length > 0) {
      candidateTimestamps.push(new Date(history[0].periodStart).getTime());
    }
    if (state.activities.length > 0) {
      candidateTimestamps.push(
        ...state.activities.map((a) => new Date(a.startedAt).getTime()),
      );
    }
    earliestDate =
      candidateTimestamps.length > 0
        ? new Date(Math.min(...candidateTimestamps))
        : today;
  }

  // Days elapsed from account start to today
  const msPerDay = 24 * 3600 * 1000;
  const daysElapsed = isGuest
    ? 0
    : Math.max(0, Math.floor((today.getTime() - earliestDate.getTime()) / msPerDay));
  const isRolling = daysElapsed >= 29;

  let windowStart: Date;
  let windowMid: Date;
  let windowEnd: Date;
  let activeDaysCount: number;

  if (isRolling) {
    windowStart = new Date(today.getTime() - 29 * msPerDay);
    windowMid = new Date(today.getTime() - 15 * msPerDay);
    windowEnd = today;
    activeDaysCount = 30;
  } else {
    // New user or guest populating the 30-day window from left to right
    windowStart = earliestDate;
    windowMid = new Date(earliestDate.getTime() + 15 * msPerDay);
    windowEnd = new Date(earliestDate.getTime() + 29 * msPerDay);
    activeDaysCount = Math.min(30, daysElapsed + 1);
  }

  const dailyValues: number[] = [];
  if (isGuest) {
    dailyValues.push(0);
  } else if (isRolling) {
    for (let d = 29; d >= 0; d--) {
      const dayDate = new Date(today.getTime() - d * msPerDay);
      const dayIso = dayKey(dayDate);
      const matching = history.filter(
        (r) => dayKey(new Date(r.periodStart)) <= dayIso,
      );
      if (matching.length > 0) {
        dailyValues.push(matching[matching.length - 1].eloAfter);
      } else if (history.length > 0) {
        dailyValues.push(history[0].eloBefore);
      } else {
        dailyValues.push(currentElo);
      }
    }
    dailyValues[29] = currentElo;
  } else {
    // Populating window: from day 0 (start date, 1000) up to today (currentElo)
    for (let d = 0; d < activeDaysCount; d++) {
      const dayDate = new Date(windowStart.getTime() + d * msPerDay);
      const dayIso = dayKey(dayDate);
      const matching = history.filter(
        (r) => dayKey(new Date(r.periodStart)) <= dayIso,
      );
      if (matching.length > 0) {
        dailyValues.push(matching[matching.length - 1].eloAfter);
      } else if (d === 0) {
        dailyValues.push(history[0]?.eloBefore ?? 1000);
      } else {
        dailyValues.push(currentElo);
      }
    }
    dailyValues[activeDaysCount - 1] = currentElo;
  }

  const minVal = Math.min(...dailyValues);
  const maxVal = Math.max(...dailyValues);
  let yMin: number;
  let yMid: number;
  let yMax: number;

  if (currentElo === 0 && maxVal === 0) {
    // Guest or 0 Elo: bottom is 0, never negative (+/- 20)
    yMin = 0;
    yMid = 20;
    yMax = 40;
  } else {
    const rawMid = (minVal + maxVal) / 2;
    const halfSpread = Math.max(15, (maxVal - minVal) / 2);
    const step = Math.max(10, Math.ceil((halfSpread * 1.25) / 10) * 10);
    const tentativeMid = Math.round(rawMid / 10) * 10;
    if (tentativeMid - step < 0) {
      yMin = 0;
      yMid = step;
      yMax = step * 2;
    } else {
      yMid = tentativeMid;
      yMin = yMid - step;
      yMax = yMid + step;
    }
  }

  // SVG plot area layout (viewBox 0 0 340 150)
  const xStart = 44;
  const xEnd = 326;
  const xMid = Math.round((xStart + xEnd) / 2);
  const yTop = 20;
  const yBottom = 116;
  const yMidPos = Math.round((yTop + yBottom) / 2);

  const pts = dailyValues.map((v, i) => {
    const xPos = isRolling
      ? xStart + (i / 29) * (xEnd - xStart)
      : xStart + (i / 29) * (xEnd - xStart);
    return {
      x: xPos,
      y: yBottom - ((v - yMin) / (yMax - yMin || 1)) * (yBottom - yTop),
    };
  });

  const lastPoint = pts[pts.length - 1];
  const linePoints =
    pts.length > 1
      ? pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
      : "";
  const areaPoints =
    pts.length > 1
      ? `${linePoints} ${lastPoint.x.toFixed(1)},${yBottom} ${pts[0].x.toFixed(1)},${yBottom}`
      : "";

  const startDateLabel = windowStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const midDateLabel = windowMid.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const todayDateLabel = today.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const endDateLabel = isRolling
    ? `Today (${todayDateLabel})`
    : windowEnd.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: APP_TIMEZONE,
      });

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={onAvatarChosen}
      />

      {editing ? (
        <section
          className="focus-profile-card is-editing"
          aria-label="Edit athlete profile"
        >
          <div
            className="focus-portrait"
            role="button"
            tabIndex={avatarBusy ? -1 : 0}
            aria-busy={avatarBusy || undefined}
            aria-disabled={avatarBusy || undefined}
            aria-label={state.avatarUrl ? "Change photo" : "Upload photo"}
            title={state.avatarUrl ? "Change photo" : "Upload photo"}
            onClick={() => {
              if (!avatarBusy) fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if (avatarBusy) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            {state.avatarUrl ? (
              <img
                src={state.avatarUrl}
                alt=""
                className="focus-portrait-img"
              />
            ) : (
              initialsFromName(name || state.name)
            )}
          </div>
          <div className="focus-profile-card-copy" style={{ flex: 1 }}>
            <label className="fb-field" style={{ marginBottom: 8 }}>
              Display name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={32}
              />
            </label>
            <label className="fb-field" style={{ marginBottom: 12 }}>
              Location / City
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City, Region"
                maxLength={48}
              />
            </label>
            {state.avatarUrl ? (
              <div className="focus-avatar-actions" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  className="fb-btn-ghost focus-avatar-btn is-danger"
                  disabled={avatarBusy}
                  onClick={onRemovePhoto}
                >
                  Remove photo
                </button>
              </div>
            ) : null}
            {avatarError && (
              <p className="fb-error" style={{ fontSize: 11, marginBottom: 8 }}>
                {avatarError}
              </p>
            )}
            <div className="fb-row" style={{ gap: 8 }}>
              <button
                type="button"
                className="fb-btn"
                style={{ fontSize: 13, padding: "6px 14px" }}
                onClick={() => {
                  if (name.trim()) dispatch({ type: "rename", name: name.trim() });
                  dispatch({ type: "set-city", city: city.trim() });
                  setEditing(false);
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="fb-btn-ghost"
                style={{ fontSize: 13, padding: "6px 14px" }}
                onClick={() => {
                  setName(state.name);
                  setCity(state.city);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="focus-profile-card" aria-label="Athlete profile">
          <div className="focus-portrait">
            {state.avatarUrl ? (
              <img
                src={state.avatarUrl}
                alt={state.name}
                className="focus-portrait-img"
              />
            ) : (
              initialsFromName(state.name)
            )}
          </div>
          <div className="focus-profile-card-copy">
            <div className="focus-profile-identity">
              <div className="focus-profile-identity-text">
                <p className="fb-kicker">{state.city || "Your location"}</p>
                <h1>{state.name}</h1>
                {email ? (
                  <p className="focus-profile-email">
                    {email}
                    {demoMode ? " · demo" : ""}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="focus-profile-edit"
                aria-label="Edit profile"
                onClick={() => {
                  setName(state.name);
                  setCity(state.city);
                  setEditing(true);
                }}
              >
                <EditIcon />
              </button>
            </div>
          </div>
        </section>
      )}

      <section
        className="focus-season-strip"
        aria-label="Your season so far"
      >
        <p className="fb-kicker">Your season so far</p>
        <div className="focus-season-stats">
          <div>
            <strong>{formatDistanceM(season.meters, state.units)}</strong>
            <span>{unit} counted</span>
          </div>
          <div>
            <strong>{season.sessions}</strong>
            <span>sessions</span>
          </div>
          <div>
            <strong>{season.weeks}</strong>
            <span>settled weeks</span>
          </div>
        </div>
      </section>

      <section className="focus-card focus-elo">
        <div className="focus-elo-top">
          <div
            className="focus-elo-track-toggle"
            role="group"
            aria-label="Effort score track"
          >
            <button
              type="button"
              aria-pressed={track === "open"}
              onClick={() => setTrack("open")}
            >
              Open
            </button>
            <button
              type="button"
              aria-pressed={track === "verified"}
              onClick={() => setTrack("verified")}
            >
              GPS verified
            </button>
          </div>
          <span className="focus-elo-rank-pill">
            {rankForElo(currentElo).name}
          </span>
        </div>

        <div className="focus-elo-score-row">
          <strong>{currentElo.toLocaleString()}</strong>
          <span className="focus-elo-score-label">effort score</span>
        </div>

        <svg
          viewBox="0 0 340 150"
          className="focus-trend"
          role="img"
          aria-label={`30-day ${track === "open" ? "Open" : "GPS verified"} effort score history ending at ${currentElo}`}
        >
          <defs>
            <linearGradient id="focus-trend-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f1c75b" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#f1c75b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines & Y-axis numbers */}
          <text
            x="36"
            y={yTop}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#616c63"
            fontSize="10"
            fontFamily="inherit"
            fontWeight="500"
          >
            {yMax}
          </text>
          <line
            x1={xStart}
            y1={yTop}
            x2={xEnd}
            y2={yTop}
            stroke="#e0e5dc"
            strokeDasharray="3 3"
          />

          <text
            x="36"
            y={yMidPos}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#616c63"
            fontSize="10"
            fontFamily="inherit"
            fontWeight="500"
          >
            {yMid}
          </text>
          <line
            x1={xStart}
            y1={yMidPos}
            x2={xEnd}
            y2={yMidPos}
            stroke="#e0e5dc"
            strokeDasharray="3 3"
          />

          <text
            x="36"
            y={yBottom}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#616c63"
            fontSize="10"
            fontFamily="inherit"
            fontWeight="500"
          >
            {yMin}
          </text>
          <line
            x1={xStart}
            y1={yBottom}
            x2={xEnd}
            y2={yBottom}
            stroke="#c8d2c2"
            strokeWidth="1"
          />

          {/* Y-axis vertical line */}
          <line
            x1={xStart}
            y1={yTop}
            x2={xStart}
            y2={yBottom}
            stroke="#c8d2c2"
            strokeWidth="1"
          />

          {/* Area under curve & trend polyline */}
          {areaPoints ? (
            <polygon points={areaPoints} fill="url(#focus-trend-grad)" />
          ) : null}
          {linePoints ? (
            <polyline
              points={linePoints}
              stroke="#282f2c"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
          ) : null}

          {/* Live pulsing dot at current day — drawn before the solid point so
              the pulse stays behind the marker when they overlap. */}
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="7"
            fill="none"
            stroke="#f1c75b"
            strokeWidth="2"
            className="focus-trend-pulse"
          />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="3.5" fill="#282f2c" />

          {/* X-axis tick marks */}
          <line
            x1={xStart}
            y1={yBottom}
            x2={xStart}
            y2={yBottom + 5}
            stroke="#8a9785"
            strokeWidth="1"
          />
          <line
            x1={xMid}
            y1={yBottom}
            x2={xMid}
            y2={yBottom + 5}
            stroke="#8a9785"
            strokeWidth="1"
          />
          <line
            x1={xEnd}
            y1={yBottom}
            x2={xEnd}
            y2={yBottom + 5}
            stroke="#8a9785"
            strokeWidth="1"
          />

          {/* X-axis date labels integrated directly into the graph */}
          <text
            x={xStart}
            y="136"
            textAnchor="start"
            fill="#616c63"
            fontSize="10"
            fontFamily="inherit"
          >
            {daysElapsed === 0 ? `Today (${todayDateLabel})` : startDateLabel}
          </text>
          <text
            x={xMid}
            y="136"
            textAnchor="middle"
            fill="#616c63"
            fontSize="10"
            fontFamily="inherit"
          >
            {midDateLabel}
          </text>
          <text
            x={xEnd}
            y="136"
            textAnchor="end"
            fill="#616c63"
            fontSize="10"
            fontFamily="inherit"
          >
            {endDateLabel}
          </text>
        </svg>
      </section>
    </>
  );
}
