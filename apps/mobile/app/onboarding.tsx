import { useEffect, useRef, useState } from "react";
import { TrackerConnections } from "./athlete";
import { OnboardingOvertake } from "../src/features/onboarding-overtake";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Modal, ScrollView, TextInput, View, type ScrollViewInstance } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { nextDailyWaveWindowAt, waveTimeLabel, PROVIDERS, SPORTS, type SportId, type UnitSystem } from "@fitness-battle/shared";
import { ChoicePicker } from "../src/ui/choice-picker";
import { Chip } from "../src/ui/chip";
import { AppText } from "../src/ui/section";
import { MotionStep } from "../src/ui/motion-step";
import { AnimatedEmber } from "../src/ui/mascot/animated-ember";
import { FocusButton, FocusSegments, f } from "../src/ui/focus";
import { OnboardingFade, OnboardingOutlook, OnboardingSummary } from "../src/features/onboarding-visuals";
import { ProfilePhoto } from "../src/features/profile-photo";
import { useAuth } from "../src/lib/auth";
import { useCompeteStore } from "../src/lib/compete-store";
import { SHELL_COLORS as c } from "../src/theme";

const titles = ["Good things start with you.", "What should we call you?", "What moves you?", "Bring your training along.", "This is an Overtake.", "Make every week count.", "Your starting line is here."];
export default function Onboarding() {
  const { state, canWrite, dispatch, saveError, retrySave } = useCompeteStore();
  const { user } = useAuth(); const router = useRouter();
  const preview = useLocalSearchParams<{ preview?: string }>().preview === "1";
  const key = `onboarding-draft:v3:${user?.id ?? "guest"}`;
  const [ready, setReady] = useState(false);
  const [loadedKey, setLoadedKey] = useState("");
  const [step, setStep] = useState(0), [name, setName] = useState(""), [city, setCity] = useState("");
  const [sports, setSports] = useState<SportId[]>(["running"]), [units, setUnits] = useState<UnitSystem>("us"), [sleep, setSleep] = useState(false);

  const finished = useRef(false), scroll=useRef<ScrollViewInstance>(null);
  useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false});},[step]);
  const [selectionError,setSelectionError]=useState(false),[now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30_000);return ()=>clearInterval(timer);},[]);
  useEffect(() => { let alive = true; setReady(false); void AsyncStorage.getItem(key).then(raw => {
    if (!alive) return;
    let draft; try { draft = !preview && raw ? JSON.parse(raw) : null; } catch {}
    setStep(Math.max(0, Math.min(6, Number(draft?.step) || 0))); setName(draft?.name ?? state?.name ?? ""); setCity(draft?.city ?? state?.city ?? "");
    setUnits(draft?.units === "metric" || draft?.units === "us" ? draft.units : state?.units ?? "us");
    setSports(Array.isArray(draft?.sports) ? draft.sports.filter((id: SportId) => SPORTS.some(s => s.id === id)) : [state?.primary ?? "running"]);
    setSleep(Boolean(draft?.sleep)); setLoadedKey(key); setReady(true);
  }).catch(() => { if (alive) setReady(true); }); return () => { alive = false; }; }, [key, preview, Boolean(state)]);
  useEffect(() => { if (ready && loadedKey === key && !preview) void AsyncStorage.setItem(key, JSON.stringify({step,name,city,sports,units,sleep})).catch(() => {}); }, [ready,loadedKey,preview,key,step,name,city,sports,units,sleep]);
  if (!state || !ready) return <AppText>Loading setup…</AppText>;
  function advance(){if(step===2&&!sports.length&&!sleep){setSelectionError(true);return;}setSelectionError(false);setStep(step+1);}
  function finish() {
    if (preview) { router.replace("/arena"); return; }
    if (!user || !canWrite || finished.current) return;
    finished.current = true;
    dispatch({ type: "rename", name: name.trim() || user.displayName });
    dispatch({ type: "set-city", city: city.trim() }); dispatch({ type: "set-units", units });
    for (const sport of sports) dispatch({ type: "opt-in", sport, accountId: user.id });
    if(sports[0]) dispatch({ type: "set-primary", sport: sports[0] });
    if (sleep) dispatch({ type: "opt-in-health", metric: "sleep" });
    dispatch({ type: "complete-onboarding" }); void AsyncStorage.removeItem(key); router.replace("/arena");
  }
  return <Modal visible presentationStyle="fullScreen"><SafeAreaProvider><SafeAreaView style={f.safe} edges={["top", "bottom"]}><ScrollView ref={scroll} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={[f.content,{maxWidth:520,width:"100%",alignSelf:"center"}]}>
    <View style={{alignItems:"center",backgroundColor:"#fff5d1",borderRadius:24,padding:12}}><AnimatedEmber size={140}/></View>
    <MotionStep identity={String(step)}>
      <AppText role="caption" secondary>{preview ? "DEBUG PREVIEW · NO CHANGES SAVED" : `YOUR FIRST FIELD · ${step+1} / 7`}</AppText>
      <AppText role="display" accessibilityRole="header">{titles[step]}</AppText>
      {step===0 && <AppText secondary>Meet Ember, your tiny teammate. Let’s set up your sports, preferences, and trackers one little step at a time.</AppText>}
      {step===1 && <>{!preview && <ProfilePhoto state={state}/>}<AppText role="label">Display name</AppText><TextInput accessibilityLabel="Display name" style={f.input} value={name} onChangeText={setName} maxLength={80}/><AppText role="label">City · optional</AppText><TextInput accessibilityLabel="City" style={f.input} value={city} onChangeText={setCity} maxLength={80}/></>}
      {step===2 && <><AppText secondary>You can change this later under your profile.</AppText><AppText role="heading">Sports</AppText><View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>{SPORTS.map(s=><Chip key={s.id} label={s.name} selected={sports.includes(s.id)} onPress={()=>setSports(current=>current.includes(s.id)?current.filter(id=>id!==s.id):[...current,s.id])}/>)}</View>{sports.length>1&&<><AppText role="label">Primary sport</AppText><ChoicePicker label="Primary sport" value={sports[0]!} options={sports.map(id=>({value:id,label:SPORTS.find(s=>s.id===id)!.name}))} onChange={id=>setSports([id,...sports.filter(s=>s!==id)])}/></>}{sports.some(s=>s!=="strength")&&<View style={{alignItems:"flex-start",gap:12}}><AppText role="label">Distance units</AppText><View style={{width:210}}><FocusSegments label="Distance units" options={[{value:"us",label:"Miles"},{value:"metric",label:"Kilometres"}]} value={units} onChange={setUnits}/></View></View>}<AppText role="heading">Sleep & recovery</AppText><View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}><Chip label="Sleep tracking" selected={sleep} onPress={()=>setSleep(!sleep)}/></View>{selectionError&&!sports.length&&!sleep&&<AppText accessibilityRole="alert">Choose at least one sport or sleep tracking to continue.</AppText>}</>}

      {step===3 && <><AppText secondary>Connect your trackers here, or skip and connect later under your profile. Provider authorization opens a secure sign-in window.</AppText>{preview ? PROVIDERS.map(p=><FocusButton key={p.id} secondary disabled label={`${p.name} · Connect (preview)`} onPress={()=>{}}/>) : <TrackerConnections/>}</>}
      {step===4 && <><AppText secondary>The moment your effort takes you ahead of another athlete. Don’t get overtaken!</AppText><OnboardingOvertake/></>}
      {step===5&&<OnboardingOutlook/>}
      {step===6&&<><OnboardingSummary sports={sports} units={units} sleep={sleep}/><OnboardingFade delay={(sports.length+Number(sleep))*300+400}><AppText role="label">Your next wave starts at {waveTimeLabel(nextDailyWaveWindowAt(new Date(now)).waveStart)}.</AppText></OnboardingFade></>}
      {saveError && <><AppText secondary>{saveError}</AppText><FocusButton secondary label="Retry account loading" onPress={retrySave}/></>}
      <View style={{flexDirection:"row",gap:12,alignItems:"stretch"}}>{step>0&&<View style={{flex:1}}><FocusButton secondary label="Back" onPress={()=>setStep(step-1)}/></View>}<View style={{flex:1}}><FocusButton label={step===6?preview?"Finish preview":user?"Finish":"Sign in to finish setup":step===3?"Skip for now":"Continue"} disabled={!preview && step===6 && Boolean(user) && !canWrite} onPress={()=>step<6?advance():!preview&&!user?router.replace("/athlete"):finish()}/></View></View>
    </MotionStep>
  </ScrollView></SafeAreaView></SafeAreaProvider></Modal>;
}
