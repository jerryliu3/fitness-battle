import { getCanonicalAvatarObjectPath } from "@fitness-battle/shared";
import { supabase } from "./supabase";

export async function uploadNativeProfileAvatar(bytes: ArrayBuffer, userId: string) {
  const path = getCanonicalAvatarObjectPath(userId);
  const { error } = await supabase.storage.from("avatars").upload(path, bytes, { upsert: true, contentType: "image/jpeg" });
  if (error) throw error;
  return `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}
