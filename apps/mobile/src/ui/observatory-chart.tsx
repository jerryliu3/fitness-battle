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
  type RaceEditionAnalytics,
} from "@fitness-battle/shared";
import { createThemedStyles, useThemedStyles } from "../theme";
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
  const gradId = useId();
  const s = useThemedStyles(sThemes);
  const [plotWidth, setPlotWidth] = useState(340);

  const pinchStartRef = useRef<[number, number]>(zoomRange);
  const panStartRef = useRef<[number, number]>(zoomRange);

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

  const inspectStats = useMemo(
    () => (inspectTimeMs !== null ? estimateAtTimeMs(analytics, inspectTimeMs) : null),
    [analytics, inspectTimeMs],
  );

  // Mobile-first Gestures: Pinch to zoom X-axis, horizontal Pan to scrub window, Tap to inspect/select bar
  const composedGesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
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
      .activeOffsetX([-12, 12])
      .failOffsetY([-10, 10])
      .onStart(() => {
        panStartRef.current = zoomRange;
      })
      .onUpdate(ev => {
        const [sLo, sHi] = panStartRef.current;
        const span = sHi - sLo;
        if (span >= 0.995) return;
        const deltaFrac = -(ev.translationX / Math.max(120, plotWidth)) * span;
        const nextLo = Math.max(0, Math.min(1 - span, sLo + deltaFrac));
        onZoomChange([Number(nextLo.toFixed(3)), Number((nextLo + span).toFixed(3))]);
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd(ev => {
        if (!chartModel || !analytics) return;
        const svgX = (ev.x / Math.max(1, plotWidth)) * SVG_W;
        const q = Math.max(0, Math.min(1, (svgX - L) / (R - L)));
        const targetMs = Math.round(chartModel.minMs + q * (chartModel.maxMs - chartModel.minMs));
        const stats = estimateAtTimeMs(analytics, targetMs);
        if (!stats) return;
        const nextBucket = selectedBucket === stats.bucket ? null : stats.bucket;
        onSelectTimeMs(nextBucket === null ? null : targetMs, nextBucket);
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
                    <Path key={idx} d={`M${L} ${yVal.toFixed(1)}H${R}`} stroke="#e7ecea" strokeWidth={1} />
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

                {/* Pinned athlete markers + staggered white pill nametags */}
                {laidOutPins.map(item => (
                  <G key={`pin-line-${item.id}`}>
                    <Line
                      x1={item.xx}
                      x2={item.xx}
                      y1={item.badgeY + item.badgeH}
                      y2={Math.max(item.badgeY + item.badgeH, item.yy - 4)}
                      stroke="#142b3b"
                      strokeWidth={1.3}
                      strokeDasharray="2.5 2.5"
                    />
                    <Circle cx={item.xx} cy={item.yy} r={4.2} fill="#FFB800" stroke="#142b3b" strokeWidth={1.6} />
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
                      fill="#ffffff"
                      stroke="#cbd5dc"
                      strokeWidth={1.1}
                    />
                    <SvgText
                      x={item.badgeX + item.badgeW / 2}
                      y={item.badgeY + 13.5}
                      fill="#142b3b"
                      {...chartTextProps("nav")}
                      textAnchor="middle"
                    >
                      {item.labelText}
                    </SvgText>
                  </G>
                ))}

                {/* Active inspected bar marker */}
                {inspectTimeMs !== null &&
                  inspectTimeMs >= chartModel.minMs &&
                  inspectTimeMs <= chartModel.maxMs &&
                  (() => {
                    const q = (inspectTimeMs - chartModel.minMs) / Math.max(1, chartModel.maxMs - chartModel.minMs);
                    const xx = L + q * (R - L);
                    const binIdx = Math.min(chartModel.numBins - 1, Math.max(0, Math.floor(q * chartModel.numBins)));
                    const yy = B - (chartModel.densities[binIdx] / chartModel.maxDensity) * (B - T);
                    return (
                      <G>
                        <Line x1={xx} x2={xx} y1={T} y2={B} stroke="#D49400" strokeWidth={1.3} strokeDasharray="2.5 2.5" />
                        <Circle cx={xx} cy={yy} r={4.5} fill="#FFB800" stroke="#142b3b" strokeWidth={1.6} />
                      </G>
                    );
                  })()}

                {/* X-axis tick labels */}
                {[0, 1, 2, 3, 4].map(j => (
                  <SvgText
                    key={j}
                    x={L + ((R - L) * j) / 4}
                    y={SVG_H - 8}
                    fill="#637482"
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
    backgroundColor: "#f4f7f8",
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
    backgroundColor: "#e2e8ec",
    overflow: "hidden",
    position: "relative",
  },
  zoomFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "#FFB800",
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
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    borderTopWidth: 1,
    borderColor: c.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
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
