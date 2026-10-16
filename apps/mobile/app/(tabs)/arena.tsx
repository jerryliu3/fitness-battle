import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PROTOTYPE_ACHIEVEMENTS,
  PROTOTYPE_ARENA_LEADERBOARD,
  PROTOTYPE_AVAILABLE_COMPETITIONS,
  PROTOTYPE_GHOST_COMPARISON,
  PROTOTYPE_GLOBAL_RECORDS,
  SUPPORTED_SPORTS,
  type ArenaCompetitor,
} from "@fitness-battle/shared";
import { colors, fonts, SHELL_COLORS, SHELL_RADIUS } from "../../src/theme";

export type ArenaVariant = "split_duel" | "podium" | "cyber_radar" | "track_circuit" | "card_deck";

export default function MobileArenaScreen() {
  const [variant, setVariant] = useState<ArenaVariant>("split_duel");
  const [isRegistered, setIsRegistered] = useState(true);
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [ghostModalOpen, setGhostModalOpen] = useState(false);
  const [rankingsModalOpen, setRankingsModalOpen] = useState(false);
  const [awardsModalOpen, setAwardsModalOpen] = useState(false);

  // Registration modal states
  const [selectedCompId, setSelectedCompId] = useState(PROTOTYPE_AVAILABLE_COMPETITIONS[0]?.id ?? "");
  const [format, setFormat] = useState<"solo" | "crew">("solo");
  const [selectedSport, setSelectedSport] = useState("running");

  // Rankings modal filter
  const [rankingsFilter, setRankingsFilter] = useState<"5k" | "10k">("5k");

  const you = PROTOTYPE_ARENA_LEADERBOARD.find((c) => c.isYou);
  const ghost = PROTOTYPE_ARENA_LEADERBOARD.find((c) => c.isGhost);
  const topThree = PROTOTYPE_ARENA_LEADERBOARD.filter((c) => !c.isGhost).slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.kicker}>Tab 2 · Arena</Text>
          <Text style={styles.title}>Weekly Leaderboard & Ghost</Text>
        </View>

        {/* 5 Unique & Distinct Designs Switcher */}
        <View style={styles.variantContainer}>
          <View style={styles.variantLabelRow}>
            <Text style={styles.variantSub}>Select Design Variant:</Text>
            <Text style={styles.variantActiveName}>
              {variant === "split_duel" && "1. Split Duel"}
              {variant === "podium" && "2. Podium Stadium"}
              {variant === "cyber_radar" && "3. Cyber Radar"}
              {variant === "track_circuit" && "4. Track Circuit"}
              {variant === "card_deck" && "5. Cards Deck"}
            </Text>
          </View>
          <View style={styles.variantPills}>
            <Pressable
              onPress={() => setVariant("split_duel")}
              style={[styles.variantBtn, variant === "split_duel" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "split_duel" && styles.variantTextOn]}>
                Split
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("podium")}
              style={[styles.variantBtn, variant === "podium" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "podium" && styles.variantTextOn]}>
                Podium
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("cyber_radar")}
              style={[styles.variantBtn, variant === "cyber_radar" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "cyber_radar" && styles.variantTextOn]}>
                Cyber
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("track_circuit")}
              style={[styles.variantBtn, variant === "track_circuit" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "track_circuit" && styles.variantTextOn]}>
                Circuit
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("card_deck")}
              style={[styles.variantBtn, variant === "card_deck" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "card_deck" && styles.variantTextOn]}>
                Deck
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Action Bar: Register, Rankings, Awards, Ghost */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRow}>
          <Pressable style={styles.actionPillPrimary} onPress={() => setRegModalOpen(true)}>
            <Text style={styles.actionPillPrimaryText}>📋 Register (Solo / Crew)</Text>
          </Pressable>
          <Pressable style={styles.actionPill} onPress={() => setGhostModalOpen(true)}>
            <Text style={styles.actionPillText}>👻 Ghost Comparator</Text>
          </Pressable>
          <Pressable style={styles.actionPill} onPress={() => setRankingsModalOpen(true)}>
            <Text style={styles.actionPillText}>🌐 All-Time Global</Text>
          </Pressable>
          <Pressable style={styles.actionPill} onPress={() => setAwardsModalOpen(true)}>
            <Text style={styles.actionPillText}>🏆 Awards ({PROTOTYPE_ACHIEVEMENTS.length})</Text>
          </Pressable>
        </ScrollView>

        {/* Empty State CTA (if not registered) */}
        {!isRegistered && (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 32, textAlign: "center" }}>🏟️</Text>
            <Text style={styles.emptyTitle}>You Are Not in an Active Arena</Text>
            <Text style={styles.emptySub}>
              Register solo or opt in with your crew for this week's Division 2 Grand Prix.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => setRegModalOpen(true)}>
              <Text style={styles.primaryBtnText}>Open Registration Panel →</Text>
            </Pressable>
          </View>
        )}

        {/* When registered, show chosen layout variant */}
        {isRegistered && (
          <>
            {/* ==============================================================
                DESIGN 1: SPLIT DUEL WITH GHOST COMPARISON
                ============================================================== */}
            {variant === "split_duel" && (
              <View style={styles.card}>
                {/* Ghost Telemetry Banner */}
                <Pressable style={styles.ghostBanner} onPress={() => setGhostModalOpen(true)}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 22 }}>👻</Text>
                    <View>
                      <Text style={styles.ghostBannerTitle}>Past-Self Ghost</Text>
                      <Text style={styles.ghostBannerSub}>5:16/km pace · Tap for split telemetry</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.ghostLeadText}>+3.6 km</Text>
                    <Text style={styles.ghostLeadSub}>AHEAD</Text>
                  </View>
                </Pressable>

                {/* Progress Bar Lanes */}
                <View style={styles.lanesBox}>
                  <Text style={styles.sectionHeader}>Division 2 Split Lanes</Text>
                  {PROTOTYPE_ARENA_LEADERBOARD.slice(0, 5).map((comp) => (
                    <View key={comp.id} style={styles.laneRow}>
                      <Text style={styles.laneName}>{comp.name.split(" ")[0]}</Text>
                      <View style={styles.laneBarBg}>
                        <View
                          style={[
                            styles.laneBar,
                            { width: `${(comp.distanceKm / 50) * 100}%` },
                            comp.isYou && styles.laneBarYou,
                            comp.isGhost && styles.laneBarGhost,
                          ]}
                        />
                      </View>
                      <Text style={styles.laneKm}>{comp.distanceKm}k</Text>
                    </View>
                  ))}
                </View>

                {/* Leaderboard Table */}
                <View style={{ gap: 6, marginTop: 12 }}>
                  {PROTOTYPE_ARENA_LEADERBOARD.map((comp) => (
                    <View
                      key={comp.id}
                      style={[
                        styles.rosterRow,
                        comp.isYou && styles.rosterRowYou,
                        comp.isGhost && styles.rosterRowGhost,
                      ]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={[styles.rosterRank, comp.rank <= 3 && styles.topRank]}>
                          {comp.isGhost ? "👻" : `#${comp.rank}`}
                        </Text>
                        <View>
                          <Text style={styles.rosterName}>{comp.name}</Text>
                          <Text style={styles.rosterSub}>
                            {comp.pace} · {comp.leoScore} Elo
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.rosterKm}>{comp.distanceKm} km</Text>
                        <Text
                          style={[
                            styles.trendText,
                            comp.rankTrend === "up" && { color: colors.limeDeep },
                            comp.rankTrend === "down" && { color: "#dc2626" },
                          ]}
                        >
                          {comp.rankTrend === "up" ? "▲ UP" : comp.rankTrend === "down" ? "▼ DOWN" : "● STEADY"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ==============================================================
                DESIGN 2: PODIUM STADIUM
                ============================================================== */}
            {variant === "podium" && (
              <View style={styles.card}>
                <View style={styles.podiumHero}>
                  {/* 2nd Place */}
                  <View style={styles.podiumCol}>
                    <Text style={{ fontSize: 18 }}>🥈</Text>
                    <View style={[styles.podiumAvatar, { backgroundColor: "#94a3b8" }]}>
                      <Text style={styles.podiumInitials}>{topThree[1]?.name.slice(0, 2)}</Text>
                    </View>
                    <Text style={styles.podiumName}>{topThree[1]?.name.split(" ")[0]}</Text>
                    <Text style={styles.podiumKm}>{topThree[1]?.distanceKm}k</Text>
                    <View style={[styles.podiumStand, { height: 40 }]} />
                  </View>

                  {/* 1st Place */}
                  <View style={styles.podiumCol}>
                    <Text style={{ fontSize: 24 }}>👑</Text>
                    <View style={[styles.podiumAvatar, { backgroundColor: "#f59e0b", width: 50, height: 50 }]}>
                      <Text style={[styles.podiumInitials, { fontSize: 16 }]}>{topThree[0]?.name.slice(0, 2)}</Text>
                    </View>
                    <Text style={[styles.podiumName, { fontWeight: "800" }]}>{topThree[0]?.name.split(" ")[0]}</Text>
                    <Text style={[styles.podiumKm, { fontSize: 15 }]}>{topThree[0]?.distanceKm}k</Text>
                    <View style={[styles.podiumStand, { height: 65 }]} />
                  </View>

                  {/* 3rd Place */}
                  <View style={styles.podiumCol}>
                    <Text style={{ fontSize: 18 }}>🥉</Text>
                    <View style={[styles.podiumAvatar, { backgroundColor: "#d97706" }]}>
                      <Text style={styles.podiumInitials}>YOU</Text>
                    </View>
                    <Text style={styles.podiumName}>You</Text>
                    <Text style={styles.podiumKm}>{topThree[2]?.distanceKm}k</Text>
                    <View style={[styles.podiumStand, { height: 26 }]} />
                  </View>
                </View>

                {/* Rest of Leaderboard */}
                <View style={{ gap: 6 }}>
                  {PROTOTYPE_ARENA_LEADERBOARD.slice(3).map((comp) => (
                    <View key={comp.id} style={styles.rosterRow}>
                      <Text style={styles.rosterRank}>#{comp.rank}</Text>
                      <Text style={{ flex: 1, fontFamily: fonts.bodyBold, color: colors.ink }}>{comp.name}</Text>
                      <Text style={styles.rosterKm}>{comp.distanceKm} km</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ==============================================================
                DESIGN 3: CYBER RADAR
                ============================================================== */}
            {variant === "cyber_radar" && (
              <View style={styles.card}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                  <Text style={styles.sectionHeader}>Division 2 Radar Roster</Text>
                  <Text style={{ color: colors.limeDeep, fontWeight: "800", fontSize: 11 }}>LIVE WAVE</Text>
                </View>
                <View style={{ gap: 6 }}>
                  {PROTOTYPE_ARENA_LEADERBOARD.map((comp) => (
                    <View
                      key={comp.id}
                      style={[
                        styles.rosterRow,
                        comp.isYou && { backgroundColor: "#f6fee7", borderColor: colors.lime },
                      ]}
                    >
                      <Text style={styles.rosterRank}>{comp.isGhost ? "👻" : comp.rank}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink }}>
                          {comp.name}
                        </Text>
                        <Text style={{ fontSize: 10, color: colors.muted }}>{comp.leoScore} Leo</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.muted, marginRight: 10 }}>{comp.pace}</Text>
                      <Text style={styles.rosterKm}>{comp.distanceKm}k</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ==============================================================
                DESIGN 4: TRACK CIRCUIT
                ============================================================== */}
            {variant === "track_circuit" && (
              <View style={styles.card}>
                <Text style={styles.sectionHeader}>Pursuit Circuit Simulation</Text>
                <View style={styles.circuitOval}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase" }}>Lead Delta</Text>
                    <Text style={{ fontSize: 20, fontFamily: fonts.bodyBold, color: colors.ink }}>+3.6 km</Text>
                    <Text style={{ fontSize: 11, color: colors.limeDeep, fontWeight: "700" }}>Ahead of Ghost</Text>
                  </View>
                </View>

                <View style={{ gap: 6, marginTop: 12 }}>
                  {PROTOTYPE_ARENA_LEADERBOARD.slice(0, 4).map((c) => (
                    <View key={c.id} style={styles.rosterRow}>
                      <Text style={styles.rosterRank}>#{c.rank}</Text>
                      <Text style={{ flex: 1, fontFamily: fonts.bodyBold, color: colors.ink }}>{c.name}</Text>
                      <Text style={styles.rosterKm}>{c.distanceKm} km</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ==============================================================
                DESIGN 5: CARDS DECK
                ============================================================== */}
            {variant === "card_deck" && (
              <View style={{ gap: 10 }}>
                {PROTOTYPE_ARENA_LEADERBOARD.map((comp) => (
                  <View
                    key={comp.id}
                    style={[
                      styles.deckCard,
                      comp.isYou && { borderColor: colors.lime, borderWidth: 2, backgroundColor: "#f6fee7" },
                    ]}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Text style={{ fontSize: 15, fontFamily: fonts.bodyBold, color: colors.muted }}>
                          {comp.isGhost ? "👻" : `#${comp.rank}`}
                        </Text>
                        <View>
                          <Text style={{ fontSize: 14, fontFamily: fonts.bodyBold, color: colors.ink }}>
                            {comp.name}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.muted }}>{comp.pace} · {comp.leoScore} Leo</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 18, fontFamily: fonts.bodyBold, color: colors.ink }}>
                        {comp.distanceKm} km
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* MODAL 1: Registration Dialog (Solo vs Crew) */}
      <Modal visible={regModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>Arena Enrollment</Text>
                <Text style={styles.modalTitle}>Register for Competition</Text>
              </View>
              <Pressable onPress={() => setRegModalOpen(false)} style={styles.modalClose}>
                <Text style={{ fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            {/* Participation Format */}
            <Text style={styles.inputLabel}>Participation Format</Text>
            <View style={styles.formatToggle}>
              <Pressable
                onPress={() => setFormat("solo")}
                style={[styles.formatBtn, format === "solo" && styles.formatBtnOn]}
              >
                <Text style={[styles.formatText, format === "solo" && styles.formatTextOn]}>
                  👤 Solo Entry
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFormat("crew")}
                style={[styles.formatBtn, format === "crew" && styles.formatBtnOn]}
              >
                <Text style={[styles.formatText, format === "crew" && styles.formatTextOn]}>
                  🛡 As a Crew (Neon Gazelles)
                </Text>
              </Pressable>
            </View>

            {/* Select League */}
            <Text style={styles.inputLabel}>Select Tournament</Text>
            <View style={{ gap: 6, marginBottom: 12 }}>
              {PROTOTYPE_AVAILABLE_COMPETITIONS.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedCompId(c.id)}
                  style={[
                    styles.compRow,
                    selectedCompId === c.id && { borderColor: colors.ink, backgroundColor: "#f6fee7" },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink }}>{c.title}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>{c.division} · Closes in {c.closesInDays}d</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.limeDeep }}>Open</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                setIsRegistered(true);
                setRegModalOpen(false);
              }}
            >
              <Text style={styles.primaryBtnText}>
                Confirm & Enter {format === "solo" ? "Solo" : "Crew"} Arena
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Ghost Telemetry Comparator */}
      <Modal visible={ghostModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>Ghost Telemetry</Text>
                <Text style={styles.modalTitle}>{PROTOTYPE_GHOST_COMPARISON.ghostName}</Text>
              </View>
              <Pressable onPress={() => setGhostModalOpen(false)} style={styles.modalClose}>
                <Text style={{ fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.ghostDeltaBox}>
              <Text style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Live Lead</Text>
              <Text style={{ fontSize: 24, fontFamily: fonts.bodyBold, color: colors.lime }}>+3.6 km Ahead</Text>
              <Text style={{ fontSize: 12, color: "#ffffff" }}>5:08/km vs {PROTOTYPE_GHOST_COMPARISON.pace}</Text>
            </View>

            <View style={{ gap: 8, marginVertical: 12 }}>
              <Text style={styles.inputLabel}>Cutoff Checkpoints</Text>
              {PROTOTYPE_GHOST_COMPARISON.telemetry.map((t, idx) => (
                <View key={idx} style={styles.ghostSplitRow}>
                  <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold }}>{t.checkpoint}</Text>
                  <Text style={{ fontSize: 12 }}>
                    <Text style={{ fontWeight: "700" }}>{t.youKm} km</Text> vs {t.ghostKm} km
                  </Text>
                </View>
              ))}
            </View>

            <Pressable style={[styles.primaryBtn, { backgroundColor: colors.paper }]} onPress={() => setGhostModalOpen(false)}>
              <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold }}>Close Comparator</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: All-Time Rankings */}
      <Modal visible={rankingsModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>OpenTrack Global Standings</Text>
                <Text style={styles.modalTitle}>All-Time Pace Leaderboard</Text>
              </View>
              <Pressable onPress={() => setRankingsModalOpen(false)} style={styles.modalClose}>
                <Text style={{ fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.formatToggle}>
              <Pressable
                onPress={() => setRankingsFilter("5k")}
                style={[styles.formatBtn, rankingsFilter === "5k" && styles.formatBtnOn]}
              >
                <Text style={[styles.formatText, rankingsFilter === "5k" && styles.formatTextOn]}>5K Record</Text>
              </Pressable>
              <Pressable
                onPress={() => setRankingsFilter("10k")}
                style={[styles.formatBtn, rankingsFilter === "10k" && styles.formatBtnOn]}
              >
                <Text style={[styles.formatText, rankingsFilter === "10k" && styles.formatTextOn]}>10K Record</Text>
              </Pressable>
            </View>

            <View style={{ gap: 6, marginVertical: 12 }}>
              {PROTOTYPE_GLOBAL_RECORDS.filter((r) => r.category === rankingsFilter).map((rec) => (
                <View
                  key={`${rec.category}-${rec.rank}`}
                  style={[styles.rosterRow, rec.isYou && { backgroundColor: "#f6fee7", borderColor: colors.lime }]}
                >
                  <Text style={styles.rosterRank}>#{rec.rank}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink }}>
                      {rec.athleteName} ({rec.country})
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.muted }}>{rec.avgPace} · {rec.date}</Text>
                  </View>
                  <Text style={styles.rosterKm}>{rec.finishTime}</Text>
                </View>
              ))}
            </View>

            <Pressable style={[styles.primaryBtn, { backgroundColor: colors.paper }]} onPress={() => setRankingsModalOpen(false)}>
              <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold }}>Close Global Records</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Past Achievements & Awards */}
      <Modal visible={awardsModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>Trophy Cabinet</Text>
                <Text style={styles.modalTitle}>Past Awards & Medals</Text>
              </View>
              <Pressable onPress={() => setAwardsModalOpen(false)} style={styles.modalClose}>
                <Text style={{ fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            <View style={{ gap: 8, marginVertical: 8 }}>
              {PROTOTYPE_ACHIEVEMENTS.map((ach) => (
                <View key={ach.id} style={styles.achRow}>
                  <Text style={{ fontSize: 24 }}>
                    {ach.tier === "gold" ? "🥇" : ach.tier === "silver" ? "🥈" : "🥉"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink }}>{ach.title}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>{ach.subtitle} · {ach.earnedDate}</Text>
                    <Text style={{ fontSize: 11, color: colors.ink, marginTop: 2 }}>{ach.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Pressable style={[styles.primaryBtn, { backgroundColor: colors.paper }]} onPress={() => setAwardsModalOpen(false)}>
              <Text style={{ color: colors.ink, fontFamily: fonts.bodyBold }}>Close Trophy Cabinet</Text>
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
  actionRow: { gap: 8, paddingVertical: 2 },
  actionPillPrimary: {
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
  },
  actionPillPrimaryText: { color: "#ffffff", fontSize: 12, fontFamily: fonts.bodyBold },
  actionPill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
  },
  actionPillText: { color: colors.ink, fontSize: 12, fontFamily: fonts.bodyBold },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  ghostBanner: {
    backgroundColor: "#12141a",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ghostBannerTitle: { color: "#ffffff", fontSize: 13, fontFamily: fonts.bodyBold },
  ghostBannerSub: { color: "#94a3b8", fontSize: 11 },
  ghostLeadText: { color: colors.lime, fontSize: 14, fontFamily: fonts.bodyBold },
  ghostLeadSub: { color: "#94a3b8", fontSize: 9, fontWeight: "700" },
  lanesBox: {
    backgroundColor: colors.paper,
    padding: 12,
    borderRadius: 14,
    gap: 8,
  },
  sectionHeader: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink },
  laneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  laneName: { width: 55, fontSize: 12, fontFamily: fonts.bodyBold, color: colors.ink },
  laneBarBg: { flex: 1, height: 10, backgroundColor: "#e2e8f0", borderRadius: 99, overflow: "hidden" },
  laneBar: { height: "100%", backgroundColor: colors.ink, borderRadius: 99 },
  laneBarYou: { backgroundColor: colors.limeDeep },
  laneBarGhost: { backgroundColor: "#94a3b8" },
  laneKm: { width: 40, textAlign: "right", fontSize: 11, fontFamily: fonts.bodyBold },
  rosterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
  },
  rosterRowYou: { backgroundColor: "#f6fee7", borderColor: colors.lime },
  rosterRowGhost: { backgroundColor: "#f8fafc", borderStyle: "dashed" },
  rosterRank: { width: 26, fontSize: 13, fontFamily: fonts.bodyBold, color: colors.muted, textAlign: "center" },
  topRank: { color: "#f59e0b" },
  rosterName: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink },
  rosterSub: { fontSize: 10, color: colors.muted },
  rosterKm: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.ink },
  trendText: { fontSize: 9, fontWeight: "800", color: colors.muted },
  podiumHero: {
    backgroundColor: "#12141a",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  podiumCol: { alignItems: "center" },
  podiumAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  podiumInitials: { color: "#12141a", fontWeight: "800", fontSize: 12 },
  podiumName: { color: "#ffffff", fontSize: 11, fontFamily: fonts.bodyBold },
  podiumKm: { color: colors.lime, fontSize: 13, fontFamily: fonts.bodyBold },
  podiumStand: { width: 60, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 6, marginTop: 4 },
  circuitOval: {
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  deckCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    borderStyle: "dashed",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: fonts.bodyBold, color: colors.ink },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: "center", lineHeight: 17 },
  primaryBtn: {
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  primaryBtnText: { color: "#ffffff", fontSize: 13, fontFamily: fonts.bodyBold },
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
  inputLabel: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.ink, marginBottom: 6 },
  formatToggle: {
    flexDirection: "row",
    backgroundColor: colors.paper,
    padding: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  formatBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  formatBtnOn: { backgroundColor: colors.card },
  formatText: { fontSize: 12, color: colors.muted },
  formatTextOn: { fontFamily: fonts.bodyBold, color: colors.ink },
  compRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
  },
  ghostDeltaBox: {
    backgroundColor: "#12141a",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  ghostSplitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.paper,
    padding: 10,
    borderRadius: 10,
  },
  achRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.paper,
    padding: 10,
    borderRadius: 12,
  },
});
