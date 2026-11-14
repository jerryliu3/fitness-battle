"use client";
import { AthleteCrest } from "@/features/athlete-card/athlete-crest";
import { EffortTrend } from "@/features/progress/effort-trend";
import { AppParagraph, AppText, SectionHeader, typographyStyle } from "@/ui/section";
import { ProfilePhoto } from "@/features/you/profile-photo";
import { useCompete } from "@/components/compete-context";
import {
  athleteCardHighlightCatalog,
  ATHLETE_CARD_HIGHLIGHT_LIMIT,
  athleteCardModel,
  clubLifetimeTotals,
  defaultAthleteCardHighlightIds,
  distanceUnitLabel,
  formatDistanceM,
  type CompeteState,
} from "@fitness-battle/shared";
import { useEffect, useState } from "react";

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
  const [cardHighlights, setCardHighlights] = useState<string[] | undefined>(state.cardHighlights);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!openProfileEdit) return;
    setName(state.name);
    setCity(state.city);
    setCardHighlights(state.cardHighlights);
    setEditing(true);
  }, [openProfileEdit, state.name, state.city, state.cardHighlights]);

  const season = clubLifetimeTotals(state);
  const unit = distanceUnitLabel(state.units);
  const highlightCatalog = athleteCardHighlightCatalog(state);
  const activeHighlightIds = cardHighlights ?? defaultAthleteCardHighlightIds(state);

  function toggleHighlight(id: string) {
    setCardHighlights((prev) => {
      const current = prev ?? activeHighlightIds;
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= ATHLETE_CARD_HIGHLIGHT_LIMIT) return current;
      return [...current, id];
    });
  }

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
            <div style={{ marginBottom: 12 }}>
              <div className="fb-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                <AppText role="field">Card highlights ({activeHighlightIds.length}/{ATHLETE_CARD_HIGHLIGHT_LIMIT})</AppText>
                {cardHighlights !== undefined ? (
                  <button
                    type="button"
                    className="fb-btn-line"
                    style={{ padding: "2px 8px", fontSize: 12 }}
                    onClick={() => setCardHighlights(undefined)}
                  >
                    Reset to PBs
                  </button>
                ) : null}
              </div>
              <div className="fb-row" style={{ flexWrap: "wrap", gap: 6 }}>
                {highlightCatalog.map((item) => {
                  const selected = activeHighlightIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={selected ? "fb-btn" : "fb-btn-line"}
                      style={{ ...typographyStyle("caption"), padding: "4px 10px" }}
                      onClick={() => toggleHighlight(item.id)}
                    >
                      {item.label}: {item.value}
                    </button>
                  );
                })}
              </div>
            </div>
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
                  dispatch({ type: "set-card-highlights", cardHighlights });
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
                  setCardHighlights(state.cardHighlights);
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
        <>
          <AthleteCrest key={email ?? "guest"} model={athleteCardModel(state)} />
          <button type="button" className="fb-btn-line" onClick={() => {
            if (onEditProfile) onEditProfile();
            else { setName(state.name); setCity(state.city); setCardHighlights(state.cardHighlights); setEditing(true); }
          }}>Edit profile</button>
        </>
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

      {showProgress ? <EffortTrend state={state} email={email} /> : null}
    </>
  );
}
