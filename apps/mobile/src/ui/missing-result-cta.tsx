import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useThemeColors } from "../theme";
import { useAuth } from "../lib/auth";
import { mobileEnv } from "../lib/env";
import { fetchWithTimeout } from "../lib/fetch-with-timeout";
import { playCue } from "../lib/haptics";
import { FocusButton, FocusSheet, useFocusStyles } from "./focus";
import { AppText } from "./section";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_IMAGE_BASE64_LEN = 3_400_000;

interface ImagePayload {
  filename: string;
  contentType: string;
  contentBase64: string;
  previewUri: string;
}

function isValidHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function MissingResultCta({
  surface,
  defaultRace = "",
}: {
  surface: "observatory" | "replay";
  defaultRace?: string;
}) {
  const c = useThemeColors();
  const f = useFocusStyles();
  const { accessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [athleteName, setAthleteName] = useState("");
  const [race, setRace] = useState("");
  const [details, setDetails] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState<ImagePayload | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const trimmedLink = link.trim();
  const hasValidLink = isValidHttpUrl(trimmedLink);
  const linkInvalid = trimmedLink.length > 0 && !hasValidLink;
  const hasProof = hasValidLink || image !== null;
  const canSubmit =
    athleteName.trim().length >= 2 &&
    race.trim().length >= 2 &&
    !linkInvalid &&
    hasProof;

  async function pickImage() {
    if (busy || imageBusy) return;
    setImageBusy(true);
    setError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) {
        throw new Error("Could not read that image. Please choose another screenshot.");
      }
      const rawMime = (asset.mimeType || "image/jpeg").toLowerCase();
      const contentType = rawMime === "image/jpg" ? "image/jpeg" : rawMime;
      if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
        throw new Error("Upload a PNG, JPEG, WebP, or GIF image.");
      }
      if (asset.base64.length > MAX_IMAGE_BASE64_LEN) {
        throw new Error("Image is too large. Please choose a smaller screenshot (under 2.5 MB).");
      }
      const ext = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1] || "png";
      setImage({
        filename: asset.fileName || `missing-result.${ext}`,
        contentType,
        contentBase64: asset.base64,
        previewUri: asset.uri,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not attach that image.");
      void playCue("error");
    } finally {
      setImageBusy(false);
    }
  }

  async function submit() {
    if (busy || imageBusy || !canSubmit) return;
    setBusy(true);
    setError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const response = await fetchWithTimeout(
        `${mobileEnv.apiUrl.replace(/\/$/, "")}/api/rankings/missing-results`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            athleteName,
            race,
            details,
            link: trimmedLink || undefined,
            image: image
              ? {
                  filename: image.filename,
                  contentType: image.contentType,
                  contentBase64: image.contentBase64,
                }
              : undefined,
            name,
            email,
            surface,
          }),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.sent) {
        throw new Error(body?.error || "We couldn't send your report. Please try again.");
      }
      setSent(true);
      setAthleteName("");
      setDetails("");
      setLink("");
      setImage(null);
      void playCue("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't send your report. Please try again.");
      void playCue("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Report missing result"
        accessibilityHint="Missing a finisher's result? Send a link or screenshot to support."
        onPress={() => {
          setSent(false);
          setError("");
          if (!race.trim() && defaultRace) setRace(defaultRace);
          setOpen(true);
        }}
        style={[
          styles.ctaPill,
          { backgroundColor: c.actionPrimary, borderColor: c.actionPrimary },
        ]}
      >
        <AppText role="nav" style={{ color: c.textOnAction }}>
          Report missing result
        </AppText>
      </Pressable>

      <FocusSheet
        open={open}
        title="Report missing result"
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        {sent ? (
          <>
            <AppText role="body" secondary accessibilityLiveRegion="polite">
              Report sent to support. Thanks — we&apos;ll review it and follow up on the missing result.
            </AppText>
            <FocusButton label="Done" onPress={() => setOpen(false)} />
          </>
        ) : (
          <>
            <AppText role="body" secondary>
              Tell us who is missing and include either an official results link or a screenshot/photo.
            </AppText>
            <TextInput
              accessibilityLabel="Athlete name"
              placeholder="Athlete name"
              placeholderTextColor={c.muted}
              style={f.input}
              value={athleteName}
              onChangeText={setAthleteName}
              maxLength={120}
              editable={!busy}
            />
            <TextInput
              accessibilityLabel="Race and year"
              placeholder="Race & year (e.g. Chicago Marathon 2025)"
              placeholderTextColor={c.muted}
              style={f.input}
              value={race}
              onChangeText={setRace}
              maxLength={200}
              editable={!busy}
            />
            <TextInput
              accessibilityLabel="Official results link (link or image required)"
              placeholder="Results link (https://...)"
              placeholderTextColor={c.muted}
              style={f.input}
              value={link}
              onChangeText={setLink}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={1000}
              editable={!busy}
            />
            {linkInvalid ? (
              <AppText role="caption" style={{ color: c.statusError }}>
                Enter a full URL starting with https:// or http://
              </AppText>
            ) : null}
            {image ? (
              <View style={[styles.previewRow, { borderColor: c.line, backgroundColor: c.paper }]}>
                <Image source={{ uri: image.previewUri }} style={styles.previewImg} />
                <AppText role="caption" style={{ flex: 1 }} numberOfLines={1}>
                  {image.filename}
                </AppText>
                <Pressable onPress={() => setImage(null)} disabled={busy}>
                  <AppText role="nav" style={{ color: c.muted }}>
                    Remove
                  </AppText>
                </Pressable>
              </View>
            ) : (
              <FocusButton
                label={imageBusy ? "Loading image…" : "Upload screenshot or photo"}
                secondary
                disabled={busy || imageBusy}
                onPress={() => void pickImage()}
              />
            )}
            <TextInput
              accessibilityLabel="Details (optional)"
              placeholder="Bib, finish time, or notes (optional)"
              placeholderTextColor={c.muted}
              multiline
              style={[f.input, { minHeight: 80, textAlignVertical: "top" }]}
              value={details}
              onChangeText={setDetails}
              maxLength={1500}
              editable={!busy}
            />
            <TextInput
              accessibilityLabel="Your name (optional)"
              placeholder="Your name (optional)"
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
            {!hasProof && !error ? (
              <AppText role="caption" secondary>
                Provide a results link or upload an image to continue.
              </AppText>
            ) : null}
            {error ? (
              <View accessibilityLiveRegion="polite">
                <AppText role="body" style={{ color: c.statusError }}>
                  {error}
                </AppText>
              </View>
            ) : null}
            <FocusButton
              label={busy ? "Sending…" : "Send report"}
              disabled={busy || imageBusy || !canSubmit}
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
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
});
