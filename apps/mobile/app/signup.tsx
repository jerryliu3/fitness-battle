import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/lib/auth-context";
import {
  buildLoginHref,
  resolveSafePostLoginPath,
} from "../src/lib/auth-redirect";
import {
  Card,
  Copy,
  Field,
  GhostButton,
  Kicker,
  Note,
  PrimaryButton,
} from "../src/ui/primitives";
import { ui } from "../src/ui/styles";

export default function SignupScreen() {
  const { signUp, user, loading, demoMode } = useAuth();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = resolveSafePostLoginPath(
    typeof params.next === "string" ? params.next : null,
  );
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace({
        pathname: "/onboarding",
        params: { next },
      });
    }
  }, [loading, user, next]);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const result = await signUp({ email, password, displayName });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.needsEmailConfirm) {
        setNote("Check your email to confirm, then sign in.");
        return;
      }
      router.replace({
        pathname: "/onboarding",
        params: { next },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign up.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={ui.safe}>
      <ScrollView contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <Kicker>Fitness Battle</Kicker>
          <Text style={ui.title}>Create account</Text>
          <Copy>
            Join boards, link trackers, and keep your rating.
            {demoMode ? " Demo mode stores your session on this device." : ""}
          </Copy>
          <Field
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={32}
          />
          <Field
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Password"
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={ui.error}>{error}</Text> : null}
          {note ? <Note>{note}</Note> : null}
          <PrimaryButton
            label={busy ? "Creating…" : "Create account"}
            disabled={busy}
            onPress={() => void onSubmit()}
          />
          <GhostButton
            label="Already have an account? Sign in"
            onPress={() => router.push(buildLoginHref(next))}
          />
          <GhostButton label="Privacy Policy" onPress={() => router.push("/privacy")} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
