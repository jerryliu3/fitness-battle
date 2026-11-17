import { useEffect, useRef, useState } from "react";
import { Animated, Image, Modal, Pressable, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AthleteCardModel } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { AppText } from "../ui/section";
import { IconButton } from "../ui/icon-button";
import { AthleteCrest } from "./athlete-crest";

export function OnboardingAthlete({ model, label, compact = false, onInteractionChange, departing = false, onDeparted }: {
  model: AthleteCardModel; label?: string; compact?: boolean; departing?: boolean; onDeparted?: () => void; onInteractionChange?: (held: boolean) => void;
}) {
  const c = useThemeColors(), reduced = useReducedMotion();
  const small = useWindowDimensions().height < 740;
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (departing) {
      if (reduced) { onDeparted?.(); return; }
      const exit = Animated.timing(progress, { toValue: 0, duration: 260, useNativeDriver: true });
      exit.start(({ finished }) => { if (finished) onDeparted?.(); });
      return () => exit.stop();
    }
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 320, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [compact, reduced, progress, departing, onDeparted]);
  if (!compact) return <Animated.View style={{ opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [departing ? .24 : .86, 1] }) },
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [departing ? 110 : 0, 0] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [departing ? -160 : 0, 0] }) },
    ] }}>
    <AthleteCrest model={model} onInteractionChange={onInteractionChange} />
  </Animated.View>;
  return <>
    <Animated.View style={{ width: small ? 142 : 158, opacity: progress, transform: [
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1.25, 1] }) },
    ] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${model.name}'s athlete card`} onPress={() => setOpen(true)}
        style={{ minHeight: small ? 64 : 96, borderRadius: 16, borderWidth: 1, borderColor: c.line, padding: 10,
          backgroundColor: c.card, gap: 5, boxShadow: "0px 4px 12px #00000014" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {model.avatarUrl ? <Image source={{ uri: model.avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} /> :
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.actionSoft, justifyContent: "center", alignItems: "center" }}><AppText role="caption">{model.initials}</AppText></View>}
          <AppText role="label" numberOfLines={1} style={{ flex: 1 }}>{model.name}</AppText>
        </View>
        <AppText role="caption" secondary numberOfLines={1}>{label}</AppText>
      </Pressable>
    </Animated.View>
    <Modal visible={open} animationType={reduced ? "none" : "fade"} onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper, padding: 20, justifyContent: "center", gap: 16 }}>
        <IconButton icon="back" label="Close athlete card" onPress={() => setOpen(false)} />
        {open && <AthleteCrest model={model} />}
      </SafeAreaView>
    </Modal>
  </>;
}
