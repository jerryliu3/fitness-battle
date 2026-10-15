import { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { Stack } from "expo-router";
import { EMBER_ACTIONS, EMBER_CLIPS, type EmberAction } from "@fitness-battle/shared/mascot";
import { AnimatedEmber } from "../src/ui/mascot/animated-ember";
import { colors, fonts } from "../src/theme";

/** Isolated native review screen, available at /mascot. */
export default function MascotScreen() {
  const [action, setAction] = useState<EmberAction>("idle");
  const [playing, setPlaying] = useState(true);
  return <ScrollView contentContainerStyle={styles.page}>
    <Stack.Screen options={{ headerShown: true, title: "Ember studio" }} />
    <Text style={styles.kicker}>STAR EMBER / MODEL 01</Text>
    <Text style={styles.title}>One little spark.</Text>
    <Text style={styles.body}>The same vector model and motion clips as the web app.</Text>
    <View style={styles.stage}><AnimatedEmber action={action} playing={playing} size={270} label="Star Ember, a golden star with a curved flame tip" /></View>
    <Text style={styles.body}>{EMBER_CLIPS[action].description}</Text>
    <View style={styles.actions}>{EMBER_ACTIONS.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === action }} onPress={() => setAction(item)} style={[styles.button, item === action && styles.selected]}><Text style={styles.buttonText}>{item}</Text></Pressable>)}</View>
    <Pressable accessibilityRole="button" onPress={() => setPlaying(value => !value)} style={styles.button}><Text style={styles.buttonText}>{playing ? "Pause" : "Play"}</Text></Pressable>
    <Text style={styles.body}>Motion respects your device’s Reduce Motion setting and pauses when this screen loses focus.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 18, backgroundColor: colors.paper, flexGrow: 1 },
  kicker: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2 },
  title: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 32 },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  stage: { alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderRadius: 24, minHeight: 320 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 14 },
  selected: { backgroundColor: colors.lime, borderColor: colors.limeDeep },
  buttonText: { color: colors.ink, fontFamily: fonts.bodyBold, textTransform: "capitalize" },
});
