"use client";
import { useState } from "react";
import { effortHistory, formatEffortScore, openLineModel, type CompeteState, type OpenLineRange, type ScoreTrack } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useScoreTrackLens } from "@/lib/score-track-lens";
import { OpenLineChart } from "@/ui/open-line-chart";

export function EffortTrend({ state, email }: { state: CompeteState; email?: string | null }) {
  const { user } = useAuth();
  const [defaultTrack] = useScoreTrackLens();
  const scope = `${user?.id}:${state.primary}`;
  const [lens, setLens] = useState<{ scope: string; track: ScoreTrack } | null>(null);
  const [range, setRange] = useState<OpenLineRange>("fourWeeks");
  const track = lens?.scope === scope ? lens.track : defaultTrack;
  const history = effortHistory(state, track, user, email, range);
  const chart = openLineModel(history.pts.map((point, i) => ({ id: point.date, date: point.date, value: history.dailyValues[i]! })), formatEffortScore);
  return <section id="effort-score" className="effort-open-chart">
    <div className="focus-elo-track-toggle" role="group" aria-label="Effort chart score track">{(["open", "verified"] as const).map(value => <button type="button" key={value} aria-pressed={track === value} onClick={() => setLens({ scope, track: value })}>{value === "open" ? "Open" : "GPS Tracked"}</button>)}</div>
    <OpenLineChart key={`${scope}:${track}`} chart={chart} label={`${track === "open" ? "Open" : "GPS Tracked"} effort score history`} unit="Effort score" range={range} onRangeChange={setRange} />
  </section>;
}
