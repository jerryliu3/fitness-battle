import { useMemo, useRef, useState } from "react";
import * as RN from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as SvgModule from "react-native-svg";
import {
  buildCompeteTimeSeriesModel,
  buildSleepTimeSeriesModel,
  clamp,
  competeNow,
  type CompeteState,
  type CompeteTimeSeriesModel,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { playCue } from "../lib/haptics";
import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { textStyle } from "./section";

function svgTag<K extends keyof typeof SvgModule>(
  key: K,
  fallback: string,
): (typeof SvgModule)[K] {
  return (key in SvgModule ? SvgModule[key] : fallback) as (typeof SvgModule)[K];
}

const Svg = svgTag("default", "Svg");
const G = svgTag("G", "SvgG");
const Line = svgTag("Line", "SvgLine");
const Polyline = svgTag("Polyline", "SvgPolyline");
const Circle = svgTag("Circle", "SvgCircle");
const Rect = svgTag("Rect", "SvgRect");
const SvgText = svgTag("Text", "SvgText");

const DIRECTION_LOCK_PX = 4;

export function CompeteTimeSeriesChart({
  state,
  sport,
  track = "open",
  mode = "sport",
  selectedId,
  onSelectAthlete,
  hiddenIds,
  reserveTopControls = false,
  compact = false,
}: {
  state: CompeteState;
  sport?: SportId;
  track?: ScoreTrack;
  mode?: "sport" | "sleep";
  selectedId?: string | null;
  onSelectAthlete?: (id: string) => void;
  hiddenIds?: readonly string[];
  reserveTopControls?: boolean;
  compact?: boolean;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null,
  );
  const [scrubFraction, setScrubFraction] = useState<number | null>(null);
  const plotWidthRef = useRef(300);
  const lastDayBucketRef = useRef<number | null>(null);
  const directionRef = useRef<"horizontal" | "vertical" | null>(null);

  const activeSelectedId =
    selectedId !== undefined ? selectedId : internalSelectedId;

  const model: CompeteTimeSeriesModel = useMemo(() => {
    const now = competeNow(state);
    if (mode === "sleep") {
      return buildSleepTimeSeriesModel(state, now, {
        hiddenIds,
        selectedAthleteId: activeSelectedId,
        scrubFraction,
      });
    }
    return buildCompeteTimeSeriesModel(
      state,
      sport ?? state.primary,
      track,
      now,
      {
        hiddenIds,
        selectedAthleteId: activeSelectedId,
        scrubFraction,
      },
    );
  }, [state, sport, track, mode, hiddenIds, activeSelectedId, scrubFraction]);

  const handleSelectAthlete = (id: string) => {
    void playCue("selection");
    if (selectedId === undefined) {
      setInternalSelectedId(id);
    }
    onSelectAthlete?.(id);
  };

  const updateScrubFromLocationX = (locationX: number) => {
    const width = Math.max(1, plotWidthRef.current);
    const svgX = (locationX / width) * model.width;
    const rawFraction =
      (svgX - model.left) / Math.max(1, model.right - model.left);
    const clamped = clamp(0, model.nowFraction, rawFraction);
    const dayBucket = Math.floor(clamped * 14);
    if (lastDayBucketRef.current !== dayBucket) {
      lastDayBucketRef.current = dayBucket;
      void playCue("selection");
    }
    setScrubFraction(clamped);
  };

  const updateScrubRef = useRef(updateScrubFromLocationX);
  updateScrubRef.current = updateScrubFromLocationX;

  const panHandlers = useMemo(() => {
    if (compact) return {};
    if (!("PanResponder" in RN) || !RN.PanResponder?.create) return {};
    return RN.PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) >=
          DIRECTION_LOCK_PX && Math.abs(gesture.dx) >= Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        directionRef.current = null;
      },
      onPanResponderMove: (event, gesture) => {
        if (
          !directionRef.current &&
          Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) >=
            DIRECTION_LOCK_PX
        ) {
          directionRef.current =
            Math.abs(gesture.dx) >= Math.abs(gesture.dy)
              ? "horizontal"
              : "vertical";
        }
        if (directionRef.current === "horizontal") {
          updateScrubRef.current(event.nativeEvent.locationX);
        }
      },
      onPanResponderTerminationRequest: () =>
        directionRef.current !== "horizontal",
      onPanResponderRelease: () => {
        directionRef.current = null;
        lastDayBucketRef.current = null;
        setScrubFraction(null);
      },
      onPanResponderTerminate: () => {
        directionRef.current = null;
        lastDayBucketRef.current = null;
        setScrubFraction(null);
      },
    }).panHandlers;
  }, [compact]);

  const selectedStroke = model.selectedAthlete.you
    ? c.fieldTeal
    : c.podiumGold;
  const unselectedAthletes = model.athletes.filter((a) => !a.selected);

  return (
    <View
      accessibilityLabel="Weekly competition time-series graph"
      style={[
        s.card,
        compact && s.cardCompact,
        reserveTopControls && { paddingTop: 64 },
      ]}
    >
      {/* Pure Open Line Header */}
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Text style={s.timeCaption} numberOfLines={1}>
            {model.timeLabel}
          </Text>
          <View style={s.readingRow}>
            <Text style={s.heroValue}>
              {model.selectedAthlete.formattedValueAtCursor}
              <Text style={s.heroUnit}> {model.unit}</Text>
            </Text>
            <View
              style={[
                s.placeBadge,
                model.selectedAthlete.you
                  ? s.placeBadgeYou
                  : s.placeBadgeRival,
              ]}
            >
              <Text
                style={[
                  s.placeBadgeText,
                  model.selectedAthlete.you
                    ? s.placeBadgeTextYou
                    : s.placeBadgeTextRival,
                ]}
              >
                {model.placeLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.headerRight}>
          <Text style={s.gapPrimary} numberOfLines={1}>
            {model.gapLabel}
          </Text>
          <Text
            style={[
              s.overtakeSub,
              model.overtakeCount > 0 && { color: c.fieldTeal },
            ]}
            numberOfLines={1}
          >
            {model.overtakeLabel}
          </Text>
        </View>
      </View>

      {/* Time-Series SVG Plot */}
      <View
        {...panHandlers}
        onLayout={(event) => {
          plotWidthRef.current = Math.max(1, event.nativeEvent.layout.width);
        }}
        onTouchStart={(event) => {
          if (compact) return;
          if (event.nativeEvent.locationX != null) {
            updateScrubFromLocationX(event.nativeEvent.locationX);
          }
        }}
        onTouchMove={(event) => {
          if (compact) return;
          if (event.nativeEvent.locationX != null) {
            updateScrubFromLocationX(event.nativeEvent.locationX);
          }
        }}
        onTouchEnd={() => {
          if (compact) return;
          lastDayBucketRef.current = null;
          setScrubFraction(null);
        }}
        onTouchCancel={() => {
          if (compact) return;
          lastDayBucketRef.current = null;
          setScrubFraction(null);
        }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Race timeline, ${model.selectedAthlete.firstName} ${model.selectedAthlete.formattedValueAtCursor} ${model.unit}, ${model.placeLabel}`}
        style={[s.plotWrap, compact && s.plotWrapCompact]}
      >
        <Svg
          width="100%"
          height={compact ? 140 : model.height}
          viewBox={`0 0 ${model.width} ${model.height}`}
        >
          {/* Future zone wash (now -> Sun) */}
          {model.nowX < model.right ? (
            <Rect
              x={model.nowX}
              y={model.top - 4}
              width={Math.max(0, model.right - model.nowX)}
              height={model.bottom - model.top + 8}
              fill={c.paper}
              opacity={0.75}
              rx={4}
            />
          ) : null}

          {/* Horizontal Y gridlines & labels */}
          {model.yTicks.map((tick, idx) => (
            <G key={`y-${idx}`}>
              <Line
                x1={model.left}
                x2={model.right}
                y1={tick.y}
                y2={tick.y}
                stroke={c.line}
                strokeWidth={0.8}
              />
              <SvgText
                x={model.left - 6}
                y={tick.y + 3.5}
                textAnchor="end"
                fill={c.muted}
              >
                {tick.label}
              </SvgText>
            </G>
          ))}

          {/* X-axis day ticks (Mon - Sun) */}
          {model.dayTicks.map((day) => (
            <G key={`d-${day.index}`}>
              <Line
                x1={day.x}
                x2={day.x}
                y1={model.top}
                y2={model.bottom}
                stroke={c.line}
                strokeWidth={0.6}
                strokeDasharray={day.future ? "2 3" : undefined}
              />
              <SvgText
                x={day.x}
                y={model.height - 10}
                textAnchor="middle"
                fill={day.active ? c.ink : c.muted}
                opacity={day.future ? 0.5 : 1}
              >
                {day.label}
              </SvgText>
            </G>
          ))}

          {/* Active time cursor line */}
          <Line
            x1={model.cursorX}
            x2={model.cursorX}
            y1={model.top - 4}
            y2={model.bottom}
            stroke={c.ink}
            strokeWidth={1}
            strokeDasharray={model.isScrubbing ? undefined : "2 3"}
            opacity={model.isScrubbing ? 0.45 : 0.25}
          />

          {/* Unselected background competitor traces */}
          {unselectedAthletes.map((athlete) => (
            <G key={athlete.id}>
              <Polyline
                points={athlete.polyline}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={1.35}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.32}
              />
              <Circle
                cx={athlete.cursorX}
                cy={athlete.cursorY}
                r={2.4}
                fill="#94a3b8"
                opacity={0.45}
              />
            </G>
          ))}

          {/* Single Selected Athlete foreground trace */}
          <G key={`selected-${model.selectedAthlete.id}`}>
            <Polyline
              points={model.selectedAthlete.polyline}
              fill="none"
              stroke={selectedStroke}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>

          {/* Overtake Crossover Nodes (drawn ONLY for the selected athlete) */}
          {model.overtakes.map((node) => (
            <G key={node.id}>
              <Circle
                cx={node.x}
                cy={node.y}
                r={4.8}
                fill="#fff5d1"
                stroke={c.tennis}
                strokeWidth={1.8}
              />
              <Circle cx={node.x} cy={node.y} r={1.8} fill={c.ink} />
            </G>
          ))}

          {/* Selected Athlete Live/Cursor Tip Node + Pill */}
          <G>
            <Circle
              cx={model.selectedAthlete.cursorX}
              cy={model.selectedAthlete.cursorY}
              r={8}
              fill={selectedStroke}
              opacity={0.16}
            />
            <Circle
              cx={model.selectedAthlete.cursorX}
              cy={model.selectedAthlete.cursorY}
              r={4.5}
              fill={selectedStroke}
              stroke="#ffffff"
              strokeWidth={1.8}
            />
            <Rect
              x={model.tipPill.x}
              y={model.tipPill.y}
              width={model.tipPill.width}
              height={model.tipPill.height}
              rx={6}
              fill={model.selectedAthlete.you ? c.ink : "#fffbeb"}
              stroke={model.selectedAthlete.you ? "none" : c.podiumGold}
              strokeWidth={model.selectedAthlete.you ? 0 : 1}
            />
            <SvgText
              x={model.tipPill.x + model.tipPill.width / 2}
              y={model.tipPill.y + 13.5}
              textAnchor="middle"
              fill={model.selectedAthlete.you ? c.tennis : c.ink}
            >
              {model.tipPill.text}
            </SvgText>
          </G>
        </Svg>
      </View>

      {/* Single-Select Athlete Quick-Focus Chips */}
      {!compact && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        >
          {model.athletes.map((athlete) => {
            const active = athlete.selected;
            return (
              <Pressable
                key={athlete.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Select ${athlete.name}, place ${athlete.placeAtCursor}`}
                onPress={() => handleSelectAthlete(athlete.id)}
                style={[
                  s.chip,
                  active &&
                    (athlete.you ? s.chipSelectedYou : s.chipSelectedRival),
                ]}
              >
                <Text
                  style={[
                    s.chipRank,
                    active &&
                      (athlete.you
                        ? s.chipRankSelectedYou
                        : s.chipRankSelectedRival),
                  ]}
                >
                  #{athlete.placeAtCursor}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    s.chipName,
                    active &&
                      (athlete.you
                        ? s.chipNameSelectedYou
                        : s.chipNameSelectedRival),
                  ]}
                >
                  {athlete.firstName}
                </Text>
                <Text
                  style={[
                    s.chipVal,
                    active &&
                      (athlete.you
                        ? s.chipValSelectedYou
                        : s.chipValSelectedRival),
                  ]}
                >
                  {athlete.formattedValueAtCursor}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const sThemes = createThemedStyles((themeColors) => {
  const c = themeColors;
  return {
  card: {
    backgroundColor: c.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.line,
    padding: 16,
    gap: 10,
  },
  cardCompact: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 8,
    gap: 6,
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  timeCaption: {
    ...textStyle("caption"),
    color: c.muted,
  },
  readingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 8,
  },
  heroValue: {
    ...textStyle("hero"),
    color: c.ink,
    fontVariant: ["tabular-nums"],
  },
  heroUnit: {
    ...textStyle("body"),
    color: c.muted,
  },
  placeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  placeBadgeYou: {
    backgroundColor: "rgba(23, 108, 117, 0.1)",
  },
  placeBadgeRival: {
    backgroundColor: "rgba(247, 201, 72, 0.24)",
  },
  placeBadgeText: {
    ...textStyle("caption"),
  },
  placeBadgeTextYou: {
    color: c.fieldTeal,
  },
  placeBadgeTextRival: {
    color: c.ink,
  },
  headerRight: {
    alignItems: "flex-end",
    paddingTop: 2,
    gap: 2,
  },
  gapPrimary: {
    ...textStyle("label"),
    color: c.ink,
    fontVariant: ["tabular-nums"],
  },
  overtakeSub: {
    ...textStyle("caption"),
    color: c.muted,
  },
  plotWrap: {
    width: "100%",
    minHeight: 204,
  },
  plotWrapCompact: {
    minHeight: 0,
    flex: 1,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: c.line,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
  },
  chipSelectedYou: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  chipSelectedRival: {
    backgroundColor: "#fffbeb",
    borderColor: c.podiumGold,
  },
  chipRank: {
    ...textStyle("caption"),
    color: c.muted,
    fontVariant: ["tabular-nums"],
  },
  chipRankSelectedYou: {
    color: c.tennis,
  },
  chipRankSelectedRival: {
    color: "#b45309",
  },
  chipName: {
    ...textStyle("caption"),
    color: c.ink,
  },
  chipNameSelectedYou: {
    color: "#ffffff",
  },
  chipNameSelectedRival: {
    color: c.ink,
  },
  chipVal: {
    ...textStyle("caption"),
    color: c.muted,
    fontVariant: ["tabular-nums"],
  },
  chipValSelectedYou: {
    color: "rgba(255, 255, 255, 0.78)",
  },
  chipValSelectedRival: {
    color: c.muted,
  },
};});
