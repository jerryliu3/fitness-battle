"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { crewDerbyOpponent, crewDerbyScore, weeklyCompetitionLastDay, APP_TIMEZONE, type CrewDerby, type UnitSystem } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { AppHeading, AppText } from "@/ui/section";
import { Sheet } from "@/ui/sheet";

export function CrewDerbyCard({ crewId, units }: { crewId: string; units?: UnitSystem }) {
  const { user, offlineMode } = useAuth();
  const [derby, setDerby] = useState<CrewDerby | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const reload = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/crews/derby?crewId=${encodeURIComponent(crewId)}`, { cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
    if (!response.ok) throw Error("Crew Derby could not refresh.");
    const result = await response.json();
    setDerby(result.derby); setError("");
  }, [crewId]);
  useEffect(() => {
    if (!user || offlineMode) return;
    const controller = new AbortController();
    void reload(controller.signal).catch(() => { if (!controller.signal.aborted) setError("Crew Derby unavailable."); });
    const refresh = () => { if (!document.hidden) void reload(controller.signal).catch(() => setError("Crew Derby could not refresh.")); };
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, [user?.id, offlineMode, reload]);
  const own = derby?.teams.find(team => team.crew_id === crewId);
  const opponent = derby && crewDerbyOpponent(derby, crewId);
  if (!derby || !own || !opponent) return null;
  return <>
    <button type="button" className="crew-derby-card" onClick={() => { setOpen(true); void reload().catch(() => setError("Crew Derby could not refresh.")); }}>
      <AppText role="caption">Crew Derby</AppText>
      <span className="crew-derby-pair"><span><strong>{own.name}</strong><AppText role="value">{crewDerbyScore(derby.sport, own.score, units)}</AppText></span><span aria-hidden="true">vs</span><span><strong>{opponent.name}</strong><AppText role="value">{crewDerbyScore(derby.sport, opponent.score, units)}</AppText></span></span>
    </button>
    <Sheet open={open} title="Crew Derby" body="" minimal onClose={() => setOpen(false)}>
      <div className="crew-editor"><AppText role="caption">{new Date(derby.wave_start).toLocaleDateString("en-US", { timeZone: APP_TIMEZONE })} – {weeklyCompetitionLastDay(new Date(derby.week_end)).toLocaleDateString("en-US", { timeZone: APP_TIMEZONE })} · {derby.sport}</AppText>
      <AppHeading level={3} role="heading">Crew standings</AppHeading>
      {derby.teams.map(team => <div className="crew-derby-standing" key={team.crew_id} aria-label={`${team.name}, place ${team.place}, ${crewDerbyScore(derby.sport, team.score, units)}`}><AppText role="caption">{team.place}</AppText><AppText role="row">{team.name}{team.crew_id === crewId ? " · Us" : ""}</AppText><AppText role="value">{crewDerbyScore(derby.sport, team.score, units)}</AppText></div>)}
      <AppText role="caption" secondary>Each crew’s total is the sum of its registered members’ normal event scores.</AppText>
      {error && <AppText role="caption" role="status">{error}</AppText>}
      <Link className="fb-btn" onClick={() => setOpen(false)} href={`/arena?event=${derby.sport}`}>Open sport event</Link></div>
    </Sheet>
  </>;
}
