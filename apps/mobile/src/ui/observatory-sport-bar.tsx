import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  OBSERVATORY_SPORTS,
  RACE_CATEGORY_FILTERS,
  type ObservatorySportId,
} from "@fitness-battle/shared";
import { createThemedStyles, useThemeColors, useThemedStyles } from "../theme";
import { FocusSegments, FocusSheet } from "./focus";
import { AppText, textStyle } from "./section";

export function ObservatorySportBar({
  sport,
  onSportChange,
  format,
  onFormatChange,
  sex,
  onSexChange,
  rightSlot,
  extraRow2,
}: {
  sport: ObservatorySportId;
  onSportChange: (next: ObservatorySportId) => void;
  format: string;
  onFormatChange: (next: string) => void;
  sex: string;
  onSexChange: (next: string) => void;
  rightSlot?: ReactNode;
  extraRow2?: ReactNode;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const [catOpen, setCatOpen] = useState(false);

  const activeSport = OBSERVATORY_SPORTS.find(sp => sp.id === sport) ?? OBSERVATORY_SPORTS[0];
  const categoryOptions = RACE_CATEGORY_FILTERS.filter(cat => cat.value !== "unknown" || sex === "unknown").map(cat => ({
    value: cat.value,
    label: cat.value === "other" ? "Non-binary" : cat.label,
  }));
  const currentCategoryLabel = categoryOptions.find(o => o.value === sex)?.label ?? "All runners";

  return (
    <View style={s.root}>
      {/* Row 1: Sport segmented toggle + optional Compare CTA */}
      <View style={s.row1}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <FocusSegments
            compact
            label="Sport"
            value={sport}
            options={OBSERVATORY_SPORTS.map(sp => ({ value: sp.id, label: sp.label }))}
            onChange={onSportChange}
          />
        </View>
        {rightSlot}
      </View>

      {/* Row 2: Distance/Format chips + Category dropdown pill + Saved toggle */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row2Scroll}
      >
        {activeSport.formats.map(f => {
          const active = f.value === format;
          return (
            <Pressable
              key={f.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onFormatChange(f.value)}
              style={[s.chip, active && s.chipActive]}
            >
              <AppText role="label" style={[s.chipText, active && s.chipTextActive]}>
                {f.label}
              </AppText>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Athlete category: ${currentCategoryLabel}`}
          onPress={() => setCatOpen(true)}
          style={[s.pillSelect, sex !== "all" && s.pillSelectActive]}
        >
          <AppText role="label" style={s.pillSelectText}>
            {currentCategoryLabel} ▾
          </AppText>
        </Pressable>

        {extraRow2}
      </ScrollView>

      <FocusSheet open={catOpen} title="Athlete category" onClose={() => setCatOpen(false)}>
        <View style={{ gap: 8 }}>
          {categoryOptions.map(opt => {
            const selected = opt.value === sex;
            return (
              <Pressable
                key={opt.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  onSexChange(opt.value);
                  setCatOpen(false);
                }}
                style={[s.sheetOption, selected && { backgroundColor: "#FFF5D1", borderColor: "#FFB800" }]}
              >
                <AppText role="label" style={{ color: c.ink }}>
                  {opt.label}
                </AppText>
                {selected && (
                  <AppText role="label" style={{ color: "#C88A00" }}>
                    ✓
                  </AppText>
                )}
              </Pressable>
            );
          })}
        </View>
      </FocusSheet>
    </View>
  );
}

const sThemes = createThemedStyles(c => ({
  root: {
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  row1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  row2Scroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 2,
  },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: c.tennis,
    borderColor: c.tennis,
  },
  chipText: {
    ...textStyle("caption"),
    color: c.muted,
  },
  chipTextActive: {
    ...textStyle("field"),
    color: c.textOnAction,
  },
  pillSelect: {
    height: 32,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  pillSelectActive: {
    borderColor: c.tennis,
    backgroundColor: c.soft,
  },
  pillSelectText: {
    ...textStyle("caption"),
    color: c.ink,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
  },
}));
