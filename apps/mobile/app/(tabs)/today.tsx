import { useState } from "react";
import {
  type DimensionValue,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
  PROTOTYPE_DAILY_RECOMMENDATION,
  PROTOTYPE_HOME_SESSIONS,
  type PrototypeHomeSession,
} from "@fitness-battle/shared";
import { colors, fonts, SHELL_COLORS, SHELL_RADIUS } from "../../src/theme";

export type HomeVariant = "ridge" | "arcade" | "swiss" | "pebble" | "orbit";

export default function MobileHomeScreen() {
  const [variant, setVariant] = useState<HomeVariant>("ridge");
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [inspectedSession, setInspectedSession] = useState<PrototypeHomeSession | null>(null);
  const [emberPressed, setEmberPressed] = useState(false);

  const past = PROTOTYPE_HOME_SESSIONS.filter((s) => s.status === "completed");
  const current = PROTOTYPE_HOME_SESSIONS.find((s) => s.status === "current");
  const future = PROTOTYPE_HOME_SESSIONS.filter((s) => s.status === "future");

  function onEmberTap() {
    setEmberPressed(true);
    setTimeout(() => {
      setEmberPressed(false);
      setRecModalOpen(true);
    }, 280);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Screen Header & Badge */}
        <View style={styles.header}>
          <Text style={styles.kicker}>Tab 1 · Home</Text>
          <Text style={styles.title}>Daily Path & Ember</Text>
        </View>

        {/* 5 Unique & Distinct Layout Design Switcher */}
        <View style={styles.variantContainer}>
          <View style={styles.variantLabelRow}>
            <Text style={styles.variantSub}>Select Design Variant:</Text>
            <Text style={styles.variantActiveName}>
              {variant === "ridge" && "1. Alpine Ridge"}
              {variant === "arcade" && "2. Arcade Stepper"}
              {variant === "swiss" && "3. Swiss Timeline"}
              {variant === "pebble" && "4. Pebble River"}
              {variant === "orbit" && "5. Constellation"}
            </Text>
          </View>
          <View style={styles.variantPills}>
            <Pressable
              onPress={() => setVariant("ridge")}
              style={[styles.variantBtn, variant === "ridge" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "ridge" && styles.variantTextOn]}>
                Ridge
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("arcade")}
              style={[styles.variantBtn, variant === "arcade" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "arcade" && styles.variantTextOn]}>
                Arcade
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("swiss")}
              style={[styles.variantBtn, variant === "swiss" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "swiss" && styles.variantTextOn]}>
                Swiss
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("pebble")}
              style={[styles.variantBtn, variant === "pebble" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "pebble" && styles.variantTextOn]}>
                Pebble
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("orbit")}
              style={[styles.variantBtn, variant === "orbit" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "orbit" && styles.variantTextOn]}>
                Orbit
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Daily Exercise Suggestion Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroKicker}>⚡ Coach Ember Suggestion</Text>
            <Text style={styles.heroTag}>Zone 2-3</Text>
          </View>
          <Text style={styles.heroTitle}>{PROTOTYPE_DAILY_RECOMMENDATION.title}</Text>
          <Text style={styles.heroSub}>{PROTOTYPE_DAILY_RECOMMENDATION.subtitle}</Text>
          <Pressable style={styles.heroAction} onPress={onEmberTap}>
            <View>
              <Text style={styles.heroActionLabel}>Today's Target</Text>
              <Text style={styles.heroActionVal}>
                {PROTOTYPE_DAILY_RECOMMENDATION.targetVolume} · {PROTOTYPE_DAILY_RECOMMENDATION.durationMin}m
              </Text>
            </View>
            <View style={styles.heroActionBtn}>
              <Text style={styles.heroActionBtnText}>Inspect Plan →</Text>
            </View>
          </Pressable>
        </View>

        {/* ==============================================================
            DESIGN 1: ALPINE RIDGE (S-CURVE WINDING TRAIL)
            ============================================================== */}
        {variant === "ridge" && (
          <View style={styles.pathCard}>
            <Text style={styles.pathHeader}>Winding 10-Session Journey</Text>
            <Text style={styles.pathSub}>
              Past 10 completed workouts. Tap Ember on Today to see recommendation.
            </Text>

            <View style={styles.canvas}>
              {/* S-Curve Path Vector */}
              <Svg style={StyleSheet.absoluteFill} viewBox="0 0 320 620">
                <Path
                  d="M 160 20 C 50 70, 60 130, 160 170 S 260 250, 160 310 S 50 390, 160 460 S 250 530, 160 600"
                  fill="none"
                  stroke={colors.line}
                  strokeWidth="8"
                  strokeDasharray="4 6"
                />
                <Path
                  d="M 160 20 C 50 70, 60 130, 160 170 S 260 250, 160 310 S 50 390, 160 460"
                  fill="none"
                  stroke={colors.limeDeep}
                  strokeWidth="6"
                />
              </Svg>

              {/* 10 Past Sessions along curve */}
              {past.map((sess, idx) => {
                const pos: { left: DimensionValue; top: DimensionValue } = ([
                  { left: "45%", top: "3%" },
                  { left: "20%", top: "10%" },
                  { left: "15%", top: "18%" },
                  { left: "35%", top: "24%" },
                  { left: "70%", top: "29%" },
                  { left: "75%", top: "37%" },
                  { left: "60%", top: "44%" },
                  { left: "30%", top: "50%" },
                  { left: "15%", top: "57%" },
                  { left: "25%", top: "65%" },
                ] as const)[idx] || { left: "50%", top: "70%" };

                return (
                  <Pressable
                    key={sess.id}
                    onPress={() => setInspectedSession(sess)}
                    style={[styles.node, { left: pos.left, top: pos.top }]}
                  >
                    <View style={styles.discCompleted}>
                      <Text style={styles.discCheck}>✓</Text>
                      <Text style={styles.discVol}>{sess.volume}</Text>
                    </View>
                    <Text style={styles.nodeLabel}>{sess.weekdayShort}</Text>
                  </Pressable>
                );
              })}

              {/* Current Day with Ember Mascot */}
              {current && (
                <Pressable
                  onPress={onEmberTap}
                  style={[
                    styles.node,
                    styles.nodeCurrent,
                    { left: "45%", top: "73%", transform: [{ scale: emberPressed ? 1.2 : 1 }] },
                  ]}
                >
                  <View style={styles.discCurrent}>
                    <Image
                      source={require("../../assets/mascots/star-ember.png")}
                      style={styles.emberImg}
                      resizeMode="contain"
                    />
                    <View style={styles.emberBadge}>
                      <Text style={styles.emberBadgeText}>TODAY</Text>
                    </View>
                  </View>
                  <Text style={styles.currentLabel}>Today · Tap Ember!</Text>
                </Pressable>
              )}

              {/* Future Sessions (Non-interactable blocks) */}
              {future.map((f, idx) => {
                const fPos: { left: DimensionValue; top: DimensionValue } = ([
                  { left: "70%", top: "82%" },
                  { left: "75%", top: "90%" },
                  { left: "45%", top: "96%" },
                ] as const)[idx] || { left: "50%", top: "95%" };

                return (
                  <View key={f.id} style={[styles.node, { left: fPos.left, top: fPos.top }]}>
                    <View style={styles.discFuture}>
                      <Text style={styles.futureLock}>🔒</Text>
                      <Text style={styles.futureVol}>{f.volume}</Text>
                    </View>
                    <Text style={styles.nodeLabel}>{f.weekdayShort}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ==============================================================
            DESIGN 2: ISOMETRIC ARCADE STEPPER
            ============================================================== */}
        {variant === "arcade" && (
          <View style={styles.pathCard}>
            <Text style={styles.pathHeader}>Arcade Stepping Plinths</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {past.map((sess, idx) => (
                <Pressable
                  key={sess.id}
                  onPress={() => setInspectedSession(sess)}
                  style={styles.arcadeRow}
                >
                  <View style={styles.arcadeBadge}>
                    <Text style={styles.arcadeBadgeText}>#{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.arcadeTitle}>{sess.dayLabel} · {sess.sportName}</Text>
                    <Text style={styles.arcadeSub}>{sess.summary}</Text>
                  </View>
                  <Text style={styles.arcadeVol}>{sess.volume}</Text>
                </Pressable>
              ))}

              {/* Current Day Plinth */}
              {current && (
                <Pressable onPress={onEmberTap} style={styles.arcadeCurrentRow}>
                  <Image
                    source={require("../../assets/mascots/star-ember.png")}
                    style={{ width: 40, height: 40 }}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.arcadeCurrentKicker}>TODAY'S MISSION</Text>
                    <Text style={styles.arcadeCurrentTitle}>5.8 km Progression Run</Text>
                    <Text style={styles.arcadeSub}>Tap to view workout intervals</Text>
                  </View>
                  <View style={styles.arcadeActivePill}>
                    <Text style={styles.arcadeActivePillText}>ACTIVE ⭐</Text>
                  </View>
                </Pressable>
              )}

              {/* Future locked */}
              {future.map((f) => (
                <View key={f.id} style={styles.arcadeFutureRow}>
                  <Text style={{ fontSize: 16 }}>🔒</Text>
                  <Text style={{ flex: 1, color: colors.muted, fontSize: 13 }}>
                    {f.dayLabel}: {f.volume}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ==============================================================
            DESIGN 3: SWISS MINIMALIST TIMELINE
            ============================================================== */}
        {variant === "swiss" && (
          <View style={styles.pathCard}>
            <Text style={styles.pathHeader}>Swiss Chrono Timeline</Text>
            <View style={styles.swissContainer}>
              {past.map((sess) => (
                <Pressable
                  key={sess.id}
                  onPress={() => setInspectedSession(sess)}
                  style={styles.swissItem}
                >
                  <View style={styles.swissDotCompleted} />
                  <View style={styles.swissRow}>
                    <Text style={styles.swissDay}>{sess.dayLabel}</Text>
                    <Text style={styles.swissVol}>{sess.volume}</Text>
                  </View>
                  <Text style={styles.swissSub}>
                    {sess.sportName} {sess.pace ? `· ${sess.pace}` : `· ${sess.durationMin}m`}
                  </Text>
                </Pressable>
              ))}

              {/* Current */}
              {current && (
                <Pressable onPress={onEmberTap} style={styles.swissCurrentItem}>
                  <View style={styles.swissDotCurrent} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Image
                      source={require("../../assets/mascots/star-ember.png")}
                      style={{ width: 34, height: 34 }}
                      resizeMode="contain"
                    />
                    <View>
                      <Text style={styles.swissCurrentKicker}>TODAY · EMBER REVIEWS</Text>
                      <Text style={styles.swissCurrentTitle}>
                        {PROTOTYPE_DAILY_RECOMMENDATION.title}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              )}

              {/* Future */}
              {future.map((f) => (
                <View key={f.id} style={[styles.swissItem, { opacity: 0.5 }]}>
                  <View style={styles.swissDotFuture} />
                  <View style={styles.swissRow}>
                    <Text style={styles.swissDay}>{f.dayLabel}</Text>
                    <Text style={styles.swissDay}>{f.volume}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ==============================================================
            DESIGN 4: TACTILE PEBBLE RIVERBED
            ============================================================== */}
        {variant === "pebble" && (
          <View style={styles.pathCard}>
            <Text style={styles.pathHeader}>Tactile Pebble River</Text>
            <View style={styles.pebbleGrid}>
              {past.map((sess, idx) => (
                <Pressable
                  key={sess.id}
                  onPress={() => setInspectedSession(sess)}
                  style={styles.pebbleCard}
                >
                  <Text style={styles.pebbleIdx}>{sess.weekdayShort} #{idx + 1}</Text>
                  <Text style={styles.pebbleVol}>{sess.volume}</Text>
                  <Text style={styles.pebbleSport}>{sess.sportName}</Text>
                </Pressable>
              ))}

              {current && (
                <Pressable onPress={onEmberTap} style={styles.pebbleCurrentCard}>
                  <Image
                    source={require("../../assets/mascots/star-ember.png")}
                    style={{ width: 44, height: 44 }}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.pebbleCurrentKicker}>TODAY'S RADIANT PEBBLE</Text>
                    <Text style={styles.pebbleCurrentTitle}>5.8 km Progression</Text>
                  </View>
                  <Text style={{ fontSize: 18 }}>✨</Text>
                </Pressable>
              )}

              {future.map((f) => (
                <View key={f.id} style={styles.pebbleFutureCard}>
                  <Text style={{ fontSize: 11, color: colors.muted }}>{f.dayLabel}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748b" }}>{f.volume}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ==============================================================
            DESIGN 5: CONSTELLATION ORBIT TRAIL
            ============================================================== */}
        {variant === "orbit" && (
          <View style={styles.pathCard}>
            <Text style={styles.pathHeader}>Celestial Orbit Stations</Text>
            {current && (
              <Pressable onPress={onEmberTap} style={styles.orbitSolarCard}>
                <Image
                  source={require("../../assets/mascots/star-ember.png")}
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.orbitSolarKicker}>SOLAR CHECKPOINT</Text>
                  <Text style={styles.orbitSolarTitle}>{PROTOTYPE_DAILY_RECOMMENDATION.title}</Text>
                  <Text style={styles.orbitSolarSub}>Tap Ember for target zones & guidance</Text>
                </View>
                <Text style={{ color: colors.lime, fontWeight: "800", fontSize: 13 }}>Open ↗</Text>
              </Pressable>
            )}

            <View style={styles.orbitGrid}>
              {past.map((sess, idx) => (
                <Pressable
                  key={sess.id}
                  onPress={() => setInspectedSession(sess)}
                  style={styles.orbitStationCard}
                >
                  <Text style={styles.orbitStationLabel}>Station #{idx + 1}</Text>
                  <Text style={styles.orbitStationVol}>{sess.volume}</Text>
                  <Text style={styles.orbitStationSub}>{sess.sportName} · {sess.weekdayShort}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Workout Recommendation Modal Sheet (Ember Tap) */}
      <Modal visible={recModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Image
                  source={require("../../assets/mascots/star-ember.png")}
                  style={{ width: 34, height: 34 }}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.modalKicker}>Coach Ember Recommends</Text>
                  <Text style={styles.modalTitle}>{PROTOTYPE_DAILY_RECOMMENDATION.title}</Text>
                </View>
              </View>
              <Pressable onPress={() => setRecModalOpen(false)} style={styles.modalClose}>
                <Text style={{ fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.pillRow}>
              <Text style={styles.pill}>⏱ {PROTOTYPE_DAILY_RECOMMENDATION.durationMin}m</Text>
              <Text style={styles.pill}>📍 {PROTOTYPE_DAILY_RECOMMENDATION.targetVolume}</Text>
              <Text style={[styles.pill, { backgroundColor: "#fef9c3", color: "#854d0e" }]}>
                ❤️ {PROTOTYPE_DAILY_RECOMMENDATION.targetHrZone}
              </Text>
            </View>

            <View style={styles.rationaleBox}>
              <Text style={styles.rationaleLabel}>Why This Today?</Text>
              <Text style={styles.rationaleText}>{PROTOTYPE_DAILY_RECOMMENDATION.rationale}</Text>
            </View>

            <View style={{ gap: 8, marginVertical: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: colors.ink }}>
                SESSION STRUCTURE
              </Text>
              <Text style={styles.structLine}>
                <Text style={{ fontWeight: "700" }}>WARMUP: </Text>
                {PROTOTYPE_DAILY_RECOMMENDATION.structure.warmup}
              </Text>
              <Text style={styles.structLine}>
                <Text style={{ fontWeight: "700", color: colors.limeDeep }}>MAIN SET: </Text>
                {PROTOTYPE_DAILY_RECOMMENDATION.structure.mainSet}
              </Text>
              <Text style={styles.structLine}>
                <Text style={{ fontWeight: "700" }}>COOLDOWN: </Text>
                {PROTOTYPE_DAILY_RECOMMENDATION.structure.cooldown}
              </Text>
            </View>

            <Pressable style={styles.primaryBtn} onPress={() => setRecModalOpen(false)}>
              <Text style={styles.primaryBtnText}>Lace Up & Log Session</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Session Receipt Modal */}
      <Modal visible={inspectedSession != null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {inspectedSession?.dayLabel} · {inspectedSession?.sportName}
              </Text>
              <Pressable onPress={() => setInspectedSession(null)} style={styles.modalClose}>
                <Text style={{ fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink, marginVertical: 8 }}>
              {inspectedSession?.volume}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
              {inspectedSession?.summary}
            </Text>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.paper, marginTop: 14 }]}
              onPress={() => setInspectedSession(null)}
            >
              <Text style={{ color: colors.ink, fontWeight: "700" }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  header: { marginTop: 4 },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: colors.ink,
  },
  variantContainer: {
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  variantLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  variantSub: { fontSize: 11, color: colors.muted, fontFamily: fonts.bodyMedium },
  variantActiveName: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.ink },
  variantPills: {
    flexDirection: "row",
    backgroundColor: colors.accentSoft,
    padding: 3,
    borderRadius: 10,
  },
  variantBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
  },
  variantBtnOn: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  variantText: { fontSize: 11, fontFamily: fonts.bodyMedium, color: colors.muted },
  variantTextOn: { fontFamily: fonts.bodyBold, color: colors.ink },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  heroKicker: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: colors.limeDeep,
    textTransform: "uppercase",
  },
  heroTag: {
    fontSize: 11,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    color: colors.muted,
  },
  heroTitle: { fontSize: 18, fontFamily: fonts.bodyBold, color: colors.ink },
  heroSub: { fontSize: 13, color: colors.muted, marginVertical: 4 },
  heroAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.paper,
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  heroActionLabel: { fontSize: 11, color: colors.muted },
  heroActionVal: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink },
  heroActionBtn: {
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  heroActionBtnText: { color: colors.card, fontSize: 12, fontFamily: fonts.bodyBold },
  pathCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  pathHeader: { fontSize: 15, fontFamily: fonts.bodyBold, color: colors.ink },
  pathSub: { fontSize: 11, color: colors.muted, marginTop: 2, marginBottom: 12 },
  canvas: { width: "100%", height: 600, position: "relative" },
  node: { position: "absolute", alignItems: "center" },
  discCompleted: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f4faeb",
    borderWidth: 2,
    borderColor: colors.limeDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  discCheck: { fontSize: 10, color: colors.limeDeep, fontWeight: "900" },
  discVol: { fontSize: 10, fontWeight: "800", color: colors.ink },
  nodeLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.muted, marginTop: 2 },
  nodeCurrent: { zIndex: 10 },
  discCurrent: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fbfee9",
    borderWidth: 3,
    borderColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.limeDeep,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emberImg: { width: 44, height: 44 },
  emberBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.lime,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 99,
  },
  emberBadgeText: { fontSize: 8, fontWeight: "900", color: colors.ink },
  currentLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.ink, marginTop: 3 },
  discFuture: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
  },
  futureLock: { fontSize: 10 },
  futureVol: { fontSize: 8, color: "#64748b" },
  arcadeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  arcadeBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#f4faeb",
    alignItems: "center",
    justifyContent: "center",
  },
  arcadeBadgeText: { fontSize: 11, fontWeight: "800", color: colors.limeDeep },
  arcadeTitle: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink },
  arcadeSub: { fontSize: 11, color: colors.muted },
  arcadeVol: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink },
  arcadeCurrentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.lime,
    backgroundColor: "#fbfee9",
  },
  arcadeCurrentKicker: { fontSize: 10, fontWeight: "800", color: colors.limeDeep },
  arcadeCurrentTitle: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.ink },
  arcadeActivePill: {
    backgroundColor: colors.lime,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  arcadeActivePillText: { fontSize: 10, fontWeight: "800", color: colors.ink },
  arcadeFutureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    opacity: 0.6,
  },
  swissContainer: {
    borderLeftWidth: 2,
    borderLeftColor: colors.line,
    marginLeft: 16,
    paddingLeft: 14,
    gap: 12,
    marginTop: 10,
  },
  swissItem: { position: "relative" },
  swissDotCompleted: {
    position: "absolute",
    left: -20,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.limeDeep,
  },
  swissRow: { flexDirection: "row", justifyContent: "space-between" },
  swissDay: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.muted },
  swissVol: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink },
  swissSub: { fontSize: 11, color: colors.muted },
  swissCurrentItem: {
    position: "relative",
    backgroundColor: "#f6fee7",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lime,
  },
  swissDotCurrent: {
    position: "absolute",
    left: -22,
    top: 14,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ff5722",
  },
  swissCurrentKicker: { fontSize: 10, fontWeight: "800", color: colors.limeDeep },
  swissCurrentTitle: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink },
  swissDotFuture: {
    position: "absolute",
    left: -19,
    top: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#cbd5e1",
  },
  pebbleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pebbleCard: {
    width: "48%",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
  },
  pebbleIdx: { fontSize: 10, color: colors.limeDeep, fontWeight: "700" },
  pebbleVol: { fontSize: 15, fontFamily: fonts.bodyBold, color: colors.ink, marginVertical: 2 },
  pebbleSport: { fontSize: 11, color: colors.muted },
  pebbleCurrentCard: {
    width: "100%",
    backgroundColor: "#fbfee9",
    borderWidth: 2,
    borderColor: colors.lime,
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  pebbleCurrentKicker: { fontSize: 10, fontWeight: "800", color: colors.limeDeep },
  pebbleCurrentTitle: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.ink },
  pebbleFutureCard: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    opacity: 0.6,
  },
  orbitSolarCard: {
    backgroundColor: "#12141a",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  orbitSolarKicker: { fontSize: 10, fontWeight: "800", color: colors.lime },
  orbitSolarTitle: { fontSize: 14, fontFamily: fonts.bodyBold, color: "#ffffff" },
  orbitSolarSub: { fontSize: 11, color: "#94a3b8" },
  orbitGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  orbitStationCard: {
    width: "48%",
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 10,
  },
  orbitStationLabel: { fontSize: 10, color: colors.muted },
  orbitStationVol: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.ink },
  orbitStationSub: { fontSize: 10, color: colors.muted },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 20, 26, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalKicker: { fontSize: 10, fontWeight: "800", color: colors.limeDeep, textTransform: "uppercase" },
  modalTitle: { fontSize: 16, fontFamily: fonts.bodyBold, color: colors.ink },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  pillRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 10 },
  pill: {
    backgroundColor: colors.paper,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 11,
    fontFamily: fonts.bodyBold,
  },
  rationaleBox: {
    backgroundColor: colors.paper,
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
  },
  rationaleLabel: { fontSize: 10, fontWeight: "800", color: colors.muted, textTransform: "uppercase" },
  rationaleText: { fontSize: 12, color: colors.ink, lineHeight: 16, marginTop: 2 },
  structLine: { fontSize: 12, color: colors.ink, lineHeight: 17 },
  primaryBtn: {
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 14, fontFamily: fonts.bodyBold },
});
