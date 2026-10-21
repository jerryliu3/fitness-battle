import { ELO_CAP, ELO_FLOOR, ELO_K, INACTIVITY_DECAY, clamp } from "./sports";

export function expectedScore(own: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - own) / 400));
}

/**
 * Chess-style update against the rest of a small weekly group.
 * `place` is 0 for first. A week with no effort decays toward the floor
 * instead of being scored as a last-place loss. Activity milestones are separate.
 */
export function settleElo(
  own: number,
  opponentElos: number[],
  place: number,
  fieldSize: number,
  effort: number,
  frozen: boolean,
): number {
  if (frozen) return clamp(ELO_FLOOR, ELO_CAP, Math.round(own));
  if (effort <= 0) {
    return clamp(ELO_FLOOR, ELO_CAP, Math.round(own - INACTIVITY_DECAY));
  }
  if (fieldSize <= 1 || opponentElos.length === 0) {
    return clamp(ELO_FLOOR, ELO_CAP, Math.round(own));
  }
  const average =
    opponentElos.reduce((sum, elo) => sum + elo, 0) / opponentElos.length;
  const expected = expectedScore(own, average);
  const actual = (fieldSize - 1 - place) / (fieldSize - 1);
  return clamp(
    ELO_FLOOR,
    ELO_CAP,
    Math.round(own + ELO_K * (actual - expected)),
  );
}
