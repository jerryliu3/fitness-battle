"use client";
import { clubLifetimeTotals } from "@fitness-battle/shared";
import { ProfilePhoto } from "@/features/you/profile-photo";
import { currentEffortMilestone, formatVolume } from "@fitness-battle/shared";

import { useScoreTrackLens } from "@/lib/score-track-lens";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";

import { distanceUnitLabel, effortHistory, ELO_UNRANKED, formatDistanceM, rankForElo, type CompeteState } from "@fitness-battle/shared";
import { useEffect, useState } from "react";

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
  offlineMode,
  openProfileEdit = false,
  sections = "profile",
}: {
  state: CompeteState;
  email?: string | null;
  offlineMode?: boolean;
  openProfileEdit?: boolean;
  /** Profile card on Athlete; lifetime totals + effort chart on Progress. */
  sections?: "profile" | "progress";
}) {
  const { user } = useAuth();
  const { dispatch } = useCompete();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.name);
  const [city, setCity] = useState(state.city);
  const [track] = useScoreTrackLens();

  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!openProfileEdit) return;
    setName(state.name);
    setCity(state.city);
    setEditing(true);
  }, [openProfileEdit, state.name, state.city]);

  const rating = state.ratings.find((r) => r.sport === state.primary);
  const openElo =
    rating?.openElo && rating.openElo > 0 ? rating.openElo : ELO_UNRANKED;
  const verifiedElo =
    rating?.verifiedElo && rating.verifiedElo > 0
      ? rating.verifiedElo
      : ELO_UNRANKED;
  const currentElo = track === "open" ? openElo : verifiedElo;

  const season = clubLifetimeTotals(state);
  const unit = distanceUnitLabel(state.units);

  const milestone = currentEffortMilestone(state, state.primary, track);
  const showProfile = sections === "profile";
  const showProgress = sections === "progress";

  const effort = showProgress
    ? effortHistory(state, track, user, email)
    : null;
  const {
    effectiveElo,
    dailyValues,
    pts,
    lastPoint,
    linePoints,
    areaPoints,
    yMin,
    yMid,
    yMax,
    xStart,
    xMid,
    xEnd,
    yTop,
    yBottom,
    yMidPos,
    startDateLabel,
    midDateLabel,
    endDateLabel,
  } = effort ?? {
    effectiveElo: 0,
    dailyValues: [],
    pts: [],
    lastPoint: { x: 0, y: 0 },
    linePoints: "",
    areaPoints: "",
    yMin: 0,
    yMid: 0,
    yMax: 0,
    xStart: 0,
    xMid: 0,
    xEnd: 0,
    yTop: 0,
    yBottom: 0,
    yMidPos: 0,
    startDateLabel: "",
    midDateLabel: "",
    endDateLabel: "",
  };

  return (
    <>
      {showProfile && editing ? (
        <section
          className="focus-profile-card is-editing"
          aria-label="Edit athlete profile"
        >
          <ProfilePhoto state={state} email={email} />
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
            {profileError ? (
              <p className="fb-error" role="alert" style={{ fontSize: 11, marginBottom: 8 }}>
                {profileError}
              </p>
            ) : null}
            <div className="fb-row" style={{ gap: 8 }}>
              <button
                type="button"
                className="fb-btn"
                style={{ fontSize: 13, padding: "6px 14px" }}
                onClick={() => {
                  const trimmedName = name.trim();
                  if (!trimmedName) {
                    setProfileError("Display name cannot be empty.");
                    return;
                  }
                  setProfileError(null);
                  dispatch({ type: "rename", name: trimmedName });
                  dispatch({ type: "set-city", city: city.trim() });
                  setEditing(false);
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="fb-btn-line"
                style={{ fontSize: 13, padding: "6px 14px" }}
                onClick={() => {
                  setName(state.name);
                  setCity(state.city);
                  setProfileError(null);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : showProfile ? (
        <section className="focus-profile-card" aria-label="Athlete profile">
          <ProfilePhoto state={state} email={email} />
          <div className="focus-profile-card-copy">
            <div className="focus-profile-identity">
              <div className="focus-profile-identity-text">
                <p className="fb-kicker">{state.city || "Your location"}</p>
                <h1>{state.name}</h1>
                {email ? (
                  <p className="focus-profile-email">
                    {email}
                    {offlineMode ? " · demo" : ""}
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
      ) : null}

      {showProgress ? (
      <section className="focus-season-strip" aria-label="Lifetime totals">
        <p className="fb-kicker">Lifetime totals</p>
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
          <div>
            <strong>{state.lifetimeOvertakes}</strong>
            <span>overtakes</span>
          </div>
        </div>
      </section>
      ) : null}

      {showProgress ? (
      <section className="focus-card focus-elo" id="effort-score">
        <div className="focus-elo-top">

          <span className="focus-elo-rank-pill">
            {rankForElo(effectiveElo).name}
          </span>
        </div>

        <div className="focus-elo-score-row">
          <strong>{effectiveElo.toLocaleString()}</strong>
          <span className="focus-elo-score-label">effort score</span>
        </div>

        {milestone ? <p className="fb-copy">+1 per {formatVolume(state.primary, state.primary === "strength" ? 0 : milestone.step, state.primary === "strength" ? milestone.step : 0, state.units)} this week · +{milestone.earned} from activity</p> : null}
        <svg
          viewBox="0 0 340 150"
          className="focus-trend"
          role="img"
          aria-label={`30-day ${track === "open" ? "Open" : "GPS Tracked"} effort score history ending at ${effectiveElo}`}
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
              stroke="#f1c75b"
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
          <circle cx={lastPoint.x} cy={lastPoint.y} r="3.5" fill="#f1c75b" />

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
            {startDateLabel}
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
      ) : null}
    </>
  );
}
