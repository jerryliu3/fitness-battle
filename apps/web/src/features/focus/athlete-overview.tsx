"use client";
import { useRef, useState } from "react";
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

export function AthleteOverview({
  state,
  email,
  demoMode,
}: {
  state: CompeteState;
  email?: string | null;
  demoMode?: boolean;
}) {
  const { dispatch } = useCompete();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.name);
  const [city, setCity] = useState(state.city);
  const [track, setTrack] = useState<"open" | "verified">("open");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const rating = state.ratings.find((r) => r.sport === state.primary);
  const openElo = rating?.openElo ?? 1000;
  const verifiedElo = rating?.verifiedElo ?? 1000;
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

  // 30-day fixed time-series Elo history
  const today = competeNow(state);
  const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 3600 * 1000);

  const history = state.periodResults
    .filter((r) => r.sport === state.primary && r.track === track)
    .slice()
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));

  // Build daily series for the last 30 days
  const dailyValues: number[] = [];
  for (let d = 29; d >= 0; d--) {
    const dayDate = new Date(today.getTime() - d * 24 * 3600 * 1000);
    const dayIso = dayKey(dayDate);
    // Find the latest settled result on or before this day
    const matching = history.filter((r) => dayKey(new Date(r.periodStart)) <= dayIso);
    if (matching.length > 0) {
      dailyValues.push(matching[matching.length - 1].eloAfter);
    } else if (history.length > 0) {
      dailyValues.push(history[0].eloBefore);
    } else {
      dailyValues.push(currentElo);
    }
  }
  // Ensure the rightmost day matches currentElo
  dailyValues[29] = currentElo;

  const minVal = Math.min(...dailyValues);
  const maxVal = Math.max(...dailyValues);
  const rawMid = (minVal + maxVal) / 2;
  const halfSpread = Math.max(15, (maxVal - minVal) / 2);
  const step = Math.max(10, Math.ceil((halfSpread * 1.25) / 10) * 10);
  const yMid = Math.round(rawMid / 10) * 10;
  const yMin = yMid - step;
  const yMax = yMid + step;

  // SVG plot area layout (viewBox 0 0 340 150)
  const xStart = 44;
  const xEnd = 326;
  const xMid = Math.round((xStart + xEnd) / 2);
  const yTop = 20;
  const yBottom = 116;
  const yMidPos = Math.round((yTop + yBottom) / 2);

  const pts = dailyValues.map((v, i) => ({
    x: xStart + (i / 29) * (xEnd - xStart),
    y: yBottom - ((v - yMin) / (yMax - yMin)) * (yBottom - yTop),
  }));
  const linePoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPoints = `${linePoints} ${xEnd},${yBottom} ${xStart},${yBottom}`;
  const lastPoint = pts[pts.length - 1];

  const startDateLabel = thirtyDaysAgo.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const todayDateLabel = today.toLocaleDateString("en-US", {
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
        <section className="focus-profile-card" aria-label="Edit athlete profile">
          <div
            className="focus-portrait"
            role="button"
            tabIndex={0}
            title={state.avatarUrl ? "Change photo" : "Upload photo"}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            {state.avatarUrl ? (
              <img
                src={state.avatarUrl}
                alt={name || state.name}
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
            <div className="focus-avatar-actions" style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="fb-btn-ghost focus-avatar-btn"
                disabled={avatarBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarBusy
                  ? "Uploading…"
                  : state.avatarUrl
                    ? "Change photo"
                    : "Upload photo"}
              </button>
              {state.avatarUrl && (
                <button
                  type="button"
                  className="fb-btn-ghost focus-avatar-btn is-danger"
                  disabled={avatarBusy}
                  onClick={onRemovePhoto}
                >
                  Remove photo
                </button>
              )}
            </div>
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
          <div
            className="focus-portrait"
            role="button"
            tabIndex={0}
            title={state.avatarUrl ? "Change photo" : "Upload photo"}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
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
          <div className="focus-profile-card-copy" style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <p className="fb-kicker">{state.city || "Your location"}</p>
                <h1>{state.name}</h1>
              </div>
              <button
                type="button"
                className="fb-btn-ghost"
                style={{ fontSize: 12, padding: "4px 10px" }}
                onClick={() => {
                  setName(state.name);
                  setCity(state.city);
                  setEditing(true);
                }}
              >
                Edit profile
              </button>
            </div>
            {email ? (
              <p className="focus-profile-email">
                {email}
                {demoMode ? " · demo" : ""}
              </p>
            ) : null}
            <div className="focus-avatar-actions">
              <button
                type="button"
                className="fb-btn-ghost focus-avatar-btn"
                disabled={avatarBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarBusy
                  ? "Uploading…"
                  : state.avatarUrl
                    ? "Change photo"
                    : "Upload photo"}
              </button>
              {state.avatarUrl && (
                <button
                  type="button"
                  className="fb-btn-ghost focus-avatar-btn is-danger"
                  disabled={avatarBusy}
                  onClick={onRemovePhoto}
                >
                  Remove
                </button>
              )}
            </div>
            {avatarError && (
              <p className="fb-error" style={{ fontSize: 11, marginTop: 4 }}>
                {avatarError}
              </p>
            )}
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
            aria-label="Effort Score Track"
          >
            <button
              type="button"
              aria-pressed={track === "open"}
              onClick={() => setTrack("open")}
            >
              Open Effort Score
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
        </div>

        <svg
          viewBox="0 0 340 150"
          className="focus-trend"
          role="img"
          aria-label={`30-day ${track === "open" ? "Open" : "GPS verified"} effort score history ending at ${currentElo}`}
        >
          <defs>
            <linearGradient id="focus-trend-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4ee89" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#d4ee89" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines & Y-axis numbers */}
          <text
            x="36"
            y={yTop}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#768172"
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
            stroke="#e4ebd9"
            strokeDasharray="3 3"
          />

          <text
            x="36"
            y={yMidPos}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#768172"
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
            stroke="#e4ebd9"
            strokeDasharray="3 3"
          />

          <text
            x="36"
            y={yBottom}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#768172"
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
          <polygon points={areaPoints} fill="url(#focus-trend-grad)" />
          <polyline
            points={linePoints}
            stroke="#26382d"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />

          {/* Live pulsing dot at current day */}
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="7"
            fill="none"
            stroke="#2f6f4e"
            strokeWidth="2"
            className="focus-trend-pulse"
          />
          <circle cx={lastPoint.x} cy={lastPoint.y} r="3.5" fill="#26382d" />

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
            fill="#768172"
            fontSize="10"
            fontFamily="inherit"
          >
            {startDateLabel}
          </text>
          <text
            x={xMid}
            y="136"
            textAnchor="middle"
            fill="#768172"
            fontSize="10"
            fontFamily="inherit"
          >
            15d ago
          </text>
          <text
            x={xEnd}
            y="136"
            textAnchor="end"
            fill="#768172"
            fontSize="10"
            fontFamily="inherit"
          >
            Today ({todayDateLabel})
          </text>
        </svg>
      </section>
    </>
  );
}
