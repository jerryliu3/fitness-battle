import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { useNetworkStatus } from "../lib/network";
import { useThemeColors } from "../theme";
import { AppText } from "./section";

/** Non-blocking indicator shown only when live network requests cannot reach the server. */
export function OfflineNotice() {
  const { isOnline, checkNow } = useNetworkStatus();
  const { user, offlineMode } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  if (isOnline || offlineMode || !user) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + 6,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 90,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Offline, showing cached data. Tap to retry connection."
        onPress={() => void checkNow()}
        style={({ pressed }) => ({
          backgroundColor: c.card,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: 99,
          paddingHorizontal: 12,
          paddingVertical: 5,
          opacity: pressed ? 0.75 : 0.95,
        })}
      >
        <AppText role="caption" secondary>
          Offline · showing cached data
        </AppText>
      </Pressable>
    </View>
  );
}
