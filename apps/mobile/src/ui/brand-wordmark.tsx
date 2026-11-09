import { Platform, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { OVERTAEK_HEADER_MARK } from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { AppText } from "./section";

export function BrandWordmark() {
  const c = useThemeColors();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
    <Svg width={30} height={26} viewBox="0 0 42 24" accessible={Platform.OS === "web" ? undefined : false} aria-hidden={Platform.OS === "web" ? true : undefined}><Path d={OVERTAEK_HEADER_MARK} fill={c.actionPressed} /></Svg>
    <AppText role="heading" style={{ flexShrink: 1 }}>Overtaek</AppText>
  </View>;
}
