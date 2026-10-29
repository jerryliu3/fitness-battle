import { useThemeColors } from "../theme";
import type { SportId } from "@fitness-battle/shared";
import { View } from "react-native";
import { SHELL_COLORS as c } from "../theme";
import { SportIcon } from "./sport-icon";

export function SportActivityIcon({ sport }: { sport: SportId }) {
  const c = useThemeColors();

  return (
    <View
      style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: c.actionSoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SportIcon sport={sport} size={26} />
    </View>
  );
}
