import { AppSwitch } from "./app-switch";
import { View } from "react-native";
import { AppText } from "./section";
import { useHapticsEnabled, setHapticsEnabled } from "../lib/haptics";
export function HapticPreference() {
  const enabled = useHapticsEnabled();
  return <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:14}}><AppText role="label">Haptic feedback</AppText><AppSwitch accessibilityLabel="Haptic feedback" value={enabled} onValueChange={setHapticsEnabled}/></View>;
}
