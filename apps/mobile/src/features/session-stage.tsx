import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import {
  APP_TIMEZONE, PROVIDERS, countsOnTrack, formatClockTime,
  formatTrainingHours, formatVolume, isVerifiedActivity, sessionStageModel, sportById,
  type Activity, type CompeteState,
} from "@fitness-battle/shared";
import { ActivityRoute } from "../ui/activity-route";
import { AppText } from "../ui/section";
import { SportIcon } from "../ui/sport-icon";
import { Chip, ChipRow } from "../ui/chip";
import { AnimatedEmber } from "../ui/mascot/animated-ember";
import { SHELL_COLORS as c } from "../theme";
import { ActivityComparison } from "./activity-comparison";
import { ActivityContext } from "./activity-context";

export function SessionStage({ state, activities, suggestion, onRemove, actions }: {
  state: CompeteState; activities: Activity[]; suggestion?: { title: string; minutes?: number | null; detail: string };
  onRemove: (id: string) => void; actions?: ReactNode;
}) {
  const s = useThemedStyles(sThemes);

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
    <ActivityDetails key={current.id} activity={current} state={state} onRemove={onRemove} />
  </View>;
}

function ActivityDetails({ activity, state, onRemove }: { activity: Activity; state: CompeteState; onRemove: (id: string) => void }) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);

  const [confirming, setConfirming] = useState(false);
  const gps = sportById(activity.sport).gps;
  const primary = gps && activity.distanceM > 0 ? formatVolume(activity.sport, activity.distanceM, activity.movingSec, state.units) : formatClockTime(activity.movingSec);
  const date = new Date(activity.startedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: APP_TIMEZONE });
  const time = new Date(activity.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE });
  return <View style={s.details}>
    <View style={s.overview}>
      <View style={s.sport}><SportIcon sport={activity.sport} size={22} /><AppText role="label">{sportById(activity.sport).name}</AppText></View>
      <AppText role="caption" secondary>{date} · {time}</AppText>
      {!countsOnTrack(activity, "open") ? <AppText role="caption" secondary>Not counted in your totals</AppText> : null}
      <AppText role="hero" accessibilityRole="header">{primary}</AppText>
    </View>
    <ActivityRoute activity={activity} units={state.units} />
    <ActivityComparison activity={activity} state={state} />
    <ActivityContext activity={activity} state={state} />
    <View style={s.footer}>
      <AppText role="caption" secondary>{activity.source === "manual" ? "Manually logged" : activity.source === "history" ? "Imported history" : `From ${PROVIDERS.find(provider => provider.id === activity.source)?.name ?? activity.source}`} · {isVerifiedActivity(activity) ? "GPS tracked" : "Recorded activity"}</AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Delete session" style={s.disclosure} onPress={() => setConfirming(true)}>
        <AppText role="caption" secondary style={{ color: c.statusError }}>Delete session</AppText>
      </Pressable>
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
                  <AppText role="label" style={{ color: c.card }}>Delete</AppText>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  </View>;
}

const sThemes = createThemedStyles((themeColors) => ({
  stack: { gap: 24 }, details: { gap: 28 }, overview: { gap: 8 }, sport: { flexDirection: "row", alignItems: "center", gap: 8 },
  group: { gap: 12 }, tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: themeColors.line, borderRadius: 12 }, active: { backgroundColor: themeColors.ink, borderColor: themeColors.ink },
  suggestion: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16, paddingVertical: 12 },
  footer: { gap: 12, borderTopWidth: 1, borderColor: themeColors.line, paddingTop: 16 },
  disclosure: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingVertical: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(10, 15, 20, 0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
  glassCard: {
    width: "100%", maxWidth: 300, backgroundColor: "rgba(255, 255, 255, 0.94)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.6)", padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
  },
  dialogContent: { gap: 12, alignItems: "center" },
  dialogActions: { flexDirection: "row", gap: 10, marginTop: 6, width: "100%" },
  cancelBtn: { flex: 1, height: 38, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: themeColors.soft, borderWidth: 1, borderColor: themeColors.line },
  deleteBtn: { flex: 1, height: 38, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: themeColors.statusError },
}));
