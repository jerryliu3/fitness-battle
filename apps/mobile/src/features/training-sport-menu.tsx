import { AppText } from "../ui/section";
import { SHELL_COLORS as c } from "../theme";
import { type ComponentRef, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  SPORTS,
  defaultTrainingSports,
  isAllTrainingSports,
  toggleTrainingSports,
  trainingSportFilterLabel,
  type SportId,
} from "@fitness-battle/shared";
import { f } from "../ui/focus";
import { playCue } from "../lib/haptics";

export function TrainingSportMenu({
  value,
  onChange,
}: {
  value: readonly SportId[];
  onChange: (sports: SportId[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<ComponentRef<typeof View>>(null);
  const [menuLayout, setMenuLayout] = useState<{
    x: number;
    y: number;
    width: number;
  } | null>(null);
  const label = trainingSportFilterLabel(value);
  const allSelected = isAllTrainingSports(value);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (triggerRef.current?.measureInWindow) {
      triggerRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        const windowWidth = Dimensions.get("window").width || 375;
        const windowHeight = Dimensions.get("window").height || 812;
        const menuWidth = 190;
        const clampedX = Math.max(16, Math.min(x, windowWidth - menuWidth - 16));
        const estimatedHeight = Math.min(280, (SPORTS.length + 1) * 44 + 16);
        const posY = y + height + 4 + estimatedHeight > windowHeight && y > estimatedHeight + 20
          ? y - estimatedHeight - 4
          : y + height + 4;
        setMenuLayout({ x: clampedX, y: Math.max(16, posY), width: menuWidth });
        setOpen(true);
      });
    } else {
      setMenuLayout({ x: 16, y: 50, width: 190 });
      setOpen(true);
    }
  };

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Training sports filter: ${label}`}
          accessibilityState={{ expanded: open }}
          onPress={toggle}
          style={[f.chip, allSelected && f.chipActive, { flexDirection: "row", gap: 4 }]}
        >
          <AppText role="caption" secondary>{label}</AppText>
          <AppText role="caption" secondary aria-hidden>
            ▾
          </AppText>
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
          accessibilityLabel="Close sports menu"
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
          <ScrollView bounces={false} style={{ maxHeight: 280 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="All sports"
              style={[s.option, allSelected && s.optionSelected]}
              onPress={() => {
                void playCue("selection");
                onChange(defaultTrainingSports());
                setOpen(false);
              }}
            >
              <AppText role="label" style={allSelected ? { fontWeight: "700" } : undefined}>
                All sports
              </AppText>
              {allSelected ? <AppText role="label">✓</AppText> : null}
            </Pressable>
            {SPORTS.map((sport) => {
              const checked = !allSelected && value.includes(sport.id);
              return (
                <Pressable
                  key={sport.id}
                  accessibilityRole="button"
                  accessibilityLabel={sport.name}
                  accessibilityState={{ selected: checked }}
                  style={[s.option, checked && s.optionSelected]}
                  onPress={() => {
                    void playCue("selection");
                    onChange(toggleTrainingSports(value, sport.id));
                  }}
                >
                  <AppText role="label" style={checked ? { fontWeight: "700" } : undefined}>
                    {sport.name}
                  </AppText>
                  {checked ? <AppText role="label">✓</AppText> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
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
