import { View } from "react-native";
import { buildCompeteTimeSeriesModel, buildSleepTimeSeriesModel, competeNow, competitionTrack, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { ReplayTimeline } from "./replay-timeline";

export function PointsTimeline({ state, event, fraction, onChange }: { state: CompeteState; event: CompeteEvent; fraction: number | null; onChange(value: number | null): void }) {
  const now = competeNow(state);
  const model = event === "sleep" ? buildSleepTimeSeriesModel(state, now, { scrubFraction: fraction }) : buildCompeteTimeSeriesModel(state, event, competitionTrack(event), now, { scrubFraction: fraction });

  const count = Math.round(model.nowFraction * 1000);
  return <View style={{ gap: 8 }}>
    <ReplayTimeline label="Competition timeline" caption={model.cursorTimeLabel} count={count} cursor={Math.round(model.cursorFraction * 1000)} onSeek={value => onChange(value >= count ? null : value / 1000)} />
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><AppText role="caption" secondary style={{ flex: 1 }}>{model.cursorTimeLabel}</AppText><AppText role="caption" secondary style={{ flex: 1, textAlign: "right" }}>{model.latestTimeLabel}</AppText></View>
  </View>;
}
