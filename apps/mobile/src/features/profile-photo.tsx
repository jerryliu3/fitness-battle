import {
  buildAvatarCleanupPathsForProfileChange,
  getCanonicalAvatarObjectPath,
  initialsFromName,
  type CompeteState,
} from "@fitness-battle/shared";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { decodePhoto } from "../lib/profile-photo";
import { supabase } from "../lib/supabase";
import { SHELL_COLORS as c } from "../theme";
import { FocusButton, f } from "../ui/focus";

export function ProfilePhoto({ state }: { state: CompeteState }) {
  const { user, demoMode } = useAuth();
  const { dispatch } = useCompeteStore();
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
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
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.65,
          base64: true,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        if (!asset.base64)
          throw new Error(
            "Could not read that photo. Please choose another image.",
          );
        const bytes = decodePhoto(asset.base64);
        if (bytes.byteLength > 5 * 1024 * 1024)
          throw new Error("Choose a photo smaller than 5 MB.");
        if (!mounted.current || ownerRef.current !== id) return;
        if (demoMode || user.mode === "demo") {
          url = `data:image/jpeg;base64,${asset.base64}`;
        } else {
          const path = getCanonicalAvatarObjectPath(id);
          const { error } = await supabase.storage
            .from("avatars")
            .upload(path, bytes, { upsert: true, contentType: "image/jpeg" });
          if (error) throw error;
          url = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
        }
      }
      if (remove && !demoMode && user.mode !== "demo") {
        const { error } = await supabase.storage.from("avatars").remove(
          buildAvatarCleanupPathsForProfileChange({
            userId: id,
            previousAvatarUrl: state.avatarUrl,
            nextAvatarUrl: null,
          }),
        );
        if (error) throw error;
      }
      if (mounted.current && ownerRef.current === id)
        dispatch({ type: "set-avatar", avatarUrl: url, accountId: id });
    } catch (e) {
      if (mounted.current && ownerRef.current === id)
        setError(
          e instanceof Error ? e.message : "Could not update your photo.",
        );
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={{ alignItems: "center", gap: 8, maxWidth: 130 }}>
      <View
        style={{
          width: 86,
          height: 86,
          borderRadius: 43,
          backgroundColor: c.ink,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {state.avatarUrl ? (
          <Image
            source={{ uri: state.avatarUrl }}
            accessibilityLabel="Profile photo"
            style={{ width: 86, height: 86 }}
          />
        ) : (
          <Text style={[f.h2, { color: c.tennis }]}>
            {initialsFromName(state.name)}
          </Text>
        )}
      </View>
      {user ? (
        <FocusButton
          label={busy ? "Updating…" : "Change photo"}
          secondary
          disabled={busy}
          onPress={() => void change()}
        />
      ) : null}
      {user && state.avatarUrl ? (
        <FocusButton
          label="Remove photo"
          secondary
          disabled={busy}
          onPress={() => void change(true)}
        />
      ) : null}
      {error ? (
        <Text style={f.small} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
