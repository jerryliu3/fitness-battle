import { useThemeColors } from "../theme";
import { playCue } from "../lib/haptics";
import { RankAvatar } from "../ui/rank-symbol";
import { AppText } from "../ui/section";
import {
  buildAvatarCleanupPathsForProfileChange,
  getCanonicalAvatarObjectPath,
  APP_ICON_PATHS,
  effectiveRankSymbol,
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

import { AnchoredMenu, AnchoredMenuItem, useAnchoredMenu } from "../ui/anchored-menu";

export function ProfilePhoto({ state }: { state: CompeteState }) {
const c=useThemeColors();

  const { user, offlineMode } = useAuth();
  const { dispatch } = useCompeteStore();
  const [busy, setBusy] = useState(false);
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
  const photoMenu = useAnchoredMenu({ minWidth: 196, estimatedHeight: 112 });
  return (
    <View style={{ alignItems: "center", gap: 8, maxWidth: 130 }}>
      <View ref={photoMenu.anchorRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profile photo options"
          accessibilityState={{ expanded: photoMenu.open }}
          disabled={!user || busy}
          onPress={() => {
            if (!user || busy) return;
            photoMenu.toggle();
          }}
          style={{
            width: 144,
            height: 144,
            alignItems: "center",
            justifyContent: "center",
            overflow: "visible",
            alignSelf: "center",
          }}
        >
          <RankAvatar
            rank={effectiveRankSymbol(state)}
            src={state.avatarUrl}
            name={state.name}
            size={144}
            fallback={<Svg width={48} height={48} viewBox="0 0 24 24">
              <Path
                d={APP_ICON_PATHS.person}
                fill={c.muted} stroke="none"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>}
          />
        </Pressable>
      </View>
      <AnchoredMenu
        open={photoMenu.open}
        menuLayout={photoMenu.menuLayout}
        accessibilityLabel="Close profile photo menu"
        onDismiss={() => {
          const id = pendingPickerOwner.current;
          pendingPickerOwner.current = null;
          if (id && mounted.current && ownerRef.current === id) void change();
        }}
        onClose={() => {
          if (!busy) photoMenu.close();
        }}
      >
        <AnchoredMenuItem
          label={busy ? "Updating…" : "Choose photo"}
          disabled={busy}
          last={!state.avatarUrl}
          onPress={() => {
            if (!user || flight.current || pendingPickerOwner.current) return;
            // UIKit must finish dismissing our menu before presenting the picker.
            pendingPickerOwner.current = user.id;
            photoMenu.close();
          }}
        />
        {state.avatarUrl ? (
          <AnchoredMenuItem
            label="Delete photo"
            destructive
            disabled={busy}
            last
            onPress={() => {
              photoMenu.close();
              void change(true);
            }}
          />
        ) : null}
      </AnchoredMenu>
      {error ? (
        <AppText role="caption" secondary  accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
