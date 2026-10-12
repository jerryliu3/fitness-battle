import type { BattleMode, CategorySlug } from "@fitness-battle/shared";
import { weeklyPeriodBounds } from "@fitness-battle/shared";
import { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBattleStore } from "../src/hooks/use-battle-store";
import { colors, fonts } from "../src/theme";

function formatScore(score: number, unitHint: string) {
  if (unitHint === "reps") return `${Math.round(score)} reps`;
  if (score >= 1000) return `${(score / 1000).toFixed(1)} km`;
  return `${Math.round(score)} m`;
}

function BrandMark({ pulse }: { pulse: Animated.Value }) {
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });
  return (
    <Animated.View style={[styles.brandBlock, { transform: [{ scale }] }]}>
      <Text style={styles.brand}>Fitness Battle</Text>
      <Text style={styles.tagline}>
        One tap. Join the pack. Let your tracker keep score.
      </Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const store = useBattleStore();
  const pulse = useRef(new Animated.Value(0)).current;
  const standingsSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  useEffect(() => {
    if (store.screen === "standings") {
      standingsSlide.setValue(24);
      Animated.timing(standingsSlide, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }
  }, [store.screen, standingsSlide, store.selectedBattleId]);

  const period = weeklyPeriodBounds();
  const battle = store.selectedBattle;
  const unit =
    store.categories.find((c) => c.slug === store.selectedCategory)?.unit ??
    "meters";

  return (
    <View style={styles.root}>
      <View style={styles.glowA} />
      <View style={styles.glowB} />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <BrandMark pulse={pulse} />

          <View style={styles.navRow}>
            {(
              [
                ["home", "Home"],
                ["join", "Join"],
                ["standings", "Standings"],
                ["tracker", "Tracker"],
              ] as const
            ).map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => store.setScreen(id)}
                style={[
                  styles.navChip,
                  store.screen === id && styles.navChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.navChipText,
                    store.screen === id && styles.navChipTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {store.screen === "home" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your battles</Text>
              <Text style={styles.sectionCopy}>
                Weekly standings reset Mondays (UTC). Periods can go
                daily, monthly, or custom later.
              </Text>
              {store.battles.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => store.selectBattle(item.id)}
                  style={[
                    styles.battleRow,
                    index === 0 && styles.battleRowFirst,
                  ]}
                >
                  <View>
                    <Text style={styles.battleName}>{item.name}</Text>
                    <Text style={styles.battleMeta}>
                      {item.mode === "one_v_one" ? "1v1" : "Group"} ·{" "}
                      {item.categorySlug} · {item.periodKind}
                    </Text>
                  </View>
                  <Text style={styles.battleCode}>{item.inviteCode}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.primaryBtn}
                onPress={() => store.setScreen("join")}
              >
                <Text style={styles.primaryBtnText}>Join a battle</Text>
              </Pressable>
            </View>
          )}

          {store.screen === "join" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Join in one tap</Text>
              <Text style={styles.sectionCopy}>
                Pick a category, choose group or 1v1, then jump in.
              </Text>

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryRow}>
                {store.categories.map((cat) => (
                  <Pressable
                    key={cat.slug}
                    onPress={() =>
                      store.selectCategory(cat.slug as CategorySlug)
                    }
                    style={[
                      styles.categoryChip,
                      store.selectedCategory === cat.slug &&
                        styles.categoryChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        store.selectedCategory === cat.slug &&
                          styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Invite code (optional)</Text>
              <TextInput
                value={store.inviteCode}
                onChangeText={(t) => store.setInviteCode(t)}
                placeholder="SUNRISE"
                placeholderTextColor={colors.fog}
                autoCapitalize="characters"
                style={styles.input}
              />

              <View style={styles.joinActions}>
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => store.joinBattle("group" as BattleMode)}
                >
                  <Text style={styles.primaryBtnText}>Join group</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => store.joinBattle("one_v_one" as BattleMode)}
                >
                  <Text style={styles.secondaryBtnText}>Join 1v1</Text>
                </Pressable>
              </View>
            </View>
          )}

          {store.screen === "standings" && (
            <Animated.View
              style={[
                styles.section,
                { transform: [{ translateY: standingsSlide }] },
              ]}
            >
              <Text style={styles.sectionTitle}>
                {battle?.name ?? "Standings"}
              </Text>
              <Text style={styles.sectionCopy}>
                Current {battle?.periodKind ?? "weekly"} period ·{" "}
                {period.startsAt.toISOString().slice(0, 10)} →{" "}
                {period.endsAt.toISOString().slice(0, 10)}
              </Text>
              {store.standings.map((row) => (
                <View
                  key={row.userId}
                  style={[
                    styles.standingRow,
                    row.isViewer && styles.standingRowYou,
                  ]}
                >
                  <Text style={styles.rank}>#{row.rank}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.standingName}>
                      {row.displayName}
                      {row.isViewer ? " · you" : ""}
                    </Text>
                  </View>
                  <Text style={styles.standingScore}>
                    {formatScore(row.score, unit)}
                  </Text>
                </View>
              ))}
            </Animated.View>
          )}

          {store.screen === "tracker" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fitness tracker</Text>
              <Text style={styles.sectionCopy}>
                Strava is the default cloud provider. Without OAuth keys the
                app stubs connect + sync with mock activities.
              </Text>
              <View style={styles.statusBlock}>
                <Text style={styles.statusLabel}>Status</Text>
                <Text style={styles.statusValue}>
                  {store.trackerStatus.status} · {store.trackerStatus.provider}
                </Text>
                <Text style={styles.sectionCopy}>{store.trackerMessage}</Text>
                {store.lastSyncSummary ? (
                  <Text style={styles.syncSummary}>{store.lastSyncSummary}</Text>
                ) : null}
              </View>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => void store.connectTracker()}
              >
                <Text style={styles.primaryBtnText}>Connect Strava</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => void store.syncTracker()}
              >
                <Text style={styles.secondaryBtnText}>Sync activities</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  glowA: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(198, 241, 53, 0.12)",
  },
  glowB: {
    position: "absolute",
    bottom: 40,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(255, 107, 74, 0.08)",
  },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 20,
  },
  brandBlock: {
    marginTop: 12,
    gap: 8,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 56,
    lineHeight: 56,
    color: colors.mist,
    letterSpacing: 1,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22,
    color: colors.fog,
    maxWidth: 320,
  },
  navRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  navChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  navChipActive: {
    borderBottomColor: colors.lime,
  },
  navChipText: {
    fontFamily: fonts.bodyMedium,
    color: colors.fog,
    fontSize: 14,
  },
  navChipTextActive: {
    color: colors.mist,
  },
  section: {
    gap: 12,
    paddingTop: 4,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.mist,
    letterSpacing: 0.5,
  },
  sectionCopy: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.fog,
  },
  battleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  battleRowFirst: {
    borderTopWidth: 0,
  },
  battleName: {
    fontFamily: fonts.bodyBold,
    color: colors.mist,
    fontSize: 17,
  },
  battleMeta: {
    fontFamily: fonts.body,
    color: colors.fog,
    fontSize: 13,
    marginTop: 2,
    textTransform: "capitalize",
  },
  battleCode: {
    fontFamily: fonts.bodyMedium,
    color: colors.lime,
    fontSize: 13,
    letterSpacing: 1,
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: colors.lime,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    fontSize: 16,
  },
  secondaryBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.limeDim,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontFamily: fonts.bodyBold,
    color: colors.lime,
    fontSize: 16,
  },
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    color: colors.mist,
    fontSize: 13,
    marginTop: 8,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.asphalt,
  },
  categoryChipActive: {
    backgroundColor: colors.lime,
  },
  categoryChipText: {
    fontFamily: fonts.bodyMedium,
    color: colors.mist,
  },
  categoryChipTextActive: {
    color: colors.ink,
  },
  input: {
    backgroundColor: colors.asphalt,
    color: colors.mist,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    letterSpacing: 2,
  },
  joinActions: {
    marginTop: 8,
    gap: 4,
  },
  standingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  standingRowYou: {
    backgroundColor: "rgba(198, 241, 53, 0.08)",
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  rank: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.lime,
    width: 48,
  },
  standingName: {
    fontFamily: fonts.bodyBold,
    color: colors.mist,
    fontSize: 16,
  },
  standingScore: {
    fontFamily: fonts.bodyMedium,
    color: colors.mist,
    fontSize: 15,
  },
  statusBlock: {
    backgroundColor: colors.asphalt,
    padding: 16,
    gap: 6,
  },
  statusLabel: {
    fontFamily: fonts.bodyMedium,
    color: colors.fog,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statusValue: {
    fontFamily: fonts.bodyBold,
    color: colors.mist,
    fontSize: 18,
    textTransform: "capitalize",
  },
  syncSummary: {
    fontFamily: fonts.bodyMedium,
    color: colors.lime,
    fontSize: 14,
    marginTop: 4,
  },
});
