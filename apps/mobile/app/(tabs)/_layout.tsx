import { PHONE_TABS } from "@fitness-battle/shared";
import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../../src/theme";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      tabBar={({ state, navigation }) => {
        const routeName = state.routes[state.index]?.name;
        const active = routeName === "index" ? "today" : routeName;
        return (
          <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            {PHONE_TABS.map((tab) => {
              const on = active === tab.id;
              const routeName = tab.id === "today" ? "index" : tab.id;
              return (
                <Pressable
                  key={tab.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => navigation.navigate(routeName)}
                  style={styles.tab}
                >
                  <Text style={[styles.label, on && styles.on]}>{tab.label}</Text>
                  {on ? <View style={styles.pill} /> : <View style={styles.pillSpacer} />}
                </Pressable>
              );
            })}
          </View>
        );
      }}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="arena" options={{ title: "Arena" }} />
      <Tabs.Screen name="field" options={{ title: "Field" }} />
      <Tabs.Screen name="you" options={{ title: "You" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: "center", gap: 4 },
  label: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 13 },
  on: { color: colors.plum, fontFamily: fonts.bodyBold },
  pill: { width: 22, height: 3, borderRadius: 2, backgroundColor: colors.tennis },
  pillSpacer: { width: 22, height: 3 },
});
