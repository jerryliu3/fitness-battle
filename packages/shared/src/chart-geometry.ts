export interface StandardChartGeometry {
  points: Array<{ x: number; y: number; val: number; index: number }>;
  polyline: string;
  polylines: string[];
  areaPath: string;
  corridorPath?: string;
  corridorHighPolyline?: string;
  corridorLowPolyline?: string;
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
  values: readonly (number | null)[],
  width = 340,
  height = 150,
  corridor?: { high: number[]; low: number[] },
  yPaddingFraction = 0.1,
  clampMinZero = true,
): StandardChartGeometry {
  const xStart = 44;
  const xEnd = Math.max(xStart + 1, width - 14);
  const xMid = Math.round((xStart + xEnd) / 2);
  const yTop = 28;
  const yBottom = Math.max(yTop + 1, height - 44);
  let yMidPos = (yTop + yBottom) / 2;
  const finite = (nums: readonly (number | null)[]) =>
    nums.filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!values.length || !finite(values).length) {
    return {
      points: [],
      polyline: "",
      polylines: [],
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
    ? [...finite(values), ...corridor.high, ...corridor.low]
    : finite(values);
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
    if (clampMinZero && rawMin >= 0 && yMin < 0) {
      yMin = 0;
    }
  } else {
    const spread = rawMax - rawMin;
    const pad = Math.max(spread * yPaddingFraction, 0.01);
    const decimals = spread < 2 ? 2 : spread < 20 ? 1 : 0;
    const factor = Math.pow(10, decimals);
    yMin = Math.floor((rawMin - pad) * factor) / factor;
    yMax = Math.ceil((rawMax + pad) * factor) / factor;
    if (clampMinZero && rawMin >= 0 && yMin < 0) {
      yMin = 0;
    }
    yMid = Math.round(((yMin + yMax) / 2) * factor) / factor;
  }

  const ySpan = Math.max(0.001, yMax - yMin);
  yMidPos = yBottom - ((yMid - yMin) / ySpan) * (yBottom - yTop);
  const usableW = Math.max(1, xEnd - xStart);
  const usableH = Math.max(1, yBottom - yTop);

  const points: StandardChartGeometry["points"] = [];
  const polylines: string[] = [];
  let current: string[] = [];
  const xAt = (i: number) => xStart + (i / Math.max(1, values.length - 1)) * usableW;
  values.forEach((val, i) => {
    if (val == null || !Number.isFinite(val)) {
      if (current.length > 1) polylines.push(current.join(" "));
      current = [];
      return;
    }
    const point = {
      x: xAt(i),
      y: yBottom - ((val - yMin) / ySpan) * usableH,
      val,
      index: i,
    };
    points.push(point);
    current.push(`${point.x.toFixed(1)},${point.y.toFixed(1)}`);
  });
  if (current.length > 1) polylines.push(current.join(" "));
  const polyline = polylines[0] ?? "";
  const first = points[0];
  const last = points[points.length - 1];
  const areaPath = first && last && polylines.length === 1
    ? `M ${first.x.toFixed(1)},${yBottom} L ${polyline} L ${last.x.toFixed(1)},${yBottom} Z`
    : "";

  let corridorPath: string | undefined;
  let corridorHighPolyline: string | undefined;
  let corridorLowPolyline: string | undefined;
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
    const lowPts = corridor.low.map((l, i) => {
      const x = xStart + (i / Math.max(1, values.length - 1)) * usableW;
      const y = yBottom - ((l - yMin) / ySpan) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const lowPtsReversed = [...lowPts].reverse();
    corridorPath = `M ${highPts.join(" L ")} L ${lowPtsReversed.join(" L ")} Z`;
    corridorHighPolyline = highPts.join(" ");
    corridorLowPolyline = lowPts.join(" ");
  }

  return {
    points,
    polyline,
    polylines,
    areaPath,
    corridorPath,
    corridorHighPolyline,
    corridorLowPolyline,
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
