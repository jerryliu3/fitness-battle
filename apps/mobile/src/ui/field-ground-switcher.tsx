import { Pressable, ScrollView, Text, View } from "react-native";
import { AnchoredMenu, useAnchoredMenu } from "./anchored-menu";
import { textStyle } from "./section";
import { playCue } from "../lib/haptics";
import { SHELL_COLORS as c } from "../theme";
import { fieldGrounds, type FieldAppearance, type FieldGround } from "@fitness-battle/shared";

export function FieldGroundSwitcher({
  appearance,
  onChangeAppearance,
}: {
  appearance: FieldAppearance;
  onChangeAppearance?(appearance: FieldAppearance): void;
}) {
  const { open, close, toggle, anchorRef, menuLayout } = useAnchoredMenu({
    minWidth: 150,
    estimatedHeight: 220,
  });

  const currentGround = fieldGrounds[appearance.ground] ?? fieldGrounds.trail;

  return (
    <View ref={anchorRef} collapsable={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Map style: ${currentGround.name}`}
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={({ pressed }) => [
          {
            minHeight: 34,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderRadius: 999,
            backgroundColor: "rgba(20, 20, 19, 0.78)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
          },
          pressed && { opacity: 0.75 },
        ]}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: currentGround.lane ?? c.tennis,
          }}
        />
        <Text
          style={{
            ...textStyle("caption"),
            color: "#ffffff",
            fontWeight: "600",
          }}
        >
          {currentGround.name} ▾
        </Text>
      </Pressable>
      <AnchoredMenu
        open={open}
        onClose={close}
        menuLayout={menuLayout}
        accessibilityLabel="Close style menu"
        style={{ padding: 8 }}
      >
        <Text
          style={[
            textStyle("caption"),
            { paddingHorizontal: 8, paddingVertical: 4, color: c.muted },
          ]}
        >
          Field style
        </Text>
        <ScrollView style={{ maxHeight: 260 }}>
          {Object.entries(fieldGrounds).map(([id, item]) => {
            const isSelected = appearance.ground === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  void playCue("selection");
                  onChangeAppearance?.({
                    ...appearance,
                    ground: id as FieldGround,
                  });
                  close();
                }}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    minHeight: 38,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: isSelected ? c.soft : "transparent",
                    gap: 10,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View
                  style={{
                    width: 14,
                    height: 18,
                    borderRadius: 4,
                    backgroundColor: item.lane,
                    borderWidth: 1,
                    borderColor: "rgba(0,0,0,0.12)",
                  }}
                />
                <Text
                  style={[
                    isSelected ? textStyle("label") : textStyle("body"),
                    {
                      flex: 1,
                      color: isSelected ? c.ink : c.muted,
                    },
                  ]}
                >
                  {item.name}
                </Text>
                {isSelected ? (
                  <Text style={[textStyle("label"), { color: c.tennis }]}>✓</Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </AnchoredMenu>
    </View>
  );
}
