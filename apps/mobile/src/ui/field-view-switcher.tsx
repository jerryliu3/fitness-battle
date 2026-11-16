import { competeFieldSwitcherOptions, type CompeteArenaEvent, type FieldViewDimension } from "@fitness-battle/shared";
import { AppIcon, type AppIconName } from "./app-icon";
import { useThemeColors } from "../theme";
import { Platform, Pressable, Text, View } from "react-native";
import { AnchoredMenu, useAnchoredMenu } from "./anchored-menu";
import { textStyle } from "./section";
import { playCue } from "../lib/haptics";

type FieldView = FieldViewDimension;

const VIEW_ICONS: Record<FieldView, AppIconName> = {
  "2d": "distance",
  "4d": "cubeFocus",
  "3d": "cubeFocus",
  graph: "progress",
};

export function FieldViewSwitcher({
  value,
  event,
  onChange,
}: {
  value: FieldView;
  event: CompeteArenaEvent;
  onChange(value: FieldView): void;
}) {
  const c = useThemeColors();
  const options = competeFieldSwitcherOptions(event);
  const active = options.find((option) => option.value === value) ?? options[0]!;
  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({
    minWidth: 200,
    estimatedHeight: options.length * 48 + 16,
  });

  return (
    <View ref={anchorRef} collapsable={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Field view: ${active.label}`}
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        onPress={toggle}
        style={({ pressed }) => [
          {
            minHeight: 44,
            minWidth: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            backgroundColor: "rgba(20, 20, 19, 0.72)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
          },
          pressed && { opacity: 0.75 },
        ]}
      >
        <AppIcon name={VIEW_ICONS[value]} size={22} color="#ffffff" />
      </Pressable>
      <AnchoredMenu
        open={open}
        onClose={close}
        menuLayout={menuLayout}
        style={{ width: menuLayout?.width ?? 200 }}
        accessibilityLabel="Close field view switcher"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={`Select ${option.label}`}
              accessibilityState={{ selected }}
              onPress={() => {
                void playCue("selection");
                onChange(option.value);
                close();
              }}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 48,
                  paddingHorizontal: 12,
                  backgroundColor: selected ? "rgba(20, 20, 19, 0.08)" : "transparent",
                },
                pressed && Platform.OS === "ios" ? { opacity: 0.7 } : null,
              ]}
            >
              <AppIcon name={VIEW_ICONS[option.value]} size={22} color={selected ? c.ink : c.muted} />
              <Text style={{ ...textStyle("body"), flex: 1, color: selected ? c.ink : c.muted }}>{option.label}</Text>
              {selected ? <Text style={{ ...textStyle("caption"), color: c.ink }}>✓</Text> : null}
            </Pressable>
          );
        })}
      </AnchoredMenu>
    </View>
  );
}
