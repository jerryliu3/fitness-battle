"use client";

import { progressGain } from "@/app/design/_studies/home-lab/model";
import { useCompete } from "@/components/compete-context";
import { FieldStage } from "@/features/field/components/field-stage";
import { buildFieldModel } from "@/features/field/model";
import { useVisit } from "@/features/play/visit";
import { Ace } from "@/features/rally/ace";
import { Matchup } from "@/features/rally/matchup";
import { useRallyPresentation } from "@/features/rally/use-rally-week";
import { buildSplitBoard } from "@/features/split/model";
import { competeNow, initialsFromName, sportById } from "@fitness-battle/shared";
import Link from "next/link";
import { useTheme } from "@/theme/theme-provider";

function valueLabel(value: number, unit: string) {
  return `${value.toFixed(1)} ${unit}`;
}

export function ArenaScreen() {
  const { state } = useCompete();
  const { theme } = useTheme();
  const { snapshot, arrival, progress, finished, replay, settle } = useVisit();
  const rallyWeek = useRallyPresentation(
    state,
    state?.primary ?? "running",
    "open",
    theme.id === "rally" && Boolean(state),
  );
  if (!state || !snapshot || !arrival) return <p className="ps-note">Loading the track…</p>;

  const now = competeNow(state);
  const sport = sportById(state.primary);
  const unit = sport.gps ? "km" : "pts";
  const board = buildSplitBoard(state, state.primary, "open", now);
  const field = buildFieldModel(state, state.primary, "open", now);
  const gain = arrival.reveal ? progressGain(arrival.previous, arrival.current) : null;
  const you = snapshot.lanes.find((lane) => lane.you);
  const showArrival = Boolean(gain) && !finished && you;
  const oldYou = you ? (arrival.previous.lanes.find((lane) => lane.you)?.value ?? you.value) : 0;
  const shownYou = you ? oldYou + (you.value - oldYou) * progress : 0;
  const nearby = you
    ? snapshot.lanes
        .filter((lane) => !lane.you)
        .sort((a, b) => Math.abs(a.value - you.value) - Math.abs(b.value - you.value))
        .slice(0, 2)
    : [];
  const visible = you ? [...nearby, you] : [];
  const peak = Math.max(5, ...snapshot.lanes.map((lane) => lane.value));
  const scale = Math.ceil(peak / 5) * 5;

  return (
    <section aria-label="Weekly track">
      <p className="ps-kicker">Arena</p>
      <h1>{sport.name}</h1>
      {!board.optedIn ? (
        <p className="ps-note">
          <Link href="/field">Join this week’s field</Link> to take a lane.
        </p>
      ) : null}
      {showArrival && you ? (
        <div className="ah-arena-track">
          {visible.map((lane) => {
            const old = arrival.previous.lanes.find((item) => item.id === lane.id)?.value ?? lane.value;
            const value = old + (lane.value - old) * progress;
            return (
              <p key={lane.id} className="ps-row">
                <span>{lane.you ? "You" : lane.name.split(" ")[0]}</span>
                <b>
                  {initialsFromName(lane.name)} {value.toFixed(1)} / {scale} {unit}
                </b>
              </p>
            );
          })}
          <p className="ps-note">
            {valueLabel(oldYou, unit)} → {valueLabel(you.value, unit)}. Now {valueLabel(shownYou, unit)}.
          </p>
        </div>
      ) : (
        <>
          {rallyWeek ? (
            <Matchup
              week={rallyWeek.week}
              reference={rallyWeek.reference}
              playing={rallyWeek.playing}
              unit={rallyWeek.rally.unit}
              checkpointLabels={board.checkpointLabels}
              onCutoff={rallyWeek.setCutoff}
              onReplay={rallyWeek.onReplay}
            />
          ) : null}
          <FieldStage model={field} checkpoint={2} boardRows={board.rows} />
        </>
      )}
      {gain ? (
        <div aria-live="polite">
          <Ace />
          <p>
            <b>+{valueLabel(unit === "km" ? gain.distanceM / 1000 : gain.effort, unit)}</b>
          </p>
          <button type="button" className="ps-btn-quiet" onClick={replay} aria-label="Replay your movement">
            Replay
          </button>
          <Link className="ps-btn" href="/" onClick={settle}>
            Today
          </Link>
        </div>
      ) : null}
    </section>
  );
}
