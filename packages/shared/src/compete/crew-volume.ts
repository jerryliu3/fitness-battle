export interface CrewVolumeEntry {
  userId: string;
  distanceM: number;
  movingSec: number;
  startedAt: string;
}

export function sumCrewWindow(
  entries: readonly CrewVolumeEntry[],
  waveStart: string,
  weekEnd: string,
): Map<string, { distanceM: number; movingSec: number }> {
  const start = new Date(waveStart).getTime();
  const end = new Date(weekEnd).getTime();
  const totals = new Map<string, { distanceM: number; movingSec: number }>();
  for (const entry of entries) {
    const at = new Date(entry.startedAt).getTime();
    if (at < start || at >= end) continue;
    const prior = totals.get(entry.userId) ?? { distanceM: 0, movingSec: 0 };
    totals.set(entry.userId, {
      distanceM: prior.distanceM + entry.distanceM,
      movingSec: prior.movingSec + entry.movingSec,
    });
  }
  return totals;
}
