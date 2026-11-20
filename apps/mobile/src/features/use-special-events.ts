import { useCallback, useEffect, useRef, useState } from "react";
import type { SpecialEventEdition } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";

export function useSpecialEvents(enabled: boolean) {
  const { user, accessToken, offlineMode } = useAuth();
  const live = Boolean(enabled && user && !offlineMode && accessToken);
  const [editions, setEditions] = useState<SpecialEventEdition[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const accountRef = useRef(user?.id ?? "");
  accountRef.current = user?.id ?? "";

  const reload = useCallback(async (force = false) => {
    if (!live || !accessToken) {
      setEditions([]);
      setError("");
      return;
    }
    const owner = accountRef.current;
    setBusy(true);
    try {
      const data = await requestApi<{ editions: SpecialEventEdition[] }>(
        mobileEnv.apiUrl,
        accessToken,
        "/api/special-events",
        force ? {} : { cacheMs: 60_000 },
      );
      if (accountRef.current !== owner) return;
      setEditions(Array.isArray(data.editions) ? data.editions : []);
      setError("");
    } catch (err) {
      if (accountRef.current === owner) {
        setError(err instanceof Error ? err.message : "Could not load special events.");
      }
    } finally {
      if (accountRef.current === owner) setBusy(false);
    }
  }, [live, accessToken]);

  useEffect(() => {
    if (!live) {
      setEditions([]);
      setError("");
      return;
    }
    void reload(false);
  }, [live, user?.id, reload]);

  const register = useCallback(
    async (editionId: string, options?: { crewId?: string | null; groupValue?: string | null }) => {
      await requestApi(mobileEnv.apiUrl, accessToken, "/api/special-events", {
        body: {
          action: "register",
          editionId,
          crewId: options?.crewId ?? null,
          groupValue: options?.groupValue ?? null,
        },
      });
      await reload(true);
    },
    [accessToken, reload],
  );

  const cancel = useCallback(
    async (editionId: string) => {
      await requestApi(mobileEnv.apiUrl, accessToken, "/api/special-events", {
        body: { action: "cancel", editionId },
      });
      await reload(true);
    },
    [accessToken, reload],
  );

  return { editions, busy, error, reload, register, cancel };
}
