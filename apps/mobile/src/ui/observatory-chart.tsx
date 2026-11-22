import { memo, useId, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import {
  OBSERVATORY_OVERLAY_COLORS,
  catmullRomPath,
  estimateAtTimeMs,
  gaussianSmooth,
  raceClock,
  racePercentLabel,
  type RaceEditionAnalytics,
} from "@fitness-battle/shared";
import { createThemedStyles, useThemeColors, useThemedStyles } from "../theme";
import { AppText, chartTextProps, textStyle } from "./section";

export type ObservatoryPinnedRecord = {
  id: number;
  name: string;
  timeMs: number;
  eventName: string;
  year: number;
  distanceSlug: string;
};

export type ObservatoryOverlayDataset = {
  editionId: number;
  label: string;
  analytics: RaceEditionAnalytics;
};

const SVG_W = 360;
const SVG_H = 228;
const L = 14;
const R = 346;
const T = 52;
const B = 198;

export const ObservatoryChart = memo(function ObservatoryChart({
  cohortTotal,
  editionScoped,
  analytics,
  loading,
  sportLabel,
  isRunningSport,
  zoomRange,
  onZoomChange,
  selectedBucket,
  inspectTimeMs,
  onSelectTimeMs,
  activePins,
  onUnpin,
  overlayIds,
  overlayData,
  onRemoveOverlay,
}: {
  cohortTotal: number | null;
  editionScoped: boolean;
  analytics: RaceEditionAnalytics | null;
  loading: boolean;
  sportLabel: string;
  isRunningSport: boolean;
  zoomRange: [number, number];
  onZoomChange: (next: [number, number]) => void;
  selectedBucket: number | null;
  inspectTimeMs: number | null;
  onSelectTimeMs: (ms: number | null, bucket: number | null) => void;
  activePins: ObservatoryPinnedRecord[];
  onUnpin: (id: number) => void;
  overlayIds: number[];
  overlayData: Record<string, ObservatoryOverlayDataset>;
  onRemoveOverlay: (editionId: number) => void;
}) {
  const c = useThemeColors();
  const gradId = useId();
  const s = useThemedStyles(sThemes);
  const [plotWidth, setPlotWidth] = useState(340);
  const [scrubTimeMs, setScrubTimeMs] = useState<number | null>(null);

  const pinchStartRef = useRef<[number, number]>(zoomRange);
  const scrubCommitRef = useRef<{ ms: number; bucket: number } | null>(null);

  const chartModel = useMemo(() => {
    if (!analytics || !analytics.bins.length || analytics.total <= 0) return null;
    const maxBucket = Math.max(...analytics.bins.map(b => b.bucket), 0);
    const totalBins = Math.max(1, maxBucket + 1);
    const fullMinMs = analytics.minimumMs;
    const fullMaxMs = analytics.minimumMs + totalBins * analytics.binWidthMs;
    const binMap = new Map(analytics.bins.map(b => [b.bucket, b.count]));
    const allDensities = Array.from({ length: totalBins }, (_, i) => (binMap.get(i) ?? 0) / Math.max(1, analytics.total));
    const allSmoothed = gaussianSmooth(allDensities);

    const startBin = Math.max(0, Math.min(totalBins - 2, Math.floor(zoomRange[0] * totalBins)));
    const endBin = Math.max(startBin + 2, Math.min(totalBins, Math.ceil(zoomRange[1] * totalBins)));
    const numBins = endBin - startBin;
    const minMs = fullMinMs + startBin * analytics.binWidthMs;
    const maxMs = fullMinMs + endBin * analytics.binWidthMs;

    const densities = allDensities.slice(startBin, endBin);
    const smoothed = allSmoothed.slice(startBin, endBin);

    const activeOverlays = (editionScoped ? [] : overlayIds)
      .map((edId, idx) => {
        const ov = overlayData[String(edId)];
        if (!ov || !ov.analytics.bins.length || ov.analytics.total <= 0) return null;
        const ovFull = Array(totalBins).fill(0) as number[];
        for (const b of ov.analytics.bins) {
          const centerMs = ov.analytics.minimumMs + (b.bucket + 0.5) * ov.analytics.binWidthMs;
          const targetIdx = Math.floor(((centerMs - fullMinMs) / Math.max(1, fullMaxMs - fullMinMs)) * totalBins);
          if (targetIdx >= 0 && targetIdx < totalBins) {
            ovFull[targetIdx] += b.count / ov.analytics.total;
          }
        }
        return {
          editionId: edId,
          label: ov.label,
          color: OBSERVATORY_OVERLAY_COLORS[idx % OBSERVATORY_OVERLAY_COLORS.length],
          dashed: idx === 1,
          smoothed: gaussianSmooth(ovFull).slice(startBin, endBin),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const maxDensity = Math.max(0.025, ...densities, ...smoothed, ...activeOverlays.flatMap(o => o.smoothed)) * 1.12;
    return { startBin, numBins, minMs, maxMs, densities, smoothed, activeOverlays, maxDensity };
  }, [analytics, overlayIds, overlayData, editionScoped, zoomRange]);

  const activeInspectMs = scrubTimeMs ?? inspectTimeMs;
  const inspectStats = useMemo(
    () => (activeInspectMs !== null ? estimateAtTimeMs(analytics, activeInspectMs) : null),
    [analytics, activeInspectMs],
  );

  // Mobile-first Gestures: Pinch zooms X-axis, single-finger drag OR tap scrubs & selects like web hover/click
  const composedGesture = useMemo(() => {
    const inspectAtX = (xPx: number) => {
      if (!chartModel || !analytics) return null;
      const svgX = (xPx / Math.max(1, plotWidth)) * SVG_W;
      const q = Math.max(0, Math.min(1, (svgX - L) / (R - L)));
      const targetMs = Math.round(chartModel.minMs + q * (chartModel.maxMs - chartModel.minMs));
      const stats = estimateAtTimeMs(analytics, targetMs);
      return stats ? { ms: targetMs, bucket: stats.bucket } : null;
    };

    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        setScrubTimeMs(null);
        pinchStartRef.current = zoomRange;
      })
      .onUpdate(ev => {
        const [lo, hi] = pinchStartRef.current;
        const span = hi - lo;
        const nextSpan = Math.max(0.14, Math.min(1, span / Math.max(0.35, ev.scale)));
        const anchor = Math.max(0, Math.min(1, ev.focalX / Math.max(1, plotWidth)));
        const center = lo + anchor * span;
        const nextLo = Math.max(0, Math.min(1 - nextSpan, center - anchor * nextSpan));
        onZoomChange([Number(nextLo.toFixed(3)), Number((nextLo + nextSpan).toFixed(3))]);
      });

    const pan = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-5, 5])
      .failOffsetY([-14, 14])
      .onStart(ev => {
        const hit = inspectAtX(ev.x);
        scrubCommitRef.current = hit;
        if (hit) setScrubTimeMs(hit.ms);
      })
      .onUpdate(ev => {
        const hit = inspectAtX(ev.x);
        scrubCommitRef.current = hit;
        if (hit) setScrubTimeMs(hit.ms);
      })
      .onEnd(() => {
        const hit = scrubCommitRef.current;
        scrubCommitRef.current = null;
        setScrubTimeMs(null);
        if (hit) onSelectTimeMs(hit.ms, hit.bucket);
      })
      .onFinalize(() => {
        scrubCommitRef.current = null;
        setScrubTimeMs(null);
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd(ev => {
        const hit = inspectAtX(ev.x);
        if (!hit) return;
        const nextBucket = selectedBucket === hit.bucket ? null : hit.bucket;
        setScrubTimeMs(null);
        onSelectTimeMs(nextBucket === null ? null : hit.ms, nextBucket);
      });

    return Gesture.Race(pinch, pan, tap);
  }, [zoomRange, plotWidth, chartModel, analytics, selectedBucket, onZoomChange, onSelectTimeMs]);

  function adjustZoom(factor: number) {
    const [lo, hi] = zoomRange;
    const span = hi - lo;
    const nextSpan = Math.max(0.14, Math.min(1, span * factor));
    const mid = (lo + hi) / 2;
    const nextLo = Math.max(0, Math.min(1 - nextSpan, mid - nextSpan / 2));
    onZoomChange([Number(nextLo.toFixed(3)), Number((nextLo + nextSpan).toFixed(3))]);
  }

  // Visible pins laid out with collision avoidance
  const laidOutPins = useMemo(() => {
    if (!chartModel || !activePins.length) return [];
    const visible = activePins
      .filter(p => p.timeMs >= chartModel.minMs && p.timeMs <= chartModel.maxMs)
      .sort((a, b) => a.timeMs - b.timeMs || a.id - b.id);
    if (!visible.length) return [];
    const tierRightEdges: number[] = [];
    const badgeH = 20;
    return visible.map(p => {
      const q = (p.timeMs - chartModel.minMs) / Math.max(1, chartModel.maxMs - chartModel.minMs);
      const xx = L + q * (R - L);
      const binIdx = Math.min(chartModel.numBins - 1, Math.max(0, Math.floor(q * chartModel.numBins)));
      const yy = B - (chartModel.densities[binIdx] / chartModel.maxDensity) * (B - T);
      const shortName = p.name.length > 16 ? `${p.name.slice(0, 15)}…` : p.name;
      const labelText = `${shortName} · ${raceClock(p.timeMs)} ×`;
      const badgeW = Math.max(92, Math.min(176, labelText.length * 5.2 + 16));
      const badgeX = Math.max(6, Math.min(SVG_W - 6 - badgeW, xx - badgeW / 2));
      let tier = 0;
      while (tier < 2 && tierRightEdges[tier] !== undefined && badgeX < tierRightEdges[tier] + 6) {
        tier++;
      }
      tierRightEdges[tier] = Math.max(tierRightEdges[tier] ?? 0, badgeX + badgeW);
      return { id: p.id, xx, yy, labelText, badgeX, badgeY: 4 + tier * 22, badgeW, badgeH };
    });
  }, [chartModel, activePins]);

  return (
    <View style={s.surface}>
      {/* Dedicated top count row so it never collides with chart pins */}
      <View style={s.countRow}>
        <AppText role="hero" style={s.countValue}>
          {isRunningSport && cohortTotal != null ? cohortTotal.toLocaleString() : "0"}
        </AppText>
        <AppText role="caption" style={s.countLabel}>
          {isRunningSport ? (editionScoped ? "EDITION FINISHERS" : "PUBLISHED FIELD") : `${sportLabel.toUpperCase()} FIELD`}
        </AppText>
      </View>

      {!isRunningSport ? (
        <View style={s.emptyBox}>
          <AppText role="body" secondary>
            No published {sportLabel} results yet.
          </AppText>
        </View>
      ) : !chartModel || !analytics ? (
        <View style={s.emptyBox}>
          {loading ? (
            <ActivityIndicator accessibilityLabel="Updating distribution chart" />
          ) : (
            <AppText role="body" secondary>
              No distribution data for these filters.
            </AppText>
          )}
        </View>
      ) : (
        <View
          onLayout={ev => setPlotWidth(Math.max(180, ev.nativeEvent.layout.width))}
          style={s.plotArea}
        >
          <GestureDetector gesture={composedGesture}>
            <View>
              <Svg width="100%" height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
                <Defs>
                  <LinearGradient id={`${gradId}-bar`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#FFB800" stopOpacity="0.52" />
                    <Stop offset="100%" stopColor="#FFB800" stopOpacity="0.18" />
                  </LinearGradient>
                  <LinearGradient id={`${gradId}-area`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#FFB800" stopOpacity="0.22" />
                    <Stop offset="100%" stopColor="#FFB800" stopOpacity="0.02" />
                  </LinearGradient>
                </Defs>

                {/* Horizontal reference grid */}
                <G>
                  {[T, T + (B - T) * 0.33, T + (B - T) * 0.66, B].map((yVal, idx) => (
                    <Path key={idx} d={`M${L} ${yVal.toFixed(1)}H${R}`} stroke={c.line} strokeWidth={1} />
                  ))}
                </G>

                {(() => {
                  const bw = (R - L) / chartModel.numBins;
                  const pts: [number, number][] = chartModel.smoothed.map((v, i) => [
                    L + (i + 0.5) * bw,
                    B - (v / chartModel.maxDensity) * (B - T),
                  ]);
                  const linePath = catmullRomPath(pts);
                  const areaPath = pts.length
                    ? `${linePath} L${pts[pts.length - 1][0].toFixed(1)} ${B} L${pts[0][0].toFixed(1)} ${B} Z`
                    : "";
                  const activeInspectBucket = inspectStats?.bucket ?? null;
                  return (
                    <G>
                      {areaPath ? <Path d={areaPath} fill={`url(#${gradId}-area)`} /> : null}
                      {chartModel.densities.map((v, i) => {
                        const globalBucket = chartModel.startBin + i;
                        const x = L + i * bw;
                        const y = B - (v / chartModel.maxDensity) * (B - T);
                        const isHi = selectedBucket === globalBucket || activeInspectBucket === globalBucket;
                        return (
                          <Rect
                            key={globalBucket}
                            x={x}
                            y={y}
                            width={Math.max(1, bw - 0.5)}
                            height={Math.max(0, B - y)}
                            rx={1.5}
                            fill={isHi ? "#FFB800" : `url(#${gradId}-bar)`}
                            opacity={isHi ? 1 : selectedBucket === null ? 0.92 : 0.45}
                          />
                        );
                      })}
                      <Path
                        d={linePath}
                        fill="none"
                        stroke="#C88A00"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                      />
                    </G>
                  );
                })()}

                {/* Overlay curves */}
                {chartModel.activeOverlays.map(ov => {
                  const bw = (R - L) / chartModel.numBins;
                  const pts: [number, number][] = ov.smoothed.map((v, i) => [
                    L + (i + 0.5) * bw,
                    B - (v / chartModel.maxDensity) * (B - T),
                  ]);
                  return (
                    <Path
                      key={ov.editionId}
                      d={catmullRomPath(pts)}
                      fill="none"
                      stroke={ov.color}
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeDasharray={ov.dashed ? "5 3" : undefined}
                    />
                  );
                })}

                {/* Pinned athlete markers + staggered pill nametags */}
                {laidOutPins.map(item => (
                  <G key={`pin-line-${item.id}`}>
                    <Line
                      x1={item.xx}
                      x2={item.xx}
                      y1={item.badgeY + item.badgeH}
                      y2={Math.max(item.badgeY + item.badgeH, item.yy - 4)}
                      stroke={c.ink}
                      strokeWidth={1.3}
                      strokeDasharray="2.5 2.5"
                    />
                    <Circle cx={item.xx} cy={item.yy} r={4.2} fill={c.tennis} stroke={c.ink} strokeWidth={1.6} />
                  </G>
                ))}
                {laidOutPins.map(item => (
                  <G key={`pin-pill-${item.id}`} onPress={() => onUnpin(item.id)}>
                    <Rect
                      x={item.badgeX}
                      y={item.badgeY}
                      width={item.badgeW}
                      height={item.badgeH}
                      rx={10}
                      fill={c.card}
                      stroke={c.line}
                      strokeWidth={1.1}
                    />
                    <SvgText
                      x={item.badgeX + item.badgeW / 2}
                      y={item.badgeY + 13.5}
                      fill={c.ink}
                      {...chartTextProps("nav")}
                      textAnchor="middle"
                    >
                      {item.labelText}
                    </SvgText>
                  </G>
                ))}

                {/* Active inspected / hovered bar marker + floating callout tooltip */}
                {activeInspectMs !== null &&
                  inspectStats &&
                  activeInspectMs >= chartModel.minMs &&
                  activeInspectMs <= chartModel.maxMs &&
                  (() => {
                    const q = (activeInspectMs - chartModel.minMs) / Math.max(1, chartModel.maxMs - chartModel.minMs);
                    const xx = L + q * (R - L);
                    const binIdx = Math.min(chartModel.numBins - 1, Math.max(0, Math.floor(q * chartModel.numBins)));
                    const yy = B - (chartModel.densities[binIdx] / chartModel.maxDensity) * (B - T);
                    const calloutText = `${raceClock(activeInspectMs)} · Faster than ${racePercentLabel(inspectStats.fasterThan)} · #${inspectStats.rank.toLocaleString()}`;
                    const boxW = Math.min(SVG_W - 12, Math.max(176, calloutText.length * 5.8 + 18));
                    const boxH = 24;
                    const boxX = Math.max(6, Math.min(SVG_W - 6 - boxW, xx - boxW / 2));
                    const boxY = 6;
                    return (
                      <G>
                        <Line x1={xx} x2={xx} y1={boxY + boxH} y2={B} stroke={c.tennis} strokeWidth={1.6} strokeDasharray="3 2.5" />
                        <Circle cx={xx} cy={yy} r={5} fill={c.tennis} stroke={c.ink} strokeWidth={1.8} />
                        <Rect x={boxX} y={boxY} width={boxW} height={boxH} rx={12} fill={c.ink} />
                        <SvgText
                          x={boxX + boxW / 2}
                          y={boxY + 15.5}
                          fill={c.card}
                          {...chartTextProps("nav")}
                          textAnchor="middle"
                        >
                          {calloutText}
                        </SvgText>
                      </G>
                    );
                  })()}

                {/* X-axis tick labels */}
                {[0, 1, 2, 3, 4].map(j => (
                  <SvgText
                    key={j}
                    x={L + ((R - L) * j) / 4}
                    y={SVG_H - 8}
                    fill={c.muted}
                    {...chartTextProps("nav")}
                    textAnchor={j === 0 ? "start" : j === 4 ? "end" : "middle"}
                  >
                    {raceClock(chartModel.minMs + ((chartModel.maxMs - chartModel.minMs) * j) / 4)}
                  </SvgText>
                ))}
              </Svg>
            </View>
          </GestureDetector>
        </View>
      )}

      {/* Sleek X-Axis Zoom Window Bar */}
      {isRunningSport && chartModel && analytics ? (
        <View style={s.zoomBar}>
          <AppText role="caption" style={s.zoomLabel}>
            Window: <AppText role="label" style={s.tabular}>{raceClock(chartModel.minMs)} – {raceClock(chartModel.maxMs)}</AppText>
          </AppText>
          <View style={s.zoomTrack}>
            <View
              style={[
                s.zoomFill,
                {
                  left: `${zoomRange[0] * 100}%`,
                  width: `${Math.max(6, (zoomRange[1] - zoomRange[0]) * 100)}%`,
                },
              ]}
            />
          </View>
          <View style={s.zoomBtns}>
            <Pressable accessibilityRole="button" accessibilityLabel="Zoom in chart window" onPress={() => adjustZoom(0.75)} style={s.zoomBtn}>
              <AppText role="nav">+</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Zoom out chart window" onPress={() => adjustZoom(1.33)} style={s.zoomBtn}>
              <AppText role="nav">−</AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Removable comparison chips (when comparing race editions) */}
      {isRunningSport && !editionScoped && overlayIds.length > 0 ? (
        <View style={s.footer}>
          <View style={s.overlayWrap}>
            {overlayIds.map((edId, idx) => {
              const ov = overlayData[String(edId)];
              const label = ov?.label ?? `Edition #${edId}`;
              const color = OBSERVATORY_OVERLAY_COLORS[idx % OBSERVATORY_OVERLAY_COLORS.length];
              return (
                <Pressable
                  key={edId}
                  onPress={() => onRemoveOverlay(edId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${label} comparison`}
                  style={s.overlayChip}
                >
                  <View style={[s.overlayDot, { backgroundColor: color }]} />
                  <AppText role="nav" numberOfLines={1}>
                    {label}
                  </AppText>
                  <AppText role="caption" secondary>×</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
});

const sThemes = createThemedStyles(c => ({
  surface: {
    overflow: "hidden",
  },
  countRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  countValue: {
    ...textStyle("metric"),
    fontVariant: ["tabular-nums"],
    color: c.ink,
  },
  countLabel: {
    ...textStyle("nav"),
    color: c.muted,
  },
  plotArea: {
    paddingHorizontal: 2,
  },
  emptyBox: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  zoomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: c.soft,
    borderTopWidth: 1,
    borderColor: c.line,
  },
  zoomLabel: {
    ...textStyle("nav"),
    color: c.muted,
    fontVariant: ["tabular-nums"],
  },
  zoomTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: c.line,
    overflow: "hidden",
    position: "relative",
  },
  zoomFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: c.tennis,
  },
  zoomBtns: {
    flexDirection: "row",
    gap: 4,
  },
  zoomBtn: {
    width: 26,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    borderTopWidth: 1,
    borderColor: c.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: c.card,
  },
  overlayWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  overlayChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
  },
  overlayDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
}));
