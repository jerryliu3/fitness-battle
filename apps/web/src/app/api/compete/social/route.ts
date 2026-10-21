import { NextResponse } from 'next/server';
import { SPORT_IDS } from '@fitness-battle/shared';
import { resolveRequestUserId } from '@/lib/auth/request-user';
import { createRequestClient } from '@/lib/supabase/request';
export async function GET(request:Request){
 if(!await resolveRequestUserId(request))return NextResponse.json({error:'authentication_required'},{status:401});
 const p=new URL(request.url).searchParams,sport=p.get('sport'),start=p.get('start'),end=p.get('end'),track=p.get('track');
 if(!SPORT_IDS.includes(sport as typeof SPORT_IDS[number])||!start||!end||!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||!['open','verified'].includes(track??''))return NextResponse.json({error:'invalid_result'},{status:400});
 const db=await createRequestClient(request),{data,error}=await db.rpc('weekly_field_social',{p_sport:sport,p_start:start,p_end:end,p_track:track});
 if(error)return NextResponse.json({error:'results_unavailable'},{status:400});return NextResponse.json(data);
}
export async function POST(request:Request){
 if(!await resolveRequestUserId(request))return NextResponse.json({error:'authentication_required'},{status:401});
 const b=await request.json().catch(()=>null),uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v);
 if(!b||!uuid(b.fieldId)||!uuid(b.recipientId)||!['open','verified'].includes(b.track)||!['congrats','repeat'].includes(b.kind)||typeof b.enabled!=='boolean')return NextResponse.json({error:'invalid_choice'},{status:400});
 const db=await createRequestClient(request),{error}=await db.rpc('set_weekly_field_choice',{p_field_id:b.fieldId,p_recipient_id:b.recipientId,p_track:b.track,p_kind:b.kind,p_enabled:b.enabled});
 if(error)return NextResponse.json({error:'choice_not_saved'},{status:400});return NextResponse.json({persisted:true});
}
