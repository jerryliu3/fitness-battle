import { playCue } from "../lib/haptics";
import { UserAvatar } from "../ui/user-avatar";
import { AppText } from "../ui/section";
import {
  buildAvatarCleanupPathsForProfileChange,
  getCanonicalAvatarObjectPath,
  PERSON_ICON_PATH,
  type CompeteState,
} from "@fitness-battle/shared";
import * as ImagePicker from "expo-image-picker";

async function photoLibraryDenied() {
  try {
    const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
    return permission.status === "denied";
  } catch {
    return false;
  }
}
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { decodePhoto } from "../lib/profile-photo";
import { supabase } from "../lib/supabase";
import { SHELL_COLORS as c } from "../theme";
import { FocusButton, FocusSheet, f } from "../ui/focus";

export function ProfilePhoto({ state }: { state: CompeteState }) {
  const { user, offlineMode } = useAuth();
  const { dispatch } = useCompeteStore();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const flight = useRef(false);
  const pendingPickerOwner = useRef<string | null>(null);
  const ownerRef = useRef(user?.id);
  ownerRef.current = user?.id;
  const [error, setError] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function change(remove = false) {
    if (!user || flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    const id = user.id;
    try {
      let url: string | null = null;
      if (!remove) {
        if (await photoLibraryDenied()) {
          setError(
            "Photo library access is off. Overtaek still works without a profile photo.",
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.65,
          base64: true,
        });
        if (result.canceled) {
          if (await photoLibraryDenied()) {
            setError(
              "Photo library access is off. Overtaek still works without a profile photo.",
            );
          }
          return;
        }
        const asset = result.assets[0];
        if (!asset.base64)
          throw new Error(
            "Could not read that photo. Please choose another image.",
          );
        const bytes = decodePhoto(asset.base64);
        if (bytes.byteLength > 5 * 1024 * 1024)
          throw new Error("Choose a photo smaller than 5 MB.");
        if (!mounted.current || ownerRef.current !== id) return;
        if (offlineMode) {
          url = `data:image/jpeg;base64,${asset.base64}`;
        } else {
          const path = getCanonicalAvatarObjectPath(id);
          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(path, bytes, { upsert: true, contentType: "image/jpeg" });
          if (uploadError) throw uploadError;
          url = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
        }
      }
      if (remove && !offlineMode) {
        const { error: removeError } = await supabase.storage.from("avatars").remove(
          buildAvatarCleanupPathsForProfileChange({
            userId: id,
            previousAvatarUrl: state.avatarUrl,
            nextAvatarUrl: null,
          }),
        );
        if (removeError) throw removeError;
      }
      if (mounted.current && ownerRef.current === id)
        dispatch({ type: "set-avatar", avatarUrl: url, accountId: id });
    } catch (e) {
      if (mounted.current && ownerRef.current === id) {
        void playCue("error");
        setError(
          e instanceof Error ? e.message : "Could not update your photo.",
        );
      }
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={{ alignItems: "center", gap: 8, maxWidth: 130 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profile photo options"
        disabled={!user || busy}
        onPress={() => {
          if (!user || busy) return;
          setMenuOpen(true);
        }}
        style={{
          width: 86,
          height: 86,
          borderRadius: 43,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <UserAvatar src={state.avatarUrl} name={state.name} size={86} fallback={<Svg width={54} height={54} viewBox="0 0 24 24">
            <Path
              d={PERSON_ICON_PATH}
              fill="none"
              stroke={c.muted}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>} />
      </Pressable>
      <FocusSheet
        open={menuOpen}
        title="Profile photo"
        onClosed={() => {
          const id = pendingPickerOwner.current;
          pendingPickerOwner.current = null;
          if (id && mounted.current && ownerRef.current === id) void change();
        }}
        onClose={() => {
          if (!busy) setMenuOpen(false);
        }}
      >
        <FocusButton
          label={busy ? "Updating…" : "Choose photo"}
          disabled={busy}
          onPress={() => {
            if (!user || flight.current || pendingPickerOwner.current) return;
            // UIKit must finish dismissing our sheet before presenting the picker.
            pendingPickerOwner.current = user.id;
            setMenuOpen(false);
          }}
        />
        {state.avatarUrl ? (
          <FocusButton
            label="Delete photo"
            secondary
            disabled={busy}
            onPress={() => {
              setMenuOpen(false);
              void change(true);
            }}
          />
        ) : null}
        <FocusButton label="Cancel" secondary onPress={() => setMenuOpen(false)} />
      </FocusSheet>
      {error ? (
        <AppText role="caption" secondary  accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
