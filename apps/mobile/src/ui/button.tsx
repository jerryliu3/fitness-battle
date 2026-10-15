import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { colors, fonts } from "../theme";

export function Button({
  label,
  tone = "primary",
  ...props
}: PressableProps & { label: string; tone?: "primary" | "quiet" }) {
  const quiet = tone === "quiet";
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        quiet ? styles.quiet : styles.primary,
        pressed && styles.pressed,
        props.disabled && styles.disabled,
      ]}
      {...props}
    >
      <Text style={[styles.label, quiet && styles.quietLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primary: { backgroundColor: colors.plum },
  quiet: { backgroundColor: "transparent" },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.45 },
  label: { fontFamily: fonts.bodyBold, color: colors.tennis, fontSize: 16 },
  quietLabel: { color: colors.plum, fontSize: 15 },
});
