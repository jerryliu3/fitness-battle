import { effortRankBadge } from "@fitness-battle/shared";
export function RankBadge({ score }: { score: number | null | undefined }) {
  if (score == null || !Number.isFinite(score)) return null;
  const rank = effortRankBadge(score);
  return <span className="club-rank-badge" role="img" aria-label={`${rank.name} level`} title={`${rank.name} · ${score} effort score`}>{rank.symbol}</span>;
}
