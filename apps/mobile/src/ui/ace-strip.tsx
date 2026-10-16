import { Image, StyleSheet, Text, View } from "react-native";
import { DEFAULT_MASCOT, MASCOTS, type MascotVariant } from "@fitness-battle/shared";
import { colors, fonts } from "../theme";
import { Ember } from "./mascot/ember";

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
      {variant === "star-ember" ? <View style={styles.ember}><Ember size={72} label={MASCOTS[variant].description}/></View> : <Image
        source={require("../../assets/mascots/quiet-ace.png")}
        style={styles.image}
        accessibilityLabel={MASCOTS[variant].description}
      />}
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
  ember: { width: 72, height: 97 },
  content: { flex: 1, gap: 4 },
  kicker: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 11 },
  title: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 18 },
  detail: { color: colors.muted, fontFamily: fonts.body, fontSize: 14 },
});
