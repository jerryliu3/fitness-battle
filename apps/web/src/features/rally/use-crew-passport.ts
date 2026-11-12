"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { crewSessionDraftId, emptyCrewProgram, readLocalCrewProgram, mutateLocalCrewProgram, type LocalCrewProgram, type CrewOverviewInput, type CrewPassport, type CrewPassportMutation } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";

export function useCrewPassport(crewId: string, input: CrewOverviewInput) {
  const { user, offlineMode } = useAuth();
  const [remote, setRemote] = useState<CrewPassport>();
  const [local, setLocal] = useState<LocalCrewProgram>();
  const [error, setError] = useState("");
  const key = `fb-local-crew-program:v1:${user?.id}:${crewId}`;
  const snapshot = useMemo(() => local ? readLocalCrewProgram(local, input) : undefined, [local, input.entries, input.members, input.now]);
  const latest = useRef({ input, snapshot }); latest.current = { input, snapshot };
  const serialized = snapshot ? JSON.stringify(snapshot) : undefined;
  useEffect(() => { if (offlineMode && user && serialized) { try { localStorage.setItem(key, serialized); } catch { setError("Could not save your crew on this device."); } } }, [offlineMode, key, serialized, user?.id]);
  const reload = useCallback(async () => {
    if (!user) return false;
    try {
      if (offlineMode) { const saved = localStorage.getItem(key); setLocal(saved ? JSON.parse(saved) : emptyCrewProgram()); }
      else {
        const response = await fetch(`/api/crews/passport?crewId=${encodeURIComponent(crewId)}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
        const result = await response.json();
        if (!response.ok) throw Error(response.status === 401 ? "Your session expired. Sign in again." : result.error || "Could not load crew programs.");
        setRemote(result);
      }
      setError(""); return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load crew programs."); return false; }
  }, [user?.id, offlineMode, key, crewId]);
  useEffect(() => { void reload(); }, [reload]);
  async function save(body: CrewPassportMutation) {
    if (!user || body.crewId !== crewId) throw Error("Sign in to manage your crew.");
    if (offlineMode) {
      if (!latest.current.snapshot) throw Error("Your crew is still loading.");
      const next = mutateLocalCrewProgram(latest.current.snapshot, latest.current.input, body, crewSessionDraftId());
      localStorage.setItem(key, JSON.stringify(next)); setLocal(next); setError(""); return;
    }
    const response = await fetch("/api/crews/passport", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok || result.persisted !== true) { if (response.status === 409) await reload(); throw Error(result.error || "Could not save your crew."); }
    if (!await reload()) throw Error("Saved. Refresh to load your updated crew.");
  }
  return { data: offlineMode ? snapshot?.passport : remote, error, reload, save, available: !!user, unavailable: "Sign in to manage your crew." };
}
