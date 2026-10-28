export interface StandardChartGeometry {
  points: Array<{ x: number; y: number; val: number }>;
  polyline: string;
  areaPath: string;
  corridorPath?: string;
  yMin: number;
  yMid: number;
  yMax: number;
  xStart: number;
  xMid: number;
  xEnd: number;
  yTop: number;
  yBottom: number;
  yMidPos: number;
}

/**
 * Standard chart geometry model shared across Web and Mobile.
 * Computes pixel-aligned SVG geometry, clean Y-axis ticks, and gridline alignments.
 */
export function buildStandardChartGeometry(
  values: number[],
  width = 340,
  height = 150,
  corridor?: { high: number[]; low: number[] },
  yPaddingFraction = 0.1,
): StandardChartGeometry {
  const xStart = 44;
  const xEnd = Math.max(xStart + 1, width - 14);
  const xMid = Math.round((xStart + xEnd) / 2);
  const yTop = 20;
  const yBottom = Math.max(yTop + 1, height - 28);
  const yMidPos = Math.round((yTop + yBottom) / 2);

  if (values.length === 0) {
    return {
      points: [],
      polyline: "",
      areaPath: "",
      yMin: 0,
      yMid: 0,
      yMax: 0,
      xStart,
      xMid,
      xEnd,
      yTop,
      yBottom,
      yMidPos,
    };
  }

  const allNumbers = corridor
    ? [...values, ...corridor.high, ...corridor.low]
    : values;
  const rawMin = Math.min(...allNumbers);
  const rawMax = Math.max(...allNumbers);

  let yMin: number;
  let yMid: number;
  let yMax: number;

  if (rawMin === rawMax) {
    yMid = rawMin;
    const diff = Math.max(1, Math.abs(rawMin) * 0.2 || 10);
    const decimals = diff < 2 ? 2 : diff < 20 ? 1 : 0;
    const factor = Math.pow(10, decimals);
    yMin = Math.round((yMid - diff) * factor) / factor;
    yMax = Math.round((yMid + diff) * factor) / factor;
  } else {
    const spread = rawMax - rawMin;
    const pad = Math.max(spread * yPaddingFraction, 0.01);
    const decimals = spread < 2 ? 2 : spread < 20 ? 1 : 0;
    const factor = Math.pow(10, decimals);
    yMin = Math.floor((rawMin - pad) * factor) / factor;
    yMax = Math.ceil((rawMax + pad) * factor) / factor;
    yMid = Math.round(((yMin + yMax) / 2) * factor) / factor;
  }

  const ySpan = Math.max(0.001, yMax - yMin);
  const usableW = Math.max(1, xEnd - xStart);
  const usableH = Math.max(1, yBottom - yTop);

  const points = values.map((val, i) => {
    const x = xStart + (i / Math.max(1, values.length - 1)) * usableW;
    const y = yBottom - ((val - yMin) / ySpan) * usableH;
    return { x, y, val };
  });

  const polyline = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const areaPath = `M ${first.x.toFixed(1)},${yBottom} L ${polyline} L ${last.x.toFixed(1)},${yBottom} Z`;

  let corridorPath: string | undefined;
  if (
    corridor &&
    corridor.high.length === values.length &&
    corridor.low.length === values.length
  ) {
    const highPts = corridor.high.map((h, i) => {
      const x = xStart + (i / Math.max(1, values.length - 1)) * usableW;
      const y = yBottom - ((h - yMin) / ySpan) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const lowPts = corridor.low
      .map((l, i) => {
        const x = xStart + (i / Math.max(1, values.length - 1)) * usableW;
        const y = yBottom - ((l - yMin) / ySpan) * usableH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .reverse();
    corridorPath = `M ${highPts.join(" L ")} L ${lowPts.join(" L ")} Z`;
  }

  return {
    points,
    polyline,
    areaPath,
    corridorPath,
    yMin,
    yMid,
    yMax,
    xStart,
    xMid,
    xEnd,
    yTop,
    yBottom,
    yMidPos,
  };
}
