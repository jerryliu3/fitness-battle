import { AppText } from "../ui/section";
import { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { requestApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { mobileEnv } from "../lib/env";
import { FocusButton, FocusSheet, f } from "../ui/focus";

export function AccountActions() {
  const { user, offlineMode, accessToken, signOut } = useAuth();
  const { clearAccountData } = useCompeteStore();
  const [panel, setPanel] = useState<"report" | "delete" | null>(null);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const ownerRef = useRef(user?.id);
  ownerRef.current = user?.id;
  const live = !!user && !offlineMode;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function submit() {
    if (flight.current || !user) return;
    const id = user.id;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      if (panel === "report") {
        const result = await requestApi<{ sent?: boolean }>(
          mobileEnv.apiUrl,
          accessToken,
          "/api/issues",
          { body: { message } },
        );
        if (!result.sent)
          throw new Error("Your report could not be sent. Please try again.");
        if (!mounted.current || ownerRef.current !== id) return;
        setSent(true);
        setMessage("");
      } else {
        if (live) {
          const result = await requestApi<{ ok?: boolean; demo?: boolean }>(
            mobileEnv.apiUrl,
            accessToken,
            "/api/account",
            { method: "DELETE" },
          );
          if (!result.ok || result.demo)
            throw new Error(
              "Account deletion is unavailable. Your account has not been deleted.",
            );
        }
        // Cleanup the deleted account even if auth signed it out while the request was in flight.
        // The store only resets the active UI when the expected account is still selected.
        if (await clearAccountData(id)) await signOut();
      }
    } catch (e) {
      if (mounted.current && ownerRef.current === id)
        setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <FocusButton
        label="Report an issue"
        secondary
        onPress={() => {
          setError("");
          setSent(false);
          setPanel("report");
        }}
      />
      <FocusButton
        label="Delete account"
        secondary
        onPress={() => {
          setError("");
          setConfirmation("");
          setPanel("delete");
        }}
      />
      <FocusSheet
        open={!!panel}
        title={
          panel === "delete" ? "Delete your account?" : "Report an issue"
        }
        onClose={() => {
          if (!busy) setPanel(null);
        }}
      >
        {panel === "report" ? (
          sent ? (
            <AppText role="body" secondary  accessibilityLiveRegion="polite">
              Report sent. Thanks for helping us improve Overtaek.
            </AppText>
          ) : (
            <>
              <AppText role="body" secondary >
                Tell us what happened and what you expected. Leave out passwords
                and sensitive details.
              </AppText>
              {live ? (
                <>
                  <TextInput
                    accessibilityLabel="What went wrong?"
                    multiline
                    style={[
                      f.input,
                      { minHeight: 150, textAlignVertical: "top" },
                    ]}
                    value={message}
                    onChangeText={setMessage}
                    maxLength={5000}
                    editable={!busy}
                  />
                  <FocusButton
                    label={busy ? "Sending…" : "Send report"}
                    disabled={busy || message.trim().length < 10}
                    onPress={() => void submit()}
                  />
                </>
              ) : (
                <AppText role="body" secondary >
                  Sign in with a live account to send a report. Demo reports are
                  not sent.
                </AppText>
              )}
            </>
          )
        ) : (
          <>
            <AppText role="body" secondary >
              {live
                ? "This permanently deletes your account and associated data. This cannot be undone."
                : "This deletes this demo account and its saved training on this device."}{" "}
              Type DELETE to confirm.
            </AppText>
            <TextInput
              accessibilityLabel="Type DELETE to confirm"
              style={f.input}
              value={confirmation}
              onChangeText={setConfirmation}
              autoCapitalize="characters"
              editable={!busy}
            />
            <FocusButton
              label={busy ? "Deleting…" : "Permanently delete account"}
              disabled={busy || confirmation !== "DELETE"}
              onPress={() => void submit()}
            />
          </>
        )}
        {error ? (
          <View accessibilityLiveRegion="polite">
            <AppText role="body" secondary >{error}</AppText>
          </View>
        ) : null}
      </FocusSheet>
    </>
  );
}
