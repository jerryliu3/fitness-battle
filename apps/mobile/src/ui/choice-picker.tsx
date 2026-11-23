import { useFocusStyles } from "./focus";
import { createThemedStyles, useThemedStyles, useThemeColors, useAppTheme } from "../theme";
import { SystemChoice } from "./system-choice";
import { textStyle } from "./section";
import { useAnchoredMenu, AnchoredMenu, AnchoredMenuItem } from "./anchored-menu";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";


import { playCue } from "../lib/haptics";

function ChevronDown() {
const c=useThemeColors();

  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginLeft: 6 }}>
      <Path d="M6 9l6 6 6-6" stroke={c.muted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Dropdown menu anchored to its trigger control with Apple material glass styling. */
export function ChoicePicker<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  systemMenu = true,
}: {
  label: string;
  value: T | "";
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
  systemMenu?: boolean;
}) {
const { mode, colors: c } = useAppTheme();
const f=useFocusStyles();
const s=useThemedStyles(sThemes);

  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({
    minWidth: 180,
    estimatedHeight: Math.min(280, options.length * 44 + 16),
  });
  const selected = options.findIndex((option) => option.value === value);

  if (systemMenu && SystemChoice) {
    return <View style={[s.trigger, { position: "relative", flexShrink: 1 }]}>
      <View pointerEvents="none" accessibilityElementsHidden style={[f.row, { flex: 1, flexShrink: 1, justifyContent: "space-between" }]}>
        <Text style={[textStyle("body"), { flexShrink: 1, color: c.ink }]}>{options[selected]?.label ?? placeholder}</Text>
        <ChevronDown />
      </View>
      <SystemChoice dark={mode === "dark"} label={label} value={value} options={options} style={StyleSheet.absoluteFill}
        onSelect={event => {
          const choice = options.find(option => option.value === event.nativeEvent.value);
          if (choice) { void playCue("selection"); onChange(choice.value); }
        }} />
    </View>;
  }

  return (
    <View style={{ flexShrink: 1 }}>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${options[selected]?.label ?? placeholder}`}
          accessibilityState={{ expanded: open }}
          onPress={toggle}
          style={({ pressed }) => [s.trigger, open && s.triggerOpen, pressed && { opacity: 0.7 }]}
        >
          <Text style={[textStyle("body"), { flexShrink: 1, color: c.ink }]}>
            {options[selected]?.label ?? placeholder}
          </Text>
          <ChevronDown />
        </Pressable>
      </View>
      <AnchoredMenu
        open={open}
        onClose={close}
        menuLayout={menuLayout}
        accessibilityLabel={`Close ${label} dropdown`}
      >
        <ScrollView
          style={{ maxHeight: 280 }}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {options.map(option => (
            <AnchoredMenuItem
              key={option.value}
              label={option.label}
              selected={option.value === value}

              onPress={() => {
                void playCue("selection");
                onChange(option.value);
                close();
              }}
            />
          ))}
        </ScrollView>
      </AnchoredMenu>
    </View>
  );
}

const sThemes = createThemedStyles(themeColors=>{const c=themeColors;return {
  trigger: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerOpen: {
    borderColor: c.ink,
  },
};});
