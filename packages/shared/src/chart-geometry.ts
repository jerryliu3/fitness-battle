export interface StandardChartGeometry {
  points: Array<{ x: number; y: number; val: number; index: number }>;
  polyline: string;
  polylines: string[];
  trendPolyline: string;
  areaPath: string;
  corridorPath?: string;
  corridorHighPolyline?: string;
  corridorLowPolyline?: string;
  yMin: number;
  yMid: number;
  yMax: number;
  yTicks: Array<{ value: number; y: number }>;
  xStart: number;
  xMid: number;
  xEnd: number;
  yTop: number;
  yBottom: number;
  yMidPos: number;
}

/** Crisp evenly-spaced dashes around a circle circumference for any radius. */
export function dottedCircleDasharray(radius: number, count = 8): string {
  const circumference = 2 * Math.PI * radius;
  const period = circumference / Math.max(1, count);
  const dash = Number((period * 0.5).toFixed(2));
  const gap = Number((period - dash).toFixed(2));
  return `${dash} ${gap}`;
}

/** Round-number Y-axis bounds and 3-5 horizontal gridline ticks encompassing [rawMin, rawMax]. */
export function computeNiceAxisTicks(
  rawMin: number,
  rawMax: number,
  clampMinZero = true,
  paddingFraction = 0.08,
): { yMin: number; yMax: number; ticks: number[] } {
  let lo = rawMin;
  let hi = rawMax;
  if (lo === hi) {
    const diff = Math.max(1, Math.abs(lo) * 0.2 || 10);
    lo -= diff;
    hi += diff;
  } else {
    const spread = hi - lo;
    const pad = Math.max(spread * paddingFraction, 0.01);
    lo -= pad;
    hi += pad;
  }
  if (clampMinZero && rawMin >= 0 && lo < 0) lo = 0;

  const span = Math.max(0.01, hi - lo);
  const roughStep = span / 3;
  const pow = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const niceBases = [1, 2, 5, 10, 20, 50];
  let bestStep = roughStep;
  let bestMin = lo;
  let bestMax = hi;
  for (const base of niceBases) {
    const candidate = base * pow;
    const cMin = clampMinZero && rawMin >= 0 ? Math.max(0, Math.floor(lo / candidate) * candidate) : Math.floor(lo / candidate) * candidate;
    const cMax = Math.ceil(hi / candidate) * candidate;
    const count = Math.round((cMax - cMin) / candidate) + 1;
    bestStep = candidate;
    bestMin = cMin;
    bestMax = cMax;
    if (count <= 5) break;
  }

  const ticks: number[] = [];
  const totalSteps = Math.max(1, Math.round((bestMax - bestMin) / bestStep));
  for (let i = 0; i <= totalSteps; i++) {
    ticks.push(Number((bestMin + i * bestStep).toPrecision(10)));
  }
  return {
    yMin: ticks[0] ?? bestMin,
    yMax: ticks[ticks.length - 1] ?? bestMax,
    ticks,
  };
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
      trendPolyline: "",
      areaPath: "",
      yMin: 0,
      yMid: 0,
      yMax: 0,
      yTicks: [],
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

  const axis = computeNiceAxisTicks(rawMin, rawMax, clampMinZero, yPaddingFraction);
  const yMin = axis.yMin;
  const yMax = axis.yMax;
  const yMid = Number(((yMin + yMax) / 2).toPrecision(10));

  const ySpan = Math.max(0.001, yMax - yMin);
  yMidPos = yBottom - ((yMid - yMin) / ySpan) * (yBottom - yTop);
  const yTicks = axis.ticks.map((value) => ({
    value,
    y: yBottom - ((value - yMin) / ySpan) * (yBottom - yTop),
  }));
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

  let trendPolyline = "";
  if (!corridor && points.length >= 2) {
    trendPolyline = points
      .map((p) => {
        const startIdx = Math.max(0, p.index - 29);
        let sum = 0;
        let count = 0;
        for (let j = startIdx; j <= p.index; j++) {
          const v = values[j];
          if (typeof v === "number" && Number.isFinite(v)) {
            sum += v;
            count += 1;
          }
        }
        const avg = count > 0 ? sum / count : p.val;
        const ty = yBottom - ((avg - yMin) / ySpan) * usableH;
        return `${p.x.toFixed(1)},${ty.toFixed(1)}`;
      })
      .join(" ");
  }

  return {
    points,
    polyline,
    polylines,
    trendPolyline,
    areaPath,
    corridorPath,
    corridorHighPolyline,
    corridorLowPolyline,
    yMin,
    yMid,
    yMax,
    yTicks,
    xStart,
    xMid,
    xEnd,
    yTop,
    yBottom,
    yMidPos,
  };
}
