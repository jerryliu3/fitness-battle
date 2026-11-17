import { OnboardingFeatureTour } from "../src/features/onboarding-feature-tour";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EMPTY_GUEST_INTRO, ONBOARDING_STEPS, ONBOARDING_TITLES, ONBOARDING_OVERTAKE_COPY, ONBOARDING_CARD_LABELS, isGuestPhoto, type OnboardingFeatureId,
  onboardingAthleteCard, guestIntroForAccount, SPORTS, type OnboardingStep,
} from "@fitness-battle/shared";
import { OnboardingAthlete } from "../src/features/onboarding-athlete";
import * as ImagePicker from "expo-image-picker";
import { OnboardingOvertake } from "../src/features/onboarding-overtake";
import { LegalLinks } from "../src/features/legal-links";
import { SportIcon } from "../src/ui/sport-icon";
import { IconButton } from "../src/ui/icon-button";
import { GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY, readGuestIntroDraft, type GuestIntroDraft } from "../src/lib/guest-intro";
import { useAuth } from "../src/lib/auth";
import { useCompeteStore } from "../src/lib/compete-store";
import { useThemeColors } from "../src/theme";
import { FocusButton, useFocusStyles } from "../src/ui/focus";
import { AppText } from "../src/ui/section";

export default function Welcome() {
  const { user, loading, signUp } = useAuth();
  const { state } = useCompeteStore();
  const router = useRouter();
  const colors = useThemeColors(), f = useFocusStyles();
  const [ready, setReady] = useState(false), [step, setStep] = useState<OnboardingStep>("sport");
  const [draft, setDraft] = useState<GuestIntroDraft>(EMPTY_GUEST_INTRO);
  const [feature, setFeature] = useState<OnboardingFeatureId>("growth");
  const [departing, setDeparting] = useState(false);
  const enterOvertake = useCallback(() => { setDeparting(false); setStep("overtake"); }, []);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cardDraft, setCardDraft] = useState<GuestIntroDraft>(EMPTY_GUEST_INTRO);
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false), [cardHeld, setCardHeld] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const steps: readonly OnboardingStep[] = user ? ONBOARDING_STEPS.filter(s => s !== "account") : ONBOARDING_STEPS;
  const card = useMemo(() => onboardingAthleteCard(cardDraft), [cardDraft]);
  useEffect(() => {
    if (cardHeld) return;
    const timer = setTimeout(() => setCardDraft(draft), 120);
    return () => clearTimeout(timer);
  }, [draft, cardHeld]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);
  useEffect(() => {
    if (!ready || loading || state?.onboardingCompleted) return;
    const timer = setTimeout(() => { void AsyncStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify(draft)).catch(() => {}); }, 600);
    return () => clearTimeout(timer);
  }, [ready, loading, draft, state?.onboardingCompleted]);
  useEffect(() => {
    if (loading || (user && !state)) return;
    let alive = true;
    void Promise.all([readGuestIntroDraft(), AsyncStorage.getItem(GUEST_SIGNUP_PENDING_KEY)]).then(([saved, pending]) => {
      if (!alive) return;
      const initial = user && state ? guestIntroForAccount(saved, pending, user.email) ?? {
        sport: state.primary, name: user.displayName || state.name, city: state.city || "", countryCode: state.countryCode || "",
      } : saved ?? EMPTY_GUEST_INTRO;
      setDraft(initial); setCardDraft(initial); setReady(true);
    }).catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [loading, user?.id, Boolean(state)]);
  if (user && state?.onboardingCompleted) return <Redirect href="/today" />;
  if (loading || !ready) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  const index = steps.indexOf(step);
  async function saveCompletedIntro(pendingEmail: string) {
    const completed = { ...draft, introCompleted: true };
    setDraft(completed);
    await AsyncStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify(completed));
    await AsyncStorage.setItem(GUEST_SIGNUP_PENDING_KEY, pendingEmail.trim().toLowerCase());
  }
  async function next() {
    setError(null);
    setCardDraft(draft);
    if (step === "athlete") { setDeparting(true); return; }
    if (step === "growth") {
      if (user) {
        try { await saveCompletedIntro(user.email); router.replace("/onboarding"); }
        catch { setError("Could not save setup on this device. Please try again."); }
        return;
      }
    }
    setStep(steps[index + 1]!);
  }
  async function createAccount() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await saveCompletedIntro(email);
      const result = await signUp({ email: email.trim().toLowerCase(), password, displayName: draft.name.trim() });
      if (result.error) { await AsyncStorage.removeItem(GUEST_SIGNUP_PENDING_KEY); setError(result.error); return; }
      setPassword("");
      if (result.needsEmailConfirm) { setConfirmation(true); return; }
      router.replace("/onboarding");
    } catch (err) {
      void AsyncStorage.removeItem(GUEST_SIGNUP_PENDING_KEY).catch(() => {});
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally { setBusy(false); }
  }
  async function choosePhoto() {
    setPhotoBusy(true); setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: .5, base64: true });
      if (result.canceled) return;
      const photo = `data:image/jpeg;base64,${result.assets[0]?.base64 ?? ""}`;
      if (!isGuestPhoto(photo)) throw new Error("Choose a smaller photo.");
      setDraft(d => ({ ...d, photo })); setCardDraft(d => ({ ...d, photo }));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not read that photo."); }
    finally { setPhotoBusy(false); }
  }
  async function signIn() {
    await AsyncStorage.removeItem(GUEST_SIGNUP_PENDING_KEY).catch(() => {});
    router.push({ pathname: "/athlete", params: { auth: "signin", from: "onboarding" } });
  }
  const back = index > 0 ? <IconButton icon="back" label="Back" disabled={busy || photoBusy || departing} onPress={() => setStep(steps[index - 1]!)} /> : null;
  const actions = (label: string, onPress: () => void, disabled = false) => <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
    {back}<View style={{ flex: 1 }}><FocusButton label={label} disabled={disabled} onPress={onPress} /></View>
  </View>;
  const header = <>
    <AppText role="caption" secondary>OVERTAEK</AppText>
    <View style={{ flexDirection: "row", gap: 5 }} accessibilityLabel={`Step ${index + 1} of ${steps.length}`}>
      {steps.map((s, i) => <View key={s} style={{ flex: 1, height: 5, borderRadius: 8, backgroundColor: i <= index ? colors.tennis : colors.line }} />)}
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1 }}><AppText role={step === "overtake" || step === "growth" ? "heading" : "display"} accessibilityRole="header">{ONBOARDING_TITLES[step]}</AppText></View>
      {(step === "overtake" || step === "growth") && <OnboardingAthlete compact model={card} label={step === "overtake" ? "Practice pass" : ONBOARDING_CARD_LABELS[feature]} onInteractionChange={setCardHeld} />}
    </View>
  </>;
  if (step === "overtake") return <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
    <View style={{ padding: 20, gap: 12 }}>{header}<AppText secondary>{ONBOARDING_OVERTAKE_COPY}</AppText></View>
    <OnboardingOvertake fill sport={draft.sport} name={draft.name} photo={draft.photo} onBack={() => setStep("athlete")} onComplete={() => void next()} />
  </SafeAreaView>;
  return <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
    <ScrollView ref={scroll} scrollEnabled={!cardHeld} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
      contentContainerStyle={[f.content, { maxWidth: 520, width: "100%", alignSelf: "center", paddingBottom: 32 }]}>
      {header}
      {step === "sport" && <>
        <AppText secondary>Choose your sport. You can add more later.</AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {SPORTS.map(sport => <Pressable key={sport.id} accessibilityRole="button" accessibilityLabel={sport.name}
            accessibilityState={{ selected: draft.sport === sport.id }} onPress={() => setDraft(d => ({ ...d, sport: sport.id }))}
            style={{ flexBasis: "46%", flexGrow: 1, minHeight: 142, alignItems: "center", justifyContent: "center", gap: 12,
              borderRadius: 20, borderWidth: draft.sport === sport.id ? 2 : 1, borderColor: draft.sport === sport.id ? colors.ink : colors.line,
              backgroundColor: draft.sport === sport.id ? colors.actionSoft : colors.card }}>
            <SportIcon sport={sport.id} size={40} /><AppText role="label">{sport.name}</AppText>
          </Pressable>)}
        </View>
      </>}
      {step === "growth" && <OnboardingFeatureTour draft={draft} selected={feature} onSelect={setFeature} />}
      {step === "athlete" && <AppText secondary>Give your athlete a name and a face.</AppText>}
      {step === "account" && <AppText secondary>Save your athlete and start competing for real.</AppText>}
      {(step === "athlete" || step === "account") && <OnboardingAthlete model={card} onInteractionChange={setCardHeld} departing={departing} onDeparted={enterOvertake} />}
      {step === "athlete" && <>
        <AppText role="label">Name</AppText>
        <TextInput accessibilityLabel="Name" value={draft.name} maxLength={80} placeholder="Your name" style={f.input}
          onChangeText={name => setDraft(d => ({ ...d, name }))} onEndEditing={() => setCardDraft(draft)} />
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}><View style={{ flex: 1 }}><FocusButton secondary label={photoBusy ? "Reading photo…" : draft.photo ? "Change photo" : "Add photo (optional)"} disabled={photoBusy} onPress={() => void choosePhoto()} /></View>
        {draft.photo && <Pressable accessibilityRole="button" onPress={() => { setDraft(d => ({ ...d, photo: undefined })); setCardDraft(d => ({ ...d, photo: undefined })); }} style={{ minHeight: 44, justifyContent: "center" }}><AppText>Remove photo</AppText></Pressable>}
        </View>
      </>}
      {step === "account" && <>
        <AppText role="label">Email</AppText>
        <TextInput accessibilityLabel="Email" style={f.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!confirmation} />
        <AppText role="label">Password</AppText>
        <TextInput accessibilityLabel="Password" style={f.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" editable={!confirmation} />
        {confirmation && <AppText accessibilityRole="alert">Check your email to confirm your account and continue setup.</AppText>}
      </>}
      {error && <AppText accessibilityRole="alert">{error}</AppText>}
      {step === "account" ? <>
        {actions(busy ? "Creating…" : "Create account", () => void createAccount(), busy || confirmation || !email.trim() || password.length < 6)}
        <LegalLinks />
      </> : actions(step === "athlete" ? "See yourself compete" : step === "growth" ? "Make it official" : "Continue", () => void next(), photoBusy || departing || (step === "athlete" && !draft.name.trim()))}
      {step === "sport" && !user && <FocusButton secondary label="I already have an account" onPress={() => void signIn()} />}
    </ScrollView>
  </SafeAreaView>;
}
