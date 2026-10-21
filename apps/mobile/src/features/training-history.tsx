import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { APP_TIMEZONE, SPORTS, RECORD_DISTANCES, competeNow, formatClockTime, formatVolume, personalRecordHistory, recordStepPath, weeklyTraining, type CompeteState, type SportId } from '@fitness-battle/shared';
import { f } from '../ui/focus';
import { SHELL_COLORS as c } from '../theme';
const date=(v:string)=>new Date(v).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:APP_TIMEZONE});
export function TrainingHistory({state}:{state:CompeteState}) {
  const [sport,setSport]=useState<SportId>(state.primary),[selected,setSelected]=useState(11),[distance,setDistance]=useState(''),[receipt,setReceipt]=useState<string|null>(null);
  const now=competeNow(state),weeks=weeklyTraining(state.activities,sport,now),week=weeks[selected]??weeks.at(-1)!;
  const value=(w:typeof week)=>sport==='strength'?w.movingSec:w.distanceM,max=Math.max(1,...weeks.map(value));
  const records=personalRecordHistory(state,now),available=(['running','cycling'] as const).flatMap(s=>RECORD_DISTANCES[s].filter(d=>records.some(r=>r.sport===s&&r.distanceId===d.id)).map(d=>({...d,sport:s})));
  const active=available.find(d=>`${d.sport}:${d.id}`===distance)??available[0],rows=active?records.filter(r=>r.sport===active.sport&&r.distanceId===active.id):[],latest=rows.at(-1),inspected=rows.find(r=>r.activityId===receipt)??latest;
  return <>
    <View style={f.card}><Text style={f.h2}>Weekly training</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={f.row}>{SPORTS.map(s=><Pressable key={s.id} accessibilityRole="button" accessibilityState={{selected:sport===s.id}} style={[f.chip,sport===s.id&&f.chipActive]} onPress={()=>setSport(s.id)}><Text>{s.name}</Text></Pressable>)}</View></ScrollView>
      <View style={{height:150,flexDirection:'row',gap:4,marginVertical:14}}>{weeks.map((w,i)=><Pressable key={w.start} accessibilityRole="button" accessibilityState={{selected:selected===i}} accessibilityLabel={`${date(w.start)}, ${formatVolume(sport,w.distanceM,w.movingSec,state.units)}${w.partial?', partial week':''}`} onPress={()=>setSelected(i)} style={{flex:1,justifyContent:'flex-end',minHeight:44}}><View style={{height:Math.max(2,value(w)/max*135),backgroundColor:selected===i?c.tennis:c.secondary,borderTopLeftRadius:4,borderTopRightRadius:4,opacity:w.partial?.65:1}}/></Pressable>)}</View>
      <Text style={f.h2}>{formatVolume(sport,week.distanceM,week.movingSec,state.units)}</Text><Text style={f.small}>{date(week.start)} · {week.partial?'This week so far':'Complete week'} · {week.sessions} sessions</Text>
    </View>
    {active&&latest&&inspected?<View style={f.card}><Text style={f.h2}>Personal records</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={f.row}>{available.map(d=><Pressable accessibilityRole="button" accessibilityState={{selected:active===d}} style={[f.chip,active===d&&f.chipActive]} key={`${d.sport}:${d.id}`} onPress={()=>{setDistance(`${d.sport}:${d.id}`);setReceipt(null)}}><Text>{d.sport==='cycling'?'Ride · ':''}{d.label}</Text></Pressable>)}</View></ScrollView>
      <Text style={f.kicker}>{active.label} · {active.sport}</Text><Text style={f.massive}>{formatClockTime(latest.seconds)}</Text><Text style={f.small}>Whole-session moving time</Text>
      <Svg viewBox="0 0 300 100" width="100%" height={120} accessibilityLabel={`${rows.length} record improvements`}><Path d={recordStepPath(rows)} fill="none" stroke={c.ink} strokeWidth={3}/>{rows.length===1?<Circle cx={8} cy={8} r={4} fill={c.tennis}/>:null}</Svg>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={f.row}>{rows.map(r=><Pressable key={r.activityId} accessibilityRole="button" accessibilityState={{selected:inspected.activityId===r.activityId}} style={[f.chip,inspected.activityId===r.activityId&&f.chipActive]} onPress={()=>setReceipt(r.activityId)}><Text>{date(r.startedAt)}</Text></Pressable>)}</View></ScrollView>
      <Text style={f.rowTitle}>{formatClockTime(inspected.seconds)} · {date(inspected.startedAt)}</Text><Text style={f.small}>{inspected.source.replaceAll('_',' ')}{inspected.verified?' · GPS recorded':''}</Text>
    </View>:null}
  </>;
}
