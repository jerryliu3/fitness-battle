import { createThemedStyles, useThemedStyles } from "../theme";
import { textStyle } from "./section";
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
  const styles = useThemedStyles(stylesThemes);

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

const stylesThemes = createThemedStyles((themeColors) => ({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.line,
    borderRadius: 16,
  },
  image: { width: 72, height: 72 },
  ember: { width: 72, height: 97 },
  content: { flex: 1, gap: 4 },
  kicker: { ...textStyle("label"), color: themeColors.muted },
  title: { ...textStyle("heading"), color: themeColors.ink },
  detail: { ...textStyle("body"), color: themeColors.muted },
}));
