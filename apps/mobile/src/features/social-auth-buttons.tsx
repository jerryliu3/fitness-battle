import { SOCIAL_AUTH_ICON_PATHS } from "@fitness-battle/shared";
import { useAppTheme } from "../theme";
import { textStyle } from "../ui/section";
import { Platform, Pressable, Text, View, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useEffect, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";

type Props = {
  onGoogle: () => void;
  onApple: () => void;
  onEmail?: () => void;
  busy?: boolean;
  disabled?: boolean;
  scale?: number;
};

export function SocialAuthButtons({
  onGoogle,
  onApple,
  onEmail,
  busy,
  disabled,
  scale = 1,
}: Props) {
  const { colors, mode } = useAppTheme();
  const os = Platform?.OS ?? "ios";
  const [appleAvailable, setAppleAvailable] = useState(os !== "ios");

  useEffect(() => {
    if (os !== "ios") return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, [os]);

  const buttonHeight = Math.round(46 * scale);
  const gap = Math.round(8 * scale);
  const iconSize = Math.round(18 * scale);

  const rowStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Math.round(10 * scale),
    height: buttonHeight,
    borderRadius: Math.round(12 * scale),
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    opacity: busy || disabled ? 0.55 : 1,
  };

  return (
    <View style={{ gap }}>
      {(appleAvailable || os === "android") &&
        (os === "ios" && appleAvailable ? (
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
              cornerRadius={Math.round(12 * scale)}
              style={{ width: "100%", height: buttonHeight }}
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
            <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
              <Path d={SOCIAL_AUTH_ICON_PATHS.apple} fill={colors.ink} />
            </Svg>
            <Text style={{ ...textStyle("label"), color: colors.ink }}>
              Continue with Apple
            </Text>
          </Pressable>
        ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        disabled={busy || disabled}
        onPress={onGoogle}
        style={rowStyle}
      >
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
          {SOCIAL_AUTH_ICON_PATHS.google.map((d) => (
            <Path key={d} d={d} fill={colors.ink} />
          ))}
        </Svg>
        <Text style={{ ...textStyle("label"), color: colors.ink }}>
          Continue with Google
        </Text>
      </Pressable>

      {onEmail ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Email"
          disabled={busy || disabled}
          onPress={onEmail}
          style={rowStyle}
        >
          <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
            <Path d={SOCIAL_AUTH_ICON_PATHS.email} fill={colors.ink} />
          </Svg>
          <Text style={{ ...textStyle("label"), color: colors.ink }}>
            Continue with Email
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
