export interface TimedMultiplier {
  multiplier: number;
  startsAt: string;
  boostEndsAt: string;
}

export function activeMultiplier(window: TimedMultiplier | undefined, now: Date) {
  if (!window || window.multiplier <= 1) return null;
  const start = Date.parse(window.startsAt);
  const end = Date.parse(window.boostEndsAt);
  if (!(start <= now.getTime() && now.getTime() < end)) return null;
  return {
    label: `${Number(window.multiplier.toFixed(2))}×`,
    remaining: (end - now.getTime()) / (end - start),
    endsAt: new Date(end),
  };
}
