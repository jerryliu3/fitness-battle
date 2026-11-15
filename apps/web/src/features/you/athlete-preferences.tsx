"use client";
import {
  APP_ICON_PATHS,
  competeNow,
  SPORT_ICON_PATHS,
  SPORTS,
  type Action,
  type CompeteState,
  type SportId,
} from "@fitness-battle/shared";
import { AppearanceControl } from "@/theme/appearance-provider";
import { AppParagraph, SectionHeader } from "@/ui/section";
import { TimezoneCombobox } from "@/ui/timezone-combobox";

export function AthletePreferencesFields({
  state,
  dispatch,
  requireAuth = (_reason, action) => action(),
}: {
  state: CompeteState;
  dispatch: (action: Action) => void;
  requireAuth?: (reason: string, action: () => void) => void;
}) {
  const nowMs = competeNow(state).getTime();

  return (
    <section className="fb-card club-preferences">
      <AppearanceControl />
      <div className="club-preference-row">
        <strong>Units</strong>
        <div className="focus-segments" role="group" aria-label="Unit system">
          {(["us", "metric"] as const).map((units) => (
            <button
              key={units}
              type="button"
              aria-pressed={state.units === units}
              onClick={() => dispatch({ type: "set-units", units })}
            >
              {units === "us" ? "Imperial" : "Metric"}
            </button>
          ))}
        </div>
      </div>
      <TimezoneCombobox
        value={state.timezone}
        onChange={(timezone) => dispatch({ type: "set-timezone", timezone })}
      />
      <label className="club-preference-row">
        <strong>Primary sport</strong>
        <select
          className="fb-input"
          value={state.primary}
          onChange={(event) => dispatch({ type: "set-primary", sport: event.target.value as SportId })}
        >
          {SPORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <SectionHeader title="Active Sports (auto-registration)" />
      <AppParagraph typographyRole="caption" className="fb-note">
        Turn on to auto-register for the event every week. Turning off will not remove you from any active events.
      </AppParagraph>
      {SPORTS.map((sport) => {
        const enrollment = state.enrollments.find((e) => e.sport === sport.id);
        const registered = Boolean(state.ratings.find((r) => r.sport === sport.id)?.optedIn);
        const queued = Boolean(enrollment && Date.parse(enrollment.waveStart) > nowMs);
        const active = registered && (queued || enrollment?.autoEnrollNext !== false);
        return (
          <div key={sport.id} className="club-preference-row">
            <strong className="club-sport-label">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={SPORT_ICON_PATHS[sport.id]} fill="currentColor" stroke="none" />
              </svg>
              {sport.name}
            </strong>
            <button
              type="button"
              role="switch"
              aria-label={`Toggle ${sport.name} active status`}
              aria-checked={active}
              className={active ? "fb-switch on" : "fb-switch"}
              onClick={() =>
                requireAuth(`Sign in to activate ${sport.name}.`, () =>
                  dispatch(
                    active
                      ? { type: queued ? "opt-out" : "schedule-leave", sport: sport.id }
                      : registered
                        ? { type: "resume-renewal", sport: sport.id }
                        : { type: "opt-in", sport: sport.id, crewBoard: null },
                  ),
                )
              }
            >
              <span className="fb-switch-knob" />
            </button>
          </div>
        );
      })}
      {(() => {
        const sleepRating = state.healthRatings.find((r) => r.metric === "sleep");
        const queued = Boolean(sleepRating && Date.parse(sleepRating.lockPeriod) > nowMs);
        const registered = Boolean(sleepRating?.optedIn);
        const active = registered && (queued || sleepRating?.autoEnrollNext !== false);
        return (
          <div className="club-preference-row">
            <strong className="club-sport-label">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d={APP_ICON_PATHS.sleep} fill="currentColor" />
              </svg>
              Recovery / Sleep
            </strong>
            <button
              type="button"
              role="switch"
              aria-label="Toggle Recovery / Sleep active status"
              aria-checked={active}
              className={active ? "fb-switch on" : "fb-switch"}
              onClick={() =>
                requireAuth("Sign in to activate Recovery / Sleep.", () =>
                  dispatch(
                    active
                      ? { type: queued ? "opt-out-health" : "schedule-leave", metric: "sleep" }
                      : registered
                        ? { type: "resume-renewal", metric: "sleep" }
                        : { type: "opt-in-health", metric: "sleep" },
                  ),
                )
              }
            >
              <span className="fb-switch-knob" />
            </button>
          </div>
        );
      })()}
    </section>
  );
}
