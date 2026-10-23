import { usePathname, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { PERSON_ICON_PATH } from "@fitness-battle/shared";
import { useCompeteStore } from "../lib/compete-store";
import { isAthleteSettingsPath } from "../lib/navigation";
import { SHELL_COLORS as c } from "../theme";

export function AppHeader() {
  const { state } = useCompeteStore();
  const router = useRouter();
  const path = usePathname();
  const onAthlete = isAthleteSettingsPath(path);
  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
          onPress={() => router.navigate("/today")}
          style={s.brand}
        >
          <Text style={s.wordmark}>Overtaek</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open athlete settings"
          accessibilityState={{ selected: onAthlete }}
          onPress={() => router.navigate("/athlete")}
          style={[s.profile, onAthlete && s.selected]}
        >
          {state?.avatarUrl ? (
            <Image source={{ uri: state.avatarUrl }} style={s.photo} />
          ) : (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
              <Path d={PERSON_ICON_PATH}/>
            </Svg>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { backgroundColor: c.paper },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brand: { minHeight: 44, justifyContent: "center" },
  wordmark: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    letterSpacing: -0.6,
    color: c.ink,
  },
  tagline: { fontFamily: "DMSans_400Regular", fontSize: 11, color: c.muted },
  profile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: c.line,
  },
  selected: { borderColor: c.tennis },
  photo: { width: "100%", height: "100%" },
});
