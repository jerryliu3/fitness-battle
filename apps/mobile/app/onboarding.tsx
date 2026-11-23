import { TextField } from "../src/ui/text-field";
import { OnboardingProgress } from "../src/ui/onboarding-progress";
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Modal, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ONBOARDING_SETUP_TITLES as titles, detectDeviceTimeZone, guestIntroForAccount, SPORTS, hasOnboardingTrainingHistory,
  type ProfileGender, type SportId, type UnitSystem,
  onboardingWeeklyVolumeInput, parseOnboardingWeeklyVolumes, onboardingDeclaredVolume, onboardingWeeklyVolumeUnit, type OnboardingWeeklyVolumes,
} from "@fitness-battle/shared";
import { TrackerConnections } from "./athlete";
import { GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY, readGuestIntroDraft } from "../src/lib/guest-intro";
import { TimezonePicker } from "../src/ui/timezone-picker";
import { CountryPicker } from "../src/ui/country-picker";
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

export default function Onboarding() {
  const f = useFocusStyles();
  const reduced = useReducedMotion();
  const { state, canWrite, dispatch, loadStatus } = useCompeteStore();
  const { user, offlineMode } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string; sport?: string; invite?: string }>();
  const preview = params.preview === "1";
  const previewSport = preview ? SPORTS.find(item => item.id === params.sport)?.id : undefined;
  const key = `onboarding-draft:v7:${user?.id ?? "guest"}`;
  const [ready, setReady] = useState(false), [loadedKey, setLoadedKey] = useState("");
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
  const finished = useRef(false);

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
      const initialSport = previewSport ?? imported?.sport ?? state.primary;
      finished.current = false;
      const savedStep = Math.max(0, Math.min(2, Math.trunc(Number(saved?.step) || 0)));
      setStep(savedStep);
      setRegistered(false);
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
  }, [key, preview, previewSport, user?.email, Boolean(state)]);

  useEffect(() => {
    if (!ready || loadedKey !== key || preview) return;
    void AsyncStorage.setItem(key, JSON.stringify({ step, name, city, gender, countryCode, units, timezone, weeklyVolume })).catch(() => {});
  }, [ready, loadedKey, preview, key, step, name, city, gender, countryCode, units, timezone, weeklyVolume]);

  useEffect(() => {
    if (step !== 2 || registered || !state || !ready || loadedKey !== key || (!preview && (!user || !canWrite))) return;
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
  }, [step, registered, state, ready, loadedKey, key, preview, user, canWrite, sport, name, city, gender, countryCode, units, timezone, dispatch]);

  const invite = params.invite;
  const completionRoute = invite ? { pathname: "/field" as const, params: { invite } } : "/today";
  if (!preview && state?.onboardingCompleted) return <Redirect href={completionRoute} />;
  if (!state || !ready) return <AppText>Loading setup…</AppText>;
  const sportName = SPORTS.find(item => item.id === sport)!.name;
  const accountReady = loadStatus !== "loading";
  const hasHistory = hasOnboardingTrainingHistory(state, sport);
  const needsVolume = accountReady && !hasHistory;
  function advance() { setStep(Math.min(2, step + 1)); }
  function back() { setRegistered(false); setStep(Math.max(0, step - 1)); }

  async function finish() {
    if (preview) { router.replace("/today"); return; }
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
    const declaredWeeklyVolume = onboardingDeclaredVolume(sport, weeklyVolume[sport] ?? "0", units);
    if (!hasHistory && declaredWeeklyVolume !== undefined) dispatch({ type: "declare-effort", sport, declaredWeeklyVolume });
    dispatch({ type: "complete-onboarding" });
    void AsyncStorage.removeItem(key).catch(() => {});
    if (guestImported) void AsyncStorage.multiRemove([GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY]).catch(() => {});
    router.replace(completionRoute);
  }

  return <Modal visible presentationStyle="fullScreen" animationType={reduced ? "none" : "fade"}>
    <SafeAreaProvider><SafeAreaView style={f.safe} edges={["top", "bottom"]}>
        <OnboardingProgress index={step} count={titles.length} />
        <OnboardingCanvas>
        <View style={{ padding: 16 }}><MotionStep identity={`${step}`}>
          <AppText role="display" accessibilityRole="header">{titles[step]}</AppText>
          {step === 0 && <>
            <View style={{ gap: 6 }}>
              <AppText role="label">Country</AppText>
              <CountryPicker value={countryCode} onChange={setCountryCode} />
            </View>
            <TextField label="City (optional)" accessibilityLabel="City" value={city} onChangeText={setCity} maxLength={80} />
            <View style={{ gap: 6 }}>
              <AppText role="label">Gender (optional)</AppText>
              <ChoicePicker label="Gender (optional)" value={gender} placeholder="Not specified"
                options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other" }]}
                onChange={value => setGender(value as ProfileGender)} />
            </View>
            <AppText role="label">Units</AppText>
            <FocusSegments label="Units" options={[{ value: "us", label: "Imperial" }, { value: "metric", label: "Metric" }]} value={units} onChange={setUnits} />
          </>}
          {step === 1 && <>
            <AppText secondary>Sync your tracker to bring up to 90 days of workouts. You can also connect later.</AppText>
            <TrackerConnections preview={preview} />
          </>}
          {step === 2 && <>
            <AppText secondary>Your chosen event registers for the next wave. You can register for more events in the app.</AppText>
            {needsVolume && <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <AppText role="caption" style={{ flex: 1 }}>Typical weekly {sport === "strength" ? "training" : sport === "walking" ? "steps" : "distance"} ({onboardingWeeklyVolumeUnit(sport, units)}) · {sportName}</AppText>
              <TextInput style={[f.input, { width: 80, textAlign: "center" }]} keyboardType="decimal-pad" accessibilityLabel={`Typical weekly ${sport}`}
                value={weeklyVolume[sport] ?? "0"}
                onChangeText={value => setWeeklyVolume(current => ({ ...current, [sport]: onboardingWeeklyVolumeInput(value) }))} />
            </View>}
            <EventRegistration state={state} event={sport} registered={registered} ticketOnly busy={saving || (!preview && !canWrite)} error={saveError ?? undefined} onBack={back} onClaim={finish} onView={finish} />
          </>}
          {step < 2 && <View style={{ flexDirection: "row", gap: 12 }}>
            {step > 0 && <IconButton icon="back" label="Back" disabled={saving} onPress={back} />}
            <View style={{ flex: 1 }}><FocusButton
              label="Continue" disabled={step === 0 && !countryCode} onPress={advance} /></View>
          </View>}
        </MotionStep></View>
        </OnboardingCanvas>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
