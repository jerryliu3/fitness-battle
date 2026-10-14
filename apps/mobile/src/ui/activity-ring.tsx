import { Pressable, Text, View } from "react-native";
import { colors, fonts } from "../theme";

const SCALE_KM = 10;

export function ActivityRing({
  km,
  title,
  minutes,
  counted,
  onPress,
}: {
  km: number;
  title: string;
  minutes: number;
  counted?: boolean;
  onPress?: () => void;
}) {
  const fill = Math.min(1, Math.max(0, km / SCALE_KM));
  const size = 88;
  const stroke = 8;

  return (
    <Pressable
      onPress={onPress}
      style={{ alignItems: "center", gap: 6, width: 100 }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: "rgba(64,35,78,0.12)",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.card,
        }}
      >
        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: colors.plum,
            opacity: 0.15 + fill * 0.85,
            transform: [{ scale: 0.92 + fill * 0.08 }],
          }}
        />
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 16,
            color: colors.plum,
          }}
        >
          {km.toFixed(1)}
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 10,
            color: colors.muted,
          }}
        >
          km
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fonts.bodyBold,
          fontSize: 12,
          color: colors.plum,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.body,
          fontSize: 11,
          color: counted ? colors.plum : colors.muted,
        }}
      >
        {minutes} min{counted ? " · counted" : ""}
      </Text>
    </Pressable>
  );
}
