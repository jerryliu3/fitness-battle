import { ELO_K, INACTIVITY_DECAY, clamp } from "./sports";
// Sleep has its own rating scale; these are not sport Effort Score bounds.
const ELO_FLOOR = 500;
const ELO_CAP = 2400;

export function expectedScore(own: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - own) / 400));
}

/**
 * Sleep competition rating update. Sport Effort Score does not call this function.
 * `place` is 0 for first. A week with no effort decays toward the floor
 * instead of being scored as a last-place loss.
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
