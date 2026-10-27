"use client";
import { ChartSvg, ChartText } from "@/ui/chart-text";
import { AppParagraph, AppText, SectionHeader, typographyStyle, AppHeading } from "@/ui/section";

import { clubLifetimeTotals } from "@fitness-battle/shared";
import { ProfilePhoto } from "@/features/you/profile-photo";
import { currentEffortMilestone, formatVolume } from "@fitness-battle/shared";

import { useScoreTrackLens } from "@/lib/score-track-lens";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";

import {
  distanceUnitLabel,
  effortHistory,
  ELO_UNRANKED,
  formatDistanceM,
  formatEffortScore,
  rankForElo,
  sportById,
  personalRecordHistory,
  RECORD_DISTANCES,
  formatClockTime,
  competeNow,
  type CompeteState,
  type ScoreTrack,
} from "@fitness-battle/shared";
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
  onEditProfile,
}: {
  state: CompeteState;
  email?: string | null;
  offlineMode?: boolean;
  openProfileEdit?: boolean;
  /** Profile card on Athlete; lifetime totals + effort chart on Progress. */
  sections?: "profile" | "progress";
  onEditProfile?: () => void;
}) {
  const { user } = useAuth();
  const { dispatch } = useCompete();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.name);
  const [city, setCity] = useState(state.city);
  const [defaultTrack] = useScoreTrackLens();
  const scope = `${user?.id}:${state.primary}`;
  const [lens, setLens] = useState<{ scope: string; track: ScoreTrack } | null>(null);
  const track = lens?.scope === scope ? lens.track : defaultTrack;

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
              <AppText role="field">Display name</AppText>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={32}
              />
            </label>
            <label className="fb-field" style={{ marginBottom: 12 }}>
              <AppText role="field">Location / City</AppText>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City, Region"
                maxLength={48}
              />
            </label>
            {profileError ? (
              <AppParagraph typographyRole="body" className="fb-error" role="alert" style={{ ...typographyStyle("body"), marginBottom: 8 }}>
                {profileError}
              </AppParagraph>
            ) : null}
            <div className="fb-row" style={{ gap: 8 }}>
              <button
                type="button"
                className="fb-btn"
                style={{ ...typographyStyle("label"), padding: "6px 14px" }}
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
                style={{ ...typographyStyle("label"), padding: "6px 14px" }}
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
        <section
          className="focus-profile-card"
          aria-label="Athlete profile"
          style={{
            background: "var(--ink, #00101b)",
            color: "var(--paper, #f7f9f5)",
            border: "1px solid var(--line, #24384a)",
            borderRadius: "24px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", width: "100%" }}>
            <ProfilePhoto state={state} email={email} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <AppHeading level={1} role="display" style={{ color: "#ffffff", margin: 0 }}>
                  {state.name}
                </AppHeading>
                <AppText role="caption" secondary style={{ color: "#8fa2b5", whiteSpace: "nowrap" }}>Since Jan 2026</AppText>
              </div>
              {state.city ? (
                <AppText role="caption" secondary style={{ color: "#c9d6e3" }}>{state.city}</AppText>
              ) : null}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                {(() => {
                  const primaryRating = state.ratings.find((r) => r.sport === state.primary);
                  const elo = primaryRating?.openElo || 1000;
                  const rank = rankForElo(elo);
                  return (
                    <div style={{ color: "var(--tennis, #ccff00)", ...typographyStyle("label") }}>
                      {sportById(state.primary).name} · Open Effort Score {elo} · {rank.name}
                    </div>
                  );
                })()}
                <button
                  type="button"
                  className="fb-pill"
                  aria-label="Edit profile"
                  style={{
                    cursor: "pointer",
                    padding: "6px 14px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    ...typographyStyle("label"),
                  }}
                  onClick={() => {
                    if (onEditProfile) {
                      onEditProfile();
                    } else {
                      setName(state.name);
                      setCity(state.city);
                      setEditing(true);
                    }
                  }}
                >
                  Edit profile
                </button>
              </div>
            </div>
          </div>

          {(() => {
            const records = personalRecordHistory(state, competeNow(state));
            const topRecords = records.slice(0, 3);
            if (topRecords.length === 0) return null;
            return (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${topRecords.length}, 1fr)`,
                  gap: "8px",
                  paddingTop: "14px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.15)",
                  width: "100%",
                  textAlign: "center",
                }}
              >
                {topRecords.map((r) => {
                  const label =
                    RECORD_DISTANCES[r.sport]?.find((d) => d.id === r.distanceId)?.label ??
                    r.distanceId;
                  return (
                    <div key={r.activityId} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span
                        style={{
                          color: "#c9d6e3",
                          ...typographyStyle("caption"),
                        }}
                      >
                        {label}
                      </span>
                      <strong style={{ color: "#ffffff", ...typographyStyle("heading") }}>
                        {formatClockTime(r.seconds)}
                      </strong>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>
      ) : null}

      {showProgress ? (
      <section className="focus-season-strip" aria-label="Lifetime totals">
        <SectionHeader title="Lifetime totals"/>
        <div className="focus-season-stats">
          <div>
            <AppText role="metric">{formatDistanceM(season.meters, state.units)}</AppText>
            <AppText role="caption" secondary>{unit} total</AppText>
          </div>
          <div>
            <AppText role="metric">{season.sessions}</AppText>
            <AppText role="caption" secondary>sessions</AppText>
          </div>
          <div>
            <AppText role="metric">{season.weeks}</AppText>
            <AppText role="caption" secondary>settled weeks</AppText>
          </div>
          <div>
            <AppText role="metric">{state.lifetimeOvertakes}</AppText>
            <AppText role="caption" secondary>overtakes</AppText>
          </div>
        </div>
      </section>
      ) : null}

      {showProgress ? (
      <section className="focus-card focus-elo" id="effort-score">
        <div className="focus-elo-track-toggle" role="group" aria-label="Effort chart score track">{(["open", "verified"] as const).map(value => <button key={value} type="button" aria-pressed={track === value} onClick={() => setLens({ scope, track: value })}>{value === "open" ? "Open" : "GPS Tracked"}</button>)}</div>
        <div className="focus-elo-top">

          <span className="focus-elo-rank-pill">
            {rankForElo(effectiveElo).name}
          </span>
        </div>

        <div className="focus-elo-score-row">
          <AppText role="metric" className="ui-score-value">{formatEffortScore(effectiveElo)}</AppText>
          <AppText role="body" secondary>Effort score</AppText>
        </div>

        {milestone ? <AppParagraph typographyRole="body" className="fb-copy">+1 per {formatVolume(state.primary, state.primary === "strength" ? 0 : milestone.step, state.primary === "strength" ? milestone.step : 0, state.units)} this week · +{milestone.earned} from activity</AppParagraph> : null}
        <ChartSvg
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
          <ChartText
            x="36"
            y={yTop}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#616c63"

          >
            {yMax}
          </ChartText>
          <line
            x1={xStart}
            y1={yTop}
            x2={xEnd}
            y2={yTop}
            stroke="#e0e5dc"
            strokeDasharray="3 3"
          />

          <ChartText
            x="36"
            y={yMidPos}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#616c63"

          >
            {yMid}
          </ChartText>
          <line
            x1={xStart}
            y1={yMidPos}
            x2={xEnd}
            y2={yMidPos}
            stroke="#e0e5dc"
            strokeDasharray="3 3"
          />

          <ChartText
            x="36"
            y={yBottom}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#616c63"

          >
            {yMin}
          </ChartText>
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
          <ChartText
            x={xStart}
            y="136"
            textAnchor="start"
            fill="#616c63"

          >
            {startDateLabel}
          </ChartText>
          <ChartText
            minChartWidth={260}
            x={xMid}
            y="136"
            textAnchor="middle"
            fill="#616c63"

          >
            {midDateLabel}
          </ChartText>
          <ChartText
            x={xEnd}
            y="136"
            textAnchor="end"
            fill="#616c63"

          >
            {endDateLabel}
          </ChartText>
        </ChartSvg>
      </section>
      ) : null}
    </>
  );
}
