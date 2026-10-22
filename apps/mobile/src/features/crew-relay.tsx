import { useId, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { crewRelay, crewRelayScene, formatVolume, PERSON_ICON_PATH, type SportId, type UnitSystem } from "@fitness-battle/shared";
import { drawFieldNode } from "../ui/field-course";
import { SHELL_COLORS as c } from "../theme";
import { f } from "../ui/focus";
export function CrewRelay({members,entries,sport,format,previousDistanceM,targetSessions,units,userId}:{members:{user_id:string;display_name:string;avatar_url?:string|null}[];entries:{user_id:string;distance_m:number;moving_sec:number;session_count?:number}[];sport:SportId;format:string;previousDistanceM?:number|null;targetSessions:number;units?:UnitSystem;userId?:string}){
  const [selected,setSelected]=useState(""),[width,setWidth]=useState(320),prefix=useId();
  const sessions=format==="personal_target"||sport==="strength",target=sessions?targetSessions*members.length:previousDistanceM&&previousDistanceM>0?previousDistanceM:null;
  const model=crewRelay(members.map(m=>{const rows=entries.filter(e=>e.user_id===m.user_id);return {id:m.user_id,name:m.display_name,value:rows.reduce((sum,e)=>sum+Number(sessions?(e.session_count??1):e.distance_m),0),sessions:rows.reduce((sum,e)=>sum+Number(e.session_count??1),0)};}),target);
  const member=model.segments.find(m=>m.id===(selected||userId))??model.segments[0],scene=crewRelayScene(model,width,prefix);
  const volume=(value:number)=>sessions?`${value} sessions`:formatVolume(sport,value,0,units);
  return <View style={{gap:12,marginTop:12}} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
    <Text style={f.small}>{target?`${sessions?"Shared session target":"Last week’s distance"} · ${volume(target)}`:previousDistanceM===0?"No distance recorded last week":"Last-week comparison unavailable"}</Text>
    <Svg width={width} height={132} accessibilityLabel={`${volume(model.total)} together${target?` compared with ${volume(target)}`:""}`}>
      {scene.ground.map(drawFieldNode)}{scene.segments.map(segment=><G key={segment.id} onPress={()=>setSelected(segment.id)}>{segment.nodes.map(drawFieldNode)}</G>)}{scene.finish.map(drawFieldNode)}
      {target?<SvgText x={Math.min(width-12,16+(model.finish??1)*Math.max(180,width-52))} y={126} textAnchor="end" fill={c.muted} fontSize={11}>{sessions?"Target":"Last week"}</SvgText>:null}
    </Svg>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{flexDirection:"row",gap:8}}>{model.segments.map(m=>{const person=members.find(p=>p.user_id===m.id);return <Pressable key={m.id} accessibilityRole="button" accessibilityState={{selected:member?.id===m.id}} accessibilityLabel={`${m.name}, ${volume(m.value)}`} onPress={()=>setSelected(m.id)} style={[s.person,member?.id===m.id&&{borderColor:c.tennis,backgroundColor:c.soft}]}><View style={[s.photo,{borderWidth:2,borderColor:m.color}]}>{person?.avatar_url?<Image source={{uri:person.avatar_url}} style={{width:36,height:36,borderRadius:18}}/>:<Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth={1.8}><Path d={PERSON_ICON_PATH}/></Svg>}</View><Text numberOfLines={1} style={f.rowTitle}>{m.name}</Text><Text style={f.small}>{volume(m.value)}</Text></Pressable>;})}</View></ScrollView>
    {member?<View style={{gap:3}} accessibilityLiveRegion="polite"><Text style={f.rowTitle}>{member.name}</Text><Text style={f.small}>{volume(member.value)} · {(member.share*100).toFixed(1)}% of recorded crew activity{!sessions?` · ${member.sessions} sessions`:""}</Text></View>:null}
    {target?<Text style={f.small}>{model.remaining?`${volume(model.remaining)} ${sessions?"to the target":"to match last week"}`:model.total>target?`${volume(model.total-target)} beyond ${sessions?"the target":"last week"}`:sessions?"Target reached together.":"Last week matched together."}</Text>:null}
  </View>;
}
const s=StyleSheet.create({person:{width:112,minHeight:116,padding:12,gap:6,alignItems:"center",borderWidth:1,borderColor:c.line,borderBottomWidth:3,borderRadius:14,backgroundColor:c.card},photo:{width:36,height:36,borderRadius:18,backgroundColor:c.soft,alignItems:"center",justifyContent:"center",overflow:"hidden"}});
