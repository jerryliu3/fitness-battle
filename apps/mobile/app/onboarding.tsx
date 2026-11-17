import { OnboardingProgress } from "../src/ui/onboarding-progress";
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Modal, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import {
  detectDeviceTimeZone, nextDailyWaveWindowAt, waveTimeLabel, guestIntroForAccount, SPORTS, COUNTRY_OPTIONS,
  type ProfileGender, type SportId, type UnitSystem,
  parseOnboardingWeeklyVolumes, onboardingDeclaredVolume, onboardingWeeklyVolumeUnit, type OnboardingWeeklyVolumes,
} from "@fitness-battle/shared";
import { TrackerConnections } from "./athlete";
import { GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY, readGuestIntroDraft } from "../src/lib/guest-intro";
import { TimezonePicker } from "../src/ui/timezone-picker";
import { ChoicePicker } from "../src/ui/choice-picker";
import { IconButton } from "../src/ui/icon-button";
import { AppText } from "../src/ui/section";
import { OnboardingCanvas } from "../src/ui/onboarding-canvas";
import { MotionStep } from "../src/ui/motion-step";
import { FocusButton, FocusSegments, useFocusStyles } from "../src/ui/focus";
import { EventRegistration } from "../src/features/event-registration";
import { decodePhoto } from "../src/lib/profile-photo";
import { uploadNativeProfileAvatar } from "../src/lib/avatar-upload";
import { useReducedMotion } from "../src/ui/use-reduced-motion";
import { useAuth } from "../src/lib/auth";
import { useCompeteStore } from "../src/lib/compete-store";

const countries = COUNTRY_OPTIONS.map(country => ({ value: country.code, label: country.name }));
const titles = ["Almost there! Final details", "Bring your training along.", "Your starting line is here."];

export default function Onboarding() {
  const f = useFocusStyles();
  const reduced = useReducedMotion();
  const { state, canWrite, dispatch } = useCompeteStore();
  const { user, offlineMode } = useAuth();
  const router = useRouter();
  const preview = useLocalSearchParams<{ preview?: string }>().preview === "1";
  const key = `onboarding-draft:v7:${user?.id ?? "guest"}`;
  const [ready, setReady] = useState(false), [loadedKey, setLoadedKey] = useState("");
  const [step, setStep] = useState(0);
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
  const finished = useRef(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    if (!state) return;
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
      const initialSport = imported?.sport ?? state.primary;
      finished.current = false;
      const savedStep = Math.max(0, Math.min(3, Math.trunc(Number(saved?.step) || 0)));
      setStep(savedStep === 3 && !state.ratings.some(r => r.sport === initialSport && r.optedIn) ? 2 : savedStep);
      setName(typeof saved?.name === "string" ? saved.name : imported ? imported.name : user?.displayName ?? state?.name ?? "");
      setCity(typeof saved?.city === "string" ? saved.city : imported ? imported.city : state?.city ?? "");
      setGender(saved?.gender === "male" || saved?.gender === "female" || saved?.gender === "other" ? saved.gender : state?.gender ?? "");
      setCountryCode(typeof saved?.countryCode === "string" ? saved.countryCode : imported ? imported.countryCode : state?.countryCode ?? "");
      setUnits(saved?.units === "us" || saved?.units === "metric" ? saved.units : state?.units ?? "us");
      setSport(initialSport);
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
    void AsyncStorage.setItem(key, JSON.stringify({ step, name, city, gender, countryCode, units, timezone, weeklyVolume })).catch(() => {});
  }, [ready, loadedKey, preview, key, step, name, city, gender, countryCode, units, timezone, weeklyVolume]);

  if (!preview && state?.onboardingCompleted) return <Redirect href="/today" />;
  if (!state || !ready) return <AppText>Loading setup…</AppText>;
  const sportName = SPORTS.find(item => item.id === sport)!.name;
  function advance() { setStep(Math.min(2, step + 1)); }
  function back() { setStep(Math.max(0, step - 1)); }

  async function finish() {
    if (preview) { setStep(3); return; }
    if (!user || !state || !canWrite || finished.current) return;
    finished.current = true;
    setSaving(true); setSaveError(null);
    try {
      const guest = guestIntroForAccount(await readGuestIntroDraft(), await AsyncStorage.getItem(GUEST_SIGNUP_PENDING_KEY), user.email);
      if (guest?.photo) {
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
    const declaredWeeklyVolume = onboardingDeclaredVolume(sport, weeklyVolume[sport], units);
    if (declaredWeeklyVolume !== undefined) dispatch({ type: "declare-effort", sport, declaredWeeklyVolume });
    dispatch({ type: "opt-in", sport, accountId: user.id });
    dispatch({ type: "set-primary", sport });
    setStep(3);
  }
  function complete() {
    if (preview) { router.replace("/arena"); return; }
    dispatch({ type: "complete-onboarding" });
    void AsyncStorage.removeItem(key).catch(() => {});
    if (guestImported) void AsyncStorage.multiRemove([GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY]).catch(() => {});
    router.replace("/today");
  }

  return <Modal visible presentationStyle="fullScreen" animationType={reduced ? "none" : "fade"}>
    <SafeAreaProvider><SafeAreaView style={f.safe} edges={["top", "bottom"]}>
        <OnboardingProgress index={step} count={4} />
        <OnboardingCanvas>
        <View style={{ padding: 16 }}><MotionStep identity={`${step}`}>
          {step < 3 && <AppText role="display" accessibilityRole="header">{titles[step]}</AppText>}
          {step === 0 && <>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, gap: 8 }}><AppText role="label">City (optional)</AppText>
                <TextInput accessibilityLabel="City" style={f.input} value={city} onChangeText={setCity} maxLength={80} />
              </View>
              <View style={{ flex: 1, gap: 8 }}><AppText role="label">Country (optional)</AppText>
                <ChoicePicker label="Country (optional)" placeholder="Country" value={countryCode} onChange={setCountryCode} options={countries} />
              </View>
            </View>
            <ChoicePicker label="Gender (optional)" value={gender} placeholder="Gender (optional)"
              options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other" }]}
              onChange={value => setGender(value as ProfileGender)} />
            <TimezonePicker label="Time zone" value={timezone} onChange={setTimezone} />
            <AppText role="label">Units</AppText>
            <FocusSegments label="Units" options={[{ value: "us", label: "Imperial" }, { value: "metric", label: "Metric" }]} value={units} onChange={setUnits} />
          </>}
          {step === 1 && <>
            <AppText secondary>Connect your tracker to bring your training along. You can also connect later.</AppText>
            {!preview && <TrackerConnections />}
          </>}
          {step === 2 && <>
            <AppText secondary>Your {sportName.toLowerCase()} event registers for the next wave. You can register for more events in the app.</AppText>
            <AppText role="label">Typical weekly {sportName.toLowerCase()} ({onboardingWeeklyVolumeUnit(sport, units)})</AppText>
            <TextInput style={f.input} keyboardType="decimal-pad" accessibilityLabel={`Typical weekly ${sport}`}
              placeholder="Optional · 0 if just starting" value={weeklyVolume[sport] ?? ""}
              onChangeText={value => setWeeklyVolume(current => ({ ...current, [sport]: value }))} />
            <AppText role="label">Next wave starts at {waveTimeLabel(nextDailyWaveWindowAt(new Date(now)).waveStart, timezone)}.</AppText>
          </>}
          {step === 3 && <>
            <AppText secondary>You’re registered for {sportName.toLowerCase()}. You can register for more events in the app.</AppText>
            <EventRegistration state={state} event={sport} registered confirmationOnly onClaim={() => {}} onView={complete} />
          </>}
          {saveError && <AppText accessibilityRole="alert">{saveError}</AppText>}
          {step < 3 && <View style={{ flexDirection: "row", gap: 12 }}>
            {step > 0 && <IconButton icon="back" label="Back" disabled={saving} onPress={back} />}
            <View style={{ flex: 1 }}><FocusButton
              label={saving ? "Saving…" : "Continue"}
              disabled={saving || (step === 2 && !preview && !canWrite)}
              onPress={() => step < 2 ? advance() : finish()} /></View>
          </View>}
        </MotionStep></View>
        </OnboardingCanvas>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
