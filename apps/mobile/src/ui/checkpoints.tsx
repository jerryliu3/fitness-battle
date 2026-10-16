import {
  CHECKPOINT_FRAME,
  type CheckpointDisc,
  type TodayRoute,
} from "@fitness-battle/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { AnimatedEmber } from "./mascot/animated-ember";
import Svg, { Path } from "react-native-svg";
import { SHELL_COLORS } from "../theme";


function Disc({
  disc,
  onPress,
}: {
  disc: CheckpointDisc;
  onPress?: () => void;
}) {
  const future = disc.role === "future";
  const [reaction, setReaction] = useState(0);
  const width = future ? 66 : 78;
  const height = future ? 56 : 68;
  const body = (
    <View
      style={[
        styles.disc,
        disc.role === "past" ? styles.past : null,
        disc.role === "today" ? styles.today : null,
        future ? styles.future : null,
        { width, height },
      ]}
    >
      {disc.role === "today" ? (
        <View style={styles.ember} pointerEvents="none"><AnimatedEmber action="hop" size={140} playing={reaction > 0} loop={false} restartKey={reaction} /></View>
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
    width, height, marginLeft: -width / 2,
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
      hitSlop={disc.role === "today" ? { top: 90, left: 28, right: 28, bottom: 6 } : undefined}
      onPressIn={() => { if(disc.role === "today") setReaction(value => value + 1); }}
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
          onPress={disc.role === "future" ? undefined : () => onOpen(disc)}
        />
      ))}
      <View style={styles.copy} pointerEvents="none">
        <Text style={styles.kicker}>Today</Text>
        <Text style={styles.title}>{route.suggestion.title}</Text>
        {route.suggestion.minutes != null ? (
          <Text style={styles.minutes}>{route.suggestion.minutes} min</Text>
        ) : null}
      </View>
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
  today: { backgroundColor: SHELL_COLORS.tennis, zIndex: 3 },
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
  ember: {
    position: "absolute",
    width: 140,
    height: 140 * 485 / 360,
    bottom: -10,
    left: -31,
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
    paddingVertical: 8,
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
});
