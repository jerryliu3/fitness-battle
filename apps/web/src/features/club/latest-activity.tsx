"use client";
import { UserAvatar } from "@/ui/user-avatar";
import { RouteStaticPreview } from "@/components/routes/route-static-preview";
import { AppText, AppParagraph, SectionHeader, Section } from "@/ui/section";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { APP_TIMEZONE, activityRoute, clubDuration, formatVolume, homeRecentActivities, sportActivityMark, sportById, type Activity, type CompeteState } from "@fitness-battle/shared";
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
    {rows.length > 0 && <Section className="club-latest" title="Latest activity">
      {rows.map(row => { const route = activityRoute(row.ownActivity); return <button key={`${row.userId}:${row.id}`} type="button" className="club-activity-row" onClick={() => row.ownActivity ? onOpen(row.ownActivity) : setSelected({ account: user?.id, id: row.id })}>
        <span className={route ? "club-activity-map" : "club-activity-icon club-activity-sport"}>{route ? <RouteStaticPreview coordinates={route} width={128} height={128} padding={16} strokeWidth={3} showMarkers={false} showPlayBadge={false} alt="Activity route" /> : <UserAvatar src={row.avatarUrl} name={row.name} size={48} fallback={<span aria-hidden="true">{sportActivityMark(row.sport)}</span>} />}</span>
        <span><b>{row.ownActivity ? sportById(row.sport).name : `${row.name} · ${sportById(row.sport).name}`} · {clubDuration(row.movingSec)}</b>
          <AppText as="small" role="body" secondary>{row.verified ? "GPS Tracked" : row.source === "manual" ? "Manual activity" : "Activity"}</AppText></span>
        <span><AppText as="small" role="body" secondary>{new Date(row.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })}</AppText><span aria-hidden="true">→</span></span>
      </button>; })}
    </Section>}
    {crew.error && <AppParagraph typographyRole="caption" role="status" className="fb-note">{crew.error}</AppParagraph>}
    <Sheet open={Boolean(detail)} title={detail ? `${detail.name}'s activity` : "Activity"} body="" onClose={() => setSelected(null)}>
      {detail && <><SectionHeader title={sportById(detail.sport).name}/><AppParagraph typographyRole="body" className="fb-copy">{clubDuration(detail.movingSec)} · {formatVolume(detail.sport, detail.distanceM, detail.movingSec, state.units)}</AppParagraph>
        <AppParagraph typographyRole="caption" className="fb-note">{new Date(detail.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE, timeZoneName: "short" })}</AppParagraph></>}
    </Sheet>
  </>;
}
