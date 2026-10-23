import { Text, View } from "react-native";
import { clubWeekSummary, type CompeteState } from "@fitness-battle/shared";
import { AnimatedEmber } from "../ui/mascot/animated-ember";
import { f } from "../ui/focus";
export function ClubWelcome({ state }: { state: CompeteState }) {
  const summary = clubWeekSummary(state);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={f.kicker}>Your everyday club</Text>
        <Text
          accessibilityRole="header"
          style={[f.title, { fontSize: 26, lineHeight: 32 }]}
        >
          {summary.greeting}, {summary.firstName}.
        </Text>
        <Text style={f.copy}>
          {summary.sessions
            ? `${summary.activeDays} active day${summary.activeDays === 1 ? "" : "s"} this week. Every effort adds up.`
            : "A new week of possibilities. Make it yours."}
        </Text>
      </View>
      <View accessible={false}>
        <AnimatedEmber
          size={66}
          action="wave"
          expression="happy"
          loop={false}
        />
      </View>
    </View>
  );
}
