import {
  CHECKPOINT_FRAME,
  DEFAULT_MASCOT,
  MASCOTS,
  type CheckpointDisc,
  type EmberClipName,
  type TodayRoute,
} from "@fitness-battle/shared";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SHELL_COLORS } from "../theme";
import { AnimatedEmber } from "./mascot/ember";

function Disc({
  disc,
  clip = "idle",
  onPress,
}: {
  disc: CheckpointDisc;
  clip?: EmberClipName;
  onPress?: () => void;
}) {
  const future = disc.role === "future";
  const width = future ? 66 : disc.role === "today" ? 88 : 78;
  const height = future ? 56 : disc.role === "today" ? 74 : 68;
  const body = (
    <View
      style={[
        styles.disc,
        disc.role === "past" ? styles.past : null,
        disc.role === "today" ? styles.today : null,
        future ? styles.future : null,
        { width, height, marginLeft: -width / 2 },
      ]}
    >
      {disc.role === "today" ? (
        <View style={styles.ace} pointerEvents="none">
          <AnimatedEmber clip={clip} size={118} />
        </View>
      ) : null}
      {disc.role === "past" ? (
        <>
          <Text style={styles.check}>✓</Text>
          <Text style={styles.volume}>{disc.volume}</Text>
        </>
      ) : null}
      {future ? <View style={styles.futureMark} /> : null}
    </View>
  );

  const position = {
    left: `${disc.cx * 100}%` as `${number}%`,
    top: disc.top,
  };

  if (future) {
    return (
      <View
        style={[styles.slot, position]}
        accessibilityRole="image"
        accessibilityLabel={disc.accessibilityLabel}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.slot, position]}
      accessibilityRole="button"
      accessibilityLabel={disc.accessibilityLabel}
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}

export function CheckpointRoute({
  route,
  onOpen,
}: {
  route: TodayRoute;
  onOpen: (disc: CheckpointDisc) => void;
}) {
  const [emberClip, setEmberClip] = useState<EmberClipName>("idle");

  useEffect(() => {
    if (emberClip === "idle") return;
    const timer = setTimeout(() => setEmberClip("idle"), 1150);
    return () => clearTimeout(timer);
  }, [emberClip]);

  return (
    <View
      style={styles.frame}
      accessibilityLabel="Winding activity checkpoints"
    >
      <Svg
        width="100%"
        height={CHECKPOINT_FRAME.height}
        viewBox={`0 0 ${CHECKPOINT_FRAME.width} ${CHECKPOINT_FRAME.height}`}
        preserveAspectRatio="none"
      >
        <Path
          d={route.path}
          stroke={SHELL_COLORS.line}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray="1 14"
          fill="none"
        />
      </Svg>
      {route.discs.map((disc) => (
        <Disc
          key={disc.id}
          disc={disc}
          clip={disc.role === "today" ? emberClip : "idle"}
          onPress={
            disc.role === "future"
              ? undefined
              : () => {
                  setEmberClip(disc.role === "today" ? "jumpUp" : "hop");
                  onOpen(disc);
                }
          }
        />
      ))}
      <View style={styles.copy} pointerEvents="none">
        <Text style={styles.kicker}>Today</Text>
        <Text style={styles.title}>{route.suggestion.title}</Text>
        {route.suggestion.minutes != null ? (
          <Text style={styles.minutes}>{route.suggestion.minutes} min</Text>
        ) : null}
      </View>
      <Text style={styles.srOnly}>{MASCOTS[DEFAULT_MASCOT].name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: CHECKPOINT_FRAME.height, position: "relative" },
  slot: { position: "absolute", zIndex: 2 },
  disc: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SHELL_COLORS.card,
  },
  past: { backgroundColor: SHELL_COLORS.greenSoft },
  today: {
    backgroundColor: SHELL_COLORS.tennis,
    borderWidth: 2,
    borderColor: SHELL_COLORS.ink,
    zIndex: 3,
  },
  future: { backgroundColor: "#fff4d4", opacity: 0.7 },
  check: { color: SHELL_COLORS.green, fontSize: 18, fontFamily: "DMSans_700Bold" },
  volume: { color: SHELL_COLORS.ink, fontSize: 11, fontFamily: "DMSans_700Bold" },
  futureMark: {
    width: 28,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: SHELL_COLORS.line,
  },
  ace: {
    position: "absolute",
    width: 118,
    height: 118,
    bottom: 6,
    left: -15,
  },
  copy: {
    position: "absolute",
    top: 295,
    left: 16,
    right: 16,
    alignItems: "center",
    gap: 6,
    zIndex: 4,
    backgroundColor: SHELL_COLORS.paper,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: SHELL_COLORS.line,
  },
  kicker: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: SHELL_COLORS.muted,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 28,
    letterSpacing: -0.6,
    textAlign: "center",
    color: SHELL_COLORS.ink,
  },
  minutes: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: SHELL_COLORS.muted,
  },
  srOnly: { position: "absolute", width: 1, height: 1, opacity: 0 },
});
