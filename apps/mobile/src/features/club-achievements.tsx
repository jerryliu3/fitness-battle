import { Section, TextAction, AppText } from "../ui/section";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import {
  athleteMomentumModel,
  competeNow,
  type CompeteState,
  type MomentumRingModel,
} from "@fitness-battle/shared";
import { SHELL_COLORS as c } from "../theme";

const RING_COLORS: Record<MomentumRingModel["accent"], string> = {
  gold: "#f7c948",
  teal: "#176c75",
  ink: "#142b3b",
  amber: "#dfad3c",
};

export function Achievements({ state }: { state: CompeteState }) {
  const now = competeNow(state);
  const momentum = athleteMomentumModel(state, now);
  const [selectedId, setSelectedId] = useState<string>("streak");
  const router = useRouter();

  const inspectedRing = momentum.rings.find((r) => r.id === selectedId);
  const inspectedBento = momentum.bentoCards.find((b) => b.id === selectedId);
  const inspected = inspectedRing ?? inspectedBento ?? momentum.rings[0]!;

  return (
    <Section
      title="Momentum & milestones"
      action={
        <TextAction
          label="View all"
          accessibilityLabel="View all achievements"
          onPress={() => router.push("/progress-achievements")}
        />
      }
    >
      <View style={{ gap: 12 }}>
        {/* 4 LIVE MOMENTUM RINGS CARD */}
        <View
          style={{
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 20,
            padding: 16,
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <AppText role="label">Live Milestone Rings</AppText>
              <AppText role="caption" secondary>
                Every counted workout advances all 4 career rings
              </AppText>
            </View>
            <View
              style={{
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: "#fff5d1",
              }}
            >
              <AppText role="caption" style={{ color: c.ink, fontWeight: "700" }}>
                {momentum.activeRingCount} Active
              </AppText>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {momentum.rings.map((ring) => {
              const active = selectedId === ring.id;
              const dash = Math.round(ring.fraction * 138.2);
              const stroke = RING_COLORS[ring.accent];
              return (
                <Pressable
                  key={ring.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${ring.label}: ${ring.metricLabel}, ${ring.percent}%`}
                  onPress={() => setSelectedId(ring.id)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    paddingVertical: 10,
                    paddingHorizontal: 4,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: active ? c.ink : c.line,
                    backgroundColor: active ? "#fffdf5" : c.paper,
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Svg
                      width={52}
                      height={52}
                      viewBox="0 0 56 56"
                      style={{ position: "absolute" }}
                      accessible={Platform.OS === "web" ? undefined : false}
                    >
                      <Circle
                        cx="28"
                        cy="28"
                        r="22"
                        fill="none"
                        stroke={c.line}
                        strokeWidth={5}
                      />
                      <Circle
                        cx="28"
                        cy="28"
                        r="22"
                        fill="none"
                        stroke={stroke}
                        strokeWidth={5}
                        strokeDasharray={`${dash} 138.2`}
                        strokeLinecap="round"
                        rotation={-90}
                        origin="28, 28"
                      />
                    </Svg>
                    <AppText
                      role="caption"
                      style={{ fontWeight: "800", color: c.ink }}
                    >
                      {ring.percent}%
                    </AppText>
                  </View>
                  <AppText
                    role="caption"
                    style={{ fontWeight: "800", color: c.ink, textAlign: "center" }}
                    numberOfLines={1}
                  >
                    {ring.label}
                  </AppText>
                  <AppText
                    role="caption"
                    secondary
                    style={{ textAlign: "center" }}
                    numberOfLines={1}
                  >
                    {ring.valueLabel}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 2 BREAKTHROUGH BENTO WALL CARDS */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {momentum.bentoCards.map((card) => {
            const active = selectedId === card.id;
            const isDark = card.tone === "dark";
            return (
              <Pressable
                key={card.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedId(card.id)}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: isDark
                    ? active
                      ? "#f7c948"
                      : "#243c4e"
                    : active
                      ? c.ink
                      : "#f7c948",
                  backgroundColor: isDark ? "#142b3b" : "#fff5d1",
                  alignItems: "flex-start",
                  gap: 6,
                }}
              >
                <View
                  style={{
                    paddingVertical: 2,
                    paddingHorizontal: 8,
                    borderRadius: 6,
                    backgroundColor: isDark ? "#f7c948" : c.ink,
                  }}
                >
                  <AppText
                    role="caption"
                    style={{
                      color: isDark ? c.ink : "#ffffff",
                      fontWeight: "800",
                    }}
                  >
                    {card.badge}
                  </AppText>
                </View>
                <AppText
                  role="heading"
                  style={{
                    color: isDark ? "#ffffff" : c.ink,
                    marginTop: 2,
                  }}
                >
                  {card.value}
                </AppText>
                <AppText
                  role="caption"
                  style={{
                    color: isDark ? "#7fd8ce" : c.fieldTeal,
                    fontWeight: "700",
                  }}
                >
                  {card.delta}
                </AppText>
                <AppText
                  role="caption"
                  style={{
                    color: isDark ? "#c9d6e3" : c.muted,
                  }}
                >
                  {card.caption}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* INTERACTIVE PROVENANCE & NEXT-TIER RECEIPT DRAWER */}
        <View
          style={{
            padding: 16,
            borderRadius: 20,
            backgroundColor: "#142b3b",
            borderWidth: 1,
            borderColor: "#294356",
            gap: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View
                style={{
                  paddingVertical: 2,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: inspected.earned
                    ? "#f7c948"
                    : "rgba(255, 255, 255, 0.14)",
                }}
              >
                <AppText
                  role="caption"
                  style={{
                    color: inspected.earned ? c.ink : "#c9d6e3",
                    fontWeight: "700",
                  }}
                >
                  {inspected.earned ? "Unlocked" : "In Pursuit"}
                </AppText>
              </View>
              <AppText role="caption" style={{ color: "#c9d6e3" }}>
                {inspected.tierLabel}
              </AppText>
            </View>
            <AppText
              role="caption"
              style={{ color: "#f7c948", fontWeight: "700" }}
            >
              {"metricLabel" in inspected
                ? inspected.metricLabel
                : inspected.dateLabel}
            </AppText>
          </View>

          <View style={{ gap: 2 }}>
            <AppText role="label" style={{ color: "#ffffff" }}>
              {inspected.title}
            </AppText>
            <AppText role="caption" style={{ color: "#c9d6e3" }}>
              {inspected.subtitle}
            </AppText>
          </View>

          <View
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              gap: 4,
            }}
          >
            <AppText role="caption" style={{ color: "#ffffff" }}>
              {inspected.receipt}
            </AppText>
            <AppText
              role="caption"
              style={{ color: "#7fd8ce", fontWeight: "700" }}
            >
              Next: {inspected.nextTierLabel}
            </AppText>
          </View>
        </View>
      </View>
    </Section>
  );
}

