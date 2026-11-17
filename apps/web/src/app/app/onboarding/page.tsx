"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ONBOARDING_SETUP_TITLES as titles, detectDeviceTimeZone, guestIntroForAccount, GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY,
  SPORTS, hasOnboardingTrainingHistory, type ProfileGender, type SportId, type UnitSystem,
  onboardingWeeklyVolumeInput, parseOnboardingWeeklyVolumes, onboardingDeclaredVolume, onboardingWeeklyVolumeUnit, type OnboardingWeeklyVolumes,
} from "@fitness-battle/shared";
import { TrackerConnections } from "@/features/you/you-route";
import { CountryCombobox } from "@/ui/country-combobox";
import { TimezoneCombobox } from "@/ui/timezone-combobox";
import { BackButton } from "@/ui/back-button";
import { AppHeading, AppParagraph } from "@/ui/section";
import { AuthGate } from "@/components/auth-gate";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { OnboardingUnits } from "@/features/club/onboarding-units";
import { resolvePostOnboardingPath } from "@/lib/auth/login-redirect";
import { createClient } from "@/lib/supabase/client";
import { uploadWebProfileAvatar } from "@/lib/profile/avatar-upload";
import { EventRegistration } from "@/features/arena/event-registration";
import "@/features/arena/event-home.css";
import { readGuestIntroDraft } from "@/lib/guest-intro";
import "@/features/club/onboarding.css";

function Setup({ preview }: { preview: boolean }) {
  const { state, dispatch, loadStatus } = useCompete();
  const { user, offlineMode } = useAuth();
  const router = useRouter(), params = useSearchParams();
  const previewSport = preview ? SPORTS.find(item => item.id === params.get("sport"))?.id : undefined;
  const finished = useRef(false), top = useRef<HTMLElement>(null);
  const key = `onboarding-draft:v7:${user?.id ?? "guest"}`;
  const [loadedKey, setLoadedKey] = useState("");
  const [step, setStep] = useState(0);
  const [registered, setRegistered] = useState(false);
  const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState<string | null>(null);
  const owner = useRef(user?.id);
  owner.current = user?.id;
  useEffect(() => () => { owner.current = undefined; }, []);
  const [name, setName] = useState(""), [city, setCity] = useState("");
  const [gender, setGender] = useState<ProfileGender | "">("");
  const [countryCode, setCountryCode] = useState("");
  const [sport, setSport] = useState<SportId>("running");
  const [weeklyVolume, setWeeklyVolume] = useState<OnboardingWeeklyVolumes>({});
  const [units, setUnits] = useState<UnitSystem>("us");
  const [timezone, setTimezone] = useState(() => detectDeviceTimeZone());
  const [guestImported, setGuestImported] = useState(false);
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
    const initialSport = previewSport ?? guest?.sport ?? state.primary;
    finished.current = false;
    const savedStep = Math.max(0, Math.min(2, Math.trunc(Number(saved?.step) || 0)));
    setStep(savedStep);
    setRegistered(false);
    setName(typeof saved?.name === "string" ? saved.name : guest?.name || user?.displayName || state.name);
    setCity(typeof saved?.city === "string" ? saved.city : guest?.city ?? state.city ?? "");
    setGender(saved?.gender === "male" || saved?.gender === "female" || saved?.gender === "other" ? saved.gender : state.gender ?? "");
    setCountryCode(typeof saved?.countryCode === "string" ? saved.countryCode : guest?.countryCode ?? state.countryCode ?? "");
    setUnits(saved?.units === "us" || saved?.units === "metric" ? saved.units : state.units);
    setSport(initialSport);
    setWeeklyVolume(parseOnboardingWeeklyVolumes(saved?.weeklyVolume));
    setTimezone(typeof saved?.timezone === "string" ? saved.timezone : detectDeviceTimeZone());
    setGuestImported(Boolean(guest));
    setLoadedKey(key);
  }, [key, preview, previewSport, user?.email, Boolean(state)]);
  useEffect(() => {
    if (loadedKey !== key || preview) return;
    try { sessionStorage.setItem(key, JSON.stringify({ step, name, city, gender, countryCode, units, timezone, weeklyVolume })); } catch {}
  }, [loadedKey, key, preview, step, name, city, gender, countryCode, units, timezone, weeklyVolume]);
  useEffect(() => {
    if (!preview && state?.onboardingCompleted) router.replace(resolvePostOnboardingPath(params.get("next")));
  }, [preview, state?.onboardingCompleted, params, router]);
  const canWrite = loadStatus === "ready" || loadStatus === "local";
  useEffect(() => {
    if (step !== 2 || registered || !state || loadedKey !== key || (!preview && (!user || !canWrite))) return;
    if (!preview && user) {
      dispatch({ type: "rename", name: name.trim() });
      dispatch({ type: "set-city", city: city.trim() });
      dispatch({ type: "set-gender", gender: gender || null });
      dispatch({ type: "set-country", countryCode });
      dispatch({ type: "set-units", units });
      dispatch({ type: "set-timezone", timezone });
      if (!state.ratings.some(r => r.sport === sport && r.optedIn)) dispatch({ type: "opt-in", sport, accountId: user.id });
      dispatch({ type: "set-primary", sport });
    }
    setRegistered(true);
  }, [step, registered, state, loadedKey, key, preview, user, canWrite, sport, name, city, gender, countryCode, units, timezone, dispatch]);

  if (!state || loadedKey !== key) return <AppParagraph>Loading setup…</AppParagraph>;
  const sportName = SPORTS.find(item => item.id === sport)!.name;
  const hasHistory = hasOnboardingTrainingHistory(state, sport);
  const needsVolume = !hasHistory;
  function advance() { setStep(Math.min(2, step + 1)); }
  async function finish() {
    if (preview) { router.replace("/app/arena"); return; }
    if (!user || !state || !canWrite || finished.current) return;
    finished.current = true;
    setSaving(true); setSaveError(null);
    try {
      const guest = guestIntroForAccount(readGuestIntroDraft(), localStorage.getItem(GUEST_SIGNUP_PENDING_KEY), user.email);
      if (guest?.photo) {
        const blob = await (await fetch(guest.photo)).blob();
        const avatarUrl = offlineMode ? guest.photo : await uploadWebProfileAvatar({ file: new File([blob], "athlete.jpg", { type: "image/jpeg" }), userId: user.id, previousAvatarUrl: state.avatarUrl, supabase: createClient(), requireStorage: true });
        if (owner.current !== user.id) return;
        dispatch({ type: "set-avatar", avatarUrl, accountId: user.id });
      }
    } catch (err) {
      finished.current = false;
      setSaveError(err instanceof Error ? err.message : "Could not save your photo. Please try again.");
      return;
    } finally { setSaving(false); }
    if (owner.current !== user.id) return;
    const declaredWeeklyVolume = onboardingDeclaredVolume(sport, weeklyVolume[sport] ?? "0", units);
    if (!hasHistory && declaredWeeklyVolume !== undefined) dispatch({ type: "declare-effort", sport, declaredWeeklyVolume });
    dispatch({ type: "complete-onboarding" });
    try {
      sessionStorage.removeItem(key);
      if (guestImported) { localStorage.removeItem(GUEST_INTRO_DRAFT_KEY); localStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); }
    } catch {}
    router.replace(resolvePostOnboardingPath(params.get("next")));
  }
  return <section ref={top} className="onboarding fb-stack">
    <div className="onboarding-progress" role="img" aria-label={`Setup step ${step + 1} of ${titles.length}`}>
      {titles.map((title, i) => <span key={title} data-complete={i <= step} />)}
    </div>
    <AppHeading level={1} role="display">{titles[step]}</AppHeading>
    {step === 0 && <>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
        <label className="fb-field">City (optional)<input value={city} onChange={e => setCity(e.target.value)} maxLength={80} /></label>
        <CountryCombobox label="Country (optional)" value={countryCode} onChange={setCountryCode} />
      </div>
      <label className="fb-field">Gender (optional)<select value={gender} onChange={e => setGender(e.target.value as ProfileGender | "")}>
        <option value="">Gender (optional)</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
      </select></label>
      <TimezoneCombobox value={timezone} onChange={setTimezone} />
      <OnboardingUnits value={units} onChange={setUnits} />
    </>}
    {step === 1 && <>
      <AppParagraph>Sync your tracker to bring up to 90 days of workouts. You can also connect later.</AppParagraph>
      {!preview && <TrackerConnections />}
    </>}
    {step === 2 && <>
      <AppParagraph>Your chosen event registers for the next wave. You can register for more events in the app.</AppParagraph>
      {needsVolume && <label className="fb-field" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, fontSize: "var(--type-caption-size)" }}>Typical weekly {sport === "strength" ? "training" : sport === "walking" ? "steps" : "distance"} ({onboardingWeeklyVolumeUnit(sport, units)}) · {sportName}</span>
        <input style={{ width: 80 }} type="number" inputMode="decimal" min="0" max={1000} step="any" aria-label={`Typical weekly ${sport}`}
          value={weeklyVolume[sport] ?? "0"}
          onChange={e => setWeeklyVolume(current => ({ ...current, [sport]: onboardingWeeklyVolumeInput(e.target.value) }))} />
      </label>}
      <EventRegistration state={state} event={sport} registered={registered} ticketOnly busy={saving || (!preview && !canWrite)} error={saveError ?? ""} onBack={() => { setRegistered(false); setStep(1); }} onClaim={finish} onView={finish} />
    </>}
    {step < 2 && <div className="onboarding-actions">
      {step > 0 && <BackButton disabled={saving} onClick={() => setStep(step - 1)} />}
      <button className="fb-btn" type="button" onClick={advance}>
        Continue
      </button>
    </div>}
  </section>;
}
function Entry() {
  const preview = useSearchParams().get("preview") === "1";
  return preview ? <Setup preview /> : <AuthGate reason="Sign in to save your preferences and join your first field."><Setup preview={false} /></AuthGate>;
}
export default function OnboardingPage() {
  return <Suspense fallback={<AppParagraph>Loading setup…</AppParagraph>}><Entry /></Suspense>;
}
