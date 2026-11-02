"use client";
import { EffortTrend } from "@/features/progress/effort-trend";
import { AppParagraph, AppText, SectionHeader, typographyStyle, AppHeading } from "@/ui/section";

import { clubLifetimeTotals } from "@fitness-battle/shared";
import { ProfilePhoto } from "@/features/you/profile-photo";

import { useCompete } from "@/components/compete-context";

import {
  distanceUnitLabel,
  formatDistanceM,
  rankForElo,
  sportById,
  personalRecordHistory,
  RECORD_DISTANCES,
  formatClockTime,
  competeNow,
  type CompeteState,
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
  const { dispatch } = useCompete();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.name);
  const [city, setCity] = useState(state.city);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!openProfileEdit) return;
    setName(state.name);
    setCity(state.city);
    setEditing(true);
  }, [openProfileEdit, state.name, state.city]);

  const season = clubLifetimeTotals(state);
  const unit = distanceUnitLabel(state.units);

  const showProfile = sections === "profile";
  const showProgress = sections === "progress";

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

      {showProgress ? <EffortTrend state={state} email={email} /> : null}

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
    </>
  );
}
