import { useThemeColors } from "../theme";
import { Pressable, Text, View } from "react-native";
import { AnchoredMenu, useAnchoredMenu } from "./anchored-menu";
import { textStyle } from "./section";
import { playCue } from "../lib/haptics";
import { SHELL_COLORS as c } from "../theme";

export function FieldViewSwitcher({
  value,
  geographic,
  onChange,
}: {
  value: "2d" | "3d" | "4d";
  geographic: boolean;
  onChange(value: "2d" | "3d" | "4d"): void;
}) {
  const c = useThemeColors();

  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({
    minWidth: 90,
    estimatedHeight: 130,
  });

  const options: Array<{ value: "2d" | "3d" | "4d"; label: string }> = [
    { value: "2d", label: "2D" },
    { value: "3d", label: "3D" },
    ...(geographic ? [{ value: "4d" as const, label: "4D" }] : []),
  ];

  return (
    <View ref={anchorRef} collapsable={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Dimension: ${value.toUpperCase()}`}
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={({ pressed }) => [
          {
            minHeight: 36,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderRadius: 999,
            backgroundColor: "rgba(20, 20, 19, 0.78)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
          },
          pressed && { opacity: 0.75 },
        ]}
      >
        <Text style={{ ...textStyle("caption"), color: "#ffffff" }}>
          {value.toUpperCase()} ▾
        </Text>
      </Pressable>
      <AnchoredMenu
        open={open}
        onClose={close}
        menuLayout={menuLayout}
        accessibilityLabel="Close dimension switcher"
      >
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityLabel={`Select ${opt.label}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                void playCue("selection");
                onChange(opt.value);
                close();
              }}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: 36,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: isSelected ? "rgba(20, 20, 19, 0.08)" : "transparent",
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text
                style={{
                  ...textStyle("caption"),
                  color: isSelected ? c.ink : c.muted,
                }}
              >
                {opt.label}
              </Text>
              {isSelected ? (
                <Text style={{ ...textStyle("caption"), color: c.ink }}>
                  ✓
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </AnchoredMenu>
    </View>
  );
}
