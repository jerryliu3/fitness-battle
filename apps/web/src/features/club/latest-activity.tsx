"use client";
import { RouteStaticPreview } from "@/components/routes/route-static-preview";
import { AppText, AppParagraph, SectionHeader, Section } from "@/ui/section";
import { WorkoutSizeIcon } from "@/ui/workout-size-icon";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { accountTimeZone, activityRoute, clubDuration, formatAccountDateTime, formatVolume, homeRecentActivities, workoutSizeSummary, sportById, type Activity, type CompeteState } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCrewActivities } from "@/features/rally/use-crew-activities";
import { Sheet } from "@/ui/sheet";

export function LatestActivity({ state, onOpen }: { state: CompeteState; onOpen: (activity: Activity) => void }) {
  const displayTz = accountTimeZone(state);
  const { user } = useAuth();
  const crew = useCrewActivities(usePathname() === "/today");
  const rows = homeRecentActivities(state, user?.id, crew.activities);
  const [selected, setSelected] = useState<{ userId: string; id: string } | null>(null);
  const detail = selected ? rows.find(row => !row.ownActivity && row.userId === selected.userId && row.id === selected.id) ?? null : null;
  const detailRoute = detail ? activityRoute(detail) : null;
  return <>
    <Section className="club-latest" title="Latest activity">
      {rows.length > 0 ? (
        rows.map(row => {
          const route = activityRoute(row.ownActivity ?? row);
          const effort = route ? null : workoutSizeSummary(row.ownActivity ?? row, state.activities);
          return <button key={`${row.userId}:${row.id}`} type="button" className="club-activity-row" onClick={() => row.ownActivity ? onOpen(row.ownActivity) : setSelected({ userId: row.userId, id: row.id })}>
          <span className="club-activity-map">{route ? <RouteStaticPreview coordinates={route} width={128} height={128} padding={16} strokeWidth={3} showMarkers={false} showPlayBadge={false} alt="Activity route" /> : <WorkoutSizeIcon bars={effort!.bars} />}</span>
          <span><b>{row.ownActivity ? `You · ${sportById(row.sport).name}` : `${row.name} · ${sportById(row.sport).name}`} · {clubDuration(row.movingSec)}</b>
            <AppText as="small" role="support" secondary>{row.verified ? "GPS Tracked" : row.source === "manual" ? "Manual activity" : "Activity"}</AppText></span>
          <span><AppText as="small" role="caption" secondary>{new Date(row.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: displayTz })}</AppText><span aria-hidden="true">→</span></span>
        </button>; })
      ) : (
        <AppParagraph typographyRole="body" className="fb-copy">No recent activity yet.</AppParagraph>
      )}
    </Section>
    {crew.error && <AppParagraph typographyRole="caption" role="status" className="fb-note">{crew.error}</AppParagraph>}
    <Sheet open={Boolean(detail)} title={detail ? `${detail.name}'s activity` : "Crewmate activity"} body="" onClose={() => setSelected(null)}>
      {detail && <><SectionHeader title={`${detail.name} · ${sportById(detail.sport).name}`}/>
        {detailRoute && <RouteStaticPreview coordinates={detailRoute} width={600} height={320} strokeColor="176c75" showMarkers showPlayBadge={false} alt={`${detail.name}'s route`} />}
        <AppParagraph typographyRole="body" className="fb-copy">Crewmate · {clubDuration(detail.movingSec)} · {formatVolume(detail.sport, detail.distanceM, detail.movingSec, state.units)}</AppParagraph>
        <AppParagraph typographyRole="caption" className="fb-note">{formatAccountDateTime(state, detail.startedAt)}</AppParagraph></>}
    </Sheet>
  </>;
}
