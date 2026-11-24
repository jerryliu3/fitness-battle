import { COMPETITION_REPLAY_SPEEDS } from "@fitness-battle/shared";
import { Pressable, Text, View } from "react-native";
import { AnchoredMenu, AnchoredMenuItem, useAnchoredMenu } from "../ui/anchored-menu";
import { textStyle } from "../ui/section";
import { useMapHud } from "../ui/map-hud";
import { useThemeColors } from "../theme";

export function ReplaySpeedControl({
  speed,
  onSelect,
  floating = false,
  fixedWidth = false,
}: {
  speed: number;
  onSelect: (value: number) => void;
  floating?: boolean;
  fixedWidth?: boolean;
}) {
  const c = useThemeColors();
  const hud = useMapHud();
  const foreground = floating ? hud.ink : c.ink;
  const menu = useAnchoredMenu({
    minWidth: 112,
    estimatedHeight: COMPETITION_REPLAY_SPEEDS.length * 46 + 12,
  });
  const label = `${speed}×`;
  return (
  <>
      <View ref={menu.anchorRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Playback speed ${speed} times. Choose speed`}
          onPress={menu.toggle}
          style={({ pressed }) => ({
            minHeight: 44,
            paddingHorizontal: fixedWidth ? 0 : 10,
            ...(fixedWidth ? { width: 48, flexShrink: 0 } : {}),
            borderRadius: 999,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: floating && !hud.light ? "#ffffff24" : c.soft,
            opacity: pressed ? 0.78 : 1,
          })}
        >
          <Text style={{ ...textStyle("label"), color: foreground, fontVariant: ["tabular-nums"] }}>
            {label}
          </Text>
        </Pressable>
      </View>
      <AnchoredMenu
        open={menu.open}
        onClose={menu.close}
        menuLayout={menu.menuLayout}
        accessibilityLabel="Close speed options"
        style={{ width: menu.menuLayout?.width ?? 112 }}
      >
        {COMPETITION_REPLAY_SPEEDS.map((option) => (
          <AnchoredMenuItem
            key={option}
            label={`${option}×`}
            selected={option === speed}
            onPress={() => {
              onSelect(option);
              menu.close();
            }}
          />
        ))}
      </AnchoredMenu>
    </>
  );
}