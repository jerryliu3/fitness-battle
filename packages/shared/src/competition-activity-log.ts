import { competitionReplayFrame, type CompetitionReplayIndex } from "./competition-replay";

/** Reveal completed events at the replay cursor; calculate places using the whole field. */
export function competitionActivityLog(index: CompetitionReplayIndex, hiddenIds: readonly string[] = [], cursor = index.replay.events.length) {
  const hidden = new Set(hiddenIds);
  const limit = Math.max(0, Math.min(index.replay.events.length, Math.floor(cursor)));
  return index.replay.events.slice(0, limit).flatMap((event, i) => {
    if (hidden.has(event.athleteId)) return [];
    const beforeRows = competitionReplayFrame(index, i).rows;
    const afterRows = competitionReplayFrame(index, i + 1).rows;
    const before = beforeRows.find(row => row.id === event.athleteId)!;
    const after = afterRows.find(row => row.id === event.athleteId)!;
    const actor = after.name;
    const delta = (after.value - before.value).toLocaleString("en-US", { maximumFractionDigits: 2 });
    const movement = after.place < before.place;
    const passed = beforeRows.filter(peer => peer.id !== after.id && !hidden.has(peer.id) && peer.value > before.value && peer.value < after.value);
    const names = passed.map(peer => peer.name);
    return [{
      id: `${event.athleteId}:${event.id}`, at: event.at, simulated: Boolean(event.simulated),
      actorId: after.id, actorName: after.name, avatarUrl: after.avatarUrl,
      title: names.length ? `${actor} overtook ${names.join(" and ")}!` : `${actor} logged +${delta} ${index.unit}`,
      detail: movement ? `+${delta} ${index.unit} · Place ${before.place} → ${after.place}` : `Place ${after.place}`,
      movement,
    }];
  }).reverse();
}
