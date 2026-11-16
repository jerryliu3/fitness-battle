"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  detectDeviceTimeZone, guestIntroForAccount, GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY,
  nextDailyWaveWindowAt, waveTimeLabel, SPORTS, type ProfileGender, type SportId, type UnitSystem,
} from "@fitness-battle/shared";
import { TrackerConnections } from "@/features/you/you-route";
import { CountryCombobox } from "@/ui/country-combobox";
import { TimezoneCombobox } from "@/ui/timezone-combobox";
import { AppHeading, AppParagraph } from "@/ui/section";
import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { ProfilePhoto } from "@/features/you/profile-photo";
import { OnboardingSummary, OnboardingUnits } from "@/features/club/onboarding-visuals";
import { resolvePostOnboardingPath } from "@/lib/auth/login-redirect";
import { readGuestIntroDraft } from "@/lib/guest-intro";
import "@/features/club/onboarding.css";

const titles = ["Bring your training along.", "A few more things about you.", "Your starting line is here."];
function Setup({ preview }: { preview: boolean }) {
  const { state, dispatch, loadStatus } = useCompete();
  const { user } = useAuth();
  const router = useRouter(), params = useSearchParams();
  const finished = useRef(false), top = useRef<HTMLElement>(null);
  const key = `onboarding-draft:v6:${user?.id ?? "guest"}`;
  const [loadedKey, setLoadedKey] = useState("");
  const [step, setStep] = useState(0);
  const [name, setName] = useState(""), [city, setCity] = useState("");
  const [gender, setGender] = useState<ProfileGender | "">("");
  const [countryCode, setCountryCode] = useState("");
  const [sports, setSports] = useState<SportId[]>([]);
  const [units, setUnits] = useState<UnitSystem>("us"), [sleep, setSleep] = useState(false);
  const [timezone, setTimezone] = useState(() => detectDeviceTimeZone());
  const [selectionError, setSelectionError] = useState(false);
  const [guestImported, setGuestImported] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  useEffect(() => { top.current?.scrollIntoView({ block: "start" }); }, [step]);
  useEffect(() => {
    if (!state) return;
    let saved: Record<string, unknown> | null = null;
    let pending: string | null = null;
    try {
      const raw: unknown = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (!preview && raw && typeof raw === "object") saved = raw as Record<string, unknown>;
      pending = localStorage.getItem(GUEST_SIGNUP_PENDING_KEY);
    } catch {}
    const guest = preview ? null : guestIntroForAccount(readGuestIntroDraft(), pending, user?.email);
    const initialSports = guest ? [guest.sport] : state.ratings.filter(r => r.optedIn).map(r => r.sport);
    setStep(Math.max(0, Math.min(2, Math.trunc(Number(saved?.step) || 0))));
    setName(typeof saved?.name === "string" ? saved.name : guest?.name || user?.displayName || state.name);
    setCity(typeof saved?.city === "string" ? saved.city : guest?.city ?? state.city ?? "");
    setGender(saved?.gender === "male" || saved?.gender === "female" || saved?.gender === "other" ? saved.gender : state.gender ?? "");
    setCountryCode(typeof saved?.countryCode === "string" ? saved.countryCode : guest?.countryCode ?? state.countryCode ?? "");
    setUnits(saved?.units === "us" || saved?.units === "metric" ? saved.units : state.units);
    setSports(Array.isArray(saved?.sports) ? saved.sports.filter((s: unknown): s is SportId => SPORTS.some(sport => sport.id === s)) : initialSports);
    setSleep(typeof saved?.sleep === "boolean" ? saved.sleep : Boolean(state.healthRatings.some(r => r.metric === "sleep" && r.optedIn)));
    setTimezone(typeof saved?.timezone === "string" ? saved.timezone : detectDeviceTimeZone());
    setGuestImported(Boolean(guest));
    setLoadedKey(key);
  }, [key, preview, user?.email, Boolean(state)]);
  useEffect(() => {
    if (loadedKey !== key || preview) return;
    try { sessionStorage.setItem(key, JSON.stringify({ step, name, city, gender, countryCode, sports, units, sleep, timezone })); } catch {}
  }, [loadedKey, key, preview, step, name, city, gender, countryCode, sports, units, sleep, timezone]);
  useEffect(() => {
    if (!preview && state?.onboardingCompleted) router.replace(resolvePostOnboardingPath(params.get("next")));
  }, [preview, state?.onboardingCompleted, params, router]);
  if (!state || loadedKey !== key) return <AppParagraph>Loading setup…</AppParagraph>;
  const identityReady = Boolean(name.trim());
  const selectionReady = sports.length > 0 || sleep;
  const canWrite = loadStatus === "ready" || loadStatus === "local";
  function advance() {
    if (step === 1 && (!identityReady || !selectionReady) && !preview) { setSelectionError(true); return; }
    setSelectionError(false);
    setStep(Math.min(2, step + 1));
  }
  function finish() {
    if (preview) { router.replace("/app/arena"); return; }
    if (!user || !canWrite || finished.current || !identityReady || !selectionReady) return;
    finished.current = true;
    dispatch({ type: "rename", name: name.trim() });
    dispatch({ type: "set-city", city: city.trim() });
    if (gender) dispatch({ type: "set-gender", gender });
    if (countryCode) dispatch({ type: "set-country", countryCode });
    dispatch({ type: "set-units", units });
    dispatch({ type: "set-timezone", timezone });
    for (const sport of sports) dispatch({ type: "opt-in", sport, accountId: user.id });
    if (sports[0]) dispatch({ type: "set-primary", sport: sports[0] });
    if (sleep) dispatch({ type: "opt-in-health", metric: "sleep" });
    dispatch({ type: "complete-onboarding" });
    try {
      sessionStorage.removeItem(key);
      if (guestImported) { localStorage.removeItem(GUEST_INTRO_DRAFT_KEY); localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); }
    } catch {}
    router.replace(resolvePostOnboardingPath(params.get("next")));
  }
  return <section ref={top} className="onboarding fb-stack">
    <div className="onboarding-progress" role="img" aria-label={`Setup step ${step + 1} of 3`}>
      {titles.map((title, i) => <span key={title} data-complete={i <= step} />)}
    </div>
    <AppHeading level={1} role="display">{titles[step]}</AppHeading>
    {step === 0 && <>
      <AppParagraph>Connect your tracker to bring your training along. You can also connect later.</AppParagraph>
      {!preview && <TrackerConnections />}
    </>}
    {step === 1 && <>
      {!preview && <ProfilePhoto state={state} email={user?.email} />}
      <label className="fb-field">Display name<input value={name} onChange={e => setName(e.target.value)} maxLength={80} /></label>
      <label className="fb-field">City (optional)<input value={city} onChange={e => setCity(e.target.value)} maxLength={80} /></label>
      <CountryCombobox label="Country (optional)" value={countryCode} onChange={setCountryCode} />
      <label className="fb-field">Gender (optional)<select value={gender} onChange={e => setGender(e.target.value as ProfileGender | "")}>
        <option value="">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
      </select></label>
      <TimezoneCombobox value={timezone} onChange={setTimezone} />
      <AppHeading>Sports to compete in</AppHeading>
      <AppParagraph>Choose which events to enter when you finish setup.</AppParagraph>
      <div className="fb-chips">{SPORTS.map(s => <button type="button" className={`fb-chip${sports.includes(s.id) ? " on" : ""}`} key={s.id}
        aria-pressed={sports.includes(s.id)} onClick={() => setSports(current => current.includes(s.id) ? current.filter(id => id !== s.id) : [...current, s.id])}>{s.name}</button>)}</div>
      {sports.length > 1 && <label className="fb-field">Primary sport<select value={sports[0]} onChange={e => { const id = e.target.value as SportId; setSports([id, ...sports.filter(s => s !== id)]); }}>
        {sports.map(id => <option key={id} value={id}>{SPORTS.find(s => s.id === id)!.name}</option>)}
      </select></label>}
      {sports.some(s => s !== "strength") && <OnboardingUnits value={units} onChange={setUnits} />}
      <AppHeading>Sleep & recovery</AppHeading>
      <div className="fb-chips"><button type="button" className={`fb-chip${sleep ? " on" : ""}`} aria-pressed={sleep} onClick={() => setSleep(!sleep)}>Sleep tracking</button></div>
      {selectionError && !identityReady && <AppParagraph role="alert">Enter your display name to continue.</AppParagraph>}
      {selectionError && !selectionReady && <AppParagraph role="alert">Choose at least one sport or sleep tracking to continue.</AppParagraph>}
    </>}
    {step === 2 && <>
      <OnboardingSummary sports={sports} units={units} sleep={sleep} />
      <AppParagraph>Your chosen events register for the next wave. You can change your preferences later.</AppParagraph>
      <AppParagraph typographyRole="label">Next wave starts at {waveTimeLabel(nextDailyWaveWindowAt(new Date(now)).waveStart, timezone)}.</AppParagraph>
    </>}
    <div className="onboarding-actions">
      {step > 0 && <button type="button" className="fb-btn-line" onClick={() => setStep(step - 1)}>Back</button>}
      <button className="fb-btn" type="button" disabled={step === 2 && !preview && !canWrite} onClick={() => step < 2 ? advance() : finish()}>
        {step === 2 ? "Finish setup & register" : step === 0 && !state.links.some(link => link.status === "connected") ? "Skip for now" : "Continue"}
      </button>
    </div>
  </section>;
}
function Entry() {
  const preview = useSearchParams().get("preview") === "1";
  return preview ? <Setup preview /> : <AuthGate reason="Sign in to save your preferences and join your first field."><Setup preview={false} /></AuthGate>;
}
export default function OnboardingPage() {
  return <Suspense fallback={<AppParagraph>Loading setup…</AppParagraph>}><Entry /></Suspense>;
}
