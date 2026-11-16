import { OnboardingFeatureTour } from "../src/features/onboarding-feature-tour";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EMPTY_GUEST_INTRO, ONBOARDING_STEPS, ONBOARDING_TITLES, ONBOARDING_OVERTAKE_COPY,
  onboardingAthleteCard, guestIntroForAccount, SPORTS, type OnboardingStep,
} from "@fitness-battle/shared";
import { AthleteCrest } from "../src/features/athlete-crest";
import { OnboardingOvertake } from "../src/features/onboarding-overtake";
import { OnboardingPotential } from "../src/features/onboarding-potential";
import { LegalLinks } from "../src/features/legal-links";
import { SearchableCountryPicker } from "../src/ui/searchable-country-picker";
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
  const [cardDraft, setCardDraft] = useState<GuestIntroDraft>(EMPTY_GUEST_INTRO);
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false), [cardHeld, setCardHeld] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const steps: readonly OnboardingStep[] = user ? ONBOARDING_STEPS.filter(s => s !== "account") : ONBOARDING_STEPS;
  const card = useMemo(() => onboardingAthleteCard(cardDraft), [cardDraft]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);
  useEffect(() => {
    if (ready && !loading && !state?.onboardingCompleted) void AsyncStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
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
    if (step === "athlete") {
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
  async function signIn() {
    await AsyncStorage.removeItem(GUEST_SIGNUP_PENDING_KEY).catch(() => {});
    router.push({ pathname: "/athlete", params: { auth: "signin", from: "onboarding" } });
  }
  const back = index > 0 ? <IconButton icon="back" label="Back" disabled={busy} onPress={() => setStep(steps[index - 1]!)} /> : null;
  const actions = (label: string, onPress: () => void, disabled = false) => <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
    {back}<View style={{ flex: 1 }}><FocusButton label={label} disabled={disabled} onPress={onPress} /></View>
  </View>;
  const header = <>
    <AppText role="caption" secondary>OVERTAEK</AppText>
    <View style={{ flexDirection: "row", gap: 5 }} accessibilityLabel={`Step ${index + 1} of ${steps.length}`}>
      {steps.map((s, i) => <View key={s} style={{ flex: 1, height: 5, borderRadius: 8, backgroundColor: i <= index ? colors.tennis : colors.line }} />)}
    </View>
    <AppText role="display" accessibilityRole="header">{ONBOARDING_TITLES[step]}</AppText>
  </>;
  if (step === "overtake") return <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
    <View style={{ padding: 20, gap: 12 }}>{header}<AppText secondary>{ONBOARDING_OVERTAKE_COPY}</AppText></View>
    <OnboardingOvertake fill sport={draft.sport} name={draft.name} onBack={() => setStep("sport")} onComplete={() => void next()} />
  </SafeAreaView>;
  return <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
    <ScrollView ref={scroll} scrollEnabled={!cardHeld} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
      contentContainerStyle={[f.content, { maxWidth: 520, width: "100%", alignSelf: "center", paddingBottom: 32 }]}>
      {header}
      {step === "sport" && <>
        <AppText secondary>Choose a sport to try first. You can add more later.</AppText>
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
      {step === "growth" && <OnboardingPotential />}
    {step === "features" && <OnboardingFeatureTour sport={draft.sport} />}
      {(step === "athlete" || step === "account") && <AthleteCrest model={card} onInteractionChange={setCardHeld} />}
      {step === "athlete" && <>
        <AppText role="label">Display name</AppText>
        <TextInput accessibilityLabel="Display name" value={draft.name} maxLength={80} style={f.input}
          onChangeText={name => setDraft(d => ({ ...d, name }))} onEndEditing={() => setCardDraft(draft)} />
        <AppText role="label">City (optional)</AppText>
        <TextInput accessibilityLabel="City" value={draft.city} maxLength={80} style={f.input}
          onChangeText={city => setDraft(d => ({ ...d, city }))} onEndEditing={() => setCardDraft(draft)} />
        <SearchableCountryPicker label="Country (optional)" value={draft.countryCode} allowClear onChange={countryCode => {
          setDraft(d => ({ ...d, countryCode })); setCardDraft(d => ({ ...d, countryCode }));
        }} />
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
      </> : actions(step === "features" ? "Create my athlete" : "Continue", () => void next(), step === "athlete" && !draft.name.trim())}
      {step === "sport" && !user && <FocusButton secondary label="I already have an account" onPress={() => void signIn()} />}
    </ScrollView>
  </SafeAreaView>;
}
