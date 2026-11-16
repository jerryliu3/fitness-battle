import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { buildCompetitionMomentTimeSeriesModel, type CompetitionMoment } from "@fitness-battle/shared";
import * as RN from "react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as SvgModule from "react-native-svg";
import {
  APP_COLORS,
  competeChartPreview,
  evaluateCompeteTimeSeriesModel,
  prepareCompeteTimeSeriesBase,
  prepareSleepTimeSeriesBase,
  clamp,
  competeNow,
  sportById,
  type CompeteState,
  type CompeteTimeSeriesModel,
  type CompeteTimeSeriesView,
  type ScoreTrack,
  type SportId,
} from "@fitness-battle/shared";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { playCue } from "../lib/haptics";
import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { AppIcon } from "./app-icon";
import { AthleteNode } from "./athlete-node";
import { chartTextProps, textStyle } from "./section";
import { UserAvatar } from "./user-avatar";
import { useReducedMotion } from "./use-reduced-motion";
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
const SvgText = svgTag("Text", "SvgText");

const DIRECTION_LOCK_PX = 4;

const GRAPH_VIEWS: readonly { id: CompeteTimeSeriesView; label: string; icon: "progress" | "scoring" }[] = [
  { id: "trajectory", label: "Trajectory", icon: "progress" },
  { id: "event", label: "Event", icon: "scoring" },
];

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
  immersive = false,
  topInset = 0,
  bottomInset = 0,
  view,
  onViewChange,
  timelineFraction,
  onTimelineChange,
  momentReplay,
  active = true,
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
  immersive?: boolean;
  topInset?: number;
  bottomInset?: number;
  view?: CompeteTimeSeriesView;
  onViewChange?: (view: CompeteTimeSeriesView) => void;
  timelineFraction?: number | null;
  onTimelineChange?: (value: number | null) => void;
  momentReplay?: { moment: CompetitionMoment; progress: number };
  active?: boolean;
}) {
  const c = useThemeColors();
  const reduceMotion = useReducedMotion();
  const { blocks } = useAthleteBlocks();
  const excludedIds = useMemo(() => [...new Set([...(hiddenIds ?? []), ...blocks.map(block => block.id)])], [hiddenIds, blocks]);
  const { height: screenHeight } = RN.useWindowDimensions();
  const plotHeight = immersive ? Math.max(260, screenHeight - topInset - bottomInset - 210) : 204;
  const s = useThemedStyles(sThemes);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null,
  );
  const [popupOpen, setPopupOpen] = useState(false);
  const [internalView, setInternalView] = useState<CompeteTimeSeriesView>("event");
  const activeView = view ?? internalView;
  const setActiveView = onViewChange ?? setInternalView;
  const [internalFraction, setInternalFraction] = useState<number | null>(null);
  const scrubFraction = timelineFraction !== undefined ? timelineFraction : internalFraction;
  const setScrubFraction = onTimelineChange ?? setInternalFraction;
  const plotWidthRef = useRef(300);
  // Touch locationX is relative to the touched child (e.g. a node), so scrubbing uses page coordinates.
  const plotRef = useRef<ComponentRef<typeof View>>(null);
  const plotPageXRef = useRef(0);
  const [plotWidth, setPlotWidth] = useState(0);
  const [foreground, setForeground] = useState(
    () => !RN.AppState?.currentState || RN.AppState.currentState === "active",
  );
  useEffect(() => {
    if (!RN.AppState?.addEventListener) return;
    const subscription = RN.AppState.addEventListener("change", (status) => {
      setForeground(status === "active");
    });
    return () => subscription?.remove?.();
  }, []);
  const pulseValueRef = useRef(
    typeof RN.Animated?.Value === "function"
      ? new RN.Animated.Value(0)
      : null,
  );
  const lastDayBucketRef = useRef<number | null>(null);
  const directionRef = useRef<"horizontal" | "vertical" | null>(null);

  const activeSelectedId =
    selectedId !== undefined ? selectedId : internalSelectedId;

  const now = competeNow(state);
  const nowMs = now.getTime();
  const baseModel = useMemo(() => {
    if (momentReplay) return null;
    const viewOption = compact ? undefined : activeView;
    if (mode === "sleep") {
      return prepareSleepTimeSeriesBase(state, now, {
        hiddenIds: excludedIds,
        view: viewOption,
      });
    }
    return prepareCompeteTimeSeriesBase(
      state,
      sport ?? state.primary,
      track,
      now,
      {
        hiddenIds: excludedIds,
        view: viewOption,
      },
    );
  }, [state, sport, track, mode, excludedIds, activeView, compact, nowMs, momentReplay?.moment]);

  const model: CompeteTimeSeriesModel = useMemo(
    () =>
      momentReplay ? buildCompetitionMomentTimeSeriesModel(momentReplay.moment, momentReplay.progress, {
        height: plotHeight, hiddenIds: excludedIds, selectedAthleteId: activeSelectedId,
      }) : evaluateCompeteTimeSeriesModel(baseModel!, {
        height: plotHeight,
        selectedAthleteId: activeSelectedId,
        scrubFraction,
      }),
    [baseModel, plotHeight, activeSelectedId, scrubFraction, momentReplay, excludedIds],
  );

  const handleSelectAthlete = (id: string) => {
    void playCue("selection");
    if (model.selectedAthlete.id === id) {
      setPopupOpen((open) => !open);
    } else {
      setPopupOpen(false);
    }
    if (selectedId === undefined) {
      setInternalSelectedId(id);
    }
    onSelectAthlete?.(id);
  };

  const scrubRafRef = useRef<number | null>(null);
  const pendingLocationXRef = useRef<number | null>(null);
  const lastCommittedFractionRef = useRef<number | null>(null);

  const commitScrubFromLocationX = (locationX: number) => {
    if (!model.historyAvailable) return;
    const width = Math.max(1, plotWidthRef.current);
    const svgX = (locationX / width) * model.width;
    const rawFraction =
      ((svgX - model.left) / Math.max(1, model.right - model.left)) *
      model.xSpanFraction;
    const clamped = clamp(0, model.nowFraction, rawFraction);
    if (
      lastCommittedFractionRef.current !== null &&
      Math.abs(clamped - lastCommittedFractionRef.current) < 1e-4
    ) {
      return;
    }
    lastCommittedFractionRef.current = clamped;
    const dayBucket = Math.floor(clamped * 14);
    if (lastDayBucketRef.current !== dayBucket) {
      lastDayBucketRef.current = dayBucket;
      void playCue("selection");
    }
    setScrubFraction(clamped);
  };

  const commitScrubRef = useRef(commitScrubFromLocationX);
  commitScrubRef.current = commitScrubFromLocationX;

  const scheduleScrubFromLocationX = (locationX: number) => {
    pendingLocationXRef.current = locationX;
    if (typeof requestAnimationFrame !== "function") {
      commitScrubRef.current(locationX);
      return;
    }
    if (scrubRafRef.current !== null) return;
    scrubRafRef.current = requestAnimationFrame(() => {
      scrubRafRef.current = null;
      const x = pendingLocationXRef.current;
      if (x !== null) commitScrubRef.current(x);
    });
  };

  const clearScheduledScrub = () => {
    pendingLocationXRef.current = null;
    lastCommittedFractionRef.current = null;
    if (scrubRafRef.current !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(scrubRafRef.current);
      scrubRafRef.current = null;
    }
  };

  useEffect(() => clearScheduledScrub, []);

  const updateScrubRef = useRef(scheduleScrubFromLocationX);
  updateScrubRef.current = scheduleScrubFromLocationX;

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
          updateScrubRef.current(event.nativeEvent.pageX - plotPageXRef.current);
        }
      },
      onPanResponderTerminationRequest: () =>
        directionRef.current !== "horizontal",
      onPanResponderRelease: () => {
        directionRef.current = null;
        lastDayBucketRef.current = null;
        clearScheduledScrub();
        setScrubFraction(null);
      },
      onPanResponderTerminate: () => {
        directionRef.current = null;
        lastDayBucketRef.current = null;
        clearScheduledScrub();
        setScrubFraction(null);
      },
    }).panHandlers;
  }, [compact]);

  const placeColor = (place: number) => (place === 1 ? c.tennis : c.secondary);
  const selectedLeads = model.selectedAthlete.placeAtCursor === 1;
  const unselectedAthletes = model.athletes.filter((a) => !a.selected);
  const showLivePulse = !compact && !model.isScrubbing && !reduceMotion && active && foreground;

  useEffect(() => {
    const pulse = pulseValueRef.current;
    if (!pulse || typeof RN.Animated?.loop !== "function" || typeof RN.Animated?.timing !== "function") return;
    pulse.setValue(0);
    if (!showLivePulse) return;
    const animation = RN.Animated.loop(
      RN.Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: RN.Easing?.inOut ? RN.Easing.inOut(RN.Easing.ease) : undefined,
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [showLivePulse]);

  if (compact) {
    const preview = competeChartPreview(model);
    return <View accessibilityLabel="Current race position over the past day" style={{ flex: 1, width: "100%", aspectRatio: 1, backgroundColor: c.paper }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${preview.width} ${preview.height}`}>
        {preview.yTicks.map(tick => <G key={tick.y}><Line x1={preview.left} x2={preview.right} y1={tick.y} y2={tick.y} stroke={c.line} /><SvgText {...chartTextProps()} x={preview.left - 8} y={tick.y + 4} textAnchor="end" fill={c.muted}>{tick.label}</SvgText></G>)}
        {preview.xTicks.map((tick, i) => <SvgText {...chartTextProps()} key={tick.label} x={tick.x} y={282} textAnchor={i ? "end" : "start"} fill={c.muted}>{tick.label}</SvgText>)}
        {preview.athletes.map(athlete => <G key={athlete.id}>
          <Polyline points={athlete.points} fill="none" stroke={placeColor(athlete.placeAtCursor)} strokeWidth={athlete.selected ? 4 : 2} opacity={athlete.selected ? 1 : .65} />
          <G transform={`translate(${athlete.x} ${athlete.y})`}>
            <AthleteNode
              lane={athlete}
              x={0}
              y={0}
              detail=""
              prefix={`preview-${athlete.id}`}
              expanded={false}
              selected={athlete.id === activeSelectedId}
              gold={athlete.placeAtCursor === 1}
              nodeRadius={22}
            />
          </G>
        </G>)}
      </Svg>
    </View>;
  }

  const cleanGapLabel = model.gapLabel
    .replace(/^Tied with .+$/i, "Tied")
    .replace(/(\s+to\s+#\d+)\s+.+$/i, "$1")
    .replace(/\s+vs\s+.+$/i, "");

  return (
    <View
      accessibilityLabel="Weekly competition time-series graph"
      style={[
        s.card,
        immersive && {
          flex: 1,
          borderRadius: 0,
          borderWidth: 0,
          backgroundColor: c.paper,
          paddingHorizontal: 10,
          paddingTop: topInset + 6,
          paddingBottom: bottomInset + 130,
          gap: 6,
          justifyContent: "space-between",
        },
        reserveTopControls && { paddingTop: 64 },
      ]}
    >
      {/* Pure Open Line Header */}
      {immersive ? (
        <View style={s.immersiveHeader}>
          <UserAvatar
            src={model.selectedAthlete.avatarUrl}
            name={model.selectedAthlete.name}
            size={40}
            highlight={model.selectedAthlete.you}
          />
          <View style={s.immersiveHeaderText}>
            <Text style={s.immersiveName} numberOfLines={1}>
              {model.selectedAthlete.name}
            </Text>
            <View style={s.immersiveMetaRow}>
              <Text
                style={[
                  s.immersivePlace,
                  model.selectedAthlete.placeAtCursor !== 1 && {
                    color: model.selectedAthlete.you ? c.fieldTeal : c.ink,
                  },
                ]}
              >
                {model.placeLabel}
              </Text>
              <Text style={s.immersiveMetaDot}>·</Text>
              <Text style={s.immersiveMetric}>
                {`${model.selectedAthlete.formattedValueAtCursor} ${model.unit}`}
              </Text>
            </View>
          </View>
        </View>
      ) : (
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
                  selectedLeads && s.placeBadgeLeader,
                ]}
              >
                <Text style={s.placeBadgeText}>
                  {model.placeLabel}
                </Text>
              </View>
            </View>
          </View>

        <View style={s.headerRight}>
          <Text style={s.gapPrimary} numberOfLines={1}>
            {cleanGapLabel}
          </Text>
          {model.historyAvailable && <Text
            style={[
              s.overtakeSub,
              model.overtakeCount > 0 && { color: c.fieldTeal },
            ]}
            numberOfLines={1}
          >
            {model.overtakeLabel}
          </Text>}
        </View>
        </View>
      )}

      {/* Time-Series SVG Plot */}
      <View
        ref={plotRef}
        {...panHandlers}
        onLayout={(event) => {
          const nextWidth = Math.max(1, event.nativeEvent.layout.width);
          plotWidthRef.current = nextWidth;
          setPlotWidth(nextWidth);
        }}
        onTouchStart={(event) => {
          if (compact) return;
          const { pageX } = event.nativeEvent;
          plotRef.current?.measure((_x, _y, _width, _height, plotPageX) => {
            plotPageXRef.current = plotPageX;
            scheduleScrubFromLocationX(pageX - plotPageX);
          });
        }}
        onTouchMove={(event) => {
          if (compact) return;
          scheduleScrubFromLocationX(event.nativeEvent.pageX - plotPageXRef.current);
        }}
        onTouchEnd={() => {
          if (compact) return;
          lastDayBucketRef.current = null;
          clearScheduledScrub();
          setScrubFraction(null);
        }}
        onTouchCancel={() => {
          if (compact) return;
          lastDayBucketRef.current = null;
          clearScheduledScrub();
          setScrubFraction(null);
        }}
        accessible
        accessibilityRole={model.historyAvailable ? "adjustable" : "image"}
        accessibilityLabel={`Race timeline, ${model.selectedAthlete.firstName} ${model.selectedAthlete.formattedValueAtCursor} ${model.unit}, ${model.placeLabel}`}
        style={s.plotWrap}
      >
        <Svg
          width="100%"
          height={model.height}
          viewBox={`0 0 ${model.width} ${model.height}`}
        >
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

          {/* Active time cursor line (visible when scrubbing) */}
          {model.isScrubbing && (
            <>
              <Line
                x1={model.cursorX}
                x2={model.cursorX}
                y1={model.top - 4}
                y2={model.bottom}
                stroke={c.ink}
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.45}
              />
              {!immersive && model.cursorTimeLabel ? (
                <SvgText
                  {...chartTextProps()}
                  x={Math.max(model.left + 36, Math.min(model.right - 36, model.cursorX))}
                  y={Math.max(12, model.top - 8)}
                  textAnchor="middle"
                  fill={c.muted}
                >
                  {model.cursorTimeLabel}
                </SvgText>
              ) : null}
            </>
          )}

          {/* Unselected background competitor traces + circular profile nodes */}
          {unselectedAthletes.map((athlete) => (
            <G key={athlete.id}>
              <Polyline
                points={athlete.polyline}
                fill="none"
                stroke={placeColor(athlete.placeAtCursor)}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.6}
              />
              <G transform={`translate(${athlete.cursorX} ${athlete.cursorY})`}>
                <AthleteNode
                  lane={athlete}
                  x={0}
                  y={0}
                  detail=""
                  prefix={`ts-peer-${athlete.id}`}
                  expanded={false}
                  selected={false}
                  gold={athlete.placeAtCursor === 1}
                  nodeRadius={22}
                />
              </G>
            </G>
          ))}

          {/* Single Selected Athlete foreground trace */}
          <G key={`selected-${model.selectedAthlete.id}`}>
            <Polyline
              points={model.selectedAthlete.polyline}
              fill="none"
              stroke={placeColor(model.selectedAthlete.placeAtCursor)}
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
              <Circle cx={node.x} cy={node.y} r={1.8} fill={c.textOnAction} />
            </G>
          ))}

          {/* Selected Athlete Live/Cursor Circular Profile Node + Expandable Detail Popup */}
          <G transform={`translate(${model.selectedAthlete.cursorX} ${model.selectedAthlete.cursorY})`}>
            <AthleteNode
              lane={{
                name: model.selectedAthlete.name,
                initials: model.selectedAthlete.initials,
                you: model.selectedAthlete.you,
                avatarUrl: model.selectedAthlete.avatarUrl,
              }}
              x={clamp(
                model.left - model.selectedAthlete.cursorX + 4,
                model.width - 132 - model.selectedAthlete.cursorX,
                model.selectedAthlete.cursorX > 180 ? -144 : 20,
              )}
              y={clamp(
                model.top - model.selectedAthlete.cursorY - 8,
                model.bottom - 48 - model.selectedAthlete.cursorY + 8,
                model.selectedAthlete.cursorY > model.top + 56 ? -56 : 20,
              )}
              detail={`${model.placeLabel} · ${model.selectedAthlete.formattedValueAtCursor} ${model.unit}`}
              subdetail={cleanGapLabel}
              prefix={`athlete-${model.selectedAthlete.id}`}
              expanded={popupOpen}
              selected={model.selectedAthlete.id === activeSelectedId}
              gold={selectedLeads}
              nodeRadius={22}
            />
          </G>
        </Svg>
        {(() => {
          const pulse = pulseValueRef.current;
          const AnimatedView = RN.Animated?.View;
          if (!showLivePulse || plotWidth <= 0 || !pulse || !AnimatedView) return null;
          const scale = Math.min(plotWidth / model.width, 1);
          const offsetX = (plotWidth - model.width * scale) / 2;
          const offsetY = (model.height - model.height * scale) / 2;
          const dotLeft = offsetX + model.selectedAthlete.cursorX * scale;
          const dotTop = offsetY + model.selectedAthlete.cursorY * scale;
          return (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: dotLeft - 14,
                top: dotTop - 14,
                width: 28,
                height: 28,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AnimatedView
                style={{
                  position: "absolute",
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: model.selectedAthlete.you ? c.fieldTeal : c.podiumGold,
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
                }}
              />
            </View>
          );
        })()}
        {plotWidth > 0
          ? model.athletes.map((athlete) => {
              const scale = Math.min(plotWidth / model.width, 1);
              const offsetX = (plotWidth - model.width * scale) / 2;
              const offsetY = (model.height - model.height * scale) / 2;
              const nodeLeft = offsetX + athlete.cursorX * scale;
              const nodeTop = offsetY + athlete.cursorY * scale;
              const hitRadius = 28;
              return (
                <Pressable
                  key={`node-hit-${athlete.id}`}
                  accessible={false}
                  onTouchStart={(event) => event.stopPropagation()}
                  onTouchMove={(event) => event.stopPropagation()}
                  onPress={() => handleSelectAthlete(athlete.id)}
                  style={{
                    position: "absolute",
                    left: nodeLeft - hitRadius,
                    top: nodeTop - hitRadius,
                    width: hitRadius * 2,
                    height: hitRadius * 2,
                    borderRadius: hitRadius,
                  }}
                />
              );
            })
          : null}
      </View>

      {/* Graph View Switcher: Trajectory vs Event (non-immersive; immersive uses layers menu) */}
      {!immersive && (
        <View style={s.viewToggleTrack} accessibilityRole="tablist">
          {GRAPH_VIEWS.map((option) => {
            const selected = activeView === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${option.label} graph view`}
                onPress={() => {
                  if (selected) return;
                  void playCue("selection");
                  setActiveView(option.id);
                }}
                style={[s.viewToggleTab, selected && s.viewToggleTabSelected]}
              >
                <AppIcon
                  name={option.icon}
                  size={15}
                  color={selected ? c.ink : c.muted}
                />
                <Text style={[s.viewToggleLabel, selected && s.viewToggleLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Single-Select Athlete Quick-Focus Chips */}
      {!immersive && (
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
                  {athlete.initials}
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
  const dark = c.paper === APP_COLORS.dark.paper;
  return {
  card: {
    backgroundColor: c.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.line,
    padding: 16,
    gap: 10,
  },
  immersiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    minHeight: 44,
    gap: 10,
    paddingHorizontal: 56,
  },
  immersiveHeaderText: {
    flexShrink: 1,
    gap: 1,
  },
  immersiveName: {
    ...textStyle("heading"),
    color: c.ink,
  },
  immersiveMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  immersivePlace: {
    ...textStyle("label"),
    color: c.podiumGold,
  },
  immersiveMetaDot: {
    ...textStyle("label"),
    color: c.muted,
  },
  immersiveMetric: {
    ...textStyle("label"),
    color: c.muted,
    fontVariant: ["tabular-nums"],
  },
  viewToggleTrack: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderRadius: 999,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    gap: 4,
  },
  viewToggleTab: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
  },
  viewToggleTabSelected: dark
    ? { backgroundColor: c.actionSoft, borderColor: c.podiumGold }
    : { backgroundColor: c.soft, borderColor: c.line },
  viewToggleLabel: {
    ...textStyle("label"),
    color: c.muted,
  },
  viewToggleLabelSelected: {
    color: c.ink,
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
    backgroundColor: c.soft,
  },
  placeBadgeLeader: {
    backgroundColor: "rgba(247, 201, 72, 0.24)",
  },
  placeBadgeText: {
    ...textStyle("caption"),
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
    backgroundColor: c.surfaceInverse,
    borderColor: c.surfaceInverse,
  },
  chipSelectedRival: {
    backgroundColor: c.actionSoft,
    borderColor: c.podiumGold,
  },
  chipRank: {
    ...textStyle("caption"),
    color: c.muted,
    fontVariant: ["tabular-nums"],
  },
  chipRankSelectedYou: {
    color: c.textOnInverse,
  },
  chipRankSelectedRival: {
    color: c.ink,
  },
  chipName: {
    ...textStyle("caption"),
    color: c.ink,
  },
  chipNameSelectedYou: {
    color: c.textOnInverse,
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
    color: c.textOnInverse,
  },
  chipValSelectedRival: {
    color: c.muted,
  },
};});
