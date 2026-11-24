import { loadCrewInvitePreview, type CrewInvitePreviewPayload } from "@fitness-battle/shared";
import { useCallback, useEffect, useState } from "react";
import {
  clearPendingCrewInvite,
  readPendingCrewAccept,
  readPendingCrewInvite,
  stashPendingCrewAccept,
  stashPendingCrewInvite,
} from "../lib/guest-entry";
import { mobileEnv } from "../lib/env";

type InviteParams = string | string[] | undefined;

function inviteFromParams(raw: InviteParams): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() ?? "";
}

export function useCrewInviteFlow({
  inviteParam,
  userId,
  router,
  joinCrew,
  onGuestAccept,
}: {
  inviteParam: InviteParams;
  userId: string | undefined;
  router: { setParams: (params: Record<string, undefined>) => void };
  joinCrew: (code: string) => Promise<boolean>;
  onGuestAccept: () => void;
}) {
  const [inviteCode, setInviteCode] = useState("");
  const [invitePreview, setInvitePreview] = useState<CrewInvitePreviewPayload | null>(null);
  const [invitePreviewLoading, setInvitePreviewLoading] = useState(false);
  const [invitePreviewError, setInvitePreviewError] = useState<string | null>(null);
  const [inviteJoinBusy, setInviteJoinBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fromParams = inviteFromParams(inviteParam);
      const fromStash = (await readPendingCrewInvite()) ?? "";
      const merged = (fromParams || fromStash).toUpperCase();
      if (cancelled) return;
      if (!merged) {
        setInviteCode("");
        setInvitePreview(null);
        setInvitePreviewError(null);
        return;
      }
      await stashPendingCrewInvite(merged);
      setInviteCode((prev) => {
        if (prev && prev !== merged) void stashPendingCrewAccept(false);
        return merged;
      });
      if (fromParams) router.setParams({ invite: undefined });
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteParam, router]);

  useEffect(() => {
    if (!inviteCode) return;
    let cancelled = false;
    setInvitePreviewLoading(true);
    setInvitePreviewError(null);
    const endpoint = `${mobileEnv.apiUrl}/api/crews/invite-preview`;
    void loadCrewInvitePreview(endpoint, inviteCode)
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
  }, [inviteCode]);

  const clearInviteFlow = useCallback(() => {
    void clearPendingCrewInvite();
    void stashPendingCrewAccept(false);
    setInviteCode("");
    setInvitePreview(null);
    setInvitePreviewError(null);
    setInviteJoinBusy(false);
  }, []);

  const acceptInvite = useCallback(async () => {
    if (!inviteCode) return;
    if (!userId) {
      await stashPendingCrewAccept(true);
      onGuestAccept();
      return;
    }
    setInviteJoinBusy(true);
    const ok = await joinCrew(inviteCode);
    setInviteJoinBusy(false);
    if (ok) clearInviteFlow();
  }, [inviteCode, userId, joinCrew, onGuestAccept, clearInviteFlow]);

  useEffect(() => {
    if (!userId || !inviteCode) return;
    let cancelled = false;
    void (async () => {
      if (!(await readPendingCrewAccept()) || cancelled) return;
      await stashPendingCrewAccept(false);
      setInviteJoinBusy(true);
      const ok = await joinCrew(inviteCode);
      if (!cancelled) {
        setInviteJoinBusy(false);
        if (ok) clearInviteFlow();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, inviteCode, joinCrew, clearInviteFlow]);

  return {
    inviteCode,
    invitePreview,
    invitePreviewLoading,
    invitePreviewError,
    inviteJoinBusy,
    clearInviteFlow,
    acceptInvite,
  };
}