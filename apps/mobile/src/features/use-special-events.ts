import { useCallback } from "react";
import type { SpecialEventEdition } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";
import { useCachedApi } from "../lib/use-cached-api";

export function useSpecialEvents(enabled: boolean) {
  const { user, accessToken, offlineMode } = useAuth();
  const live = Boolean(enabled && user && !offlineMode && accessToken);
  const api = useCachedApi<{ editions: SpecialEventEdition[] }>(live ? "/api/special-events" : null);

  const reload = useCallback(async () => {
    await api.reload();
  }, [api.reload]);

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
      await reload();
    },
    [accessToken, reload],
  );

  const cancel = useCallback(
    async (editionId: string) => {
      await requestApi(mobileEnv.apiUrl, accessToken, "/api/special-events", {
        body: { action: "cancel", editionId },
      });
      await reload();
    },
    [accessToken, reload],
  );

  return {
    editions: Array.isArray(api.data?.editions) ? api.data.editions : [],
    busy: api.busy,
    error: api.error,
    reload,
    register,
    cancel,
  };
}
