import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

export function Row({
  title,
  detail,
  trailing,
  onPress,
}: {
  title: string;
  detail?: string;
  trailing?: string;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  copy: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 16 },
  detail: { fontFamily: fonts.body, color: colors.muted, fontSize: 13 },
  trailing: { fontFamily: fonts.bodyBold, color: colors.plum, fontSize: 14 },
  pressed: { opacity: 0.7 },
});
