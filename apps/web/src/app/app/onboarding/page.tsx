"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { TrackerConnections } from "@/features/you/you-route";
import { OnboardingOvertake } from "@/features/club/onboarding-overtake";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { nextDailyWaveWindowAt, waveTimeLabel, PROVIDERS, SPORTS, type SportId, type UnitSystem } from "@fitness-battle/shared";
import { AppHeading, AppParagraph, typographyStyle } from "@/ui/section";
import { Ember } from "@/components/mascot/ember";
import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { ProfilePhoto } from "@/features/you/profile-photo";
import { OnboardingOutlook, OnboardingSummary, OnboardingUnits } from "@/features/club/onboarding-visuals";
import { resolveSafePostLoginPath } from "@/lib/auth/login-redirect";
const titles = ["Good things start with you.","What should we call you?","What moves you?","Bring your training along.","This is an Overtake.","Make every week count.","Your starting line is here."];
function Setup({preview}:{preview:boolean}) {
  const {state,dispatch} = useCompete(); const {user} = useAuth(); const router=useRouter(), params=useSearchParams(), reduced=useReducedMotion();
  const finished = useRef(false), setupTop=useRef<HTMLElement>(null);
  const [selectionError,setSelectionError]=useState(false),[now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30_000);return ()=>clearInterval(timer);},[]);
  const key=`onboarding-draft:v3:${user?.id??"guest"}`;
  const [loadedKey,setLoadedKey]=useState("");
  const [ready,setReady]=useState(false),[step,setStep]=useState(0),[name,setName]=useState(""),[city,setCity]=useState("");
  useEffect(()=>{setupTop.current?.scrollIntoView({block:"start"});},[step]);
  const [sports,setSports]=useState<SportId[]>(["running"]),[units,setUnits]=useState<UnitSystem>("us"),[sleep,setSleep]=useState(false);
  useEffect(()=>{if(!state)return; let d;try{d=!preview?JSON.parse(sessionStorage.getItem(key)??"null"):null;}catch{}
    setStep(Math.max(0,Math.min(6,Number(d?.step)||0)));setName(d?.name??state.name);setCity(d?.city??state.city);
    setUnits(d?.units==="metric"||d?.units==="us"?d.units:state.units);
    setSports(Array.isArray(d?.sports)?d.sports.filter((id:SportId)=>SPORTS.some(s=>s.id===id)):[state.primary]);setSleep(Boolean(d?.sleep));setLoadedKey(key);setReady(true);
  },[key,preview,Boolean(state)]);
  useEffect(()=>{if(ready&&loadedKey===key&&!preview)try{sessionStorage.setItem(key,JSON.stringify({step,name,city,sports,units,sleep}));}catch{}},[ready,loadedKey,preview,key,step,name,city,sports,units,sleep]);
  if(!state||!ready)return <AppParagraph>Loading setup…</AppParagraph>;
  function advance(){if(step===2&&!sports.length&&!sleep){setSelectionError(true);return;}setSelectionError(false);setStep(step+1);}
  function finish(){if(preview){router.replace("/app/arena");return;}if(!user||finished.current)return;finished.current=true;
    dispatch({type:"rename",name:name.trim()||user.displayName});dispatch({type:"set-city",city:city.trim()});dispatch({type:"set-units",units});
    for(const sport of sports)dispatch({type:"opt-in",sport,accountId:user.id});if(sports[0])dispatch({type:"set-primary",sport:sports[0]});if(sleep)dispatch({type:"opt-in-health",metric:"sleep"});dispatch({type:"complete-onboarding"});
    try{sessionStorage.removeItem(key);}catch{} router.replace(resolveSafePostLoginPath(params.get("next")));
  }
  return <section ref={setupTop} className="fb-stack" style={{maxWidth:480,margin:"0 auto",padding:"20px 0",scrollMarginTop:80}}>
    <div style={{background:"var(--action-soft, #fff5d1)",borderRadius:24,display:"grid",placeItems:"center",padding:12}}><Ember style={{width:140,height:140}}/></div>
    <AnimatePresence mode="wait"><motion.div key={step} className="fb-stack" initial={reduced?false:{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0}} transition={{duration:reduced?0:.22}}>
      <AppParagraph typographyRole="caption">{preview?"DEBUG PREVIEW · NO CHANGES SAVED":`YOUR FIRST FIELD · ${step+1} / 7`}</AppParagraph>
      <AppHeading level={1} role="display">{titles[step]}</AppHeading>
      {step===0&&<AppParagraph>Meet Ember, your tiny teammate. Let’s set up your sports, preferences, and trackers one little step at a time.</AppParagraph>}
      {step===1&&<>{!preview&&<ProfilePhoto state={state} email={user?.email}/>}<label className="fb-field">Display name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80}/></label><label className="fb-field">City · optional<input value={city} onChange={e=>setCity(e.target.value)} maxLength={80}/></label></>}
      {step===2&&<><AppParagraph>You can change this later under your profile.</AppParagraph><AppHeading>Sports</AppHeading><div className="fb-chips">{SPORTS.map(s=><button type="button" className={`fb-chip${sports.includes(s.id)?" on":""}`} key={s.id} aria-pressed={sports.includes(s.id)} onClick={()=>setSports(current=>current.includes(s.id)?current.filter(id=>id!==s.id):[...current,s.id])}>{s.name}</button>)}</div>{sports.length>1&&<label className="fb-field">Primary sport<select value={sports[0]} onChange={e=>{const id=e.target.value as SportId;setSports([id,...sports.filter(s=>s!==id)]);}}>{sports.map(id=><option key={id} value={id}>{SPORTS.find(s=>s.id===id)?.name}</option>)}</select></label>}{sports.some(s=>s!=="strength")&&<OnboardingUnits value={units} onChange={setUnits}/>}<AppHeading>Sleep & recovery</AppHeading><div className="fb-chips"><button type="button" className={`fb-chip${sleep?" on":""}`} aria-pressed={sleep} onClick={()=>setSleep(!sleep)}>Sleep tracking</button></div>{selectionError&&!sports.length&&!sleep&&<AppParagraph role="alert">Choose at least one sport or sleep tracking to continue.</AppParagraph>}</>}

      {step===3&&<><AppParagraph>Connect a tracker now to authorize your real account. Strava, WHOOP, and Oura start syncing after connection. Garmin sends new activities after your device syncs with Garmin Connect; Starter access does not include past activity history. You can also connect later under your profile.</AppParagraph>{preview?PROVIDERS.map(p=><button key={p.id} className="fb-btn-line" disabled>{p.name} · Connect (preview)</button>):<TrackerConnections/>}</>}
      {step===4&&<><AppParagraph>The moment your effort takes you ahead of another athlete. Don’t get overtaken!</AppParagraph><OnboardingOvertake/></>}
      {step===5&&<OnboardingOutlook/>}
      {step===6&&<><OnboardingSummary sports={sports} units={units} sleep={sleep}/><motion.div initial={{opacity:reduced?1:0}} animate={{opacity:1}} transition={{delay:reduced?0:(sports.length+Number(sleep))*.3+.4}}><AppParagraph typographyRole="label">Your next wave starts at {waveTimeLabel(nextDailyWaveWindowAt(new Date(now)).waveStart)}.</AppParagraph></motion.div></>}
      <div style={{display:"flex",gap:12,alignItems:"stretch"}}>{step>0&&<button type="button" className="fb-btn-line" style={{flex:1}} onClick={()=>setStep(step-1)}>Back</button>}<button className="fb-btn" style={{flex:1}} type="button" onClick={()=>step<6?advance():finish()}>{step===6?preview?"Finish preview":"Finish":step===3?(state.links.some(link=>link.status==="connected")?"Continue":"Skip for now"):"Continue"}</button></div>
    </motion.div></AnimatePresence>
  </section>;
}
function Entry(){const preview=useSearchParams().get("preview")==="1";return preview?<Setup preview/>:<AuthGate reason="Sign in to save your preferences and join your first field."><Setup preview={false}/></AuthGate>;}
export default function OnboardingPage(){return <Suspense fallback={<AppParagraph>Loading setup…</AppParagraph>}><Entry/></Suspense>;}
