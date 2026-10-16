import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PROTOTYPE_ATHLETE_ANALYTICS,
  PROTOTYPE_ATHLETE_PROFILE,
  PROTOTYPE_BACKFILL_STEPS,
  PROTOTYPE_SENSORS,
  type AthleteAnalytics,
  type AthleteProfile,
  type SensorStatus,
} from "@fitness-battle/shared";
import { colors, fonts } from "../../src/theme";

export type AthleteVariant = "passport" | "bento" | "kinetic" | "gamer_hex" | "command";

export default function MobileAthleteScreen() {
  const [variant, setVariant] = useState<AthleteVariant>("passport");
  const [profile, setProfile] = useState<AthleteProfile>(PROTOTYPE_ATHLETE_PROFILE);
  const [sensors, setSensors] = useState<SensorStatus[]>(PROTOTYPE_SENSORS);
  const [analytics, setAnalytics] = useState<AthleteAnalytics>(PROTOTYPE_ATHLETE_ANALYTICS);

  // Modals
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [backfillModalOpen, setBackfillModalOpen] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<"leo" | "volume" | "sports" | "recovery">("leo");

  // Settings
  const [crewInvites, setCrewInvites] = useState(true);
  const [gpsOnly, setGpsOnly] = useState(false);
  const [pushAlerts, setPushAlerts] = useState(true);

  // Backfill Simulation
  const [backfillStep, setBackfillStep] = useState(0);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillDone, setBackfillDone] = useState(false);

  function runBackfill() {
    setBackfillRunning(true);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setBackfillStep(step);
      if (step >= PROTOTYPE_BACKFILL_STEPS.length) {
        clearInterval(interval);
        setBackfillRunning(false);
        setBackfillDone(true);
      }
    }, 700);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.kicker}>Tab 4 · Athlete</Text>
          <Text style={styles.title}>Profile & Analytics</Text>
        </View>

        {/* 5 Unique & Distinct Designs Switcher */}
        <View style={styles.variantContainer}>
          <View style={styles.variantLabelRow}>
            <Text style={styles.variantSub}>Select Design Variant:</Text>
            <Text style={styles.variantActiveName}>
              {variant === "passport" && "1. Pro Passport"}
              {variant === "bento" && "2. Bento Grid"}
              {variant === "kinetic" && "3. Kinetic Dossier"}
              {variant === "gamer_hex" && "4. Gamer Telemetry"}
              {variant === "command" && "5. Command Center"}
            </Text>
          </View>
          <View style={styles.variantPills}>
            <Pressable
              onPress={() => setVariant("passport")}
              style={[styles.variantBtn, variant === "passport" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "passport" && styles.variantTextOn]}>
                Passport
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("bento")}
              style={[styles.variantBtn, variant === "bento" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "bento" && styles.variantTextOn]}>
                Bento
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("kinetic")}
              style={[styles.variantBtn, variant === "kinetic" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "kinetic" && styles.variantTextOn]}>
                Kinetic
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("gamer_hex")}
              style={[styles.variantBtn, variant === "gamer_hex" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "gamer_hex" && styles.variantTextOn]}>
                Gamer
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("command")}
              style={[styles.variantBtn, variant === "command" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "command" && styles.variantTextOn]}>
                Command
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ==============================================================
            DESIGN 1: PRO PASSPORT
            ============================================================== */}
        {variant === "passport" && (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatarLg}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: colors.lime }}>
                  {profile.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.profileHandle}>{profile.handle} · {profile.city}</Text>
                <View style={styles.leoBadge}>
                  <Text style={styles.leoBadgeText}>⚡ {profile.leoScore} Elo · {profile.division}</Text>
                </View>
              </View>
            </View>

            {/* Settings Toggles */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Preferences & Settings</Text>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Crew Squad Invites</Text>
                  <Text style={styles.settingSub}>Allow teammates to invite you to squad battles</Text>
                </View>
                <Switch value={crewInvites} onValueChange={setCrewInvites} trackColor={{ false: "#cbd5e1", true: colors.limeDeep }} />
              </View>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Strict GPS Scoring Only</Text>
                  <Text style={styles.settingSub}>Only count verified GPS outdoor traces</Text>
                </View>
                <Switch value={gpsOnly} onValueChange={setGpsOnly} trackColor={{ false: "#cbd5e1", true: colors.limeDeep }} />
              </View>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>Push Nudge Alerts</Text>
                  <Text style={styles.settingSub}>Receive teammate motivation alerts</Text>
                </View>
                <Switch value={pushAlerts} onValueChange={setPushAlerts} trackColor={{ false: "#cbd5e1", true: colors.limeDeep }} />
              </View>
            </View>

            {/* Connected Trackers */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Connected Trackers</Text>
              <View style={{ gap: 6, marginTop: 8 }}>
                {sensors.map((s) => (
                  <View key={s.id} style={styles.sensorRow}>
                    <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink }}>{s.name}</Text>
                    <Text
                      style={[
                        styles.sensorStatus,
                        s.status === "connected" && { backgroundColor: "#f4faeb", color: colors.limeDeep },
                      ]}
                    >
                      {s.status === "connected" ? "Connected ✓" : "Disconnected"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* ==============================================================
            DESIGN 2: BENTO GRID
            ============================================================== */}
        {variant === "bento" && (
          <View style={styles.bentoGrid}>
            <View style={[styles.bentoCard, { width: "100%" }]}>
              <Text style={styles.bentoTitle}>Athlete Dossier</Text>
              <Text style={{ fontSize: 18, fontFamily: fonts.bodyBold, color: colors.ink, marginTop: 4 }}>
                {profile.name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>{profile.city} · {profile.tier}</Text>
            </View>
            <Pressable style={styles.bentoCard} onPress={() => setProgressModalOpen(true)}>
              <Text style={styles.bentoTitle}>Leo Elo Rating</Text>
              <Text style={[styles.bentoVal, { color: colors.limeDeep }]}>{profile.leoScore}</Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>Division 2 ↗</Text>
            </Pressable>
            <Pressable style={styles.bentoCard} onPress={() => setProgressModalOpen(true)}>
              <Text style={styles.bentoTitle}>Distance</Text>
              <Text style={styles.bentoVal}>{profile.totalDistanceKm}k</Text>
              <Text style={{ fontSize: 11, color: colors.muted }}>148 sessions ↗</Text>
            </Pressable>
          </View>
        )}

        {/* ==============================================================
            DESIGN 3: KINETIC RECORD
            ============================================================== */}
        {variant === "kinetic" && (
          <View style={styles.card}>
            <Text style={styles.kicker}>ATHLETE RECORD</Text>
            <Text style={{ fontSize: 22, fontFamily: fonts.bodyBold, color: colors.ink, marginVertical: 4 }}>
              {profile.name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
              {profile.handle} · {profile.division}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontSize: 11, color: colors.muted }}>Leo Rating</Text>
                <Text style={{ fontSize: 18, fontFamily: fonts.bodyBold, color: colors.ink }}>{profile.leoScore} Elo</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: colors.muted }}>Distance</Text>
                <Text style={{ fontSize: 18, fontFamily: fonts.bodyBold, color: colors.ink }}>{profile.totalDistanceKm} km</Text>
              </View>
              <View>
                <Text style={{ fontSize: 11, color: colors.muted }}>Workouts</Text>
                <Text style={{ fontSize: 18, fontFamily: fonts.bodyBold, color: colors.ink }}>{profile.totalWorkouts}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ==============================================================
            DESIGN 4: GAMER HEX & ATTRIBUTES
            ============================================================== */}
        {variant === "gamer_hex" && (
          <View style={[styles.card, { backgroundColor: "#12141a" }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: colors.lime, fontSize: 12, fontWeight: "800" }}>LEVEL 42 ATHLETE</Text>
              <Text style={{ color: "#ffffff", fontSize: 16, fontFamily: fonts.bodyBold }}>{profile.leoScore} Leo</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <View style={styles.hexBox}>
                <Text style={styles.hexLabel}>Endurance</Text>
                <Text style={styles.hexVal}>92 / 100</Text>
              </View>
              <View style={styles.hexBox}>
                <Text style={styles.hexLabel}>Pace Rhythm</Text>
                <Text style={styles.hexVal}>88 / 100</Text>
              </View>
              <View style={styles.hexBox}>
                <Text style={styles.hexLabel}>Consistency</Text>
                <Text style={styles.hexVal}>96 / 100</Text>
              </View>
              <View style={styles.hexBox}>
                <Text style={styles.hexLabel}>Recovery</Text>
                <Text style={styles.hexVal}>88 / 100</Text>
              </View>
            </View>
          </View>
        )}

        {/* ==============================================================
            DESIGN 5: COMMAND CENTER
            ============================================================== */}
        {variant === "command" && (
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Command Telemetry</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <View>
                <Text style={{ fontSize: 16, fontFamily: fonts.bodyBold, color: colors.ink }}>{profile.name}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>Strava + Apple Health Active</Text>
              </View>
              <Text style={{ fontSize: 18, fontFamily: fonts.bodyBold, color: colors.limeDeep }}>
                {profile.leoScore} Elo
              </Text>
            </View>
          </View>
        )}

        {/* PROMINENT PROGRESS BUTTON (Core User Requirement) */}
        <Pressable style={styles.progressBtn} onPress={() => setProgressModalOpen(true)}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={styles.progressIconWrap}>
              <Text style={{ fontSize: 20 }}>📈</Text>
            </View>
            <View>
              <Text style={styles.progressTitle}>Deep Dive Progress & Trends</Text>
              <Text style={styles.progressSub}>
                Inspect Leo score charts, weekly volume & vitals
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.lime, fontSize: 18, fontWeight: "800" }}>→</Text>
        </Pressable>

        {/* One-Time Historical Backfill Trigger */}
        <Pressable
          style={styles.backfillBtn}
          onPress={() => {
            setBackfillStep(0);
            setBackfillDone(false);
            setBackfillModalOpen(true);
          }}
        >
          <Text style={styles.backfillBtnText}>🔄 Re-calibrate 90-Day Historical Backfill</Text>
        </Pressable>
      </ScrollView>

      {/* MODAL 1: Comprehensive Progress & Analytics */}
      <Modal visible={progressModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>Performance Dossier</Text>
                <Text style={styles.modalTitle}>Progress, Trends & Leo Score</Text>
              </View>
              <Pressable onPress={() => setProgressModalOpen(false)} style={styles.modalClose}>
                <Text style={{ fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            {/* Tabs */}
            <View style={styles.formatToggle}>
              <Pressable
                onPress={() => setAnalyticsTab("leo")}
                style={[styles.formatBtn, analyticsTab === "leo" && styles.formatBtnOn]}
              >
                <Text style={[styles.formatText, analyticsTab === "leo" && styles.formatTextOn]}>📈 Leo Elo</Text>
              </Pressable>
              <Pressable
                onPress={() => setAnalyticsTab("volume")}
                style={[styles.formatBtn, analyticsTab === "volume" && styles.formatBtnOn]}
              >
                <Text style={[styles.formatText, analyticsTab === "volume" && styles.formatTextOn]}>📊 Volume</Text>
              </Pressable>
              <Pressable
                onPress={() => setAnalyticsTab("sports")}
                style={[styles.formatBtn, analyticsTab === "sports" && styles.formatBtnOn]}
              >
                <Text style={[styles.formatText, analyticsTab === "sports" && styles.formatTextOn]}>🏃 Sports</Text>
              </Pressable>
              <Pressable
                onPress={() => setAnalyticsTab("recovery")}
                style={[styles.formatBtn, analyticsTab === "recovery" && styles.formatBtnOn]}
              >
                <Text style={[styles.formatText, analyticsTab === "recovery" && styles.formatTextOn]}>❤️ Recovery</Text>
              </Pressable>
            </View>

            {/* Leo Tab */}
            {analyticsTab === "leo" && (
              <View style={{ gap: 10, marginVertical: 8 }}>
                <View style={styles.heroBox}>
                  <Text style={{ color: "#94a3b8", fontSize: 10, textTransform: "uppercase", fontWeight: "700" }}>Current Leo Rating</Text>
                  <Text style={{ fontSize: 24, fontFamily: fonts.bodyBold, color: colors.lime }}>1,842 Elo</Text>
                  <Text style={{ fontSize: 11, color: "#ffffff" }}>Division 2 (Master) · +222 Elo over 8 weeks</Text>
                </View>
                <View style={styles.chartBox}>
                  <Text style={styles.chartTitle}>8-Week Historical Progression</Text>
                  <View style={styles.barsRow}>
                    {analytics.leoTrend.map((t, idx) => (
                      <View key={t.period} style={styles.barCol}>
                        <Text style={styles.barVal}>{t.score}</Text>
                        <View style={[styles.barFill, { height: `${((t.score - 1500) / 400) * 100}%` }, idx === analytics.leoTrend.length - 1 && { backgroundColor: colors.limeDeep }]} />
                        <Text style={styles.barLabel}>{t.period.replace("Week ", "W")}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Volume Tab */}
            {analyticsTab === "volume" && (
              <View style={{ gap: 10, marginVertical: 8 }}>
                <View style={styles.chartBox}>
                  <Text style={styles.chartTitle}>Weekly Kilometers Logged</Text>
                  <View style={styles.barsRow}>
                    {analytics.weeklyVolume.map((v) => (
                      <View key={v.weekLabel} style={styles.barCol}>
                        <Text style={styles.barVal}>{v.km}k</Text>
                        <View style={[styles.barFill, { height: `${(v.km / 65) * 100}%` }]} />
                        <Text style={styles.barLabel}>{v.weekLabel}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Sports Tab */}
            {analyticsTab === "sports" && (
              <View style={{ gap: 8, marginVertical: 8 }}>
                {analytics.sportBreakdown.map((s) => (
                  <View key={s.sportId} style={styles.sportBreakRow}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink }}>
                        {s.isGps ? "🛰 " : "⚡ "}
                        {s.sportName} ({s.isGps ? "GPS Verified" : "Open Score"})
                      </Text>
                      <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold }}>{s.percentage}%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: "#e2e8f0", borderRadius: 99, marginTop: 4 }}>
                      <View style={{ width: `${s.percentage}%`, height: "100%", backgroundColor: colors.limeDeep, borderRadius: 99 }} />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recovery Tab */}
            {analyticsTab === "recovery" && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 }}>
                <View style={[styles.hexBox, { backgroundColor: colors.paper }]}>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Resting HR</Text>
                  <Text style={{ fontSize: 20, fontFamily: fonts.bodyBold, color: colors.ink }}>
                    {analytics.recoveryTelemetry.restingHr} bpm
                  </Text>
                </View>
                <View style={[styles.hexBox, { backgroundColor: colors.paper }]}>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Sleep Avg</Text>
                  <Text style={{ fontSize: 20, fontFamily: fonts.bodyBold, color: colors.ink }}>
                    {analytics.recoveryTelemetry.sleepHoursAvg} hrs
                  </Text>
                </View>
                <View style={[styles.hexBox, { backgroundColor: colors.paper }]}>
                  <Text style={{ fontSize: 11, color: colors.muted }}>HRV</Text>
                  <Text style={{ fontSize: 20, fontFamily: fonts.bodyBold, color: colors.ink }}>
                    {analytics.recoveryTelemetry.hrvMs} ms
                  </Text>
                </View>
                <View style={[styles.hexBox, { backgroundColor: colors.paper }]}>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Readiness</Text>
                  <Text style={{ fontSize: 20, fontFamily: fonts.bodyBold, color: colors.limeDeep }}>
                    {analytics.recoveryTelemetry.readinessScore} / 100
                  </Text>
                </View>
              </View>
            )}

            <Pressable style={[styles.primaryBtn, { backgroundColor: colors.paper }]} onPress={() => setProgressModalOpen(false)}>
              <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold }}>Close Dossier</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: 90-Day Historical Backfill Simulation */}
      <Modal visible={backfillModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>One-Time Calibration</Text>
                <Text style={styles.modalTitle}>90-Day Historical Backfill</Text>
              </View>
              <Pressable onPress={() => setBackfillModalOpen(false)} style={styles.modalClose}>
                <Text style={{ fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            <View style={{ gap: 8, marginVertical: 12 }}>
              {PROTOTYPE_BACKFILL_STEPS.map((step, idx) => {
                const done = backfillDone || idx < backfillStep;
                return (
                  <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 10, opacity: done ? 1 : 0.4 }}>
                    <Text style={{ fontSize: 14 }}>{done ? "✓" : "⏳"}</Text>
                    <Text style={{ fontSize: 12, fontFamily: fonts.bodyBold, color: colors.ink }}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {!backfillDone ? (
              <Pressable style={styles.primaryBtn} onPress={runBackfill} disabled={backfillRunning}>
                <Text style={styles.primaryBtnText}>
                  {backfillRunning ? "Syncing 90-Day History..." : "Start Historical Backfill Sync"}
                </Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryBtn} onPress={() => setBackfillModalOpen(false)}>
                <Text style={styles.primaryBtnText}>Calibrated: 1,842 Elo (Division 2) ✓</Text>
              </Pressable>
            )}
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
  variantLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  variantSub: { fontSize: 11, color: colors.muted },
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
  variantBtnOn: { backgroundColor: colors.card },
  variantText: { fontSize: 11, color: colors.muted },
  variantTextOn: { fontFamily: fonts.bodyBold, color: colors.ink },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarLg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { fontSize: 18, fontFamily: fonts.bodyBold, color: colors.ink },
  profileHandle: { fontSize: 12, color: colors.muted, marginVertical: 2 },
  leoBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.lime,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  leoBadgeText: { fontSize: 11, fontWeight: "800", color: colors.ink },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  sectionHeader: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.muted, textTransform: "uppercase" },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  settingTitle: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink },
  settingSub: { fontSize: 11, color: colors.muted },
  sensorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.paper,
    padding: 10,
    borderRadius: 10,
  },
  sensorStatus: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bentoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bentoCard: {
    width: "48%",
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  bentoTitle: { fontSize: 10, fontWeight: "800", color: colors.muted, textTransform: "uppercase" },
  bentoVal: { fontSize: 20, fontFamily: fonts.bodyBold, color: colors.ink, marginVertical: 4 },
  hexBox: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 10,
    borderRadius: 10,
  },
  hexLabel: { fontSize: 10, color: "#94a3b8" },
  hexVal: { fontSize: 14, fontWeight: "800", color: "#ffffff", marginTop: 2 },
  progressBtn: {
    backgroundColor: "#12141a",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  progressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(183, 242, 85, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressTitle: { color: "#ffffff", fontSize: 14, fontFamily: fonts.bodyBold },
  progressSub: { color: "#94a3b8", fontSize: 11, marginTop: 2 },
  backfillBtn: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  backfillBtnText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.ink },
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
  modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  modalKicker: { fontSize: 10, fontWeight: "800", color: colors.limeDeep, textTransform: "uppercase" },
  modalTitle: { fontSize: 17, fontFamily: fonts.bodyBold, color: colors.ink },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  formatToggle: {
    flexDirection: "row",
    backgroundColor: colors.paper,
    padding: 4,
    borderRadius: 12,
  },
  formatBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  formatBtnOn: { backgroundColor: colors.card },
  formatText: { fontSize: 11, color: colors.muted },
  formatTextOn: { fontFamily: fonts.bodyBold, color: colors.ink },
  heroBox: {
    backgroundColor: "#12141a",
    padding: 14,
    borderRadius: 14,
  },
  chartBox: {
    backgroundColor: colors.paper,
    padding: 12,
    borderRadius: 14,
  },
  chartTitle: { fontSize: 11, fontWeight: "800", color: colors.muted, textTransform: "uppercase" },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 90,
    marginTop: 8,
  },
  barCol: { alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" },
  barVal: { fontSize: 8, fontWeight: "700", color: colors.muted, marginBottom: 2 },
  barFill: { width: 14, backgroundColor: colors.ink, borderRadius: 3 },
  barLabel: { fontSize: 9, color: colors.muted, marginTop: 4 },
  sportBreakRow: {
    backgroundColor: colors.paper,
    padding: 10,
    borderRadius: 10,
  },
  primaryBtn: {
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 13, fontFamily: fonts.bodyBold },
});
