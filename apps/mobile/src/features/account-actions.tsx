import {
  EMPTY_PASSWORD_DRAFT,
  MIN_PASSWORD_LENGTH,
  PASSWORD_FIELDS,
  validatePasswordChange,
  type PasswordChangeInput,
} from "@fitness-battle/shared";
import { useThemeColors } from "../theme";
import { useFocusStyles } from "../ui/focus";
import { playCue } from "../lib/haptics";
import { AppText } from "../ui/section";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { requestApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { mobileEnv } from "../lib/env";
import { FocusButton, FocusSheet } from "../ui/focus";

export function AccountActions({
  showDeleteButton = true,
  middle,
  footer,
}: {
  showDeleteButton?: boolean;
  middle?: ReactNode;
  footer?: (openDelete: () => void) => ReactNode;
}) {
const f=useFocusStyles();
const c=useThemeColors();

  const { user, offlineMode, accessToken, signOut, changePassword } = useAuth();
  const { clearAccountData } = useCompeteStore();
  const [panel, setPanel] = useState<"report" | "delete" | "password" | null>(null);
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [draft, setDraft] = useState<PasswordChangeInput>(EMPTY_PASSWORD_DRAFT);
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const ownerRef = useRef(user?.id);
  ownerRef.current = user?.id;
  const live = !!user && !offlineMode && user.mode !== "demo";
  const passwordReady = Boolean(draft.currentPassword && draft.newPassword && draft.confirmPassword);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  function clearPasswordDraft() {
    setDraft(EMPTY_PASSWORD_DRAFT);
    setPasswordSaved(false);
    setError("");
  }

  useEffect(() => {
    setPanel(null);
    clearPasswordDraft();
  }, [user?.id]);

  function closePanel() {
    if (busy) return;
    setPanel(null);
    clearPasswordDraft();
  }

  async function submit() {
    if (flight.current || !user) return;
    const id = user.id;
    if (panel === "password") {
      const validationError = validatePasswordChange(draft);
      if (validationError) {
        void playCue("error");
        setError(validationError);
        return;
      }
    }
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      if (panel === "password") {
        const result = await changePassword(draft.currentPassword, draft.newPassword, draft.confirmPassword);
        if (!mounted.current || ownerRef.current !== id) return;
        if (result.error) throw new Error(result.error);
        void playCue("success");
        setDraft(EMPTY_PASSWORD_DRAFT);
        setPasswordSaved(true);
      } else if (panel === "report") {
        const result = await requestApi<{ sent?: boolean }>(
          mobileEnv.apiUrl,
          accessToken,
          "/api/issues",
          { body: { message } },
        );
        if (!result.sent)
          throw new Error("Your report could not be sent. Please try again.");
        if (!mounted.current || ownerRef.current !== id) return;
        void playCue("success");
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
      if (mounted.current && ownerRef.current === id) {
        void playCue("error");
        setError(e instanceof Error ? e.message : "Please try again.");
      }
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <>
      {user ? (
        <FocusButton
          label="Reset password"
          secondary
          onPress={() => {
            clearPasswordDraft();
            setPanel("password");
          }}
        />
      ) : null}
      <FocusButton
        label="Report an issue"
        secondary
        onPress={() => {
          setError("");
          setSent(false);
          setPanel("report");
        }}
      />
      {middle}
      {showDeleteButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          style={[f.button, f.secondary]}
          onPress={() => {
            setError("");
            setConfirmation("");
            setPanel("delete");
          }}
        ><Text style={[f.buttonText, { color: c.statusError }]}>Delete account</Text></Pressable>
      ) : null}
      {footer ? footer(() => {
        setError("");
        setConfirmation("");
        setPanel("delete");
      }) : null}
      <FocusSheet
        open={!!panel}
        title={
          panel === "delete"
            ? "Delete your account?"
            : panel === "password"
              ? "Reset password"
              : "Report an issue"
        }
        onClose={closePanel}
      >
        {panel === "password" ? (
          passwordSaved ? (
            <>
              <AppText role="body" secondary accessibilityLiveRegion="polite">
                Password updated. Use your new password the next time you sign in.
              </AppText>
              <FocusButton label="Done" onPress={closePanel} />
            </>
          ) : live ? (
            <>
              <AppText role="body" secondary>
                Verify your current password, then choose a new password ({MIN_PASSWORD_LENGTH}+ characters).
              </AppText>
              {PASSWORD_FIELDS.map((field) => (
                <TextInput
                  key={field.key}
                  accessibilityLabel={field.label}
                  placeholder={field.minLength ? `${field.label} (${field.minLength}+ characters)` : field.label}
                  placeholderTextColor={c.muted}
                  style={f.input}
                  value={draft[field.key]}
                  onChangeText={(value) => setDraft((prev) => ({ ...prev, [field.key]: value }))}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType={field.textContentType}
                  autoComplete={field.autoComplete}
                  editable={!busy}
                />
              ))}
              <FocusButton
                label={busy ? "Updating…" : "Update password"}
                disabled={busy || !passwordReady}
                onPress={() => void submit()}
              />
            </>
          ) : (
            <AppText role="body" secondary>
              Sign in with a live account to reset your password.
            </AppText>
          )
        ) : panel === "report" ? (
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
                  Sign in to send a report.
                </AppText>
              )}
            </>
          )
        ) : (
          <>
            <AppText role="body" secondary >
              This permanently deletes your account and associated data. This cannot be undone.{" "}
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
            <AppText role="body" style={{ color: c.statusError }}>{error}</AppText>
          </View>
        ) : null}
      </FocusSheet>
    </>
  );
}
