import { AppText } from "../ui/section";
import { FocusSheet, f } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";
import { useState } from "react";
import { Pressable, View } from "react-native";
import {
  SPORTS,
  defaultTrainingSports,
  isAllTrainingSports,
  toggleTrainingSports,
  trainingSportFilterLabel,
  type SportId,
} from "@fitness-battle/shared";

export function TrainingSportMenu({
  value,
  onChange,
}: {
  value: readonly SportId[];
  onChange: (sports: SportId[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = trainingSportFilterLabel(value);
  const allSelected = isAllTrainingSports(value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={[f.chip, allSelected && f.chipActive, { flexDirection: "row", gap: 4 }]}
      >
        <AppText role="caption" secondary>{label}</AppText>
        <AppText role="caption" secondary aria-hidden>
          ▾
        </AppText>
      </Pressable>
      <FocusSheet open={open} title="Sports" onClose={() => setOpen(false)}>
        <View style={{ gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onChange(defaultTrainingSports())}
            style={[f.chip, isAllTrainingSports(value) && f.chipActive]}
          >
            <AppText role="label">All sports</AppText>
          </Pressable>
          {SPORTS.map((sport) => {
            const checked = value.includes(sport.id);
            return (
              <Pressable
                key={sport.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => onChange(toggleTrainingSports(value, sport.id))}
                style={[f.row, { minHeight: 44 }]}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: checked ? c.plum : c.line,
                    backgroundColor: checked ? c.soft : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {checked ? <AppText role="caption">✓</AppText> : null}
                </View>
                <AppText role="label">{sport.name}</AppText>
              </Pressable>
            );
          })}
        </View>
      </FocusSheet>
    </>
  );
}
