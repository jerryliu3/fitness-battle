import { Switch, type SwitchProps } from "react-native";
import { useThemeColors } from "../theme";

type AppSwitchProps = Omit<SwitchProps, "trackColor" | "thumbColor" | "ios_backgroundColor">;

export function AppSwitch(props: AppSwitchProps) {
  const colors = useThemeColors();
  return (
    <Switch
      {...props}
      trackColor={{ false: colors.line, true: colors.ink }}
      thumbColor={props.value ? colors.card : colors.ink}
      ios_backgroundColor={colors.line}
    />
  );
}
