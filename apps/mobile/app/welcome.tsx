import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { athleteCardModelForPeer, athleteLocationLine, SPORTS, type SportId } from "@fitness-battle/shared";
import { AthleteCrest } from "../src/features/athlete-crest";
import { OnboardingOvertake } from "../src/features/onboarding-overtake";
import { OnboardingPotential } from "../src/features/onboarding-potential";
import { SearchableCountryPicker } from "../src/ui/searchable-country-picker";
import { SportIcon } from "../src/ui/sport-icon";
import {
  GUEST_INTRO_DRAFT_KEY, GUEST_INTRO_SEEN_KEY,
  readGuestIntroDraft, type GuestIntroDraft,
} from "../src/lib/guest-intro";
import { useAuth } from "../src/lib/auth";
import { useThemeColors } from "../src/theme";
import { FocusButton, useFocusStyles } from "../src/ui/focus";
import { AppText } from "../src/ui/section";

type Step = "sport" | "overtake" | "growth" | "athlete" | "account";
const STEPS: Step[] = ["sport", "overtake", "growth", "athlete", "account"];
const TITLES: Record<Step, string> = {
  sport: "What moves you?",
  overtake: "Make your first overtake.",
  growth: "See your potential.",
  athlete: "Create your athlete.",
  account: "Save your athlete.",
};
const EMPTY_DRAFT: GuestIntroDraft = { sport: "running", name: "", city: "", countryCode: "" };

/** Every guest step is practice or profile preparation; no account competition writes. */
export default function Welcome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const f = useFocusStyles();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<Step>("sport");
  const [draft, setDraft] = useState<GuestIntroDraft>(EMPTY_DRAFT);
  const [leaving, setLeaving] = useState(false);

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
  async function go(next: Step) {
    await saveDraft();
    setStep(next);
  }
  async function leave(destination: "/today" | "/athlete?auth=signin" | "/athlete?auth=signup") {
    if (leaving) return;
    setLeaving(true);
    await saveDraft();
    try { await AsyncStorage.setItem(GUEST_INTRO_SEEN_KEY, "1"); }
    catch { /* The app remains accessible without local preferences. */ }
    router.replace(destination);
  }

  if (loading || !ready) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  if (user) return <Redirect href="/today" />;

  const index = STEPS.indexOf(step);
  const name = draft.name.trim() || "Athlete";
  const sportName = SPORTS.find(s => s.id === draft.sport)?.name ?? "Running";
  const card = {
    ...athleteCardModelForPeer({ name, city: draft.city, sport: sportName }),
    countryCode: draft.countryCode || null,
    location: athleteLocationLine(draft.city, draft.countryCode || null),
  };
  const back = index > 0 ? <FocusButton secondary label="Back" disabled={leaving} onPress={() => void go(STEPS[index - 1]!)} /> : null;
  return (
    <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        contentContainerStyle={[f.content, { maxWidth: 520, width: "100%", alignSelf: "center", paddingBottom: 32 }]}>
        <AppText role="caption" secondary>OVERTAEK · YOUR STARTING LINE</AppText>
        <View style={{ flexDirection: "row", gap: 5 }} accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 5, borderRadius: 8, backgroundColor: i <= index ? colors.tennis : colors.line }} />)}
        </View>
        <AppText role="display" accessibilityRole="header">{TITLES[step]}</AppText>
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
          <FocusButton secondary label="I already have an account" disabled={leaving} onPress={() => void leave("/athlete?auth=signin")} />
          <FocusButton secondary label="Explore the app" disabled={leaving} onPress={() => void leave("/today")} />
        </>}
        {step === "overtake" && <>
          <AppText secondary>Close the gap in a practice {sportName.toLowerCase()} event. This isn't a real workout or competition result.</AppText>
          <OnboardingOvertake sport={draft.sport} name={name} initialDimension="2d" onComplete={() => void go("growth")} />
          {back}
        </>}
        {step === "growth" && <>
          <AppText secondary>See how staying consistent could translate into progress in {sportName.toLowerCase()}.</AppText>
          <OnboardingPotential sport={draft.sport} />
          <FocusButton label="Create my athlete" onPress={() => void go("athlete")} />
          {back}
        </>}
        {step === "athlete" && <>
          <AppText secondary>Your card updates with your name and location. Rotate it to explore.</AppText>
          <AthleteCrest model={card} />
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
          <AppText role="caption" secondary>More personal details and tracker connections come after account creation.</AppText>
          <FocusButton label="Continue" disabled={!draft.name.trim()} onPress={() => void go("account")} />
          {back}
        </>}
        {step === "account" && <>
          <View style={{ borderRadius: 20, padding: 20, gap: 12, backgroundColor: colors.actionSoft }}>
            <AppText role="heading">{name}</AppText>
            <AppText role="label">{sportName} · {draft.city || "Your starting line"}</AppText>
            <AppText secondary>Keep your athlete, enter real events, and build your record with friends.</AppText>
          </View>
          <FocusButton label="Create account" disabled={leaving} onPress={() => void leave("/athlete?auth=signup")} />
          <FocusButton secondary label="Sign in" disabled={leaving} onPress={() => void leave("/athlete?auth=signin")} />
          <FocusButton secondary label="Explore without an account" disabled={leaving} onPress={() => void leave("/today")} />
          {back}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
