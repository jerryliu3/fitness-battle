import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OnboardingOvertake } from "../src/features/onboarding-overtake";
import { GUEST_INTRO_SEEN_KEY } from "../src/lib/guest-intro";
import { useAuth } from "../src/lib/auth";
import { useThemeColors } from "../src/theme";
import { FocusButton, useFocusStyles } from "../src/ui/focus";
import { AnimatedEmber } from "../src/ui/mascot/animated-ember";
import { AppText } from "../src/ui/section";

type Step = "intro" | "overtake" | "complete";

/** A practice overtake before account creation; no event or activity is recorded. */
export default function Welcome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const focus = useFocusStyles();
  const [step, setStep] = useState<Step>("intro");
  const [leaving, setLeaving] = useState(false);

  async function leave(destination: "/today" | "/athlete?auth=signin" | "/athlete?auth=signup") {
    if (leaving) return;
    setLeaving(true);
    try {
      await AsyncStorage.setItem(GUEST_INTRO_SEEN_KEY, "1");
    } catch {
      // A failed local preference write must not block access to the app.
    }
    router.replace(destination);
  }

  if (loading) return null;
  if (user) return <Redirect href="/today" />;

  return (
    <SafeAreaView style={focus.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={[
          focus.content,
          { width: "100%", maxWidth: 520, alignSelf: "center", paddingBottom: 32 },
        ]}
      >
        {step === "intro" ? (
          <>
            <View style={{ alignItems: "center", padding: 20, borderRadius: 24, backgroundColor: colors.actionSoft }}>
              <AnimatedEmber size={174} />
            </View>
            <AppText role="caption" secondary>WELCOME TO OVERTAEK</AppText>
            <AppText role="display" accessibilityRole="header">Make your training a competition.</AppText>
            <AppText secondary>
              Every session moves you through the field. See what it feels like to overtake another athlete.
            </AppText>
            <FocusButton label="Try an overtake" onPress={() => setStep("overtake")} />
            <FocusButton label="Explore the app" secondary disabled={leaving} onPress={() => void leave("/today")} />
            <FocusButton label="I already have an account" secondary disabled={leaving} onPress={() => void leave("/athlete?auth=signin")} />
          </>
        ) : step === "overtake" ? (
          <>
            <AppText role="caption" secondary>YOUR FIRST FIELD</AppText>
            <AppText role="display" accessibilityRole="header">This is an overtake.</AppText>
            <AppText secondary>
              Watch the pass, switch views, and continue when you're ready.
            </AppText>
            <OnboardingOvertake initialDimension="2d" onComplete={() => setStep("complete")} />
            <FocusButton label="Back" secondary onPress={() => setStep("intro")} />
          </>
        ) : (
          <>
            <View style={{ alignItems: "center", padding: 20, borderRadius: 24, backgroundColor: colors.actionSoft }}>
              <AnimatedEmber size={174} />
            </View>
            <AppText role="caption" secondary>YOUR STARTING LINE</AppText>
            <AppText role="display" accessibilityRole="header">Now make it real.</AppText>
            <AppText secondary>
              That was a practice overtake. Create an account to enter real competitions, connect your workouts, and build your record with friends.
            </AppText>
            <FocusButton label="Create account" disabled={leaving} onPress={() => void leave("/athlete?auth=signup")} />
            <FocusButton label="Explore the app first" secondary disabled={leaving} onPress={() => void leave("/today")} />
            <FocusButton label="Sign in" secondary disabled={leaving} onPress={() => void leave("/athlete?auth=signin")} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
