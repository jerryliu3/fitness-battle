import { Text } from "react-native";
import type { SportId } from "@fitness-battle/shared";

// Leave the font unspecified: iOS uses Apple Color Emoji, Android its system emoji.
const sportEmoji: Record<SportId, string> = {
  running: "🏃",
  cycling: "🚴",
  walking: "🚶",
  strength: "🏋️",
};

export function SportIcon({ sport, size = 24 }: { sport: SportId; size?: number }) {
  return <Text accessible={false} accessibilityElementsHidden style={{ fontSize: size, lineHeight: size + 8, textAlign: "center", includeFontPadding: false }}>{sportEmoji[sport]}</Text>;
}
