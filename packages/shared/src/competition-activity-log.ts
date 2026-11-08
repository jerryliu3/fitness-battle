import { competitionReplayFrame, type CompetitionReplayIndex } from "./competition-replay";

/** One row per counted replay event; retain the full field when calculating places. */
export function competitionActivityLog(index: CompetitionReplayIndex, hiddenIds: readonly string[] = []) {
  const hidden = new Set(hiddenIds);
  return index.replay.events.flatMap((event, i) => {
    if (hidden.has(event.athleteId)) return [];
    const before = competitionReplayFrame(index, i).rows.find(row => row.id === event.athleteId)!;
    const after = competitionReplayFrame(index, i + 1).rows.find(row => row.id === event.athleteId)!;
    const actor = after.you ? "You" : after.name;
    const delta = (after.value - before.value).toLocaleString("en-US", { maximumFractionDigits: 2 });
    const movement = after.place < before.place;
    return [{
      id: `${event.athleteId}:${event.id}`, at: event.at, simulated: Boolean(event.simulated),
      title: movement ? `${actor} moved to place ${after.place}` : `${actor} logged +${delta} ${index.unit}`,
      detail: movement ? `+${delta} ${index.unit} · Place ${before.place} → ${after.place}` : `Place ${after.place}`,
      movement,
    }];
  }).reverse();
}
