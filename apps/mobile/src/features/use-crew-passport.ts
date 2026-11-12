import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { crewSessionDraftId, emptyCrewProgram, readLocalCrewProgram, mutateLocalCrewProgram, type LocalCrewProgram, type CrewOverviewInput, type CrewPassport, type CrewPassportMutation } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { useCachedApi } from "../lib/use-cached-api";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";

export function useCrewPassport(crewId: string, input: CrewOverviewInput) {
  const { user, accessToken, offlineMode } = useAuth();
  const api = useCachedApi<CrewPassport>(user && accessToken && !offlineMode ? `/api/crews/passport?crewId=${encodeURIComponent(crewId)}` : null);
  const [local, setLocal] = useState<LocalCrewProgram>();
  const [error, setError] = useState("");
  const key = `fb-local-crew-program:v1:${user?.id}:${crewId}`;
  const snapshot = useMemo(() => local ? readLocalCrewProgram(local, input) : undefined, [local, input.entries, input.members, input.now]);
  const latest = useRef({ input, snapshot }); latest.current = { input, snapshot };
  const serialized = snapshot ? JSON.stringify(snapshot) : undefined;
  useEffect(() => { if (offlineMode && user && serialized) void AsyncStorage.setItem(key, serialized).catch(() => setError("Could not save your crew on this device.")); }, [offlineMode, key, serialized, user?.id]);
  const reload = useCallback(async () => {
    if (!user) return false;
    if (!offlineMode) return api.reload();
    try { const saved = await AsyncStorage.getItem(key); setLocal(saved ? JSON.parse(saved) : emptyCrewProgram()); setError(""); return true; }
    catch { setError("Could not load crew programs on this device."); return false; }
  }, [user?.id, offlineMode, key, api.reload]);
  useEffect(() => { if (offlineMode) void reload(); }, [offlineMode, reload]);
  async function save(body: CrewPassportMutation) {
    if (!user || body.crewId !== crewId) throw Error("Sign in to manage your crew.");
    if (offlineMode) {
      if (!latest.current.snapshot) throw Error("Your crew is still loading.");
      const next = mutateLocalCrewProgram(latest.current.snapshot, latest.current.input, body, crewSessionDraftId());
      await AsyncStorage.setItem(key, JSON.stringify(next)); setLocal(next); setError(""); return;
    }
    await requestApi(mobileEnv.apiUrl, accessToken, "/api/crews/passport", { body });
    if (!await api.reload()) throw Error("Saved. Refresh to load your updated crew.");
  }
  return { data: offlineMode ? snapshot?.passport : api.data, error: error || api.error, reload, save, available: !!user && (offlineMode || !!accessToken), unavailable: user ? "Your session is unavailable. Sign in again." : "Sign in to manage your crew." };
}
