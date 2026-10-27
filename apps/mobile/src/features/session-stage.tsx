import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  APP_TIMEZONE, PROVIDERS, countsOnTrack, activityContextRecordedHr, clubSessionMetrics,
  competitionTrack, competitionTrackLabel, effortPointProgress, formatClockTime,
  formatTrainingHours, formatVolume, isVerifiedActivity, sessionStageModel, sportById,
  type Activity, type CompeteState,
} from "@fitness-battle/shared";
import { ActivityRoute } from "../ui/activity-route";
import { AppText } from "../ui/section";
import { SportIcon } from "../ui/sport-icon";
import { FocusButton } from "../ui/focus";
import { AnimatedEmber } from "../ui/mascot/animated-ember";
import { SHELL_COLORS as c } from "../theme";
import { ActivityComparison } from "./activity-comparison";
import { ActivityContext } from "./activity-context";

export function SessionStage({ state, activities, suggestion, onRemove, actions }: {
  state: CompeteState; activities: Activity[]; suggestion?: { title: string; minutes?: number | null; detail: string };
  onRemove: (id: string) => void; actions?: ReactNode;
}) {
  const model = sessionStageModel(activities);
  const [selected, setSelected] = useState<string | null>(null);
  const current = model.rows.find(row => row.id === selected) ?? model.rows[0];
  if (!current) return <View style={s.stack}>
    <AppText role="display" accessibilityRole="header">{suggestion?.title ?? "Make room to move."}</AppText>
    <View style={s.suggestion}><View><AppText role="hero">{formatTrainingHours((suggestion?.minutes ?? 0) * 60)}</AppText><AppText role="caption" secondary>hr · Suggested time</AppText></View><AnimatedEmber size={90} expression="happy" action="idle" loop /></View>
    <AppText secondary>{suggestion?.detail ?? "Nothing recorded today."}</AppText>{actions}
  </View>;
  return <View style={s.stack}>
    {model.rows.length > 1 ? <View style={s.group}>
      <AppText role="label">{`${model.sessions} recorded sessions · ${formatTrainingHours(model.movingSec)} hr total`}</AppText>
      <View style={s.tabs}>{model.rows.map(row => <Pressable key={row.id} accessibilityRole="button" accessibilityState={{ selected: row.id === current.id }} onPress={() => setSelected(row.id)} style={[s.tab, row.id === current.id && s.active]}><AppText role="label" style={row.id === current.id ? { color: c.card } : undefined}>{sportById(row.sport).name} · {new Date(row.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE })}</AppText></Pressable>)}</View>
    </View> : null}
    <ActivityDetails key={current.id} activity={current} state={state} onRemove={onRemove} />
  </View>;
}

function ActivityDetails({ activity, state, onRemove }: { activity: Activity; state: CompeteState; onRemove: (id: string) => void }) {
  const [removing, setRemoving] = useState(false), [showImpact, setShowImpact] = useState(false);
  const gps = sportById(activity.sport).gps;
  const point = effortPointProgress(state, activity.sport, competitionTrack(activity.sport));
  const hr = activityContextRecordedHr(activity);
  const primary = gps && activity.distanceM > 0 ? formatVolume(activity.sport, activity.distanceM, activity.movingSec, state.units) : formatClockTime(activity.movingSec);
  const metrics = clubSessionMetrics([activity], state.units).filter(metric => metric.label !== (gps ? "Distance" : "Moving time"));
  const date = new Date(activity.startedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: APP_TIMEZONE });
  const time = new Date(activity.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE });
  return <View style={s.details}>
    <View style={s.overview}>
      <View style={s.sport}><SportIcon sport={activity.sport} size={22} /><AppText role="label">{sportById(activity.sport).name}</AppText></View>
      <AppText role="caption" secondary>{date} · {time}</AppText>
      {!countsOnTrack(activity, "open") ? <AppText role="caption" secondary>Not counted in your totals</AppText> : null}
      <AppText role="hero" accessibilityRole="header">{primary}</AppText>
      <AppText role="caption" secondary>{gps && activity.distanceM > 0 ? "Distance covered" : "Time well spent"}</AppText>
      <View style={s.metrics}>
        {metrics.map(metric => <View key={metric.label} style={s.metric}><AppText role="value">{metric.value}</AppText><AppText role="caption" secondary>{metric.label}</AppText></View>)}
        {hr !== null ? <View style={s.metric}><AppText role="value">{Math.round(hr)} bpm</AppText><AppText role="caption" secondary>Avg heart rate</AppText></View> : null}
        {Number.isFinite(activity.elevationGainM) && activity.elevationGainM! >= 0 ? <View style={s.metric}><AppText role="value">{Math.round(activity.elevationGainM! * (state.units === "us" ? 3.28084 : 1))} {state.units === "us" ? "ft" : "m"}</AppText><AppText role="caption" secondary>Elevation gain</AppText></View> : null}
      </View>
    </View>
    <ActivityRoute activity={activity} units={state.units} />
    <ActivityContext activity={activity} state={state} />
    <ActivityComparison activity={activity} state={state} compact />
    <View style={s.footer}>
      <AppText role="caption" secondary>{activity.source === "manual" ? "Manually logged" : activity.source === "history" ? "Sample history" : `From ${PROVIDERS.find(provider => provider.id === activity.source)?.name ?? activity.source}`} · {isVerifiedActivity(activity) ? "GPS tracked" : "Recorded activity"}</AppText>
      {point ? <><Pressable style={s.disclosure} accessibilityRole="button" accessibilityState={{ expanded: showImpact }} onPress={() => setShowImpact(!showImpact)}><AppText role="label">Your Effort Score this week</AppText><AppText>{showImpact ? "−" : "+"}</AppText></Pressable>{showImpact ? <View style={s.group}><AppText secondary>{competitionTrackLabel(activity.sport)} · +{point.earned} from activity this week</AppText><AppText role="caption" secondary>{point.capped ? "Maximum score reached" : `${formatVolume(activity.sport, activity.sport === "strength" ? 0 : point.remaining, activity.sport === "strength" ? point.remaining : 0, state.units)} to the next point`}. This is your weekly total, not an award for this session.</AppText>{point.retained ? <AppText role="caption" secondary>Previously earned points are kept when a session is removed.</AppText> : null}</View> : null}</> : null}
      {removing ? <View style={s.group}><AppText>Remove this session from your activity?</AppText><FocusButton label="Remove session" secondary onPress={() => onRemove(activity.id)} /><FocusButton label="Keep session" secondary onPress={() => setRemoving(false)} /></View> : <Pressable accessibilityRole="button" style={s.disclosure} onPress={() => setRemoving(true)}><AppText role="caption" secondary>Remove session</AppText></Pressable>}
    </View>
  </View>;
}

const s = StyleSheet.create({
  stack: { gap: 24 }, details: { gap: 28 }, overview: { gap: 8 }, sport: { flexDirection: "row", alignItems: "center", gap: 8 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 20, paddingTop: 16 }, metric: { gap: 3, minWidth: 125, flexGrow: 1, flexBasis: "40%" },
  group: { gap: 12 }, tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: c.line, borderRadius: 12 }, active: { backgroundColor: c.ink, borderColor: c.ink },
  suggestion: { padding: 24, borderRadius: 20, backgroundColor: c.soft, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footer: { gap: 12, borderTopWidth: 1, borderColor: c.line, paddingTop: 20 }, disclosure: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
});
