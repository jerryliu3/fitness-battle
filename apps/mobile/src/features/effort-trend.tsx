import { ChartSvg, ChartText } from "../ui/chart-text";
import { AppText, textStyle } from "../ui/section";
import {
  APP_TIMEZONE,
  effortHistory,
  currentEffortMilestone,
  formatEffortScore,
  formatVolume,
  rankForElo,
  type CompeteState,
  type ScoreTrack,
} from "@fitness-battle/shared";
import { useState } from "react";
import { useScoreTrackLens } from "../lib/score-track-lens";
import { StyleSheet, Text, View } from "react-native";
import { Circle, Line, Polygon, Polyline } from "react-native-svg";
import { ChartScrubber } from "../ui/chart-scrubber";
import { ChartFrame } from "../ui/chart-frame";
import { useAuth } from "../lib/auth";
import { SHELL_COLORS as c } from "../theme";
import { FocusSegments, f } from "../ui/focus";

export function EffortTrend({ state }: { state: CompeteState }) {
  const [defaultTrack] = useScoreTrackLens();
  const { user } = useAuth();
  const scope = `${user?.id}:${state.primary}`;
  const [lens, setLens] = useState<{ scope: string; track: ScoreTrack } | null>(null);
  const track = lens?.scope === scope ? lens.track : defaultTrack;
  const milestone = currentEffortMilestone(state, state.primary, track);
  const model = effortHistory(state, track, user, user?.email);
  const {
    effectiveElo,
    xStart,
    xEnd,
    xMid,
    yTop,
    yBottom,
    yMidPos,
    yMin,
    yMid,
    yMax,
    lastPoint,
  } = model;

  return (
    <ChartFrame>
      <View style={f.section}>
        <FocusSegments
          label="Effort chart score track"
          value={track}
          options={[
            { value: "open", label: "Open" },
            { value: "verified", label: "GPS Tracked" },
          ]}
          onChange={(nextTrack) => setLens({ scope, track: nextTrack })}
        />

        <Text style={f.kicker}>{rankForElo(effectiveElo).name}</Text>
        <View style={s.total}>
          <Text style={s.number}>
            {formatEffortScore(effectiveElo)}
            <Text style={s.unit}> effort score</Text>
          </Text>
        </View>

        {milestone ? (
          <AppText role="body" secondary>
            +1 per {formatVolume(state.primary, state.primary === "strength" ? 0 : milestone.step, state.primary === "strength" ? milestone.step : 0, state.units)} this week · +{milestone.earned} from activity
          </AppText>
        ) : null}

        <ChartScrubber
          key={`${scope}:${track}`}
          label="Effort score history"
          width={340}
          height={150}
          plotTop={yTop}
          plotBottom={yBottom}
          summaryOnSelection
          points={model.pts.map((point, index) => ({
            id: point.date,
            x: point.x,
            y: point.y,
            value: `${formatEffortScore(model.dailyValues[index])} effort score`,
            label: new Date(point.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: APP_TIMEZONE,
            }),
          }))}
        >
          <ChartSvg
            preserveAspectRatio="none"
            width="100%"
            height={180}
            viewBox="0 0 340 150"
            accessible
            accessibilityLabel={`30-day ${track === "open" ? "Open" : "GPS Tracked"} effort score history ending at ${formatEffortScore(effectiveElo)}`}
          >
            {[
              [yTop, yMax],
              [yMidPos, yMid],
              [yBottom, yMin],
            ].map(([y, value]) => (
              <ViewGrid key={y} y={y} value={Math.round(value)} />
            ))}
            <Line x1={xStart} x2={xStart} y1={yTop} y2={yBottom} stroke={c.line} />
            {model.areaPoints ? (
              <Polygon points={model.areaPoints} fill={c.tennis} opacity={0.18} />
            ) : null}
            {model.linePoints ? (
              <Polyline
                points={model.linePoints}
                stroke={c.fieldTeal}
                strokeWidth={2.5}
                fill="none"
              />
            ) : null}
            <Circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r={6}
              stroke={c.fieldTeal}
              strokeWidth={2}
              fill={c.card}
            />
            {[
              { x: xStart, label: model.startDateLabel },
              { x: xMid, label: model.midDateLabel },
              { x: xEnd, label: model.endDateLabel },
            ].map(({ x, label }) => (
              <ChartText
                minChartWidth={x === xMid ? 260 : 0}
                key={x}
                x={x}
                y={140}
                textAnchor={x === xEnd ? "end" : x === xStart ? "start" : "middle"}
                fill={c.muted}
              >
                {label}
              </ChartText>
            ))}
          </ChartSvg>
        </ChartScrubber>
        <AppText role="caption" secondary>
          History reflects closed-week scores and your current score.
        </AppText>
      </View>
    </ChartFrame>
  );
}

function ViewGrid({ y, value }: { y: number; value: number }) {
  return (
    <>
      <Line
        x1={44}
        x2={326}
        y1={y}
        y2={y}
        stroke={c.line}
        strokeDasharray="3 3"
      />
      <ChartText x={36} y={y + 3} textAnchor="end" fill={c.muted}>
        {formatEffortScore(value)}
      </ChartText>
    </>
  );
}

const s = StyleSheet.create({
  total: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  number: {
    ...textStyle("hero"),
    color: c.ink,
    fontVariant: ["tabular-nums"],
  },
  unit: {
    ...textStyle("body"),
    color: c.muted,
  },
});
