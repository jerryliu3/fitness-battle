import { SectionHeader, AppText } from "../ui/section";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { competitionTrack, APP_TIMEZONE, formatEloDelta, sportById, type CompeteState, type SportId } from "@fitness-battle/shared";
import { f } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";
import { CompetitionReplayButton } from "./competition-replay";
import { ResultCard } from "./result-card";
export function WeeklyChapters({state}:{state:CompeteState}){
  const [sport,setSport]=useState<SportId|"all">(state.primary),[selected,setSelected]=useState<string|null>(null);
  const sports=[...new Set(state.periodResults.map(r=>r.sport))].sort();
  const rows=state.periodResults.filter(r=>(sport==="all"||r.sport===sport)&&r.track===competitionTrack(r.sport)).sort((a,b)=>b.periodStart.localeCompare(a.periodStart));
  const month=(end:string)=>new Date(Date.parse(end)-1).toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:APP_TIMEZONE});
  const date=(at:string)=>new Date(at).toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:APP_TIMEZONE});
  return <View style={{gap:14}}>
    <SectionHeader title="Past weeks" action={<AppText role="caption" secondary >{new Set(rows.map(r=>r.periodStart)).size} weeks</AppText>}/>
    {!state.periodResults.length?<AppText role="support" secondary >Your first settled week will appear here.</AppText>:<>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={f.row}>{(["all",...sports] as const).map(id=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:sport===id}} style={[f.chip,sport===id&&f.chipActive]} onPress={()=>setSport(id)}><AppText role="caption" secondary >{id==="all"?"All sports":sportById(id).name}</AppText></Pressable>)}</View></ScrollView>
      {!rows.length?<AppText role="caption" secondary >No closed weeks match this selection.</AppText>:null}
      {rows.map((r,i)=><View key={r.id}>{i===0||month(r.periodEnd)!==month(rows[i-1]!.periodEnd)?<Text style={[f.kicker,{marginTop:8,marginBottom:12}]}>{month(r.periodEnd)}</Text>:null}
        <Pressable accessibilityRole="button" accessibilityState={{expanded:selected===r.id}} accessibilityLabel={`${date(r.periodStart)} to ${date(new Date(Date.parse(r.periodEnd)-1).toISOString())}, ${sportById(r.sport).name}, ${r.track}, place ${r.place} of ${r.fieldSize}, ${formatEloDelta(r.eloBefore,r.eloAfter)} Effort Score`} onPress={()=>setSelected(selected===r.id?null:r.id)} style={s.chapter}>
          <View style={[s.place,r.place===1&&{backgroundColor:c.tennis}]}><AppText role="value" >#{r.place}</AppText></View><View style={{flex:1,gap:4}}><AppText role="row" >{date(r.periodStart)} – {date(new Date(Date.parse(r.periodEnd)-1).toISOString())}</AppText><AppText role="support" secondary >{sportById(r.sport).name} · {r.track==="verified"?"GPS":"Open"} · {r.place} of {r.fieldSize}{r.frozen?" · frozen":""}</AppText></View><View style={{alignItems:"flex-end"}}><AppText role="value" >{formatEloDelta(r.eloBefore,r.eloAfter)}</AppText><AppText role="support" secondary >score</AppText></View>
        </Pressable>{selected===r.id?<><ResultCard result={r} units={state.units}/><CompetitionReplayButton state={state} selection={r} label="Replay this round" /></>:null}
      </View>)}
    </>}
  </View>;
}
const s=StyleSheet.create({row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},chapter:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:16,borderBottomWidth:1,borderBottomColor:c.line,minHeight:80},place:{width:52,height:56,borderRadius:14,borderBottomWidth:3,borderBottomColor:c.line,backgroundColor:c.soft,alignItems:"center",justifyContent:"center"}});
