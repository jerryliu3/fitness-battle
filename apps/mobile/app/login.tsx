import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/lib/auth-context";
import {
  buildSignupHref,
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

export default function LoginScreen() {
  const { signIn, user, loading, demoMode } = useAuth();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = resolveSafePostLoginPath(
    typeof params.next === "string" ? params.next : null,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(next as "/");
  }, [loading, user, next]);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.replace(next as "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={ui.safe}>
      <ScrollView contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled">
        <Card>
          <Kicker onCard>RALLY</Kicker>
          <Text style={ui.cardTitle}>Sign in</Text>
          <Copy onCard>
            Browse freely. Sign in when you are ready to join a board or open
            You.
            {demoMode ? " Demo mode stores your session on this device." : ""}
          </Copy>
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
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={ui.error}>{error}</Text> : null}
          <PrimaryButton
            label={busy ? "Signing in…" : "Sign in"}
            disabled={busy}
            onPress={() => void onSubmit()}
          />
          <Note>
            New here?{" "}
          </Note>
          <GhostButton
            label="Create an account"
            onPress={() => router.push(buildSignupHref(next))}
          />
          <GhostButton label="Privacy Policy" onPress={() => router.push("/privacy")} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
