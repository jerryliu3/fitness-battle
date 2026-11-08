import { View } from "react-native";
import { useAppTheme } from "../appearance";
import { FocusSegments } from "./focus";
import { AppText } from "./section";
export function AppearanceControl() {
  const { preference, setPreference } = useAppTheme();
  return <View style={{ gap: 8 }}><AppText role="label">Appearance</AppText>
    <FocusSegments label="Appearance" value={preference} onChange={setPreference}
      options={[{value:"system",label:"System"},{value:"light",label:"Light"},{value:"dark",label:"Dark"}]} />
  </View>;
}
