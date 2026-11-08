import { useFocusStyles } from "../ui/focus";
import { createThemedStyles, useThemedStyles } from "../theme";
import { AppText } from "../ui/section";

import {
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

import { playCue } from "../lib/haptics";
import { useAnchoredMenu, AnchoredMenu } from "../ui/anchored-menu";

export function TrainingSportMenu({
  value,
  onChange,
}: {
  value: readonly SportId[];
  onChange: (sports: SportId[]) => void;
}) {
const f=useFocusStyles();
const s=useThemedStyles(sThemes);

  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({
    minWidth: 190,
    estimatedHeight: Math.min(280, (SPORTS.length + 1) * 44 + 16),
  });
  const label = trainingSportFilterLabel(value);
  const allSelected = isAllTrainingSports(value);

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Training sports filter: ${label}`}
          accessibilityState={{ expanded: open }}
          onPress={toggle}
          style={[f.chip, allSelected && f.chipActive, { flexDirection: "row", gap: 4 }]}
        >
          <AppText role="caption">{label}</AppText>
          <AppText role="caption" style={{ opacity: 0.65 }} aria-hidden>
            ▾
          </AppText>
        </Pressable>
      </View>
      <AnchoredMenu
        open={open}
        onClose={close}
        menuLayout={menuLayout}
        accessibilityLabel="Close sports menu"
      >
        <ScrollView bounces={false} style={{ maxHeight: 280 }}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: allSelected }}
            accessibilityLabel="All sports"
            style={[s.option, allSelected && s.optionSelected]}
            onPress={() => {
              void playCue("selection");
              onChange(defaultTrainingSports());
            }}
          >
            <View style={s.optionContent}>
              <View style={[s.checkbox, allSelected && s.checkboxChecked]}>
                {allSelected ? (
                  <AppText role="caption" style={s.checkmark}>✓</AppText>
                ) : null}
              </View>
              <AppText role={allSelected ? "label" : "body"}>
                All sports
              </AppText>
            </View>
          </Pressable>
          {SPORTS.map((sport) => {
            const checked = !allSelected && value.includes(sport.id);
            return (
              <Pressable
                key={sport.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={sport.name}
                style={[s.option, checked && s.optionSelected]}
                onPress={() => {
                  void playCue("selection");
                  onChange(toggleTrainingSports(value, sport.id));
                }}
              >
                <View style={s.optionContent}>
                  <View style={[s.checkbox, checked && s.checkboxChecked]}>
                    {checked ? (
                      <AppText role="caption" style={s.checkmark}>✓</AppText>
                    ) : null}
                  </View>
                  <AppText role={checked ? "label" : "body"}>
                    {sport.name}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </AnchoredMenu>
    </>
  );
}

const sThemes = createThemedStyles(themeColors=>{const c=themeColors;return {
  option: {
    height: 44,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: c.ink,
    backgroundColor: c.ink,
  },
  checkmark: {
    color: c.card,
  },
  optionSelected: {
    backgroundColor: c.soft,
  },
};});
