import { OnboardingFeatureTour } from "../src/features/onboarding-feature-tour";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EMPTY_GUEST_INTRO, ONBOARDING_STEPS, ONBOARDING_TITLES, isGuestPhoto, type OnboardingFeatureId,
  onboardingAthleteCard, guestIntroForAccount, SPORTS, type OnboardingStep,
} from "@fitness-battle/shared";
import { OnboardingCanvas, ONBOARDING_CANVAS } from "../src/ui/onboarding-canvas";
import { OnboardingAthlete } from "../src/features/onboarding-athlete";
import * as ImagePicker from "expo-image-picker";
import { OnboardingOvertake } from "../src/features/onboarding-overtake";
import { VitalsLabCanvasPrefetch } from "../src/features/vitals-lab/vitals-lab-canvas-prefetch";
import { LegalLinks } from "../src/features/legal-links";
import { IconButton } from "../src/ui/icon-button";
import { GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY, readGuestIntroDraft, type GuestIntroDraft } from "../src/lib/guest-intro";
import { useAuth } from "../src/lib/auth";
import { useCompeteStore } from "../src/lib/compete-store";
import { useThemeColors } from "../src/theme";
import { FocusButton, useFocusStyles } from "../src/ui/focus";
import { AppText } from "../src/ui/section";

const sportTiles = {
  running: { emoji: "🏃‍♀️", background: "#FCE4DA" },
  cycling: { emoji: "🚴", background: "#DDEFF3" },
  walking: { emoji: "🚶", background: "#E5F1DC" },
  strength: { emoji: "🏋️‍♀️", background: "#FFF0BE" },
};

export default function Welcome() {
  const { user, loading, signUp } = useAuth();
  const { state } = useCompeteStore();
  const router = useRouter();
  const preview = useLocalSearchParams<{ preview?: string }>().preview === "1";
  const colors = useThemeColors(), f = useFocusStyles();
  const [ready, setReady] = useState(false), [step, setStep] = useState<OnboardingStep>("sport");
  const [draft, setDraft] = useState<GuestIntroDraft>(EMPTY_GUEST_INTRO);
  const [feature, setFeature] = useState<OnboardingFeatureId>("growth");
  const [previewScore, setPreviewScore] = useState<number | null>(null);
  const [previewPasses, setPreviewPasses] = useState(0);
  const showScore = useCallback((score: number) => setPreviewScore(Math.round(score / 50) * 50), []);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cardDraft, setCardDraft] = useState<GuestIntroDraft>(EMPTY_GUEST_INTRO);
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false), [cardHeld, setCardHeld] = useState(false);
  const steps: readonly OnboardingStep[] = user && !preview ? ONBOARDING_STEPS.filter(s => s !== "account") : ONBOARDING_STEPS;
  const baseCard = useMemo(() => onboardingAthleteCard(cardDraft), [cardDraft]);
  const card = useMemo(() => ({ ...baseCard, score: previewScore, overtakes: previewPasses }), [baseCard, previewScore, previewPasses]);
  useEffect(() => {
    if (cardHeld) return;
    const timer = setTimeout(() => setCardDraft(draft), 120);
    return () => clearTimeout(timer);
  }, [draft, cardHeld]);
  useEffect(() => {
    if (!ready || loading || preview || state?.onboardingCompleted) return;
    const timer = setTimeout(() => { void AsyncStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify(draft)).catch(() => {}); }, 600);
    return () => clearTimeout(timer);
  }, [ready, loading, draft, preview, state?.onboardingCompleted]);
  useEffect(() => {
    if (loading || (user && !state)) return;
    let alive = true;
    void Promise.all([readGuestIntroDraft(), AsyncStorage.getItem(GUEST_SIGNUP_PENDING_KEY)]).then(([saved, pending]) => {
      if (!alive) return;
      const initial = preview ? EMPTY_GUEST_INTRO : user && state ? guestIntroForAccount(saved, pending, user.email) ?? {
        sport: state.primary, name: user.displayName || state.name, city: state.city || "", countryCode: state.countryCode || "",
      } : saved ?? EMPTY_GUEST_INTRO;
      setDraft(initial); setCardDraft(initial); setReady(true);
    }).catch(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [loading, preview, user?.id, Boolean(state)]);
  if (!preview && user && state?.onboardingCompleted) return <Redirect href="/today" />;
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
    if (step === "growth") {
      if (user && !preview) {
        try { await saveCompletedIntro(user.email); router.replace("/onboarding"); }
        catch { setError("Could not save setup on this device. Please try again."); }
        return;
      }
    }
    setStep(steps[index + 1]!);
  }
  async function createAccount() {
    if (busy) return;
    if (preview) { router.replace("/onboarding?preview=1"); return; }
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
    if (!preview) await AsyncStorage.removeItem(GUEST_SIGNUP_PENDING_KEY).catch(() => {});
    router.push({ pathname: "/athlete", params: { auth: "signin", from: "onboarding" } });
  }
  const back = index > 0 ? <IconButton icon="back" label="Back" disabled={busy || photoBusy} onPress={() => setStep(steps[index - 1]!)} /> : null;
  const actions = (label: string, onPress: () => void, disabled = false) => <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
    {back}<View style={{ flex: 1 }}><FocusButton fit label={label} disabled={disabled} onPress={onPress} /></View>
  </View>;
  const field = { ...f.input, minHeight: 0, height: 46, paddingVertical: 8 };
  const box = (top: number, height: number) => ({ position: "absolute" as const, left: 16, right: 16, top, height });
  return <View style={{ flex: 1, backgroundColor: colors.paper, overflow: "hidden" }}>
    <VitalsLabCanvasPrefetch />
    {step === "overtake" && <View style={{ position: "absolute", inset: 0 }}>
      <OnboardingOvertake fill sport={draft.sport} name={draft.name} photo={draft.photo} onOvertakeCountChange={setPreviewPasses}
        onBack={() => setStep("athlete")} onComplete={() => void next()} />
    </View>}
    <SafeAreaView pointerEvents="box-none" style={{ flex: 1 }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView pointerEvents="box-none" style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <OnboardingCanvas height={ONBOARDING_CANVAS.height}>
          <OnboardingAthlete model={card} step={step} onInteractionChange={setCardHeld} />
          {step !== "growth" && <View pointerEvents="none" style={{ ...box(8, 48), right: step === "overtake" ? 120 : 16 }}>
            <AppText role={step === "overtake" ? "heading" : "display"} accessibilityRole="header" style={{ flex: 1 }} maxFontSizeMultiplier={1.2} numberOfLines={2} adjustsFontSizeToFit>{step === "athlete" ? `Welcome ${draft.name.trim() || "athlete"}!` : ONBOARDING_TITLES[step]}</AppText>
          </View>}
          {step === "overtake" && <View pointerEvents="none" style={{ ...box(64, 60), right: 124 }}><AppText role="caption" numberOfLines={3}>Race your level. Chase a friendly rival and make the next overtake yours.</AppText></View>}
          {step === "sport" && <>
            <View style={box(64, 48)}><AppText secondary style={{ flex: 1 }} numberOfLines={2} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>Choose your sport. You can add more later.</AppText></View>
            <View style={{ ...box(126, 380), flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {SPORTS.map(sport => <Pressable key={sport.id} accessibilityRole="button" accessibilityLabel={sport.name}
                accessibilityState={{ selected: draft.sport === sport.id }} onPress={() => setDraft(d => ({ ...d, sport: sport.id }))}
                style={{ width: 158, height: 182, alignItems: "center", justifyContent: "center", borderRadius: 26,
                  borderWidth: 2, borderColor: draft.sport === sport.id ? "#082637" : "transparent",
                  backgroundColor: sportTiles[sport.id].background }}>
                <Text accessible={false} allowFontScaling={false} style={{ fontSize: 108, lineHeight: 126, textAlign: "center", includeFontPadding: false }}>{sportTiles[sport.id].emoji}</Text>
                <AppText role="label" numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2} style={{ color: "#082637", alignSelf: "stretch", paddingHorizontal: 16 }}>{sport.name}</AppText>
                {draft.sport === sport.id && <View pointerEvents="none" style={{ position: "absolute", top: 10, right: 10, width: 25, height: 25, borderRadius: 13, backgroundColor: "#082637", alignItems: "center", justifyContent: "center" }}>
                  <Text accessible={false} allowFontScaling={false} style={{ color: "white", fontSize: 18, fontWeight: "800", lineHeight: 22 }}>✓</Text>
                </View>}
              </Pressable>)}
            </View>
            {(!user || preview) && <View style={box(520, 48)}><FocusButton fit secondary label="I already have an account" onPress={() => void signIn()} /></View>}
          </>}
          {step === "athlete" && <>
            <View style={box(450, 46)}><TextInput maxFontSizeMultiplier={1.2} accessibilityLabel="Athlete name" placeholder="Athlete name" value={draft.name} maxLength={80} style={field}
              onChangeText={name => setDraft(d => ({ ...d, name }))} onEndEditing={() => setCardDraft(draft)} /></View>
            <View style={{ ...box(514, 52), flexDirection: "row", gap: 16, alignItems: "center" }}>
              <View style={{ flex: 1 }}><FocusButton fit secondary label={photoBusy ? "Reading photo…" : draft.photo ? "Change photo" : "Add photo"} disabled={photoBusy} onPress={() => void choosePhoto()} /></View>
              {draft.photo && <Pressable accessibilityRole="button" onPress={() => { setDraft(d => ({ ...d, photo: undefined })); setCardDraft(d => ({ ...d, photo: undefined })); }} style={{ minHeight: 44, justifyContent: "center" }}><AppText numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={1.2}>Remove photo</AppText></Pressable>}
            </View>
          </>}
          {step === "growth" && <View style={{ ...box(12, 548) }}>
            <OnboardingFeatureTour draft={draft} selected={feature} onSelect={setFeature} onScoreChange={showScore} />
          </View>}
          {step === "account" && <>
            <View style={box(390, 46)}><TextInput maxFontSizeMultiplier={1.2} accessibilityLabel="Email" placeholder="Email" style={field} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!confirmation} /></View>
            <View style={box(448, 46)}><TextInput maxFontSizeMultiplier={1.2} accessibilityLabel="Password" placeholder="Password" style={field} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" editable={!confirmation} /></View>
            <View style={box(510, 38)}><LegalLinks /></View>
          </>}
          {(error || confirmation) && <View style={box(528, 46)}><AppText role="caption" accessibilityRole="alert" numberOfLines={3} adjustsFontSizeToFit>{error ?? "Check your email to confirm your account and continue setup."}</AppText></View>}
          {step !== "overtake" && <View style={box(584, 52)}>
            {step === "account" ? actions(busy ? "Creating…" : "Continue", () => void createAccount(), busy || confirmation || !email.trim() || password.length < 6)
              : actions("Continue", () => void next(), photoBusy || (step === "athlete" && !draft.name.trim()))}
          </View>}
        </OnboardingCanvas>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>;
}
