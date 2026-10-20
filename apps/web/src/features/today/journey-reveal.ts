/** The first snapshot establishes history; later snapshots reveal only new stops. */
export function newJourneyStops(seen: readonly string[] | null, current: readonly string[]): string[] {
  if (seen === null) return current.slice(0, 1);
  return current.filter((id) => !seen.includes(id));
}
