export interface ChartDatum {
  id: string;
  x: number;
  y: number;
  label: string;
  value: string;
}

export function nearestChartDatum(points: readonly ChartDatum[], x: number) {
  return points.reduce<ChartDatum | undefined>(
    (best, point) =>
      !best || Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best,
    undefined,
  );
}
