"use client";

import { useCompete } from "@/components/compete-context";
import { ActivitySplits } from "@/features/split/components/activity-splits";
import {
  ProductHeader,
  sourceFromLinks,
} from "@/features/split/components/product-header";
import { buildSplitBoard } from "@/features/split/model";
import {
  yourBenchmarkSeconds,
  formatClockTime,
  BENCHMARKS,
  sportById,
  type ScoreTrack,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function SplitsPage() {
  const { state } = useCompete();
  const [track, setTrack] = useState<ScoreTrack>("open");
  const now = useMemo(() => new Date(), []);

  if (!state) return <p className="fb-copy">Loading splits…</p>;

  const sport = state.primary;
  const spec = sportById(sport);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";
  const board = buildSplitBoard(state, sport, shownTrack, now);
  const source = sourceFromLinks(state.links);
  const benchmark =
    sport === "running" || sport === "cycling"
      ? BENCHMARKS[sport][0]
      : null;
  const estimate = benchmark
    ? yourBenchmarkSeconds(state, sport, benchmark.meters)
    : null;

  return (
    <>
      <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />

      <div className="sp-title-block">
        <p className="fb-kicker">
          {board.periodLabel} / {spec.name}
        </p>
        <h1>
          YOUR
          <br />
          <span>SPLITS.</span>
        </h1>
        <p className="fb-copy">
          The work behind the line. Each counted session is a numbered split for
          this week.
        </p>
      </div>

      {spec.gps ? (
        <div className="fb-chips">
          {(
            [
              ["open", "All efforts"],
              ["verified", "Verified only"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={shownTrack === id ? "fb-chip on" : "fb-chip"}
              onClick={() => setTrack(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <ActivitySplits activities={board.weekActivities} sport={sport} />

      {benchmark && estimate != null ? (
        <section className="fb-card">
          <p className="fb-kicker">Separate from weekly effort</p>
          <h2>
            Estimated {benchmark.label}: {formatClockTime(estimate)}
          </h2>
          <p className="fb-copy">
            Absolute pace lives on its own board. It does not move Elo or this
            week’s effort track.
          </p>
          <Link href="/pace" className="fb-btn-line">
            Open pace board ↗
          </Link>
        </section>
      ) : (
        <section className="fb-card">
          <h2>Pace board</h2>
          <p className="fb-copy">
            Absolute times stay separate from weekly effort. Open pace when you
            want completion speed, not volume.
          </p>
          <Link href="/pace" className="fb-btn-line">
            Open pace board ↗
          </Link>
        </section>
      )}

      <Link href="/you#connections" className="fb-btn-ghost">
        {source.label} · manage source ↗
      </Link>
    </>
  );
}
