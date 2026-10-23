import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { competitionTrack, APP_TIMEZONE, formatEloDelta, sportById, type CompeteState, type SportId } from "@fitness-battle/shared";
import { f } from "../ui/focus";
import { SHELL_COLORS as c } from "../theme";
import { ResultCard } from "./result-card";
export function WeeklyChapters({state}:{state:CompeteState}){
  const [sport,setSport]=useState<SportId|"all">(state.primary),[selected,setSelected]=useState<string|null>(null);
  const sports=[...new Set(state.periodResults.map(r=>r.sport))].sort();
  const rows=state.periodResults.filter(r=>(sport==="all"||r.sport===sport)&&r.track===competitionTrack(r.sport)).sort((a,b)=>b.periodStart.localeCompare(a.periodStart));
  const month=(end:string)=>new Date(Date.parse(end)-1).toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:APP_TIMEZONE});
  const date=(at:string)=>new Date(at).toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:APP_TIMEZONE});
  return <View style={{gap:14}}>
    <View style={s.row}><Text style={f.h2}>Past weeks</Text><Text style={f.small}>{new Set(rows.map(r=>r.periodStart)).size} weeks</Text></View>
    {!state.periodResults.length?<Text style={f.copy}>Your first settled week will appear here.</Text>:<>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={f.row}>{(["all",...sports] as const).map(id=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:sport===id}} style={[f.chip,sport===id&&f.chipActive]} onPress={()=>setSport(id)}><Text style={f.small}>{id==="all"?"All sports":sportById(id).name}</Text></Pressable>)}</View></ScrollView>
      {!rows.length?<Text style={f.small}>No closed weeks match this selection.</Text>:null}
      {rows.map((r,i)=><View key={r.id}>{i===0||month(r.periodEnd)!==month(rows[i-1]!.periodEnd)?<Text style={[f.kicker,{marginTop:8,marginBottom:12}]}>{month(r.periodEnd)}</Text>:null}
        <Pressable accessibilityRole="button" accessibilityState={{expanded:selected===r.id}} accessibilityLabel={`${date(r.periodStart)} to ${date(new Date(Date.parse(r.periodEnd)-1).toISOString())}, ${sportById(r.sport).name}, ${r.track}, place ${r.place} of ${r.fieldSize}, ${formatEloDelta(r.eloBefore,r.eloAfter)} Effort Score`} onPress={()=>setSelected(selected===r.id?null:r.id)} style={s.chapter}>
          <View style={[s.place,r.place===1&&{backgroundColor:c.tennis}]}><Text style={[f.h2,{fontSize:23}]}>#{r.place}</Text></View><View style={{flex:1,gap:4}}><Text style={f.rowTitle}>{date(r.periodStart)} – {date(new Date(Date.parse(r.periodEnd)-1).toISOString())}</Text><Text style={f.small}>{sportById(r.sport).name} · {r.track==="verified"?"GPS":"Open"} · {r.place} of {r.fieldSize}{r.frozen?" · frozen":""}</Text></View><View style={{alignItems:"flex-end"}}><Text style={f.rowTitle}>{formatEloDelta(r.eloBefore,r.eloAfter)}</Text><Text style={f.small}>score</Text></View>
        </Pressable>{selected===r.id?<ResultCard result={r} units={state.units}/>:null}
      </View>)}
    </>}
  </View>;
}
const s=StyleSheet.create({row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},chapter:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:16,borderBottomWidth:1,borderBottomColor:c.line,minHeight:80},place:{width:52,height:56,borderRadius:14,borderBottomWidth:3,borderBottomColor:c.line,backgroundColor:c.soft,alignItems:"center",justifyContent:"center"}});
