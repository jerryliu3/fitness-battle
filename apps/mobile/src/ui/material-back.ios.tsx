import { requireNativeView } from "expo";
import type { ViewProps } from "react-native";
const NativeBack = requireNativeView<ViewProps & { backButton: boolean; onSelect(): void }>("AnchoredChoice");
export function MaterialBack({ onPress }: { onPress(): void }) { return <NativeBack backButton onSelect={onPress} style={{ width: 44, height: 44 }} />; }
