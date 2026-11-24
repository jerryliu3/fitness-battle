"use client";

import { loadCrewInvitePreview, type CrewInvitePreviewPayload } from "@fitness-battle/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  clearPendingCrewInvite,
  readPendingCrewAccept,
  readPendingCrewInvite,
  stashPendingCrewAccept,
  stashPendingCrewInvite,
} from "@/lib/guest-entry";

export function useCrewInviteFlow({
  offlineMode,
  userId,
  joinCrew,
  onGuestAccept,
}: {
  offlineMode: boolean;
  userId: string | undefined;
  joinCrew: (code: string) => Promise<boolean>;
  onGuestAccept: () => void;
}) {
  const router = useRouter();
  const path = usePathname();
  const searchParams = useSearchParams();
  const inviteParam = searchParams.get("invite")?.trim() ?? "";

  const [inviteCode, setInviteCode] = useState("");
  const [invitePreview, setInvitePreview] = useState<CrewInvitePreviewPayload | null>(null);
  const [invitePreviewLoading, setInvitePreviewLoading] = useState(false);
  const [invitePreviewError, setInvitePreviewError] = useState<string | null>(null);
  const [inviteJoinBusy, setInviteJoinBusy] = useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get("invite")?.trim() ?? "";
    const fromStash = readPendingCrewInvite() ?? "";
    const merged = (fromUrl || fromStash).toUpperCase();
    if (!merged) {
      setInviteCode("");
      setInvitePreview(null);
      setInvitePreviewError(null);
      return;
    }
    stashPendingCrewInvite(merged);
    setInviteCode((prev) => {
      if (prev && prev !== merged) stashPendingCrewAccept(false);
      return merged;
    });
    if (fromUrl) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("invite");
      const qs = next.toString();
      router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
    }
  }, [searchParams, router, path]);

  useEffect(() => {
    if (!inviteCode || offlineMode) return;
    let cancelled = false;
    setInvitePreviewLoading(true);
    setInvitePreviewError(null);
    void loadCrewInvitePreview("/api/crews/invite-preview", inviteCode)
      .then((payload) => {
        if (!cancelled) setInvitePreview(payload);
      })
      .catch((error) => {
        if (!cancelled) {
          setInvitePreview(null);
          setInvitePreviewError(error instanceof Error ? error.message : "Could not load this invitation.");
        }
      })
      .finally(() => {
        if (!cancelled) setInvitePreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteCode, offlineMode]);

  const clearInviteFlow = useCallback(() => {
    clearPendingCrewInvite();
    stashPendingCrewAccept(false);
    setInviteCode("");
    setInvitePreview(null);
    setInvitePreviewError(null);
    setInviteJoinBusy(false);
  }, []);

  const acceptInvite = useCallback(async () => {
    if (!inviteCode) return;
    if (!userId) {
      stashPendingCrewAccept(true);
      onGuestAccept();
      return;
    }
    setInviteJoinBusy(true);
    const ok = await joinCrew(inviteCode);
    setInviteJoinBusy(false);
    if (ok) clearInviteFlow();
  }, [inviteCode, userId, joinCrew, onGuestAccept, clearInviteFlow]);

  useEffect(() => {
    if (!userId || offlineMode || !inviteCode || !readPendingCrewAccept()) return;
    stashPendingCrewAccept(false);
    setInviteJoinBusy(true);
    void joinCrew(inviteCode).then((ok) => {
      setInviteJoinBusy(false);
      if (ok) clearInviteFlow();
    });
  }, [userId, offlineMode, inviteCode, joinCrew, clearInviteFlow]);

  return {
    inviteParam,
    inviteCode,
    invitePreview,
    invitePreviewLoading,
    invitePreviewError,
    inviteJoinBusy,
    clearInviteFlow,
    acceptInvite,
  };
}