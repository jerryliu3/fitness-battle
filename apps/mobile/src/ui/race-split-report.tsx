import { Linking, View } from "react-native";
import { analyzeRaceSplits, raceClock, raceHalfCaption, racePaceLabel, raceSourceUrl, type RaceTimingSplits } from "@fitness-battle/shared";
import { AppText } from "./section";
import { FocusButton } from "./focus";
import { useThemeColors } from "../theme";

export function SplitReport({splits,distance}:{splits:RaceTimingSplits | null | undefined;distance:string}) {
  const colors=useThemeColors();
  const analysis=analyzeRaceSplits(splits,distance);
  if (analysis.status!=="ready") return <View style={{gap:12}}><AppText role="heading">Checkpoints & pacing</AppText><AppText role="caption" secondary>{analysis.status==="invalid" ? "Checkpoint times need reconciliation before pacing can be shown." : "Checkpoint times are not available for this result."}</AppText></View>;
  const maximum=Math.max(...analysis.rows.map(row=>row.paceMsPerKm ?? 0),1);
  const source=splits ? raceSourceUrl(splits.sourceUrl) : null;
  return <View style={{gap:16}}>
    <AppText role="heading">Checkpoints & pacing</AppText>
    <AppText role="caption" secondary>{analysis.clock==="chip" ? "Chip elapsed times" : "Official elapsed times, including any start-line delay"}. Pace uses adjacent recorded checkpoints. Missing times remain unavailable.</AppText>
    {analysis.halfDeltaMs!==null && <AppText role="label">{raceHalfCaption(analysis.halfDeltaMs)}</AppText>}
    {analysis.rows.map(row=><View key={row.distanceM} style={{gap:10,borderBottomWidth:1,borderColor:colors.line,paddingBottom:14}}>
      <AppText role="label">{row.label}</AppText>
      <AppText role="caption" style={{fontVariant:["tabular-nums"]}}>Elapsed {row.elapsedMs===null ? "unavailable" : raceClock(row.elapsedMs)} · Segment {row.segmentMs===null ? "unavailable" : raceClock(row.segmentMs)}</AppText>
      <AppText role="label">{row.paceMsPerKm===null ? "Pace unavailable" : racePaceLabel(row.paceMsPerKm)}</AppText>
      {row.paceMsPerKm!==null && <View style={{height:6,backgroundColor:colors.line,borderRadius:3}}><View style={{height:6,width:`${row.paceMsPerKm/maximum*100}%`,backgroundColor:colors.tennis,borderRadius:3}} /></View>}
    </View>)}
    <AppText role="caption" secondary>Bars compare segment pace; longer bars mean slower pace. Half comparisons require an observed halfway time and finish on the same clock.</AppText>
    {source && <FocusButton label="Timing source" secondary onPress={()=>{void Linking.openURL(source);}} />}
  </View>;
}
