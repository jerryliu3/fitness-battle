import {
  effortHistory,
  rankForElo,
  type CompeteState,
} from "@fitness-battle/shared";
import { playCue } from "../lib/haptics";
import { useScoreTrackLens } from "../lib/score-track-lens";
import { Pressable, Text, View } from "react-native";
import Svg, {
  Circle,
  Line,
  Polygon,
  Polyline,
  Text as SvgText,
} from "react-native-svg";
import { useAuth } from "../lib/auth";
import { SHELL_COLORS as c } from "../theme";
import { f } from "../ui/focus";
export function EffortTrend({ state }: { state: CompeteState }) {
  const [track, setTrack] = useScoreTrackLens();
  const { user } = useAuth();
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
    <View style={f.card}>
      <View style={f.chipRow}>
        {(["open", "verified"] as const).map((t) => (
          <Pressable
            key={t}
            accessibilityRole="radio"
            accessibilityState={{ checked: t === track }}
            onPress={() => {
              if (t !== track) void playCue("selection");
              setTrack(t);
            }}
            style={[f.chip, t === track && f.chipActive]}
          >
            <Text style={f.rowTitle}>
              {t === "open" ? "Open" : "GPS verified"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={f.kicker}>{rankForElo(effectiveElo).name}</Text>
      <View style={f.row}>
        <Text style={[f.massive, { backgroundColor: c.tennis, color: c.ink, borderRadius: 12, paddingHorizontal: 12 }]}>{effectiveElo.toLocaleString()}</Text>
        <Text style={f.copy}>effort score</Text>
      </View>
      <Svg
        width="100%"
        height={170}
        viewBox="0 0 340 150"
        accessible
        accessibilityLabel={`30-day ${track === "open" ? "Open" : "GPS verified"} effort score history ending at ${effectiveElo}`}
      >
        {[
          [yTop, yMax],
          [yMidPos, yMid],
          [yBottom, yMin],
        ].map(([y, value]) => (
          <ViewGrid key={y} y={y} value={value} />
        ))}
        <Line x1={xStart} x2={xStart} y1={yTop} y2={yBottom} stroke={c.line} />
        {model.areaPoints ? (
          <Polygon points={model.areaPoints} fill={c.tennis} opacity={0.18} />
        ) : null}
        {model.linePoints ? (
          <Polyline
            points={model.linePoints}
            stroke={c.ink}
            strokeWidth={2.5}
            fill="none"
          />
        ) : null}
        <Circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={6}
          stroke={c.tennis}
          strokeWidth={2}
          fill={c.card}
        />
        {[
          { x: xStart, label: model.startDateLabel },
          { x: xMid, label: model.midDateLabel },
          { x: xEnd, label: model.endDateLabel },
        ].map(({ x, label }) => (
          <SvgText
            key={x}
            x={x}
            y={140}
            textAnchor={x === xEnd ? "end" : x === xStart ? "start" : "middle"}
            fontSize={9}
            fill={c.muted}
          >
            {label}
          </SvgText>
        ))}
      </Svg>
    </View>
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
      <SvgText x={36} y={y + 3} textAnchor="end" fontSize={10} fill={c.muted}>
        {value}
      </SvgText>
    </>
  );
}
