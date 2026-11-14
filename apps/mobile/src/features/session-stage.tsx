import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import {
  APP_TIMEZONE, EFFORT_TIER_LABELS, PROVIDERS, activityComparisons, activityEffort, activityRoute, competeNow, countsOnTrack,
  distanceUnitLabel, formatClockTime, formatDistanceM, formatEffort, formatTrainingHours,
  isVerifiedActivity, sessionEffortSummary, sessionStageModel, sportById,
  type Activity, type CompeteState, type UnitSystem,
} from "@fitness-battle/shared";
import { ActivityRoute } from "../ui/activity-route";
import { EffortBarsIcon } from "../ui/effort-bars-icon";
import { AppText } from "../ui/section";
import { SportIcon } from "../ui/sport-icon";
import { Chip, ChipRow } from "../ui/chip";
import { AnimatedEmber } from "../ui/mascot/animated-ember";

import { ActivityComparison } from "./activity-comparison";
import {
  ActivityScatterChart,
  ActivityTrajectoryChart,
  ActivityVolumeChart,
  useActivityContextAvailability,
} from "./activity-context";

type InsightKey = "comparison" | "trajectory" | "volume" | "scatter";

function formatPace(movingSec: number, distanceM: number, units: UnitSystem): string | null {
  if (distanceM <= 0 || movingSec <= 0) return null;
  const distUnits = units === "us" ? distanceM / 1609.344 : distanceM / 1000;
  if (distUnits <= 0) return null;
  const totalSec = Math.round(movingSec / distUnits);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}'${String(secs).padStart(2, "0")}"/${units === "us" ? "mi" : "km"}`;
}

function formatElevation(elevationM: number, units: UnitSystem): string {
  return units === "us"
    ? `${Math.round(elevationM * 3.28084)} ft`
    : `${Math.round(elevationM)} m`;
}

export function SessionStage({ state, activities, suggestion, onRemove, actions }: {
  state: CompeteState; activities: Activity[]; suggestion?: { kind?: string; title: string; minutes?: number | null; detail: string };
  onRemove: (id: string) => void; actions?: ReactNode;
}) {
  const s = useThemedStyles(sThemes);

  const model = sessionStageModel(activities);
  const [selected, setSelected] = useState<string | null>(null);
  const current = model.rows.find(row => row.id === selected) ?? model.rows[0];
  if (!current) {
    const suggestedMin = suggestion?.minutes ?? 0;
    const isHours = suggestedMin >= 60;
    const timeVal = isHours ? (suggestedMin / 60).toFixed(1) : String(suggestedMin);
    const timeUnit = isHours ? "hr · Suggested time" : "min · Suggested time";
    return <View style={s.stack}>
      <AppText role="display" accessibilityRole="header">{suggestion?.title ?? "Make room to move."}</AppText>
      <View style={s.suggestion}><View><AppText role="hero">{timeVal}</AppText><AppText role="caption" secondary>{timeUnit}</AppText></View><AnimatedEmber size={90} expression="happy" action="idle" loop /></View>
      <AppText secondary>{suggestion?.detail ?? "Nothing recorded today."}</AppText>{suggestion?.kind !== "rest" && actions}
    </View>;
  }
  return <View style={s.stack}>
    {model.rows.length > 1 ? <View style={s.group}>
      <AppText role="label">{`${model.sessions} recorded sessions · ${formatTrainingHours(model.movingSec)} hr total`}</AppText>
      <ChipRow>
        {model.rows.map(row => (
          <Chip
            key={row.id}
            selected={row.id === current.id}
            onPress={() => setSelected(row.id)}
            label={`${sportById(row.sport).name} · ${new Date(row.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE })}`}
          />
        ))}
      </ChipRow>
    </View> : null}
    <ActivityDetailView key={current.id} activity={current} state={state} onRemove={onRemove} />
  </View>;
}

export function ActivityDetailView({
  activity,
  state,
  onRemove,
}: {
  activity: Activity;
  state: CompeteState;
  onRemove?: (id: string) => void;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);

  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState<InsightKey | null>(null);

  const sport = sportById(activity.sport);
  const hasRoute = Boolean(activityRoute(activity));
  const effortSummary = sessionEffortSummary(activity, state.activities);
  const effortPts = formatEffort(activityEffort(activity));
  const pace = sport.gps ? formatPace(activity.movingSec, activity.distanceM, state.units) : null;
  const date = new Date(activity.startedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: APP_TIMEZONE });
  const time = new Date(activity.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE });
  const { history, hasScatter } = useActivityContextAvailability(activity, state);
  const comparisons = activityComparisons(activity, state.activities, state.units, competeNow(state));
  const topComparison = comparisons[0];

  const stats: { label: string; value: string; detail?: string; accent?: string }[] = [
    { label: "Workout time", value: formatClockTime(activity.movingSec), accent: c.tennis },
    ...(activity.distanceM > 0
      ? [{ label: "Distance", value: `${formatDistanceM(activity.distanceM, state.units)} ${distanceUnitLabel(state.units)}`, accent: c.green }]
      : []),
    ...(pace ? [{ label: "Avg pace", value: pace }] : []),
    {
      label: "Effort",
      value: `${effortPts} pts`,
      detail: `${EFFORT_TIER_LABELS[effortSummary.tier]} · ${effortSummary.bars}/5`,
      accent: c.podiumGold,
    },
    ...(activity.avgHr != null ? [{ label: "Avg heart rate", value: `${Math.round(activity.avgHr)} bpm`, accent: c.statusError }] : []),
    ...(activity.elevationGainM != null && activity.elevationGainM > 0
      ? [{ label: "Elevation gain", value: formatElevation(activity.elevationGainM, state.units) }]
      : []),
  ];

  const insightTiles: { key: InsightKey; title: string; summary: string }[] = [
    ...(comparisons.length > 0
      ? [{
          key: "comparison" as const,
          title: "Compared with usual",
          summary: topComparison ? `${topComparison.label}: ${topComparison.currentLabel}` : "30-day median",
        }]
      : []),
    ...(history.length > 0
      ? [{
          key: "trajectory" as const,
          title: "Recent trajectory",
          summary: `${history.length} session trend`,
        }]
      : []),
    ...(history.length > 0
      ? [{
          key: "volume" as const,
          title: "Volume added",
          summary: `+${Math.round(activity.movingSec / 60)} min · 7d avg`,
        }]
      : []),
    ...(hasScatter
      ? [{
          key: "scatter" as const,
          title: sport.gps ? "Pace × heart rate" : "Duration × heart rate",
          summary: `${history.length} sessions`,
        }]
      : []),
  ];

  const toggleInsight = (key: InsightKey) => setExpanded((cur) => (cur === key ? null : key));

  return (
    <View style={s.details}>
      {/* Top Hero Visual: interactive route when GPS exists, or Effort hero tile when non-GPS */}
      {hasRoute ? (
        <ActivityRoute activity={activity} units={state.units} />
      ) : (
        <View style={s.effortHero}>
          <EffortBarsIcon bars={effortSummary.bars} size={64} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText role="caption" secondary>Session effort · {effortSummary.bars}/5</AppText>
            <AppText role="heading" accessibilityRole="header">{EFFORT_TIER_LABELS[effortSummary.tier]}</AppText>
            <AppText role="caption" secondary>
              {!effortSummary.hasBaseline
                ? "First logged session in 30 days"
                : effortSummary.ratio >= 1
                  ? `${effortSummary.ratio.toFixed(1)}× your 30-day ${effortSummary.basis}`
                  : `${Math.round(effortSummary.ratio * 100)}% of your 30-day ${effortSummary.basis}`}
            </AppText>
          </View>
        </View>
      )}

      {/* Header strip */}
      <View style={s.headerStrip}>
        <View style={s.sportBadge}>
          <SportIcon sport={activity.sport} size={20} />
          <AppText role="heading" accessibilityRole="header">{sport.name}</AppText>
        </View>
        <AppText role="caption" secondary>
          {date} · {time}
          {!countsOnTrack(activity, "open") ? " · Excluded from totals" : ""}
        </AppText>
      </View>

      {/* Apple Fitness-style 2-column Bento Metrics Grid */}
      <View style={s.bentoGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={s.bentoCard}>
            <AppText role="caption" secondary>{stat.label}</AppText>
            <AppText
              role="metric"
              style={[s.bentoValue, stat.accent ? { color: stat.accent } : null]}
            >
              {stat.value}
            </AppText>
            {stat.detail ? <AppText role="caption" secondary>{stat.detail}</AppText> : null}
          </View>
        ))}
      </View>

      {/* Expandable Bento Insights underneath (tap a tile to inspect chart) */}
      {insightTiles.length > 0 ? (
        <View style={s.insightsWrap}>
          <AppText role="label" secondary>Insights</AppText>
          <View style={s.bentoGrid}>
            {insightTiles.map((tile) => {
              const isOpen = expanded === tile.key;
              return (
                <Pressable
                  key={tile.key}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  onPress={() => toggleInsight(tile.key)}
                  style={({ pressed }) => [
                    s.bentoCard,
                    isOpen && s.bentoTileActive,
                    pressed && { opacity: 0.78 },
                  ]}
                >
                  <View style={s.tileTop}>
                    <AppText role="label" numberOfLines={1} style={{ flex: 1 }}>{tile.title}</AppText>
                    <AppText role="caption" secondary>{isOpen ? "−" : "+"}</AppText>
                  </View>
                  <AppText role="caption" secondary numberOfLines={1}>{tile.summary}</AppText>
                </Pressable>
              );
            })}
          </View>

          {expanded ? (
            <View style={s.expandedPanel}>
              {expanded === "comparison" ? <ActivityComparison activity={activity} state={state} /> : null}
              {expanded === "trajectory" ? <ActivityTrajectoryChart activity={activity} history={history} units={state.units} /> : null}
              {expanded === "volume" ? <ActivityVolumeChart activity={activity} history={history} /> : null}
              {expanded === "scatter" ? <ActivityScatterChart activity={activity} history={history} units={state.units} /> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Quiet source & delete footer */}
      <View style={s.footer}>
        <AppText role="caption" secondary>
          {activity.source === "manual"
            ? "Manually logged"
            : activity.source === "history"
              ? "Imported history"
              : `From ${PROVIDERS.find(provider => provider.id === activity.source)?.name ?? activity.source}`}{" "}
          · {isVerifiedActivity(activity) ? "GPS tracked" : "Recorded activity"}
        </AppText>
        {onRemove ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Delete session" style={s.disclosure} onPress={() => setConfirming(true)}>
            <AppText role="caption" secondary style={{ color: c.statusError }}>Delete session</AppText>
          </Pressable>
        ) : null}
        {onRemove ? (
          <Modal transparent animationType="fade" visible={confirming} onRequestClose={() => setConfirming(false)}>
            <Pressable style={s.modalBackdrop} onPress={() => setConfirming(false)}>
              <Pressable style={s.glassCard} onPress={e => e.stopPropagation()}>
                <View style={s.dialogContent}>
                  <AppText role="heading" accessibilityRole="header">Delete session?</AppText>
                  <AppText role="caption" secondary style={{ textAlign: "center" }}>
                    This session will be deleted from your activity and week totals.
                  </AppText>
                  <View style={s.dialogActions}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Cancel" style={s.cancelBtn} onPress={() => setConfirming(false)}>
                      <AppText role="label">Cancel</AppText>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel="Delete session" style={s.deleteBtn} onPress={() => { setConfirming(false); onRemove(activity.id); }}>
                      <AppText role="label" style={{ color: c.white }}>Delete</AppText>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        ) : null}
      </View>
    </View>
  );
}

const sThemes = createThemedStyles(themeColors => {
  const c = themeColors;
  return {
    stack: { gap: 18 },
    details: { gap: 18 },
    group: { gap: 10 },
    suggestion: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16, paddingVertical: 12 },
    effortHero: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 16,
      borderRadius: 18,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
    },
    headerStrip: { gap: 4 },
    sportBadge: { flexDirection: "row", alignItems: "center", gap: 8 },
    bentoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    bentoCard: {
      flexBasis: "47%",
      flexGrow: 1,
      padding: 14,
      borderRadius: 16,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
      gap: 4,
    },
    bentoValue: { fontVariant: ["tabular-nums"] },
    insightsWrap: { gap: 10 },
    bentoTileActive: {
      borderColor: c.tennis,
      backgroundColor: c.actionSoft,
    },
    tileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
    expandedPanel: {
      padding: 14,
      borderRadius: 18,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
    },
    footer: { gap: 8, borderTopWidth: 1, borderColor: c.line, paddingTop: 14 },
    disclosure: { minHeight: 40, justifyContent: "center", alignSelf: "flex-start", paddingVertical: 4 },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(10, 15, 20, 0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
    glassCard: {
      width: "100%", maxWidth: 300, backgroundColor: `${themeColors.card}f0`, borderRadius: 20,
      borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.6)", padding: 20,
      shadowColor: themeColors.shadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
    },
    dialogContent: { gap: 12, alignItems: "center" },
    dialogActions: { flexDirection: "row", gap: 10, marginTop: 6, width: "100%" },
    cancelBtn: { flex: 1, height: 38, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: c.soft, borderWidth: 1, borderColor: c.line },
    deleteBtn: { flex: 1, height: 38, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: c.statusError },
  };
});
