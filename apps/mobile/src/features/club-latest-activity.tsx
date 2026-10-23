import { Pressable, Text, View } from "react-native";
import {
  APP_TIMEZONE,
  clubDuration,
  competeNow,
  countsOnTrack,
  isVerifiedActivity,
  sportById,
  type Activity,
  type CompeteState,
} from "@fitness-battle/shared";
import { SHELL_COLORS as c } from "../theme";
import { f } from "../ui/focus";
export function LatestActivity({
  state,
  onOpen,
}: {
  state: CompeteState;
  onOpen: (activity: Activity) => void;
}) {
  const activity = state.activities
    .filter(
      (a) =>
        countsOnTrack(a, "open") &&
        Date.parse(a.startedAt) <= competeNow(state).getTime(),
    )
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  if (!activity) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={f.h2}>
        Latest activity
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open latest ${sportById(activity.sport).name} activity`}
        onPress={() => onOpen(activity)}
        style={[
          f.row,
          {
            minHeight: 76,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: c.line,
          },
        ]}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: c.actionSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={f.h2}>↗</Text>
        </View>
        <View style={[f.grow, { gap: 4 }]}>
          <Text style={f.rowTitle}>
            {sportById(activity.sport).name} ·{" "}
            {clubDuration(activity.movingSec)}
          </Text>
          <Text style={[f.small, { color: c.green }]}>
            {isVerifiedActivity(activity) ? "GPS verified" : "Open"} · Counted
          </Text>
        </View>
        <Text style={f.small}>
          {new Date(activity.startedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: APP_TIMEZONE,
          })}{" "}
          →
        </Text>
      </Pressable>
    </View>
  );
}
