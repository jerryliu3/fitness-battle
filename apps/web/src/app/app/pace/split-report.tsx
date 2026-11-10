import { analyzeRaceSplits, raceClock, raceHalfCaption, racePaceLabel, raceSourceUrl, type RaceTimingSplits } from "@fitness-battle/shared";
import { AppHeading } from "@/ui/section";

export function SplitReport({splits,distance}:{splits:RaceTimingSplits | null | undefined;distance:string}) {
  const analysis=analyzeRaceSplits(splits,distance);
  if (analysis.status!=="ready") return <section className="race-split-report"><AppHeading level={2} role="heading">Checkpoints & pacing</AppHeading><p className="rankings-note">{analysis.status==="invalid" ? "Checkpoint times need reconciliation before pacing can be shown." : "Checkpoint times are not available for this result."}</p></section>;
  const maximum=Math.max(...analysis.rows.map(row=>row.paceMsPerKm ?? 0),1);
  const source=splits ? raceSourceUrl(splits.sourceUrl) : null;
  return <section className="race-split-report">
    <AppHeading level={2} role="heading">Checkpoints & pacing</AppHeading>
    <p className="rankings-note">{analysis.clock==="chip" ? "Chip elapsed times" : "Official elapsed times, including any start-line delay"}. Pace uses adjacent recorded checkpoints. Missing times remain unavailable.</p>
    {analysis.halfDeltaMs!==null && <p className="race-half-summary">{raceHalfCaption(analysis.halfDeltaMs)}</p>}
    <div className="race-table" role="region" aria-label="Recorded checkpoint times" tabIndex={0}><table><thead><tr><th scope="col">Checkpoint</th><th scope="col">Elapsed</th><th scope="col">Segment</th><th scope="col">Pace / km</th></tr></thead><tbody>{analysis.rows.map(row=><tr key={row.distanceM}><th scope="row">{row.label}</th><td className="race-time">{row.elapsedMs===null ? "Unavailable" : raceClock(row.elapsedMs)}</td><td className="race-time">{row.segmentMs===null ? "—" : raceClock(row.segmentMs)}</td><td className="race-time">{row.paceMsPerKm===null ? "—" : <>{racePaceLabel(row.paceMsPerKm)}<span className="race-pace-track"><span style={{width:`${row.paceMsPerKm/maximum*100}%`}} /></span></>}</td></tr>)}</tbody></table></div>
    <p className="rankings-note">Bars compare segment pace; longer bars mean slower pace. Half comparisons require an observed halfway time and finish on the same clock.</p>
    {source && <a href={source} target="_blank" rel="noreferrer">Timing source ↗</a>}
  </section>;
}
