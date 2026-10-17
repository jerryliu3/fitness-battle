"use client";
import Link from "next/link";
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
  const rating = state.ratings.find((r) => r.sport === state.primary);
  const elo = rating?.openElo ?? 1000;
  const season = seasonSummary(state);
  const unit = distanceUnitLabel(state.units);
  const history = state.periodResults
    .filter((r) => r.sport === state.primary && r.track === "open")
    .slice()
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const values = history.map((r) => r.eloAfter);
  if (!values.length || values.at(-1) !== elo) values.push(elo);
  const low = Math.min(...values) - 20,
    high = Math.max(...values) + 20;
  const points = values
    .map(
      (v, i) =>
        `${values.length === 1 ? 160 : (i / (values.length - 1)) * 320},${100 - ((v - low) / (high - low)) * 80}`,
    )
    .join(" ");
  return (
    <>
      <section className="focus-profile-card" aria-label="Athlete profile">
        <div className="focus-portrait">{initialsFromName(state.name)}</div>
        <div className="focus-profile-card-copy">
          <p className="fb-kicker">Athlete · {state.city || "Your own pace"}</p>
          <h1>{state.name}</h1>
          {email ? (
            <p className="focus-profile-email">
              {email}
              {demoMode ? " · demo" : ""}
            </p>
          ) : null}
          <p className="fb-copy">Your own kind of progress.</p>
        </div>
      </section>
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
        <div className="focus-row">
          <div>
            <p className="fb-kicker">{rankForElo(elo).name} · Open Elo</p>
            <strong>{elo.toLocaleString()}</strong>
          </div>
          <span className="focus-status">
            {rating?.verifiedElo ?? 1000}
            <small>GPS-verified Elo</small>
          </span>
        </div>
        <svg
          viewBox="0 0 320 120"
          className="focus-trend"
          role="img"
          aria-label={
            history.length
              ? "Your settled weekly Elo history"
              : "No settled weeks yet; current Elo shown"
          }
        >
          <path d="M0 35H320M0 75H320M0 115H320" stroke="#e0e5dd" />
          <polyline
            points={points}
            stroke="#26382d"
            strokeWidth="3"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <p className="fb-note">
          {history.length
            ? `${history.length} settled weeks · ${history[0]?.eloBefore} → ${elo}`
            : "Your history starts with your first completed week."}
        </p>
      </section>
      <Link href="/pace" className="focus-benchmark">
        <span aria-hidden="true">→</span>
        <div>
          <b>Your benchmarks</b>
          <small>Training pace & all-time race rankings</small>
        </div>
        <span aria-hidden="true">→</span>
      </Link>
    </>
  );
}
