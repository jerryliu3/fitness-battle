import { SystemChoice } from "./system-choice";
import { textStyle } from "./section";
import { useAnchoredMenu, AnchoredMenu } from "./anchored-menu";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SHELL_COLORS as c } from "../theme";
import { f } from "./focus";
import { playCue } from "../lib/haptics";

/** Dropdown menu anchored to its trigger control. */
export function ChoicePicker<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  systemMenu = false,
}: {
  label: string;
  value: T | "";
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
  systemMenu?: boolean;
}) {
  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({
    minWidth: 180,
    estimatedHeight: Math.min(280, options.length * 44 + 16),
  });
  const selected = options.findIndex((option) => option.value === value);

  if (systemMenu && SystemChoice) {
    return <View style={[f.input, f.row, s.trigger, { position: "relative", flexShrink: 1 }]}>
      <View pointerEvents="none" accessibilityElementsHidden style={[f.row, { flexShrink: 1 }]}>
        <Text style={[textStyle("label"), { flexShrink: 1 }]}>{options[selected]?.label ?? placeholder}</Text>
        <Text style={[textStyle("body"), { marginLeft: 4 }]}>▾</Text>
      </View>
      <SystemChoice label={label} value={value} options={options} style={StyleSheet.absoluteFill}
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
          style={[f.input, f.row, s.trigger]}
        >
          <Text style={[textStyle("label"), { flexShrink: 1 }]}>
            {options[selected]?.label ?? placeholder}
          </Text>
          <Text style={[textStyle("body"), { marginLeft: 4 }]}>▾</Text>
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
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [
                  s.option,
                  isSelected && s.optionSelected,
                  pressed && s.optionPressed,
                  index === options.length - 1 && s.optionLast,
                ]}
                onPress={() => {
                  void playCue("selection");
                  onChange(option.value);
                  close();
                }}
              >
                <Text
                  style={[
                    isSelected ? textStyle("label") : textStyle("body"),
                    { flexShrink: 1 },
                    isSelected && { color: c.ink },
                  ]}
                >
                  {option.label}
                </Text>
                {isSelected ? (
                  <Text style={[textStyle("label"), { color: c.ink }]}>✓</Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </AnchoredMenu>
    </View>
  );
}

const s = StyleSheet.create({
  trigger: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "space-between",
  },
  option: {
    height: 44,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },
  optionSelected: {
    backgroundColor: c.soft,
  },
  optionPressed: {
    backgroundColor: "rgba(0, 16, 27, 0.06)",
  },
  optionLast: {
    borderBottomWidth: 0,
  },
});
