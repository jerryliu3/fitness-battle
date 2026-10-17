"use client";
import { useState } from "react";
import { useCompete } from "@/components/compete-context";
import {
  countsOnTrack,
  distanceUnitLabel,
  formatDistanceM,
  initialsFromName,
  rankForElo,
  type CompeteState,
} from "@fitness-battle/shared";

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

  const rating = state.ratings.find((r) => r.sport === state.primary);
  const openElo = rating?.openElo ?? 1000;
  const verifiedElo = rating?.verifiedElo ?? 1000;
  const currentElo = track === "open" ? openElo : verifiedElo;

  const season = seasonSummary(state);
  const unit = distanceUnitLabel(state.units);

  // 30-day fixed time-series Elo history
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 3600 * 1000);

  const history = state.periodResults
    .filter((r) => r.sport === state.primary && r.track === track)
    .slice()
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));

  // Build daily series for the last 30 days
  const dailyValues: number[] = [];
  for (let d = 29; d >= 0; d--) {
    const dayDate = new Date(today.getTime() - d * 24 * 3600 * 1000);
    const dayIso = dayDate.toISOString().slice(0, 10);
    // Find the latest settled result on or before this day
    const matching = history.filter((r) => r.periodStart.slice(0, 10) <= dayIso);
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
  const padding = Math.max(15, (maxVal - minVal) * 0.2);
  const yMin = minVal - padding;
  const yMax = maxVal + padding;

  const pts = dailyValues.map((v, i) => ({
    x: 16 + (i / 29) * 288,
    y: 100 - ((v - yMin) / (yMax - yMin)) * 75,
  }));
  const linePoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPoints = `${linePoints} 304,115 16,115`;
  const lastPoint = pts[pts.length - 1];

  const startDateLabel = thirtyDaysAgo.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const todayDateLabel = today.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <>
      {editing ? (
        <section className="focus-profile-card" aria-label="Edit athlete profile">
          <div className="focus-portrait">{initialsFromName(name || state.name)}</div>
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
          <div className="focus-portrait">{initialsFromName(state.name)}</div>
          <div className="focus-profile-card-copy" style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
        <div className="focus-row" style={{ alignItems: "center" }}>
          <div>
            <p className="fb-kicker">
              {rankForElo(currentElo).name} · {track === "open" ? "Open Elo" : "GPS Verified Elo"}
            </p>
            <strong>{currentElo.toLocaleString()}</strong>
          </div>
          <div className="focus-segments" role="group" aria-label="Elo Track">
            <button
              type="button"
              aria-pressed={track === "open"}
              onClick={() => setTrack("open")}
            >
              Open Elo
            </button>
            <button
              type="button"
              aria-pressed={track === "verified"}
              onClick={() => setTrack("verified")}
            >
              GPS verified
            </button>
          </div>
        </div>
        <svg
          viewBox="0 0 320 120"
          className="focus-trend"
          role="img"
          aria-label={`30-day ${track === "open" ? "Open" : "GPS verified"} Elo history ending at ${currentElo}`}
        >
          <defs>
            <linearGradient id="focus-trend-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4ee89" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#d4ee89" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M0 35H320M0 75H320M0 115H320" stroke="#e0e5dd" />
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
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span className="fb-note">{startDateLabel}</span>
          <span className="fb-note">Today ({todayDateLabel})</span>
        </div>
      </section>
    </>
  );
}
