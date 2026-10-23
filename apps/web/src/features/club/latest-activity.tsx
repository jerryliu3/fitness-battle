"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { APP_TIMEZONE, clubDuration, formatVolume, homeRecentActivities, sportById, type Activity, type CompeteState } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCrewActivities } from "@/features/rally/use-crew-activities";
import { Sheet } from "@/ui/sheet";

export function LatestActivity({ state, onOpen }: { state: CompeteState; onOpen: (activity: Activity) => void }) {
  const { user } = useAuth();
  const crew = useCrewActivities(usePathname() === "/today");
  const rows = homeRecentActivities(state, user?.id, crew.activities);
  const [selected, setSelected] = useState<{ account?: string; id: string } | null>(null);
  const detail = selected?.account === user?.id ? rows.find(row => row.id === selected?.id) : null;
  return <>
    {rows.length > 0 && <section className="club-latest">
      <h2>Latest activity</h2>
      {rows.map(row => <button key={`${row.userId}:${row.id}`} type="button" className="club-activity-row" onClick={() => row.ownActivity ? onOpen(row.ownActivity) : setSelected({ account: user?.id, id: row.id })}>
        <span className="club-activity-icon" aria-hidden="true">{row.avatarUrl ? <img src={row.avatarUrl} alt="" style={{ width: 42, height: 42, borderRadius: 14, objectFit: "cover" }} /> : "↗"}</span>
        <span><b>{row.ownActivity ? sportById(row.sport).name : `${row.name} · ${sportById(row.sport).name}`} · {clubDuration(row.movingSec)}</b>
          <small>{row.verified ? "GPS Tracked" : row.source === "manual" ? "Manual activity" : "Activity"}</small></span>
        <span><small>{new Date(row.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })}</small><span aria-hidden="true">→</span></span>
      </button>)}
    </section>}
    {crew.error && <p role="status" className="fb-note">{crew.error}</p>}
    <Sheet open={Boolean(detail)} title={detail ? `${detail.name}'s activity` : "Activity"} body="" onClose={() => setSelected(null)}>
      {detail && <><h2>{sportById(detail.sport).name}</h2><p className="fb-copy">{clubDuration(detail.movingSec)} · {formatVolume(detail.sport, detail.distanceM, detail.movingSec, state.units)}</p>
        <p className="fb-note">{new Date(detail.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE, timeZoneName: "short" })}</p></>}
    </Sheet>
  </>;
}
