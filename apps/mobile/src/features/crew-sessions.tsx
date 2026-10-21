import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { APP_TIMEZONE, crewSessionDraftId, crewSessionError, crewSessionInstant, type CrewSession } from '@fitness-battle/shared';
import { useAuth } from '../lib/auth';
import { mobileEnv } from '../lib/env';
import { requestApi } from '../lib/api';
import { FocusButton, FocusSheet, f } from '../ui/focus';
export function CrewSessions({crewId}:{crewId:string}) {
  const {user,accessToken}=useAuth();
  const [sessions,setSessions]=useState<CrewSession[]>([]),[open,setOpen]=useState(false),[title,setTitle]=useState(''),[day,setDay]=useState(''),[time,setTime]=useState('08:00'),[duration,setDuration]=useState('30'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const flight=useRef(false),id=useRef(crewSessionDraftId()),mounted=useRef(true);
  const reload=useCallback(async()=>{const body=await requestApi<{sessions:CrewSession[]}>(mobileEnv.apiUrl,accessToken,`/api/crews/sessions?crewId=${encodeURIComponent(crewId)}`);if(mounted.current)setSessions(body.sessions)},[crewId,accessToken]);
  useEffect(()=>{mounted.current=true;void reload().catch(()=>{if(mounted.current)setError('Could not load sessions.')});return()=>{mounted.current=false}},[reload]);
  async function write(body:object){if(flight.current)return;flight.current=true;setBusy(true);setError('');try{
    await requestApi(mobileEnv.apiUrl,accessToken,'/api/crews/sessions',{body});if(!mounted.current)return;
    setOpen(false);setTitle('');id.current=crewSessionDraftId();await reload().catch(()=>setError('Saved. Refresh to load the updated start list.'));
  }catch(e){if(mounted.current)setError(crewSessionError(e instanceof Error?e.message:''))}finally{flight.current=false;if(mounted.current)setBusy(false)}}
  return <View style={f.card}><View style={f.row}><Text style={f.h2}>Start Line</Text><FocusButton label="＋ Schedule" secondary disabled={busy} onPress={()=>{setError('');setOpen(true)}}/></View>
    {sessions.map(s=>{const joined=s.participants.some(p=>p.user_id===user?.id),closed=!!s.cancelled_at||Date.parse(s.starts_at)<=Date.now();return <View key={s.id} style={{backgroundColor:'#f7f4e9',borderRadius:18,borderBottomWidth:3,borderColor:'#e0d5b2',padding:20,gap:10,marginVertical:8}}>
      <Text style={f.kicker}>{new Date(s.starts_at).toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric',timeZone:s.time_zone})}</Text>
      <Text style={[f.massive,{fontSize:46}]}>{new Date(s.starts_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:s.time_zone})}</Text><Text style={f.small}>{s.time_zone} · {s.duration_min} min</Text><Text style={f.h2}>{s.title}</Text>
      <View style={[f.chipRow,{borderTopWidth:1,borderStyle:'dashed',borderColor:'#c8cdbf',paddingTop:14}]}>{s.participants.slice(0,6).map(p=><View key={p.user_id} accessible accessibilityLabel={p.display_name} style={[f.avatar,{backgroundColor:p.user_id===user?.id?'#f1c75b':'#e0e5dc'}]}><Text>{p.display_name.slice(0,2).toUpperCase()}</Text></View>)}{s.participants.length>6?<Text>+{s.participants.length-6}</Text>:null}</View>
      <Text style={f.small}>{s.cancelled_at?'Cancelled':closed?'Session started':`${s.participants.length} on the start list`}</Text>
      {!closed?<><FocusButton label={joined?'Leave session':'Count me in ↗'} secondary={joined} disabled={busy} onPress={()=>void write({action:'rsvp',id:s.id,join:!joined})}/>{s.created_by===user?.id?<FocusButton label="Cancel session" secondary disabled={busy} onPress={()=>void write({action:'cancel',id:s.id})}/>:null}</>:null}
    </View>})}
    {!sessions.length&&!error?<Text style={f.small}>Same time. Your own place.</Text>:null}{!open&&error?<><Text accessibilityRole="alert" style={f.copy}>{error}</Text><FocusButton secondary label="Refresh sessions" onPress={()=>void reload().then(()=>setError('')).catch(()=>setError('Could not load sessions.'))}/></>:null}
    <FocusSheet open={open} title="A shared start" body="Same time. Your own place. RSVP does not log a workout." onClose={()=>{if(!busy)setOpen(false)}}>
      <Text style={f.small}>Session</Text><TextInput accessibilityLabel="Session title" style={f.input} maxLength={80} placeholder="Easy run, together" value={title} onChangeText={setTitle}/>
      <Text style={f.small}>Date · YYYY-MM-DD</Text><TextInput accessibilityLabel="Session date YYYY-MM-DD" style={f.input} placeholder="2026-10-24" value={day} onChangeText={setDay}/>
      <Text style={f.small}>Time · {APP_TIMEZONE} · HH:mm</Text><TextInput accessibilityLabel="Session time HH:mm Eastern" style={f.input} value={time} onChangeText={setTime}/>
      <Text style={f.small}>Minutes</Text><TextInput accessibilityLabel="Duration in minutes" keyboardType="number-pad" style={f.input} value={duration} onChangeText={setDuration}/>
      {error?<Text accessibilityRole="alert" style={f.copy}>{error}</Text>:null}<FocusButton label={busy?'Saving…':'Set the start line'} disabled={busy||!title.trim()||!day} onPress={()=>{try{const startsAt=crewSessionInstant(day,time);void write({action:'create',id:id.current,crewId,title,startsAt,durationMin:Number(duration),timeZone:APP_TIMEZONE})}catch(e){setError((e as Error).message)}}}/>
    </FocusSheet>
  </View>;
}
