import { useThemeColors } from "../theme";
import { textStyle } from "./section";
import { Text } from "react-native";
import { effortRankBadge } from "@fitness-battle/shared";
import { SHELL_COLORS as c } from "../theme";
export function RankBadge({ score }: { score: number | null | undefined }) {
  const c = useThemeColors();

  if (score == null || !Number.isFinite(score)) return null;
  const rank = effortRankBadge(score);
  return <Text accessibilityLabel={`${rank.name} level`} style={{ ...textStyle("body"), color: c.fieldTeal }}>{rank.symbol}</Text>;
}
