export type VitalsPhenotypeSliders = {
  age: number;
  muscle: number;
  weight: number;
  height: number;
  proportions: number;
};

export type VitalsPhenotypeFile = {
  male: VitalsPhenotypeSliders;
  female: VitalsPhenotypeSliders;
};

export const DEFAULT_VITALS_PHENOTYPE: VitalsPhenotypeFile = {
  male: {
    age: 0.58,
    muscle: 0.32,
    weight: 0.48,
    height: 0.54,
    proportions: 0.5,
  },
  female: {
    age: 0.58,
    muscle: 0.28,
    weight: 0.44,
    height: 0.5,
    proportions: 0.52,
  },
};

export function clampPhenotype01(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function normalizePhenotypeSliders(
  input: Partial<VitalsPhenotypeSliders> | undefined,
  base: VitalsPhenotypeSliders,
): VitalsPhenotypeSliders {
  return {
    age: clampPhenotype01(input?.age, base.age),
    muscle: clampPhenotype01(input?.muscle, base.muscle),
    weight: clampPhenotype01(input?.weight, base.weight),
    height: clampPhenotype01(input?.height, base.height),
    proportions: clampPhenotype01(input?.proportions, base.proportions),
  };
}
