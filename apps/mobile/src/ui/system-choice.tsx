import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export interface SystemChoiceProps {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onSelect: (event: { nativeEvent: { value: string } }) => void;
  style?: StyleProp<ViewStyle>;
}

/** Android/web and older installed iOS binaries keep the accessible anchored fallback. */
export const SystemChoice: ComponentType<SystemChoiceProps> | null = null;
