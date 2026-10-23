import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { INTEGRATION_ICONS, type ProviderId } from "@fitness-battle/shared";
export function IntegrationIcon({ provider }: { provider: ProviderId }) {
  const icon = INTEGRATION_ICONS[provider];
  return <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: icon.background, alignItems: "center", justifyContent: "center" }}>
    <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}><Path d={icon.path} fill={icon.color} fillRule="evenodd" /></Svg>
  </View>;
}
