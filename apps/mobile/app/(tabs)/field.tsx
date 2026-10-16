import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PROTOTYPE_CREW_DETAILS,
  PROTOTYPE_CREW_FEED,
  PROTOTYPE_CREW_MEMBERS,
  type CrewActivityFeedItem,
  type CrewDetails,
  type CrewMember,
} from "@fitness-battle/shared";
import { colors, fonts } from "../../src/theme";

export type CrewVariant = "clubhouse" | "syndicate" | "stories" | "battleground" | "ledger";

export default function MobileCrewScreen() {
  const [variant, setVariant] = useState<CrewVariant>("clubhouse");
  const [crew, setCrew] = useState<CrewDetails>(PROTOTYPE_CREW_DETAILS);
  const [members, setMembers] = useState<CrewMember[]>(PROTOTYPE_CREW_MEMBERS);
  const [feed, setFeed] = useState<CrewActivityFeedItem[]>(PROTOTYPE_CREW_FEED);
  const [viewMode, setViewMode] = useState<"feed" | "leaderboard">("feed");

  // Nudge Modal
  const [nudgeTarget, setNudgeTarget] = useState<CrewMember | null>(null);
  const [nudgeSent, setNudgeSent] = useState(false);

  // Manage Modal
  const [manageOpen, setManageOpen] = useState(false);
  const [editName, setEditName] = useState(crew.name);
  const [editMotto, setEditMotto] = useState(crew.motto);

  function handleCheer(id: string) {
    setFeed((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const userCheered = !item.userCheered;
          return {
            ...item,
            userCheered,
            cheersCount: userCheered ? item.cheersCount + 1 : item.cheersCount - 1,
          };
        }
        return item;
      }),
    );
  }

  function sendNudge() {
    setNudgeSent(true);
    setTimeout(() => {
      setNudgeSent(false);
      setNudgeTarget(null);
    }, 1000);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.kicker}>Tab 3 · Crew</Text>
          <Text style={styles.title}>Squad Social & Nudging</Text>
        </View>

        {/* 5 Unique & Distinct Designs Switcher */}
        <View style={styles.variantContainer}>
          <View style={styles.variantLabelRow}>
            <Text style={styles.variantSub}>Select Design Variant:</Text>
            <Text style={styles.variantActiveName}>
              {variant === "clubhouse" && "1. Clubhouse Feed"}
              {variant === "syndicate" && "2. Tactical Syndicate"}
              {variant === "stories" && "3. Stories Stream"}
              {variant === "battleground" && "4. Co-Op Battle"}
              {variant === "ledger" && "5. Squad Ledger"}
            </Text>
          </View>
          <View style={styles.variantPills}>
            <Pressable
              onPress={() => setVariant("clubhouse")}
              style={[styles.variantBtn, variant === "clubhouse" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "clubhouse" && styles.variantTextOn]}>
                Club
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("syndicate")}
              style={[styles.variantBtn, variant === "syndicate" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "syndicate" && styles.variantTextOn]}>
                Mission
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("stories")}
              style={[styles.variantBtn, variant === "stories" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "stories" && styles.variantTextOn]}>
                Stories
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("battleground")}
              style={[styles.variantBtn, variant === "battleground" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "battleground" && styles.variantTextOn]}>
                Battle
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVariant("ledger")}
              style={[styles.variantBtn, variant === "ledger" && styles.variantBtnOn]}
            >
              <Text style={[styles.variantText, variant === "ledger" && styles.variantTextOn]}>
                Ledger
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Crew Banner */}
        <View style={styles.crewHero}>
          <View style={styles.crewHeroTop}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.crewTitle}>{crew.name}</Text>
              <View style={styles.crewBadge}>
                <Text style={styles.crewBadgeText}>[{crew.tag}]</Text>
              </View>
            </View>
            <Pressable style={styles.manageBtn} onPress={() => setManageOpen(true)}>
              <Text style={styles.manageBtnText}>⚙️ Manage</Text>
            </Pressable>
          </View>
          <Text style={styles.crewMotto}>"{crew.motto}"</Text>

          <View style={styles.crewStatsBar}>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.crewStatVal}>#{crew.rank}</Text>
              <Text style={styles.crewStatLabel}>GLOBAL RANK</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.crewStatVal}>{crew.weeklyCurrentKm} km</Text>
              <Text style={styles.crewStatLabel}>WEEKLY VOL</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.crewStatVal}>{crew.totalMembers} / {crew.maxMembers}</Text>
              <Text style={styles.crewStatLabel}>ATHLETES</Text>
            </View>
          </View>
        </View>

        {/* Teammate Nudge Radar Strip */}
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={styles.sectionHeader}>Teammates & Nudge Radar</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>Tap avatar to nudge</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {members.map((m) => (
              <Pressable key={m.id} style={styles.nudgeAvatarBtn} onPress={() => setNudgeTarget(m)}>
                <View
                  style={[
                    styles.nudgeAvatarRing,
                    m.status === "slacking" && { borderColor: "#ef4444" },
                    m.status === "resting" && { borderColor: "#94a3b8" },
                  ]}
                >
                  <Text style={{ fontWeight: "800", fontSize: 13 }}>{m.name.slice(0, 2)}</Text>
                  <View style={styles.nudgeBadge}>
                    <Text style={{ fontSize: 9 }}>⚡</Text>
                  </View>
                </View>
                <Text style={styles.nudgeAvatarName}>{m.name.split(" ")[0]}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* View Toggle (Feed vs Leaderboard) */}
        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.toggleBtn, viewMode === "feed" && styles.toggleBtnOn]}
            onPress={() => setViewMode("feed")}
          >
            <Text style={[styles.toggleText, viewMode === "feed" && styles.toggleTextOn]}>
              💬 Crew Activity Feed
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, viewMode === "leaderboard" && styles.toggleBtnOn]}
            onPress={() => setViewMode("leaderboard")}
          >
            <Text style={[styles.toggleText, viewMode === "leaderboard" && styles.toggleTextOn]}>
              🏆 Crew Leaderboard
            </Text>
          </Pressable>
        </View>

        {/* Leaderboard View */}
        {viewMode === "leaderboard" && (
          <View style={{ gap: 6 }}>
            {members
              .slice()
              .sort((a, b) => b.weeklyKm - a.weeklyKm)
              .map((m, idx) => (
                <View
                  key={m.id}
                  style={[
                    styles.memberRow,
                    m.name.includes("You") && { backgroundColor: "#f6fee7", borderColor: colors.lime },
                  ]}
                >
                  <Text style={[styles.memberRank, idx === 0 && { color: "#f59e0b" }]}>#{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink }}>
                      {m.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.muted }}>
                      {m.role} · {m.streakDays}d streak
                    </Text>
                  </View>
                  <Text style={styles.memberKm}>{m.weeklyKm} km</Text>
                  <Pressable style={styles.miniNudgeBtn} onPress={() => setNudgeTarget(m)}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: colors.ink }}>⚡ Nudge</Text>
                  </Pressable>
                </View>
              ))}
          </View>
        )}

        {/* Feed View (According to selected design variant) */}
        {viewMode === "feed" && (
          <View style={{ gap: 10 }}>
            {feed.map((post) => (
              <View
                key={post.id}
                style={[
                  styles.feedCard,
                  variant === "stories" && { borderLeftWidth: 4, borderLeftColor: colors.limeDeep },
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink }}>
                    {post.memberName}
                  </Text>
                  <View style={styles.feedPill}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: colors.ink }}>
                      {post.distanceOrDuration}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold, color: colors.ink, marginVertical: 3 }}>
                  {post.title}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {post.timestamp} · {post.sportName}
                </Text>

                <View style={styles.feedActionRow}>
                  <Pressable
                    style={[styles.cheerBtn, post.userCheered && { backgroundColor: colors.lime }]}
                    onPress={() => handleCheer(post.id)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700" }}>
                      🔥 High Five ({post.cheersCount})
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.cheerBtn}
                    onPress={() => {
                      const target = members.find((m) => m.name === post.memberName);
                      if (target) setNudgeTarget(target);
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700" }}>⚡ Nudge Back</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: Nudge Modal */}
      <Modal visible={nudgeTarget != null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>Squad Motivation</Text>
                <Text style={styles.modalTitle}>Nudge {nudgeTarget?.name}</Text>
              </View>
              <Pressable onPress={() => setNudgeTarget(null)} style={styles.modalClose}>
                <Text style={{ fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            <View style={{ backgroundColor: colors.paper, padding: 12, borderRadius: 12, marginVertical: 10 }}>
              <Text style={{ fontSize: 13, fontFamily: fonts.bodyBold }}>
                {nudgeTarget?.name} ({nudgeTarget?.role})
              </Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                {nudgeTarget?.weeklyKm} km logged this week · Last active {nudgeTarget?.lastActiveLabel}
              </Text>
            </View>

            {nudgeSent ? (
              <View style={{ backgroundColor: "#dcfce7", padding: 14, borderRadius: 12, alignItems: "center" }}>
                <Text style={{ color: "#15803d", fontFamily: fonts.bodyBold }}>
                  ⚡ Nudge Delivered to {nudgeTarget?.name}!
                </Text>
              </View>
            ) : (
              <Pressable style={styles.primaryBtn} onPress={sendNudge}>
                <Text style={styles.primaryBtnText}>⚡ Send Motivational Nudge</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Crew Administration Modal */}
      <Modal visible={manageOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalKicker}>Crew Settings</Text>
                <Text style={styles.modalTitle}>Manage {crew.name}</Text>
              </View>
              <Pressable onPress={() => setManageOpen(false)} style={styles.modalClose}>
                <Text style={{ fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            <View style={{ gap: 10, marginVertical: 10 }}>
              <View>
                <Text style={styles.inputLabel}>Crew Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  style={styles.textInput}
                />
              </View>
              <View>
                <Text style={styles.inputLabel}>Crew Motto</Text>
                <TextInput
                  value={editMotto}
                  onChangeText={setEditMotto}
                  style={styles.textInput}
                />
              </View>
            </View>

            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                setCrew({ ...crew, name: editName, motto: editMotto });
                setManageOpen(false);
              }}
            >
              <Text style={styles.primaryBtnText}>Save Crew Settings</Text>
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
  crewHero: {
    backgroundColor: "#12141a",
    borderRadius: 18,
    padding: 16,
  },
  crewHeroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  crewTitle: { color: "#ffffff", fontSize: 18, fontFamily: fonts.bodyBold },
  crewBadge: {
    backgroundColor: colors.lime,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  crewBadgeText: { color: colors.ink, fontSize: 10, fontWeight: "800" },
  manageBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  manageBtnText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  crewMotto: { color: "#94a3b8", fontSize: 12, fontStyle: "italic", marginVertical: 8 },
  crewStatsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  crewStatVal: { color: colors.lime, fontSize: 15, fontFamily: fonts.bodyBold },
  crewStatLabel: { color: "#cbd5e1", fontSize: 9, fontWeight: "700" },
  sectionHeader: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.ink, textTransform: "uppercase" },
  nudgeAvatarBtn: { alignItems: "center", width: 52 },
  nudgeAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.limeDeep,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    position: "relative",
  },
  nudgeBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  nudgeAvatarName: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.ink, marginTop: 4 },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: colors.paper,
    padding: 4,
    borderRadius: 12,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  toggleBtnOn: { backgroundColor: colors.card },
  toggleText: { fontSize: 12, color: colors.muted },
  toggleTextOn: { fontFamily: fonts.bodyBold, color: colors.ink },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  memberRank: { width: 26, fontSize: 13, fontFamily: fonts.bodyBold, color: colors.muted },
  memberKm: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.ink, marginRight: 8 },
  miniNudgeBtn: {
    backgroundColor: colors.paper,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  feedCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 14,
  },
  feedPill: {
    backgroundColor: colors.paper,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  feedActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  cheerBtn: {
    backgroundColor: colors.paper,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
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
  primaryBtn: {
    backgroundColor: colors.ink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 13, fontFamily: fonts.bodyBold },
  inputLabel: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.ink, marginBottom: 4 },
  textInput: {
    backgroundColor: colors.paper,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
  },
});
