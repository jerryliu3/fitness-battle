import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import {
  analyzeRaceSplits,
  cityCodeForEvent,
  computeSplitMetrics,
  projectCourseOutline,
  type RaceTimingSplits,
} from "@fitness-battle/shared";
import { AppText, textStyle } from "./section";

export function SplitSparklineNative({
  splits,
  distanceSlug,
}: {
  splits: RaceTimingSplits | null | undefined;
  distanceSlug: string;
}) {
  const result = useMemo(() => {
    const analysis = analyzeRaceSplits(splits, distanceSlug);
    if (analysis.status !== "ready" || !splits) return null;
    const validPaces = analysis.rows
      .map(r => r.paceMsPerKm)
      .filter((p): p is number => p !== null && Number.isFinite(p) && p > 0);
    if (validPaces.length < 2) return null;
    const mean = validPaces.reduce((a, b) => a + b, 0) / validPaces.length;
    const minP = Math.min(...validPaces, mean * 0.92);
    const maxP = Math.max(...validPaces, mean * 1.08);
    const span = Math.max(1, maxP - minP);
    const d = validPaces
      .map((p, idx) => {
        const x = 4 + (idx / Math.max(1, validPaces.length - 1)) * 78;
        const y = 3 + ((p - minP) / span) * 14;
        return `${idx === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
    const metrics = computeSplitMetrics(analysis, splits.finishMs);
    return { d, ...metrics };
  }, [splits, distanceSlug]);

  if (!result) {
    return (
      <AppText role="caption" secondary>
        —
      </AppText>
    );
  }

  const badgeBg =
    result.tone === "negative" ? "#dcfce7" : result.tone === "positive" ? "#fee2e2" : "#fef3c7";
  const badgeColor =
    result.tone === "negative" ? "#15803d" : result.tone === "positive" ? "#b91c1c" : "#a16207";

  return (
    <View style={styles.splitRow}>
      <Svg width={78} height={20} viewBox="0 0 86 20">
        <Path
          d={result.d}
          fill="none"
          stroke={result.stroke}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      {result.badge ? (
        <View style={[styles.splitBadge, { backgroundColor: badgeBg }]}>
          <AppText role="caption" style={[styles.splitBadgeText, { color: badgeColor }]}>
            {result.badge}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export function RaceRouteArtNative({
  eventName,
  year,
  coursePoints,
  compact = false,
}: {
  eventName: string;
  year: number;
  coursePoints?: [number, number][] | null;
  compact?: boolean;
}) {
  const city = useMemo(() => cityCodeForEvent(eventName), [eventName]);
  const projected = useMemo(() => projectCourseOutline(coursePoints), [coursePoints]);
  const height = compact ? 86 : 112;

  return (
    <View style={[styles.artBox, { height, backgroundColor: projected ? "#142b3b" : "#1c2d3a" }]}>
      <Svg width="100%" height={height} viewBox="0 0 460 180" preserveAspectRatio="xMidYMid meet">
        <G fill="none" stroke="#9fa5af" strokeOpacity={0.14} strokeWidth={1}>
          <Path d="M0 36H460M0 90H460M0 144H460M92 0V180M184 0V180M276 0V180M368 0V180" />
        </G>
        {projected && (
          <>
            <Path
              d={projected.path}
              fill="none"
              stroke="#FFB800"
              strokeOpacity={0.22}
              strokeWidth={14}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d={projected.path}
              fill="none"
              stroke="#FFB800"
              strokeWidth={3.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Circle cx={projected.start[0]} cy={projected.start[1]} r={5.5} fill="#ffffff" stroke="#142b3b" strokeWidth={2.5} />
            <Circle cx={projected.end[0]} cy={projected.end[1]} r={5.5} fill="#FFB800" stroke="#142b3b" strokeWidth={2.5} />
          </>
        )}
      </Svg>
      <AppText role="caption" style={styles.artCity}>
        {city} · {year}
      </AppText>
      {!projected && (
        <View style={styles.noGpsWrap} pointerEvents="none">
          <AppText role="caption" style={styles.noGpsText}>
            NO GPS MAP
          </AppText>
        </View>
      )}
      <AppText role="hero" style={styles.artYear}>
        {year}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  splitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  splitBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  splitBadgeText: {
    ...textStyle("nav"),
    fontVariant: ["tabular-nums"],
  },
  artBox: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  artCity: {
    ...textStyle("nav"),
    position: "absolute",
    top: 10,
    left: 12,
    color: "#FFB800",
  },
  noGpsWrap: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  noGpsText: {
    ...textStyle("nav"),
    color: "rgba(159, 165, 175, 0.58)",
  },
  artYear: {
    ...textStyle("display"),
    position: "absolute",
    bottom: 2,
    right: 10,
    color: "rgba(255, 255, 255, 0.08)",
  },
});
