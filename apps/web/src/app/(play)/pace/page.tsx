"use client";
import { AppParagraph, AppText, AppHeading } from "@/ui/section";


import { useCompete } from "@/components/compete-context";
import {
  BENCHMARKS,
  formatClockTime,
  paceBoard,
  rankForElo,
  type Benchmark,
  type PaceScope,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useState } from "react";

export default function PacePage() {
  const { state } = useCompete();
  const [sport, setSport] = useState<"running" | "cycling">("running");
  const [scope, setScope] = useState<PaceScope>("global");
  const [benchmark, setBenchmark] = useState<Benchmark>(BENCHMARKS.running[0]!);
  if (!state) return <AppParagraph typographyRole="body" className="fb-copy">Loading pace…</AppParagraph>;

  const options = BENCHMARKS[sport];
  const selected = options.find((item) => item.id === benchmark.id) ?? options[0]!;
  const rows = paceBoard(state, sport, selected, scope);
  const you = rows.find((row) => row.you);
  const mine = state.ratings.find((item) => item.sport === sport);
  const yourElo = mine?.openElo ?? 0;
  const currentRank = rankForElo(yourElo).name;

  return (
    <>
      <AppParagraph typographyRole="badgeLabel" className="fb-kicker">Pace</AppParagraph>
      <AppHeading level={1} role="pageTitle">Times</AppHeading>
      <AppParagraph typographyRole="body" className="fb-copy">
        Completion time for a distance. It does not move your effort score or the weekly track.
      </AppParagraph>

      <div className="fb-chips">
        {(["running", "cycling"] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={sport === id ? "fb-chip on" : "fb-chip"}
            onClick={() => {
              setSport(id);
              setBenchmark(BENCHMARKS[id][0]!);
            }}
          >
            {id === "running" ? "Running" : "Cycling"}
          </button>
        ))}
      </div>
      <div className="fb-chips">
        {options.map((item) => (
          <button
            key={item.id}
            type="button"
            className={selected.id === item.id ? "fb-chip on" : "fb-chip"}
            onClick={() => setBenchmark(item)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="fb-chips">
        {(
          [
            ["global", "Global"],
            ["local", `Local (${state.city})`],
            ["category", `Category (${currentRank})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={scope === id ? "fb-chip on" : "fb-chip"}
            onClick={() => setScope(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {scope === "category" ? (
        <AppParagraph typographyRole="caption" className="fb-note" style={{ margin: "4px 0 12px" }}>
          Showing athletes in your {currentRank} rating tier (effort score {yourElo}).
        </AppParagraph>
      ) : null}

      <section className="fb-card">
        {rows.length === 0 ? (
          <AppParagraph typographyRole="body" className="fb-copy">No one in this slice yet.</AppParagraph>
        ) : (
          rows.slice(0, 20).map((row) => (
            <div key={row.id} className={row.you ? "fb-row fb-you" : "fb-row"}>
              <span className="fb-place">{row.place}</span>
              <span className="fb-grow">
                {row.name}
                <AppText as="small" role="supporting" secondary>{row.city}</AppText>
              </span>
              <b>{formatClockTime(row.seconds)}</b>
            </div>
          ))
        )}
        {!you ? (
          <AppParagraph typographyRole="caption" className="fb-note">
            You are not on this list until a synced effort covers {selected.label}.
            Longer activities are scaled back to the distance.
          </AppParagraph>
        ) : null}
      </section>

      <AppParagraph typographyRole="caption" className="fb-note">
        Public race results, separate from your training pace, live on{" "}
        <Link href="/rankings">race rankings</Link>.
      </AppParagraph>
    </>
  );
}
