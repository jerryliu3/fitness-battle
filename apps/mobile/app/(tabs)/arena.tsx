import {
  competeNow,
  formatVolume,
  sportById,
  weeklyBoard,
  type BoardRow,
} from "@fitness-battle/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { useCompete } from "../../src/compete/store";
import { LaneBoard, laneUnit } from "../../src/features/lane-board";
import { Button } from "../../src/ui/button";
import { EmptyNote, Screen } from "../../src/ui/screen";
import { Sheet } from "../../src/ui/sheet";
import { colors, fonts } from "../../src/theme";

export default function ArenaScreen() {
  const { state, arrival, acknowledgeArrival } = useCompete();
  const [selected, setSelected] = useState<BoardRow | null>(null);
  if (!state) return <Screen title="Arena" />;

  const now = competeNow(state);
  const sport = sportById(state.primary);
  const rows = weeklyBoard(state, state.primary, "open", now).slice(0, 6);
  const you = rows.find((row) => row.you);
  const unit = laneUnit(state.primary);

  return (
    <Screen kicker="Arena" title={sport.name}>
      {arrival ? (
        <>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 28, color: colors.plum }}>
            +{sport.gps ? `${(arrival.distanceM / 1000).toFixed(1)} km` : `${arrival.effort.toFixed(1)} pts`}
          </Text>
          <Text style={{ fontFamily: fonts.body, color: colors.muted }}>
            New counted progress since you last opened the week.
          </Text>
        </>
      ) : null}
      {rows.length === 0 ? (
        <>
          <EmptyNote text="Join a field to see the lanes." />
          <Button label="Go to Field" onPress={() => router.push("/field")} />
        </>
      ) : (
        <LaneBoard rows={rows} gps={sport.gps} onSelect={setSelected} />
      )}
      {you ? (
        <Text style={{ fontFamily: fonts.body, color: colors.muted }}>
          You · {formatVolume(state.primary, you.distanceM, you.movingSec)} · place {you.place}
        </Text>
      ) : null}
      {arrival ? <Button label="Continue to today" onPress={() => { acknowledgeArrival(); router.replace("/"); }} /> : null}
      <Sheet title={selected?.you ? "You" : selected?.name ?? ""} visible={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected ? (
          <Text style={{ fontFamily: fonts.body, color: colors.ink, fontSize: 18 }}>
            {(sport.gps ? selected.distanceM / 1000 : selected.effort).toFixed(1)} {unit}
          </Text>
        ) : null}
      </Sheet>
    </Screen>
  );
}
