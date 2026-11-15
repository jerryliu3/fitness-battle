import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ViewProps } from "react-native";
import { IconButton } from "./icon-button";
const NativeBack = requireOptionalNativeModule("AnchoredChoice")
  ? requireNativeView<ViewProps & { backButton: boolean; onSelect(): void }>("AnchoredChoice") : null;
export function MaterialBack({ onPress, label = "Back to events" }: { onPress(): void; label?: string }) {
  return NativeBack ? <NativeBack accessibilityLabel={label} backButton onSelect={onPress} style={{ width: 44, height: 44 }} />
    : <IconButton icon="back" label={label} onPress={onPress} />;
}
