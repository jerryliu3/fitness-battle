import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useThemeColors } from "../theme";
import { useAuth } from "../lib/auth";
import { mobileEnv } from "../lib/env";
import { fetchWithTimeout } from "../lib/fetch-with-timeout";
import { playCue } from "../lib/haptics";
import { FocusButton, FocusSheet, useFocusStyles } from "./focus";
import { AppText } from "./section";

export function RequestRaceCta({
  surface,
}: {
  surface: "observatory" | "replay";
}) {
  const c = useThemeColors();
  const f = useFocusStyles();
  const { accessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [race, setRace] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    if (busy || race.trim().length < 2) return;
    setBusy(true);
    setError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const response = await fetchWithTimeout(
        `${mobileEnv.apiUrl.replace(/\/$/, "")}/api/rankings/race-requests`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ race, name, email, surface }),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.sent) {
        throw new Error(body?.error || "We couldn't send your request. Please try again.");
      }
      setSent(true);
      setRace("");
      void playCue("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't send your request. Please try again.");
      void playCue("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Request a race"
        accessibilityHint="Don't see your race here? Send a race request."
        onPress={() => {
          setSent(false);
          setError("");
          setOpen(true);
        }}
        style={[
          styles.ctaPill,
          { backgroundColor: c.actionPrimary, borderColor: c.actionPrimary },
        ]}
      >
        <AppText role="nav" style={{ color: c.textOnAction }}>
          + Request a race
        </AppText>
      </Pressable>

      <FocusSheet
        open={open}
        title="Request a race"
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        {sent ? (
          <>
            <AppText role="body" secondary accessibilityLiveRegion="polite">
              Request sent. Thanks — we&apos;ll review it for upcoming race coverage.
            </AppText>
            <FocusButton label="Done" onPress={() => setOpen(false)} />
          </>
        ) : (
          <>
            <AppText role="body" secondary>
              Don&apos;t see your race here? Share the race name, year, and any results or course link.
            </AppText>
            <TextInput
              accessibilityLabel="Which race should we add?"
              placeholder="e.g. Vancouver Marathon 2026 (optional link)"
              placeholderTextColor={c.muted}
              multiline
              style={[f.input, { minHeight: 110, textAlignVertical: "top" }]}
              value={race}
              onChangeText={setRace}
              maxLength={2000}
              editable={!busy}
            />
            <TextInput
              accessibilityLabel="Name (optional)"
              placeholder="Name (optional)"
              placeholderTextColor={c.muted}
              style={f.input}
              value={name}
              onChangeText={setName}
              maxLength={120}
              editable={!busy}
            />
            <TextInput
              accessibilityLabel="Email (optional)"
              placeholder="Email (optional)"
              placeholderTextColor={c.muted}
              style={f.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={254}
              editable={!busy}
            />
            {error ? (
              <View accessibilityLiveRegion="polite">
                <AppText role="body" style={{ color: c.statusError }}>
                  {error}
                </AppText>
              </View>
            ) : null}
            <FocusButton
              label={busy ? "Sending…" : "Send request"}
              disabled={busy || race.trim().length < 2}
              onPress={() => void submit()}
            />
          </>
        )}
      </FocusSheet>
    </>
  );
}

const styles = StyleSheet.create({
  ctaPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
});
