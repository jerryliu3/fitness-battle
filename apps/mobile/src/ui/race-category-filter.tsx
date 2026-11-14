import { View } from "react-native";
import { RACE_CATEGORY_FILTERS } from "@fitness-battle/shared";
import { FocusButton } from "./focus";
import { AnchoredMenu, AnchoredMenuItem, useAnchoredMenu } from "./anchored-menu";

export function RaceCategoryFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const menu = useAnchoredMenu({ minWidth: 200, estimatedHeight: RACE_CATEGORY_FILTERS.length * 46 + 12 });
  return (
    <View>
      <View ref={menu.anchorRef} collapsable={false}>
        <FocusButton
          label={`Category: ${RACE_CATEGORY_FILTERS.find((c) => c.value === value)?.label ?? "All runners"}`}
          secondary
          onPress={menu.toggle}
        />
      </View>
      <AnchoredMenu
        open={menu.open}
        onClose={menu.close}
        menuLayout={menu.menuLayout}
        accessibilityLabel="Close category dropdown"
      >
        {RACE_CATEGORY_FILTERS.map((cat, idx) => (
          <AnchoredMenuItem
            key={cat.value}
            label={cat.label}
            selected={value === cat.value}
            last={idx === RACE_CATEGORY_FILTERS.length - 1}
            onPress={() => {
              onChange(cat.value);
              menu.close();
            }}
          />
        ))}
      </AnchoredMenu>
    </View>
  );
}
