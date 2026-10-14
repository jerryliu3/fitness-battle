import { Image, StyleSheet, Text, View } from "react-native";
import { DEFAULT_MASCOT, MASCOTS, type MascotVariant } from "@fitness-battle/shared";
import { colors, fonts } from "../theme";

// Literal requires ensure Metro bundles both choices.
const mascotAssets = {
  "star-ember": require("../../assets/mascots/star-ember.png"),
  "quiet-ace": require("../../assets/mascots/quiet-ace.png"),
} satisfies Record<MascotVariant, number>;

export function AceStrip({
  kicker = "THE FIELD",
  title,
  detail,
  variant = DEFAULT_MASCOT,
}: {
  kicker?: string;
  title: string;
  detail: string;
  variant?: MascotVariant;
}) {
  return (
    <View style={styles.strip}>
      <Image
        source={mascotAssets[variant]}
        style={styles.image}
        accessibilityLabel={MASCOTS[variant].description}
      />
      <View style={styles.content}>
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
  },
  image: { width: 72, height: 72 },
  content: { flex: 1, gap: 4 },
  kicker: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 11 },
  title: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 18 },
  detail: { color: colors.muted, fontFamily: fonts.body, fontSize: 14 },
});
