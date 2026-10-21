import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { formatVolume, repeatStatus, type PeriodResult, type UnitSystem, type WeeklySocial } from '@fitness-battle/shared';
import { useAuth } from '../lib/auth';
import { requestApi } from '../lib/api';
import { mobileEnv } from '../lib/env';
import { FocusButton, f } from '../ui/focus';
export function WeeklySocialActions({result,units}:{result:PeriodResult;units:UnitSystem}) {
 const {user,accessToken,demoMode}=useAuth(),[data,setData]=useState<WeeklySocial|null>(null),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),flight=useRef(false),mounted=useRef(true);
 const query=`sport=${result.sport}&start=${encodeURIComponent(result.periodStart)}&end=${encodeURIComponent(result.periodEnd)}&track=${result.track}`;
 const load=useCallback(async()=>{const next=await requestApi<WeeklySocial>(mobileEnv.apiUrl,accessToken,`/api/compete/social?${query}`);if(mounted.current)setData(next)},[accessToken,query]);
 useEffect(()=>{mounted.current=true;if(user&&!demoMode)void load().catch(()=>{if(mounted.current)setError('Could not load the settled field.')});return()=>{mounted.current=false}},[load,user?.id,demoMode]);
 const peer=data?.peers.find(p=>p.id===selected)??data?.peers[0];
 async function toggle(kind:'congrats'|'repeat'){
  if(!peer||!data?.fieldId||flight.current)return;flight.current=true;setBusy(true);setError('');
  try{await requestApi(mobileEnv.apiUrl,accessToken,'/api/compete/social',{body:{fieldId:data.fieldId,recipientId:peer.id,track:result.track,kind,enabled:!peer[kind]}});await load().catch(()=>{if(mounted.current)setError('Saved. Refresh to see the latest choices.')})}catch{if(mounted.current)setError('Could not save your choice. Try again.')}finally{flight.current=false;if(mounted.current)setBusy(false)}
 }
 if(!user||demoMode)return null;
 if(error&&!data)return <View><Text accessibilityRole="alert">{error}</Text><FocusButton label="Retry" secondary onPress={()=>void load().then(()=>setError('')).catch(()=>setError('Could not load the settled field.'))}/></View>;
 if(!peer)return null;
 return <View style={[f.card,{gap:12}]}><Text style={f.kicker}>Your field</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={f.row}>{data!.peers.map(p=><Pressable key={p.id} accessibilityRole="button" accessibilityState={{selected:p.id===peer.id}} style={[f.chip,p.id===peer.id&&f.chipActive]} onPress={()=>setSelected(p.id)}><Text>{p.name}</Text></Pressable>)}</View></ScrollView>
  <Text style={f.rowTitle}>{peer.name} · #{peer.place} · {formatVolume(result.sport,peer.distanceM,peer.movingSec,units)}</Text>
  <View style={f.row}><FocusButton label={peer.congrats?'Congrats ✓':'Congrats'} secondary disabled={busy} onPress={()=>void toggle('congrats')}/><FocusButton label={peer.repeat?'Race again ✓':'Race again'} secondary disabled={busy||(!peer.repeat&&peer.status==='expired')} onPress={()=>void toggle('repeat')}/></View>
  <Text style={f.small}>{repeatStatus(peer.status)}</Text>{error?<Text accessibilityRole="alert">{error}</Text>:null}
 </View>;
}
