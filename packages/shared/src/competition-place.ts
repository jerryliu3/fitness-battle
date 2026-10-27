/** Competition ranking: equal values share a place; the next place is skipped. */
export function competitionPlace(values: readonly number[], value: number): number {
  return 1 + values.filter(other => other > value).length;
}

/** Zero-based average of the positions occupied by a tied group for score settlement. */
export function averageTiePosition(values: readonly number[], value: number): number {
  const ahead = values.filter(other => other > value).length;
  const tied = values.filter(other => other === value).length;
  return ahead + Math.max(0, tied - 1) / 2;
}
