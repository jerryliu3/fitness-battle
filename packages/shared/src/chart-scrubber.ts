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

/** Map a horizontal pointer position into chart model X (shared by web and native scrubbers). */
export function chartClientXToModel(
  clientX: number,
  rect: { left: number; width: number },
  modelWidth: number,
) {
  const width = Math.max(1, rect.width);
  const x = Math.max(0, Math.min(width, clientX - rect.left));
  return (x / width) * modelWidth;
}
