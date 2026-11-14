import { useThemeColors } from "../theme";
import { playCue } from "../lib/haptics";
import { AppText } from "../ui/section";
import {
  buildAvatarCleanupPathsForProfileChange,
  getCanonicalAvatarObjectPath,
  APP_ICON_PATHS,
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
import { Image, Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { decodePhoto } from "../lib/profile-photo";
import { supabase } from "../lib/supabase";
import { AppIcon } from "../ui/app-icon";

import { FocusButton, FocusSheet } from "../ui/focus";

export function ProfilePhoto({ state, editSize = 144 }: { state: CompeteState; editSize?: number }) {
const c=useThemeColors();

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
    <View style={{ alignItems: "center", gap: 8, alignSelf: "center" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit profile photo"
        disabled={!user || busy}
        onPress={() => {
          if (!user || busy) return;
          setMenuOpen(true);
        }}
        style={{
          width: editSize,
          height: editSize,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: editSize,
            height: editSize,
            borderRadius: editSize / 2,
            overflow: "hidden",
            backgroundColor: c.soft,
            borderWidth: 1,
            borderColor: c.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {state.avatarUrl ? (
            <Image
              source={{ uri: state.avatarUrl }}
              style={{ width: "100%", height: "100%" }}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Svg width={editSize * 0.35} height={editSize * 0.35} viewBox="0 0 24 24">
              <Path d={APP_ICON_PATHS.person} fill={c.muted} />
            </Svg>
          )}
        </View>
        <View
          style={{
            position: "absolute",
            right: 4,
            bottom: 4,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppIcon name="edit" size={16} />
        </View>
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
      </FocusSheet>
      {error ? (
        <AppText role="caption" secondary  accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}