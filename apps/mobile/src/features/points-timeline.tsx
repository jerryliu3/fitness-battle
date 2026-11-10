import { useAthleteBlocks } from "../lib/athlete-blocks";
import { View } from "react-native";
import { buildCompeteTimeSeriesModel, buildSleepTimeSeriesModel, competeNow, competitionTrack, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { ReplayTimeline } from "./replay-timeline";

export function PointsTimeline({ state, event, fraction, onChange }: { state: CompeteState; event: CompeteEvent; fraction: number | null; onChange(value: number | null): void }) {
  const now = competeNow(state);
  const { blocks } = useAthleteBlocks();
  const hiddenIds = blocks.map(block => block.id);
  const model = event === "sleep" ? buildSleepTimeSeriesModel(state, now, { scrubFraction: fraction, hiddenIds }) : buildCompeteTimeSeriesModel(state, event, competitionTrack(event), now, { scrubFraction: fraction, hiddenIds });

  const count = model.nowFraction > 0 ? 1000 : 0;
  if (!model.historyAvailable) return <AppText role="caption" secondary>Race history is not available yet.</AppText>;
  return <View style={{ gap: 8 }}>
    <ReplayTimeline timeBased label="Competition timeline" caption={model.cursorTimeLabel} count={count} cursor={model.nowFraction ? model.cursorFraction / model.nowFraction * count : 0} onSeek={value => onChange(value >= count ? null : Math.max(0, value) / count * model.nowFraction)} />
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><AppText role="caption" secondary style={{ flex: 1 }}>{model.cursorTimeLabel}</AppText><AppText role="caption" secondary style={{ flex: 1, textAlign: "right" }}>{model.latestTimeLabel}</AppText></View>
  </View>;
}
