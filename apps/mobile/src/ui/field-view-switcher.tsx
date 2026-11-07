import { useRef } from "react";
import { Platform } from "react-native";
import { SettingsToggleRow } from "./settings-toggle-row";
import { AppIcon } from "./app-icon";
import { Pressable, Text, View } from "react-native";
import { AnchoredMenu, useAnchoredMenu } from "./anchored-menu";
import { textStyle } from "./section";
import { playCue } from "../lib/haptics";
import { SHELL_COLORS as c } from "../theme";

export function FieldViewSwitcher({
  compact = false,
  value,
  geographic,
  onChange,
}: {
  compact?: boolean;
  value: "2d" | "3d" | "4d";
  geographic: boolean;
  onChange(value: "2d" | "3d" | "4d"): void;
}) {
  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({
    minWidth: compact ? 220 : 90,
    estimatedHeight: compact ? 52 : 130,
  });

  const pendingChange = useRef<(() => void) | null>(null);
  const finishChange = () => { const action = pendingChange.current; pendingChange.current = null; action?.(); };
  const options: Array<{ value: "2d" | "3d" | "4d"; label: string }> = [
    { value: "2d", label: "2D" },
    ...(geographic ? [{ value: "4d" as const, label: "3D" }] : []),
  ];

  return (
    <View ref={anchorRef} collapsable={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={compact ? "Course options" : `Dimension: ${(value === "4d" ? "3D" : value.toUpperCase())}`}
        accessibilityState={{ expanded: open }}
        hitSlop={compact ? 8 : undefined}
        onPress={toggle}
        style={({ pressed }) => [
          {
            minHeight: compact ? 28 : 44,
            paddingHorizontal: compact ? 2 : 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderRadius: 999,
            backgroundColor: compact ? "transparent" : "rgba(20, 20, 19, 0.78)",
            borderWidth: compact ? 0 : 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
          },
          pressed && { opacity: 0.75 },
        ]}
      >
        {compact ? <AppIcon name="settings" size={22} color={c.ink} /> : <Text style={{ ...textStyle("caption"), color: "#ffffff" }}>
          {(value === "4d" ? "3D" : value.toUpperCase())} ▾
        </Text>}
      </Pressable>
      <AnchoredMenu
        open={open}
        onClose={close}
        menuLayout={menuLayout}
        onDismiss={compact ? finishChange : undefined}
        style={compact ? { width: menuLayout?.width ?? 220 } : undefined}
        accessibilityLabel="Close dimension switcher"
      >
        {compact && geographic ? <SettingsToggleRow label="3D view" value={value === "4d"} onChange={() => { const next = value === "4d" ? "2d" : "4d"; if (Platform.OS === "ios") pendingChange.current = () => onChange(next); else onChange(next); close(); }} /> : options.map((opt) => {
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
                  minHeight: 44,
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
