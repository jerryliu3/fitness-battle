"use client";
import { currentEffortMilestone, formatVolume } from "@fitness-battle/shared";
import { playCue } from "@/lib/haptics";
import { useScoreTrackLens } from "@/lib/score-track-lens";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import {
  removeWebProfileAvatar,
  uploadWebProfileAvatar,
} from "@/lib/profile/avatar-upload";
import { createClient } from "@/lib/supabase/client";
import {
  countsOnTrack,
  distanceUnitLabel,
  effortHistory,
  ELO_UNRANKED,
  formatDistanceM,
  PERSON_ICON_PATH,
  rankForElo,
  type CompeteState,
} from "@fitness-battle/shared";
import { useEffect, useRef, useState } from "react";

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
  openProfileEdit = false,
  sections = "profile",
}: {
  state: CompeteState;
  email?: string | null;
  demoMode?: boolean;
  openProfileEdit?: boolean;
  /** Profile card on Athlete; lifetime totals + effort chart on Progress. */
  sections?: "profile" | "progress";
}) {
  const { user } = useAuth();
  const { dispatch } = useCompete();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.name);
  const [city, setCity] = useState(state.city);
  const [track, setTrack] = useScoreTrackLens();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
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
      {showProfile ? (
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={onAvatarChosen}
      />
      ) : null}

      {showProfile && editing ? (
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
              <svg
                width="54"
                height="54"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--muted)", pointerEvents: "none" }}
                aria-hidden="true"
              >
                <path d={PERSON_ICON_PATH} />
              </svg>
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
              <div
                className="focus-avatar-actions"
                style={{ marginBottom: 12 }}
              >
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
          <div
            className="focus-portrait"
            role="button"
            tabIndex={avatarBusy ? -1 : 0}
            aria-label={state.avatarUrl ? "Change photo" : "Upload photo"}
            onClick={() => {
              if (avatarBusy) return;
              setName(state.name);
              setCity(state.city);
              setEditing(true);
              fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if (avatarBusy) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setName(state.name);
                setCity(state.city);
                setEditing(true);
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
              <svg
                width="54"
                height="54"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--muted)", pointerEvents: "none" }}
                aria-hidden="true"
              >
                <path d={PERSON_ICON_PATH} />
              </svg>
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
          <div
            className="focus-elo-track-toggle"
            role="group"
            aria-label="Effort score track"
          >
            <button
              type="button"
              aria-pressed={track === "open"}
              onClick={() => {
                if (track !== "open") void playCue("selection");
                setTrack("open");
              }}
            >
              Open
            </button>
            <button
              type="button"
              aria-pressed={track === "verified"}
              onClick={() => {
                if (track !== "verified") void playCue("selection");
                setTrack("verified");
              }}
            >
              GPS verified
            </button>
          </div>
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
          aria-label={`30-day ${track === "open" ? "Open" : "GPS verified"} effort score history ending at ${effectiveElo}`}
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
