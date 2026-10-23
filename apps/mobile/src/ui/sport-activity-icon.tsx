import { sportActivityMark, type SportId } from "@fitness-battle/shared";
import { Text, View } from "react-native";
import { SHELL_COLORS as c } from "../theme";
import { f } from "./focus";

export function SportActivityIcon({ sport }: { sport: SportId }) {
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
      <Text style={[f.small, { color: c.ink, fontFamily: "DMSans_700Bold", fontSize: 11 }]}>
        {sportActivityMark(sport)}
      </Text>
    </View>
  );
}
