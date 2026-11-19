"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpecialEventEdition } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";

export function useSpecialEvents(active: boolean) {
  const { user } = useAuth();
  const enabled = Boolean(user && user.mode === "supabase");
  const [editions, setEditions] = useState<SpecialEventEdition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const accountRef = useRef(user?.id ?? "");
  accountRef.current = user?.id ?? "";

  const reload = useCallback(async () => {
    if (!enabled) {
      setEditions([]);
      setError("");
      return;
    }
    const owner = accountRef.current;
    setLoading(true);
    try {
      const response = await fetch("/api/special-events", { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const data = await response.json().catch(() => ({}));
      if (accountRef.current !== owner) return;
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "");
        return;
      }
      setEditions(Array.isArray(data.editions) ? (data.editions as SpecialEventEdition[]) : []);
      setError("");
    } catch {
      if (accountRef.current === owner) setError("Could not load special events.");
    } finally {
      if (accountRef.current === owner) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setEditions([]);
      setError("");
      return;
    }
    if (active) void reload();
  }, [enabled, active, user?.id, reload]);

  const mutate = useCallback(
    async (payload: Record<string, unknown>) => {
      const response = await fetch("/api/special-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not update special event registration.");
      }
      await reload();
      return data;
    },
    [reload],
  );

  const register = useCallback(
    (editionId: string, options?: { crewId?: string | null; groupValue?: string | null }) =>
      mutate({
        action: "register",
        editionId,
        crewId: options?.crewId ?? null,
        groupValue: options?.groupValue ?? null,
      }),
    [mutate],
  );

  const cancel = useCallback(
    (editionId: string) => mutate({ action: "cancel", editionId }),
    [mutate],
  );

  return { editions, loading, error, reload, register, cancel };
}
