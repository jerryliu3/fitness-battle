"use client";
import Link from "next/link";
import {
  initialsFromName,
  rankForElo,
  type CompeteState,
} from "@fitness-battle/shared";
export function AthleteOverview({ state }: { state: CompeteState }) {
  const rating = state.ratings.find((r) => r.sport === state.primary);
  const elo = rating?.openElo ?? 1000;
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
      <header className="focus-profile">
        <div className="focus-portrait">{initialsFromName(state.name)}</div>
        <p className="fb-kicker">Athlete · {state.city || "Your own pace"}</p>
        <h1>{state.name}</h1>
        <p className="fb-copy">Your own kind of progress.</p>
      </header>
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
        <span>↗</span>
        <div>
          <b>Your benchmarks</b>
          <small>Training pace & all-time race rankings</small>
        </div>
        <span>→</span>
      </Link>
    </>
  );
}
