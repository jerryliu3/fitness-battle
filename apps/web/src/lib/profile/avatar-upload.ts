import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAvatarCleanupPathsForProfileChange,
  getCanonicalAvatarObjectPath,
} from "@fitness-battle/shared";

const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1024;

export function validateAvatarFile(file: File): string | null {
  if (file.size > AVATAR_MAX_BYTES) {
    return "Profile photo must be 5 MB or smaller.";
  }
  if (!file.type.startsWith("image/")) {
    return "Please select an image file (JPEG, PNG, WebP).";
  }
  return null;
}

/**
 * Resize and optimize an image file to JPEG using HTML Canvas.
 */
async function processImageFile(
  file: File,
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not initialize canvas context."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not convert canvas to image blob."));
              return;
            }
            resolve({ blob, dataUrl });
          },
          "image/jpeg",
          0.9,
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadWebProfileAvatar({
  file,
  userId,
  previousAvatarUrl,
  supabase,
  requireStorage = false,
}: {
  file: File;
  userId?: string | null;
  previousAvatarUrl?: string | null;
  supabase?: SupabaseClient | null;
  /** When true (signed-in athlete), never fall back to a base64 data URL. */
  requireStorage?: boolean;
}): Promise<string> {
  const error = validateAvatarFile(file);
  if (error) {
    throw new Error(error);
  }

  const { blob, dataUrl } = await processImageFile(file);

  const mustStore = requireStorage || Boolean(supabase && userId);
  if (mustStore) {
    if (!supabase || !userId) {
      throw new Error("Sign in again to update your photo.");
    }
    const canonicalPath = getCanonicalAvatarObjectPath(userId);
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(canonicalPath, blob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(
        uploadError.message || "Could not upload profile photo. Try again.",
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(canonicalPath);

    const nextAvatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const cleanupPaths = buildAvatarCleanupPathsForProfileChange({
      userId,
      previousAvatarUrl,
      nextAvatarUrl,
    });
    if (cleanupPaths.length > 0) {
      void supabase.storage.from(AVATAR_BUCKET).remove(cleanupPaths);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: nextAvatarUrl })
      .eq("id", userId);
    if (profileError) {
      throw new Error(profileError.message || "Could not save profile photo.");
    }

    return nextAvatarUrl;
  }

  // Guest / demo only: keep a local optimized data URL.
  return dataUrl;
}

export async function removeWebProfileAvatar({
  userId,
  previousAvatarUrl,
  supabase,
}: {
  userId?: string | null;
  previousAvatarUrl?: string | null;
  supabase?: SupabaseClient | null;
}): Promise<null> {
  if (supabase && userId) {
    if (previousAvatarUrl) {
      try {
        const cleanupPaths = buildAvatarCleanupPathsForProfileChange({
          userId,
          previousAvatarUrl,
          nextAvatarUrl: null,
        });
        if (cleanupPaths.length > 0) {
          await supabase.storage.from(AVATAR_BUCKET).remove(cleanupPaths);
        }
      } catch {
        // Storage cleanup is best-effort.
      }
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);
    if (profileError) {
      throw new Error(profileError.message || "Could not remove profile photo.");
    }
  }
  return null;
}
