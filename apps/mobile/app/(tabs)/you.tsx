import {
  awardCards,
  initialsFromName,
  rankForElo,
} from "@fitness-battle/shared";
import { useRouter } from "expo-router";
import { Avatar } from "heroui-native/avatar";
import { Button } from "heroui-native/button";
import { Input } from "heroui-native/input";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../../src/lib/compete-store";
import { providersForDevice } from "../../src/lib/platform-providers";
import { AwardShelf } from "../../src/ui/award-shelf";
import { SHELL_COLORS, SHELL_RADIUS } from "../../src/theme";

export default function YouScreen() {
  const { state, dispatch } = useCompeteStore();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);

  if (!state) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.copy}>Loading you…</Text>
      </SafeAreaView>
    );
  }

  const draftName = name ?? state.name;
  const draftCity = city ?? state.city;
  const dirty = draftName !== state.name || draftCity !== state.city;
  const rating = state.ratings.find((row) => row.sport === state.primary);
  const rank = rankForElo(rating?.openElo ?? 1000);
  const cards = awardCards(state);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>You</Text>
        <View style={styles.portrait}>
          <Avatar color="accent" size="lg">
            <Avatar.Fallback>{initialsFromName(state.name)}</Avatar.Fallback>
          </Avatar>
          <View style={styles.portraitCopy}>
            <Text style={styles.name}>{state.name}</Text>
            <Text style={styles.copy}>
              {rank.name} · {rating?.openElo ?? 1000}
            </Text>
            <Text style={styles.copy}>{state.city}</Text>
          </View>
        </View>

        <Text style={styles.section}>Week awards</Text>
        <AwardShelf cards={cards} />

        <Text style={styles.section}>Profile</Text>
        <Input
          value={draftName}
          onChangeText={setName}
          accessibilityLabel="Name"
          placeholder="Name"
        />
        <Input
          value={draftCity}
          onChangeText={setCity}
          accessibilityLabel="City"
          placeholder="City"
        />
        {dirty ? (
          <Button
            onPress={() => {
              dispatch({ type: "rename", name: draftName.trim() || state.name });
              dispatch({ type: "set-city", city: draftCity.trim() || state.city });
              setName(null);
              setCity(null);
            }}
          >
            Save profile
          </Button>
        ) : null}

        <Text style={styles.section}>Trackers</Text>
        {providersForDevice().map((provider) => {
          const link = state.links.find((row) => row.provider === provider.id);
          const status =
            link?.status === "connected"
              ? "Connected"
              : link?.status === "stub"
                ? "Demo link"
                : "Not connected";
          const onPhone =
            provider.id === "apple_health" || provider.id === "google_health";
          const copy = (
            <>
              <Text style={styles.rowTitle}>{provider.name}</Text>
              <Text style={styles.copy}>
                {status}
                {onPhone ? "" : " · connect on the web"}
              </Text>
            </>
          );
          if (!onPhone) {
            return (
              <View key={provider.id} style={styles.row}>
                {copy}
              </View>
            );
          }
          return (
            <Pressable
              key={provider.id}
              accessibilityRole="button"
              onPress={() => router.push("/connections")}
              style={styles.row}
            >
              {copy}
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/settings")}
          style={styles.row}
        >
          <Text style={styles.rowTitle}>Notification settings</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SHELL_COLORS.paper },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  kicker: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: SHELL_COLORS.muted,
  },
  portrait: { flexDirection: "row", gap: 14, alignItems: "center" },
  portraitCopy: { gap: 2, flex: 1 },
  name: {
    fontFamily: "DMSans_700Bold",
    fontSize: 28,
    color: SHELL_COLORS.ink,
  },
  section: {
    marginTop: 8,
    fontFamily: "DMSans_700Bold",
    color: SHELL_COLORS.ink,
    fontSize: 16,
  },
  row: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SHELL_RADIUS.control,
    backgroundColor: SHELL_COLORS.card,
    borderWidth: 1,
    borderColor: SHELL_COLORS.line,
    gap: 2,
  },
  rowTitle: { fontFamily: "DMSans_700Bold", color: SHELL_COLORS.ink, fontSize: 16 },
  copy: { fontFamily: "DMSans_400Regular", color: SHELL_COLORS.muted, fontSize: 14 },
});
