import { useState } from "react";
import { effortHistory, formatEffortScore, openLineModel, type CompeteState, type OpenLineRange, type ScoreTrack } from "@fitness-battle/shared";
import { useScoreTrackLens } from "../lib/score-track-lens";
import { useAuth } from "../lib/auth";
import { View } from "react-native";
import { OpenLineChart } from "../ui/open-line-chart";
import { ChartFrame } from "../ui/chart-frame";
import { FocusSegments, f } from "../ui/focus";

export function EffortTrend({ state }: { state: CompeteState }) {
  const [defaultTrack] = useScoreTrackLens();
  const { user } = useAuth();
  const scope = `${user?.id}:${state.primary}`;
  const [lens, setLens] = useState<{ scope: string; track: ScoreTrack } | null>(null);
  const [range, setRange] = useState<OpenLineRange>("fourWeeks");
  const track = lens?.scope === scope ? lens.track : defaultTrack;
  const history = effortHistory(state, track, user, user?.email, range);
  const chart = openLineModel(history.pts.map((point, i) => ({ id: point.date, date: point.date, value: history.dailyValues[i]! })), formatEffortScore);
  return <ChartFrame><View style={f.section}>
    <FocusSegments label="Effort chart score track" value={track} options={[{ value: "open", label: "Open" }, { value: "verified", label: "GPS Tracked" }]} onChange={nextTrack => setLens({ scope, track: nextTrack })} />
    <OpenLineChart live key={`${scope}:${track}`} chart={chart} label={`${track === "open" ? "Open" : "GPS Tracked"} effort score history`} unit="Effort score" range={range} onRangeChange={setRange} />
  </View></ChartFrame>;
}
