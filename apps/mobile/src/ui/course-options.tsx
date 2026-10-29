import { Pressable, Text, View } from "react-native";
import { AnchoredMenu, useAnchoredMenu } from "./anchored-menu";
import { textStyle } from "./section";
import { playCue } from "../lib/haptics";
import { SHELL_COLORS as c } from "../theme";

export function CourseOptions({ flat, spaced, onToggleDimension, onToggleSpacing, onOverview }: {
  flat: boolean;
  spaced: boolean;
  onToggleDimension(): void;
  onToggleSpacing(): void;
  onOverview(): void;
}) {
  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({
    minWidth: 176,
    estimatedHeight: 132,
  });
  const options = [
    { label: flat ? "3D chase" : "2D map", action: onToggleDimension },
    { label: spaced ? "Racers: spaced" : "Racers: together", action: onToggleSpacing },
    { label: "Race overview", action: onOverview },
  ];

  return <View ref={anchorRef} collapsable={false}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Course options"
      accessibilityState={{ expanded: open }}
      onPress={toggle}
      style={({ pressed }) => [{
        minHeight: 36,
        paddingHorizontal: 12,
        justifyContent: "center",
        borderRadius: 999,
        backgroundColor: "rgba(20, 20, 19, 0.78)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
      }, pressed && { opacity: 0.75 }]}
    >
      <Text style={{ ...textStyle("caption"), color: "#ffffff" }}>Options ▾</Text>
    </Pressable>
    <AnchoredMenu open={open} onClose={close} menuLayout={menuLayout} accessibilityLabel="Close course options">
      {options.map(option => <Pressable
        key={option.label}
        accessibilityRole="button"
        accessibilityLabel={option.label}
        onPress={() => { void playCue("selection"); option.action(); close(); }}
        style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }, pressed && { opacity: 0.7 }]}
      >
        <Text style={{ ...textStyle("caption"), color: c.ink }}>{option.label}</Text>
      </Pressable>)}
    </AnchoredMenu>
  </View>;
}
