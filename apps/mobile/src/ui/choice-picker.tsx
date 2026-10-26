import { textStyle } from "./section";
import { type ComponentRef, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
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
}: {
  label: string;
  value: T | "";
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<ComponentRef<typeof View>>(null);
  const [menuLayout, setMenuLayout] = useState<{
    x: number;
    y: number;
    width: number;
  } | null>(null);
  const selected = options.findIndex((option) => option.value === value);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (triggerRef.current?.measureInWindow) {
      triggerRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        const windowWidth = Dimensions.get("window").width || 375;
        const windowHeight = Dimensions.get("window").height || 812;
        const menuWidth = Math.max(width, 180);
        const clampedX = Math.max(16, Math.min(x, windowWidth - menuWidth - 16));
        const estimatedHeight = Math.min(280, options.length * 44 + 16);
        const posY = y + height + 4 + estimatedHeight > windowHeight && y > estimatedHeight + 20
          ? y - estimatedHeight - 4
          : y + height + 4;
        setMenuLayout({ x: clampedX, y: Math.max(16, posY), width: menuWidth });
        setOpen(true);
      });
    } else {
      setMenuLayout({ x: 16, y: 50, width: 200 });
      setOpen(true);
    }
  };

  return (
    <View style={{ flexShrink: 1 }}>
      <View ref={triggerRef} collapsable={false}>
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
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={`Close ${label} dropdown`}
          onPress={() => setOpen(false)}
        >
          <View style={StyleSheet.absoluteFill} />
        </Pressable>
        <View
          style={[
            s.dropdown,
            menuLayout
              ? {
                  position: "absolute",
                  top: menuLayout.y,
                  left: menuLayout.x,
                  minWidth: menuLayout.width,
                }
              : null,
          ]}
        >
          <ScrollView
            style={{ maxHeight: 280 }}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: isSelected }}
                  style={[s.option, isSelected && s.optionSelected]}
                  onPress={() => {
                    void playCue("selection");
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      textStyle("label"),
                      { flexShrink: 1 },
                      isSelected && { color: c.ink, fontWeight: "700" },
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
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  trigger: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdown: {
    backgroundColor: c.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    overflow: "hidden",
    shadowColor: c.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
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
});
