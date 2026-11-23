import { ScrollView, View } from "react-native";
import { fieldGrounds, type FieldAppearance, type FieldGround } from "@fitness-battle/shared";
import { AnchoredMenuItem } from "./anchored-menu";
import { LayersMenu } from "./course-options";
import { playCue } from "../lib/haptics";

const grounds = Object.entries(fieldGrounds) as [FieldGround, (typeof fieldGrounds)[FieldGround]][];
const MENU_HEIGHT = 264;

export function FieldGroundSwitcher({ appearance, onChangeAppearance }: {
  appearance: FieldAppearance;
  onChangeAppearance(appearance: FieldAppearance): void;
}) {
  return (
    <LayersMenu label="Lane options" closeLabel="Close lane options" icon="distance" estimatedHeight={MENU_HEIGHT}>
      {({ close }) => (
        <ScrollView style={{ maxHeight: MENU_HEIGHT }}>
          {grounds.map(([ground, item]) => (
            <AnchoredMenuItem
              key={ground}
              label={item.name}
              selected={appearance.ground === ground}

              left={<View style={{ width: 14, height: 18, borderRadius: 4, backgroundColor: item.lane }} />}
              onPress={() => {
                void playCue("selection");
                onChangeAppearance({ ...appearance, ground });
                close();
              }}
            />
          ))}
        </ScrollView>
      )}
    </LayersMenu>
  );
}
