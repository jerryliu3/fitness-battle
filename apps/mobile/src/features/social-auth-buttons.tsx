import { useAppTheme } from "../theme";
import { textStyle } from "../ui/section";
import { IconBrandApple, IconBrandGoogle } from "@tabler/icons-react-native";
import { Platform, Pressable, Text, View, type ViewStyle } from "react-native";
import { useEffect, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";

type Props = {
  onGoogle: () => void;
  onApple: () => void;
  busy?: boolean;
  disabled?: boolean;
};

export function SocialAuthButtons({ onGoogle, onApple, busy, disabled }: Props) {
  const { colors, mode } = useAppTheme();
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS !== "ios");

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const rowStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    opacity: busy || disabled ? 0.55 : 1,
  };

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginVertical: 4,
        }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        <Text style={{ ...textStyle("caption"), color: colors.muted }}>or</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        disabled={busy || disabled}
        onPress={onGoogle}
        style={rowStyle}
      >
        <IconBrandGoogle size={20} color={colors.ink} />
        <Text style={{ ...textStyle("label"), color: colors.ink }}>
          Continue with Google
        </Text>
      </Pressable>

      {(appleAvailable || Platform.OS === "android") && (
        Platform.OS === "ios" && appleAvailable ? (
          <View
            pointerEvents={busy || disabled ? "none" : "auto"}
            style={{ opacity: busy || disabled ? 0.55 : 1 }}
          >
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                mode === "dark"
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={12}
              style={{ width: "100%", height: 48 }}
              onPress={() => {
                if (!busy && !disabled) onApple();
              }}
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
            disabled={busy || disabled}
            onPress={onApple}
            style={rowStyle}
          >
            <IconBrandApple size={20} color={colors.ink} />
            <Text style={{ ...textStyle("label"), color: colors.ink }}>
              Continue with Apple
            </Text>
          </Pressable>
        )
      )}
    </View>
  );
}
