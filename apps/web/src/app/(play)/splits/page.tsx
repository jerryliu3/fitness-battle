"use client";

import { useCompete } from "@/components/compete-context";
import { Ace } from "@/features/rally/ace";
import { ActivityRing } from "@/features/rally/activity-ring";
import {
  ActivityReceipt,
  RallyDetailDialog,
} from "@/features/rally/detail-dialog";
import { RallyHero } from "@/features/rally/hero";
import { buildRallyBoard, formatRallyValue, type RallyMove } from "@/features/rally/model";
import { useRallyWeek } from "@/features/rally/use-rally-week";
import {
  ProductHeader,
  sourceFromLinks,
} from "@/features/split/components/product-header";
import {
  yourBenchmarkSeconds,
  formatClockTime,
  BENCHMARKS,
  competeNow,
  sportById,
  type ScoreTrack,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

export default function MovesPage() {
  const { state } = useCompete();
  const [track, setTrack] = useState<ScoreTrack>("open");
  const [detail, setDetail] = useState<{
    title: string;
    body: ReactNode;
    kind: "activity" | "info";
  } | null>(null);

  const sport = state?.primary ?? "running";
  const spec = sportById(sport);
  const shownTrack: ScoreTrack = spec.gps ? track : "open";

  const rally = useMemo(() => {
    if (!state) return null;
    return buildRallyBoard(state, sport, shownTrack, competeNow(state));
  }, [state, sport, shownTrack]);
  const weekState = useRallyWeek(rally);

  if (!state || !rally || !weekState) {
    return <p className="fb-copy">Loading moves…</p>;
  }

  const source = sourceFromLinks(state.links);
  const benchmark =
    sport === "running" || sport === "cycling" ? BENCHMARKS[sport][0] : null;
  const estimate = benchmark
    ? yourBenchmarkSeconds(state, sport, benchmark.meters)
    : null;
  const totalLabel =
    rally.unit === "km"
      ? formatRallyValue(
          rally.moves.reduce((sum, move) => sum + move.km, 0),
          "km",
        )
      : formatRallyValue(weekState.week.total, "pts");

  function openMove(move: RallyMove) {
    const at = weekState!.receiptFor(move);
    setDetail({
      title: move.title,
      kind: "activity",
      body: (
        <ActivityReceipt
          move={move}
          at={at}
          reference={weekState!.reference}
          unit={rally!.unit}
        />
      ),
    });
  }

  return (
    <main>
      <ProductHeader sourceStatus={source.status} sourceLabel={source.label} />
      <div className="rf-demo-line">
        <span>
          {spec.name} · {rally.periodLabel}
        </span>
        <span>{source.label}</span>
      </div>

      <RallyHero
        kicker="YOUR COUNTED MOVEMENT"
        line1="THAT ONE"
        line2="COUNTED."
        copy="Every outing has a place in your week."
      />

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

      <section className="rf-moves-summary">
        <span className="rf-kicker">
          {rally.moves.length} IMPORT{rally.moves.length === 1 ? "" : "S"}. COUNTED
          ONCE.
        </span>
        <strong>
          {totalLabel}
          <small>
            {rally.unit}, together
          </small>
        </strong>
        <p>
          {rally.moves.length === 0
            ? "Sync a tracker to fill this week with counted moves."
            : "Open a ring to see its part in the story."}
        </p>
      </section>

      {rally.moves.length === 0 ? (
        <section className="sp-empty">
          <h2>No moves yet</h2>
          <p className="fb-copy">
            Sync a tracker or log work this week. Counted sessions appear here as
            rings.
          </p>
        </section>
      ) : (
        <div className="rf-moves-grid">
          {rally.moves.map((move) => (
            <ActivityRing
              key={move.id}
              move={move}
              unit={rally.unit}
              onOpen={() => openMove(move)}
            />
          ))}
        </div>
      )}

      <p className="rf-ring-caption">
        A shared 10 km distance scale. The filled arc shows mileage; “Counted”
        records the completed import.
      </p>

      <section className="rf-moves-note">
        <Ace />
        <div>
          <p className="rf-kicker">ACE’S CALL</p>
          <h2>Good work looks like getting out.</h2>
          <p>Long, short, steady, easy. These are your moves to keep.</p>
        </div>
      </section>

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
            Absolute times stay separate from weekly effort.
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
    </main>
  );
}
