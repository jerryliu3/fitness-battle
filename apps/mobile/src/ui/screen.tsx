import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "../theme";

export function Screen({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function EmptyNote({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { padding: 20, paddingBottom: 28, gap: 14 },
  kicker: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 32, color: colors.ink, letterSpacing: -0.4 },
  empty: { paddingVertical: 12 },
  emptyText: { fontFamily: fonts.body, color: colors.muted, fontSize: 15, lineHeight: 21 },
});
