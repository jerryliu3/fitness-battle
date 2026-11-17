import { OnboardingProgress } from "../src/ui/onboarding-progress";
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Modal, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import {
  detectDeviceTimeZone, nextDailyWaveWindowAt, waveTimeLabel, guestIntroForAccount, SPORTS,
  type ProfileGender, type SportId, type UnitSystem,
  parseOnboardingWeeklyVolumes, onboardingDeclaredVolume, onboardingWeeklyVolumeUnit, type OnboardingWeeklyVolumes,
} from "@fitness-battle/shared";
import { TrackerConnections } from "./athlete";
import { GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY, readGuestIntroDraft } from "../src/lib/guest-intro";
import { TimezonePicker } from "../src/ui/timezone-picker";
import { SearchableCountryPicker } from "../src/ui/searchable-country-picker";
import { ChoicePicker } from "../src/ui/choice-picker";
import { Chip } from "../src/ui/chip";
import { IconButton } from "../src/ui/icon-button";
import { AppText } from "../src/ui/section";
import { OnboardingCanvas } from "../src/ui/onboarding-canvas";
import { MotionStep } from "../src/ui/motion-step";
import { FocusButton, FocusSegments, useFocusStyles } from "../src/ui/focus";
import { OnboardingSummary } from "../src/features/onboarding-visuals";
import { decodePhoto } from "../src/lib/profile-photo";
import { uploadNativeProfileAvatar } from "../src/lib/avatar-upload";
import { useReducedMotion } from "../src/ui/use-reduced-motion";
import { useAuth } from "../src/lib/auth";
import { useCompeteStore } from "../src/lib/compete-store";

const titles = ["Bring your training along.", "A few more things about you.", "Your starting line is here."];

export default function Onboarding() {
  const f = useFocusStyles();
  const reduced = useReducedMotion();
  const { state, canWrite, dispatch } = useCompeteStore();
  const { user, offlineMode } = useAuth();
  const router = useRouter();
  const preview = useLocalSearchParams<{ preview?: string }>().preview === "1";
  const key = `onboarding-draft:v6:${user?.id ?? "guest"}`;
  const [ready, setReady] = useState(false), [loadedKey, setLoadedKey] = useState("");
  const [step, setStep] = useState(0);
  const [profilePage, setProfilePage] = useState(0);
  const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState<string | null>(null);
  const owner = useRef(user?.id);
  owner.current = user?.id;
  useEffect(() => () => { owner.current = undefined; }, []);
  const [name, setName] = useState(""), [city, setCity] = useState("");
  const [gender, setGender] = useState<ProfileGender | "">("");
  const [countryCode, setCountryCode] = useState("");
  const [sports, setSports] = useState<SportId[]>([]);
  const [weeklyVolume, setWeeklyVolume] = useState<OnboardingWeeklyVolumes>({});
  const [units, setUnits] = useState<UnitSystem>("us"), [sleep, setSleep] = useState(false);
  const [timezone, setTimezone] = useState(() => detectDeviceTimeZone());
  const [guestImported, setGuestImported] = useState(false);
  const [selectionError, setSelectionError] = useState(false);
  const finished = useRef(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    let alive = true;
    setReady(false);
    void (async () => {
      const [raw, pending, guest] = await Promise.all([
        AsyncStorage.getItem(key),
        AsyncStorage.getItem(GUEST_SIGNUP_PENDING_KEY),
        readGuestIntroDraft(),
      ]);
      if (!alive) return;
      let saved: Record<string, unknown> | null = null;
      try { saved = !preview && raw ? JSON.parse(raw) : null; } catch { /* Ignore corrupt drafts. */ }
      const imported = preview ? null : guestIntroForAccount(guest, pending, user?.email);
      const useGuest = Boolean(imported);
      const initialSports = imported ? [imported.sport] : state?.ratings.filter(r => r.optedIn).map(r => r.sport) ?? [];
      const selectedSports = Array.isArray(saved?.sports) ? saved.sports.filter((s: unknown): s is SportId => SPORTS.some(sport => sport.id === s)) : initialSports;
      setStep(Math.max(0, Math.min(2, Math.trunc(Number(saved?.step) || 0))));
      setProfilePage(Math.max(0, Math.min(2, Math.trunc(Number(saved?.profilePage) || 0))));
      setName(typeof saved?.name === "string" ? saved.name : imported ? imported.name : user?.displayName ?? state?.name ?? "");
      setCity(typeof saved?.city === "string" ? saved.city : imported ? imported.city : state?.city ?? "");
      setGender(saved?.gender === "male" || saved?.gender === "female" || saved?.gender === "other" ? saved.gender : state?.gender ?? "");
      setCountryCode(typeof saved?.countryCode === "string" ? saved.countryCode : imported ? imported.countryCode : state?.countryCode ?? "");
      setUnits(saved?.units === "us" || saved?.units === "metric" ? saved.units : state?.units ?? "us");
      setSports(selectedSports);
      setSleep(typeof saved?.sleep === "boolean" ? saved.sleep : Boolean(state?.healthRatings.some(r => r.metric === "sleep" && r.optedIn)));
      setWeeklyVolume(parseOnboardingWeeklyVolumes(saved?.weeklyVolume));
      setTimezone(typeof saved?.timezone === "string" ? saved.timezone : detectDeviceTimeZone());
      setGuestImported(useGuest);
      setLoadedKey(key);
      setReady(true);
    })().catch(() => {
      if (alive) {
        setName(user?.displayName ?? state?.name ?? "Athlete");
        setLoadedKey(key);
        setReady(true);
      }
    });
    return () => { alive = false; };
  }, [key, preview, user?.email, Boolean(state)]);

  useEffect(() => {
    if (!ready || loadedKey !== key || preview) return;
    void AsyncStorage.setItem(key, JSON.stringify({ step, profilePage, name, city, gender, countryCode, sports, units, sleep, timezone, weeklyVolume })).catch(() => {});
  }, [ready, loadedKey, preview, key, step, profilePage, name, city, gender, countryCode, sports, units, sleep, timezone, weeklyVolume]);

  if (!preview && state?.onboardingCompleted) return <Redirect href="/today" />;
  if (!state || !ready) return <AppText>Loading setup…</AppText>;
  const selectionReady = sports.length > 0 || sleep;
  const identityReady = name.trim().length > 0;

  function advance() {
    if (step === 1 && !preview && ((!identityReady && profilePage === 0) || (!selectionReady && profilePage === 1))) {
      setSelectionError(true); return;
    }
    setSelectionError(false);
    if (step === 1 && profilePage < 2 && (profilePage === 0 || sports.length > 0)) { setProfilePage(profilePage + 1); return; }
    setStep(Math.min(2, step + 1));
  }
  function back() {
    setSelectionError(false);
    if (step === 1 && profilePage > 0) setProfilePage(profilePage - 1);
    else if (step === 2) { setStep(1); setProfilePage(sports.length ? 2 : 1); }
    else setStep(Math.max(0, step - 1));
  }

  async function finish() {
    if (preview) { router.replace("/arena"); return; }
    if (!user || !state || !canWrite || finished.current || !identityReady || !selectionReady) return;
    finished.current = true;
    setSaving(true); setSaveError(null);
    try {
      const guest = guestIntroForAccount(await readGuestIntroDraft(), await AsyncStorage.getItem(GUEST_SIGNUP_PENDING_KEY), user.email);
      if (guest?.photo && !state.avatarUrl) {
        const avatarUrl = offlineMode ? guest.photo : await uploadNativeProfileAvatar(decodePhoto(guest.photo.split(",")[1]!), user.id);
        if (owner.current !== user.id) return;
        dispatch({ type: "set-avatar", avatarUrl, accountId: user.id });
      }
    } catch (err) {
      finished.current = false;
      setSaveError(err instanceof Error ? err.message : "Could not save your photo. Please try again.");
      return;
    } finally { setSaving(false); }
    if (owner.current !== user.id) return;
    dispatch({ type: "rename", name: name.trim() });
    dispatch({ type: "set-city", city: city.trim() });
    if (gender) dispatch({ type: "set-gender", gender });
    if (countryCode.length === 2) dispatch({ type: "set-country", countryCode });
    dispatch({ type: "set-units", units });
    dispatch({ type: "set-timezone", timezone });
    for (const sport of sports) {
      const declaredWeeklyVolume = onboardingDeclaredVolume(sport, weeklyVolume[sport], units);
      if (declaredWeeklyVolume !== undefined) dispatch({ type: "declare-effort", sport, declaredWeeklyVolume });
      dispatch({ type: "opt-in", sport, accountId: user.id });
    }
    if (sports[0]) dispatch({ type: "set-primary", sport: sports[0] });
    if (sleep) dispatch({ type: "opt-in-health", metric: "sleep" });
    dispatch({ type: "complete-onboarding" });
    void AsyncStorage.removeItem(key).catch(() => {});
    if (guestImported) void AsyncStorage.multiRemove([GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY]).catch(() => {});
    router.replace("/today");
  }

  return <Modal visible presentationStyle="fullScreen" animationType={reduced ? "none" : "fade"}>
    <SafeAreaProvider><SafeAreaView style={f.safe} edges={["top", "bottom"]}>
        <OnboardingProgress index={step === 0 ? 0 : step === 1 ? profilePage + 1 : 4} count={5} />
        <OnboardingCanvas>
        <View style={{ padding: 16 }}><MotionStep identity={`${step}:${profilePage}`}>
          <AppText role="display" accessibilityRole="header">{titles[step]}</AppText>
          {step === 0 && <>
            <AppText secondary>Connect your tracker to bring your training along. You can also connect later.</AppText>
            {!preview && <TrackerConnections />}
          </>}
          {step === 1 && <>
            {profilePage === 0 && <>
            <TextInput accessibilityLabel="Athlete name" placeholder="Athlete name" style={f.input} value={name} onChangeText={setName} maxLength={80} />
            <AppText role="label">City (optional)</AppText>
            <TextInput accessibilityLabel="City" style={f.input} value={city} onChangeText={setCity} maxLength={80} />
            <SearchableCountryPicker label="Country (optional)" value={countryCode} onChange={setCountryCode} allowClear />
            <ChoicePicker label="Gender (optional)" value={gender} placeholder="Prefer not to say"
              options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other" }]}
              onChange={value => setGender(value as ProfileGender)} />
            <TimezonePicker label="Time zone" value={timezone} onChange={setTimezone} />
            </>}
            {profilePage === 1 && <>
            <AppText role="heading">Sports to compete in</AppText>
            <AppText secondary>Choose which events to enter when you finish setup. Your selected sports will register for the next competition wave.</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SPORTS.map(s => <Chip key={s.id} label={s.name} selected={sports.includes(s.id)}
                onPress={() => setSports(current => current.includes(s.id) ? current.filter(id => id !== s.id) : [...current, s.id])} />)}
            </View>
            {sports.length > 1 && <ChoicePicker label="Primary sport" value={sports[0]!}
              options={sports.map(id => ({ value: id, label: SPORTS.find(s => s.id === id)!.name }))}
              onChange={id => setSports([id as SportId, ...sports.filter(s => s !== id)])} />}
            {SPORTS.some(s => s.gps && sports.includes(s.id)) && <View style={{ gap: 8 }}>
              <AppText role="label">Distance units</AppText>
              <View style={{ width: 210 }}><FocusSegments label="Distance units"
                options={[{ value: "us", label: "Miles" }, { value: "metric", label: "Kilometres" }]}
                value={units} onChange={setUnits} /></View>
            </View>}
            <Chip label="Sleep tracking" selected={sleep} onPress={() => setSleep(!sleep)} />
            </>}
            {profilePage === 2 && <>
            {sports.map(sport => <View key={sport} style={{ gap: 8 }}>
              <AppText role="label">Typical weekly {SPORTS.find(s => s.id === sport)!.name.toLowerCase()} ({onboardingWeeklyVolumeUnit(sport, units)})</AppText>
              <TextInput style={f.input} keyboardType="decimal-pad" accessibilityLabel={`Typical weekly ${sport}`}
                placeholder="Optional · 0 if just starting" value={weeklyVolume[sport] ?? ""}
                onChangeText={value => setWeeklyVolume(current => ({ ...current, [sport]: value }))} />
            </View>)}
            </>}
          {selectionError && !identityReady && <AppText accessibilityRole="alert">Enter your name to continue.</AppText>}
          {selectionError && !selectionReady && <AppText accessibilityRole="alert">Choose at least one sport or sleep tracking to continue.</AppText>}
          </>}
          {step === 2 && <>
            <OnboardingSummary compact sports={sports} units={units} sleep={sleep} />
            <AppText secondary>Your chosen events register for the next wave. You can change your preferences later.</AppText>
            <AppText role="label">Next wave starts at {waveTimeLabel(nextDailyWaveWindowAt(new Date(now)).waveStart, timezone)}.</AppText>
          </>}
          {saveError && <AppText accessibilityRole="alert">{saveError}</AppText>}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {step > 0 && <IconButton icon="back" label="Back" disabled={saving} onPress={back} />}
            <View style={{ flex: 1 }}><FocusButton
              label={saving ? "Saving…" : step === 2 ? "Enter events" : step === 0 && !state.links.some(link => link.status === "connected") ? "Skip for now" : "Continue"}
              disabled={saving || (step === 2 && !preview && !canWrite)}
              onPress={() => step < 2 ? advance() : finish()} /></View>
          </View>
        </MotionStep></View>
        </OnboardingCanvas>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
