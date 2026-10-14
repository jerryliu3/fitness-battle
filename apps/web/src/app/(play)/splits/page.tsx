"use client";

import { useCompete } from "@/components/compete-context";
import { ActivityRing } from "@/features/rally/activity-ring";
import {
  ActivityReceipt,
  RallyDetailDialog,
} from "@/features/rally/detail-dialog";
import { type RallyMove } from "@/features/rally/model";
import { useRallyPresentation } from "@/features/rally/use-rally-week";
import { ActivitySplits } from "@/features/split/components/activity-splits";
import {
  ProductHeader,
  sourceFromLinks,
} from "@/features/split/components/product-header";
import { buildSplitBoard } from "@/features/split/model";
import { useTheme } from "@/theme/theme-provider";
import {
  yourBenchmarkSeconds,
  formatClockTime,
  BENCHMARKS,
  competeNow,
  sportById,
  type ScoreTrack,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useState, type ReactNode } from "react";

export default function SplitsPage() {
  const { state } = useCompete();
  const { theme } = useTheme();
  const [track, setTrack] = useState<ScoreTrack>("open");
  const [detail, setDetail] = useState<{
    title: string;
    body: ReactNode;
    kind: "activity" | "info";
  } | null>(null);

  const sport = state?.primary ?? "running";
  const spec = sportById(sport);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";
  const rallyWeek = useRallyPresentation(
    state,
    sport,
    shownTrack,
    theme.id === "rally",
  );

  if (!state) return <p className="fb-copy">Loading splits…</p>;

  const now = competeNow(state);
  const board = buildSplitBoard(state, sport, shownTrack, now);
  const source = sourceFromLinks(state.links);
  const benchmark =
    sport === "running" || sport === "cycling" ? BENCHMARKS[sport][0] : null;
  const estimate = benchmark
    ? yourBenchmarkSeconds(state, sport, benchmark.meters)
    : null;

  function openMove(move: RallyMove) {
    if (!rallyWeek) return;
    const at = rallyWeek.receiptFor(move);
    setDetail({
      title: move.title,
      kind: "activity",
      body: (
        <ActivityReceipt
          move={move}
          at={at}
          reference={rallyWeek.reference}
          unit={rallyWeek.rally.unit}
        />
      ),
    });
  }

  return (
    <>
      <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />

      <div className="sp-title-block">
        <p className="fb-kicker">
          {board.periodLabel} / {spec.name}
        </p>
        <h1>
          {theme.id === "rally" ? (
            <>
              YOUR
              <br />
              <span>MOVES.</span>
            </>
          ) : (
            <>
              YOUR
              <br />
              <span>SPLITS.</span>
            </>
          )}
        </h1>
        <p className="fb-copy">
          The work behind the line. Each counted session is a numbered split for
          this week
          {theme.id === "rally" ? ", with optional activity rings above" : ""}.
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

      {theme.id === "rally" &&
      rallyWeek &&
      rallyWeek.rally.moves.length > 0 ? (
        <div className="rf-addon">
          <div className="rf-moves-grid">
            {rallyWeek.rally.moves.map((move) => (
              <ActivityRing
                key={move.id}
                move={move}
                unit={rallyWeek.rally.unit}
                onOpen={() => openMove(move)}
              />
            ))}
          </div>
          <p className="rf-ring-caption">
            Rings use a shared 10 km distance scale. The numbered splits below
            stay the source of truth for effort.
          </p>
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

      <RallyDetailDialog detail={detail} onClose={() => setDetail(null)} />
    </>
  );
}
