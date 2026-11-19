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
              <Path
                d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z"
                fill={colors.ink}
              />
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
          <Path
            d="M21.8 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.65Z"
            fill={colors.ink}
          />
          <Path
            d="M12 22c2.76 0 5.07-.91 6.76-2.47l-3.3-2.56c-.91.61-2.08.98-3.46.98-2.66 0-4.92-1.8-5.73-4.21H2.86v2.64A10 10 0 0 0 12 22Z"
            fill={colors.ink}
          />
          <Path
            d="M6.27 13.74A6.02 6.02 0 0 1 5.95 12c0-.61.11-1.2.32-1.74V7.62H2.86A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.38l3.2-2.64Z"
            fill={colors.ink}
          />
          <Path
            d="M12 5.98c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.06 2.93 14.75 2 12 2A10 10 0 0 0 2.86 7.62l3.41 2.64C7.08 7.78 9.34 5.98 12 5.98Z"
            fill={colors.ink}
          />
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
            <Path
              d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.5l8 5.33 8-5.33V7H4Zm16 10V9.9l-7.45 4.96a1 1 0 0 1-1.1 0L4 9.9V17h16Z"
              fill={colors.ink}
            />
          </Svg>
          <Text style={{ ...textStyle("label"), color: colors.ink }}>
            Continue with Email
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
