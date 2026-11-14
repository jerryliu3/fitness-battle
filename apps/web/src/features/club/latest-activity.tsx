"use client";
import { RouteStaticPreview } from "@/components/routes/route-static-preview";
import { AppText, AppParagraph, SectionHeader, Section } from "@/ui/section";
import { EffortBarsIcon } from "@/ui/effort-bars-icon";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { APP_TIMEZONE, activityRoute, clubDuration, formatVolume, homeRecentActivities, sessionEffortSummary, sportById, type Activity, type CompeteState } from "@fitness-battle/shared";
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
    <Section className="club-latest" title="Latest activity">
      {rows.length > 0 ? (
        rows.map(row => {
          const route = activityRoute(row.ownActivity);
          const effort = route ? null : sessionEffortSummary(row.ownActivity ?? row, state.activities);
          return <button key={`${row.userId}:${row.id}`} type="button" className="club-activity-row" onClick={() => row.ownActivity ? onOpen(row.ownActivity) : setSelected({ account: user?.id, id: row.id })}>
          <span className="club-activity-map">{route ? <RouteStaticPreview coordinates={route} width={128} height={128} padding={16} strokeWidth={3} showMarkers={false} showPlayBadge={false} alt="Activity route" /> : <EffortBarsIcon bars={effort!.bars} />}</span>
          <span><b>{row.ownActivity ? `You · ${sportById(row.sport).name}` : `${row.name} · ${sportById(row.sport).name}`} · {clubDuration(row.movingSec)}</b>
            <AppText as="small" role="support" secondary>{row.verified ? "GPS Tracked" : row.source === "manual" ? "Manual activity" : "Activity"}</AppText></span>
          <span><AppText as="small" role="caption" secondary>{new Date(row.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })}</AppText><span aria-hidden="true">→</span></span>
        </button>; })
      ) : (
        <AppParagraph typographyRole="body" className="fb-copy">No recent activity yet.</AppParagraph>
      )}
    </Section>
    {crew.error && <AppParagraph typographyRole="caption" role="status" className="fb-note">{crew.error}</AppParagraph>}
    <Sheet open={Boolean(detail)} title={detail ? `${detail.name}'s activity` : "Activity"} body="" onClose={() => setSelected(null)}>
      {detail && <><SectionHeader title={sportById(detail.sport).name}/><AppParagraph typographyRole="body" className="fb-copy">{clubDuration(detail.movingSec)} · {formatVolume(detail.sport, detail.distanceM, detail.movingSec, state.units)}</AppParagraph>
        <AppParagraph typographyRole="caption" className="fb-note">{new Date(detail.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE, timeZoneName: "short" })}</AppParagraph></>}
    </Sheet>
  </>;
}
