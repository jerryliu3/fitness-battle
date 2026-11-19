import { competeFieldSwitcherOptions, type CompeteArenaEvent, type FieldViewDimension } from "@fitness-battle/shared";
import { AppIcon, type AppIconName } from "./app-icon";
import { useAppTheme } from "../theme";
import { Pressable, StyleSheet, View } from "react-native";
import { AnchoredMenu, AnchoredMenuItem, useAnchoredMenu } from "./anchored-menu";
import { SystemChoice } from "./system-choice";
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
  const { mode, colors: c } = useAppTheme();
  const options = competeFieldSwitcherOptions(event);
  const active = options.find((option) => option.value === value) ?? options[0]!;
  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({
    minWidth: 200,
    estimatedHeight: options.length * 48 + 16,
  });

  const trigger = {
    width: 44, height: 44, alignItems: "center", justifyContent: "center",
    borderRadius: 999, backgroundColor: value === "graph" ? c.card : "rgba(20, 20, 19, 0.72)",
    borderWidth: 1, borderColor: value === "graph" ? c.line : "rgba(255, 255, 255, 0.2)",
  } as const;
  const icon = <AppIcon name={VIEW_ICONS[value]} size={22} color={value === "graph" ? c.ink : "#ffffff"} />;
  const choose = (next: FieldView) => {
    void playCue("selection");
    onChange(next);
  };

  if (SystemChoice) {
    return <View style={trigger}>
      <View pointerEvents="none" accessibilityElementsHidden>{icon}</View>
      <SystemChoice
        dark={mode === "dark"}
        label="Field view"
        value={active.value}
        options={options.map(option => ({
          ...option,
          symbol: option.value === "2d" ? "point.topleft.down.to.point.bottomright.curvepath" : option.value === "graph" ? "chart.xyaxis.line" : "cube",
        }))}
        style={StyleSheet.absoluteFill}
        onSelect={event => {
          const option = options.find(choice => choice.value === event.nativeEvent.value);
          if (option) choose(option.value);
        }}
      />
    </View>;
  }

  return (
    <View ref={anchorRef} collapsable={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Field view: ${active.label}`}
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        onPress={toggle}
        style={({ pressed }) => [trigger, pressed && { opacity: 0.75 }]}
      >
        {icon}
      </Pressable>
      <AnchoredMenu
        open={open}
        onClose={close}
        menuLayout={menuLayout}
        style={{ width: menuLayout?.width ?? 200 }}
        accessibilityLabel="Close field view switcher"
      >
        {options.map(option => (
          <AnchoredMenuItem
            key={option.value}
            label={option.label}
            accessibilityLabel={`Select ${option.label}`}
            selected={option.value === value}

            left={<AppIcon name={VIEW_ICONS[option.value]} size={22} color={option.value === value ? c.ink : c.muted} />}
            onPress={() => {
              choose(option.value);
              close();
            }}
          />
        ))}
      </AnchoredMenu>
    </View>
  );
}
