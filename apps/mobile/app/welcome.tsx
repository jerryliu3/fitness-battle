import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { athleteCardModelForPeer, athleteLocationLine, SPORTS, EMPTY_GUEST_INTRO, ONBOARDING_STEPS, ONBOARDING_TITLES, type OnboardingStep, type SportId } from "@fitness-battle/shared";
import { AthleteCrest } from "../src/features/athlete-crest";
import { OnboardingOvertake } from "../src/features/onboarding-overtake";
import { OnboardingPotential } from "../src/features/onboarding-potential";
import { OnboardingFeatureTour } from "../src/features/onboarding-feature-tour";
import { SearchableCountryPicker } from "../src/ui/searchable-country-picker";
import { SportIcon } from "../src/ui/sport-icon";
import {
  GUEST_INTRO_DRAFT_KEY, GUEST_SIGNUP_PENDING_KEY,
  readGuestIntroDraft, type GuestIntroDraft,
} from "../src/lib/guest-intro";
import { useAuth } from "../src/lib/auth";
import { useThemeColors } from "../src/theme";
import { FocusButton, useFocusStyles } from "../src/ui/focus";
import { AppText } from "../src/ui/section";

/** Every guest step is practice or profile preparation; no account competition writes. */
export default function Welcome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const f = useFocusStyles();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("sport");
  const [draft, setDraft] = useState<GuestIntroDraft>(EMPTY_GUEST_INTRO);
  const [leaving, setLeaving] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const [cardHeld, setCardHeld] = useState(false);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);
  useEffect(() => {
    if (ready) void AsyncStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, [ready, draft]);

  useEffect(() => {
    let alive = true;
    void readGuestIntroDraft().then(saved => {
      if (alive && saved) setDraft(saved);
    }).catch(() => {}).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  async function saveDraft() {
    try { await AsyncStorage.setItem(GUEST_INTRO_DRAFT_KEY, JSON.stringify(draft)); }
    catch { /* Storage errors must not trap guests in onboarding. */ }
  }
  function go(next: OnboardingStep) { setStep(next); }
  async function leave(mode: "signin" | "signup") {
    if (leaving) return;
    setLeaving(true);
    await saveDraft();
    if (mode === "signin") await AsyncStorage.removeItem(GUEST_SIGNUP_PENDING_KEY).catch(() => {});
    router.push({ pathname: "/athlete", params: { auth: mode, from: "onboarding" } });
    setLeaving(false);
  }

  if (loading || !ready) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  if (user) return <Redirect href="/today" />;

  const index = ONBOARDING_STEPS.indexOf(step);
  const name = draft.name.trim() || "Athlete";
  const sportName = SPORTS.find(s => s.id === draft.sport)?.name ?? "Running";
  const card = {
    ...athleteCardModelForPeer({ name, city: draft.city, sport: sportName }),
    countryCode: draft.countryCode || null,
    location: athleteLocationLine(draft.city, draft.countryCode || null),
  };
  const back = index > 0 ? <FocusButton secondary label="Back" disabled={leaving} onPress={() => void go(ONBOARDING_STEPS[index - 1]!)} /> : null;
  return (
    <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
      <ScrollView ref={scroll} scrollEnabled={!cardHeld} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        contentContainerStyle={[f.content, { maxWidth: 520, width: "100%", alignSelf: "center", paddingBottom: 32 }]}>
        <AppText role="caption" secondary>OVERTAEK</AppText>
        <View style={{ flexDirection: "row", gap: 5 }} accessibilityLabel={`Step ${index + 1} of ${ONBOARDING_STEPS.length}`}>
          {ONBOARDING_STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 5, borderRadius: 8, backgroundColor: i <= index ? colors.tennis : colors.line }} />)}
        </View>
        <AppText role="display" accessibilityRole="header">{ONBOARDING_TITLES[step]}</AppText>
        {step === "sport" && <>
          <AppText secondary>Choose a sport to try first. You can add more later.</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {SPORTS.map(sport => {
              const selected = draft.sport === sport.id;
              return <Pressable key={sport.id} accessibilityRole="button"
                accessibilityLabel={sport.name} accessibilityState={{ selected }}
                onPress={() => setDraft(current => ({ ...current, sport: sport.id as SportId }))}
                style={{ flexBasis: "46%", flexGrow: 1, minHeight: 142, alignItems: "center", justifyContent: "center", gap: 12,
                  borderRadius: 20, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.ink : colors.line,
                  backgroundColor: selected ? colors.actionSoft : colors.card }}>
                <SportIcon sport={sport.id} size={40} />
                <AppText role="label">{sport.name}{selected ? " ✓" : ""}</AppText>
              </Pressable>;
            })}
          </View>
          <FocusButton label="Continue" onPress={() => void go("overtake")} />
          <FocusButton secondary label="I already have an account" disabled={leaving} onPress={() => void leave("signin")} />
        </>}
        {step === "overtake" && <>
          <AppText secondary>Make training fun: pass other athletes as you move. Join events with people near your level and keep each other motivated.</AppText>
          <OnboardingOvertake sport={draft.sport} name={name} onComplete={() => void go("growth")} />
          {back}
        </>}
        {step === "growth" && <>
          <OnboardingPotential />
          <FocusButton label="Explore what else you can do" onPress={() => void go("features")} />
          {back}
        </>}
        {step === "features" && <>
          <OnboardingFeatureTour sport={draft.sport} />
          <FocusButton label="Create my athlete" onPress={() => void go("athlete")} />
          {back}
        </>}
        {step === "athlete" && <>
          <AthleteCrest model={card} onInteractionChange={setCardHeld} />
          <AppText role="label">Display name</AppText>
          <TextInput accessibilityLabel="Display name" value={draft.name} maxLength={80}
            style={f.input} placeholder="What should we call you?"
            onChangeText={value => setDraft(current => ({ ...current, name: value }))} />
          <AppText role="label">City (optional)</AppText>
          <TextInput accessibilityLabel="City" value={draft.city} maxLength={80}
            style={f.input} placeholder="Your city"
            onChangeText={value => setDraft(current => ({ ...current, city: value }))} />
          <SearchableCountryPicker label="Country (optional)" value={draft.countryCode}
            onChange={value => setDraft(current => ({ ...current, countryCode: value }))} allowClear />
          <FocusButton label="Continue" disabled={!draft.name.trim()} onPress={() => void go("account")} />
          {back}
        </>}
        {step === "account" && <>
          <AthleteCrest model={card} onInteractionChange={setCardHeld} />
          <AppText secondary>Keep your athlete and build your record.</AppText>
          <FocusButton label="Create account" disabled={leaving} onPress={() => void leave("signup")} />
          <FocusButton secondary label="Sign in" disabled={leaving} onPress={() => void leave("signin")} />
          {back}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
