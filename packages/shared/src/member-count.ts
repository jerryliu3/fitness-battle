/** Grammatical member count for crew headers and captions. */
export function formatMemberCount(count: number): string {
  const safe = Math.max(0, Math.floor(count));
  return safe === 1 ? "1 member" : `${safe} members`;
}
