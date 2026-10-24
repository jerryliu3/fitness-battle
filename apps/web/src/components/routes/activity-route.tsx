"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { activityRoute, type Activity } from "@fitness-battle/shared";
import { Sheet } from "@/ui/sheet";
import { webEnv } from "@/lib/env";
import { RouteStaticPreview } from "./route-static-preview";

const Replay = dynamic(() => import("./route-timelapse-map").then(m => m.RouteTimelapseMap), {
  ssr: false,
  loading: () => <p role="status">Loading route…</p>,
});

export function ActivityRoute({ activity, milestone = false, units = "metric" }: { activity?: Activity; milestone?: boolean; units?: "us" | "metric" }) {
  const coordinates = useMemo(() => activityRoute(activity), [activity?.summaryPolyline, activity?.detailedPolyline]);
  const [open, setOpen] = useState(false);
  if (!coordinates || !activity) return null;
  return <div className="club-activity-route">
    {activity.id.startsWith("local-route-") && <p className="fb-note">Local file preview · original activity date · Open only</p>}
    <RouteStaticPreview coordinates={coordinates} width={600} height={260} strokeColor="176c75"
      showPlayBadge={false} alt="Recorded GPS route. Open route overview and flyover." onClick={() => setOpen(true)} />
    <button type="button" className="club-route-open" onClick={() => setOpen(true)}>Explore route <span>2D map · 3D flyover ↗</span></button>
    <Sheet open={open} onClose={() => setOpen(false)} title="Your route" body="" fullScreen>
      {activity.elevationGainM != null && <p className="fb-note">{activity.elevationGainM.toLocaleString()} m elevation gain</p>}
      {milestone && <p className="fb-note">Full activity route · the record segment is not identified.</p>}
      {open && (webEnv.mapboxAccessToken
        ? <Replay key={activity.id} coordinates={coordinates} units={units} mode="2d-overview" autoPlay={false} className="club-route-player" />
        : <><RouteStaticPreview coordinates={coordinates} showPlayBadge={false} strokeColor="f7c948" /><p className="fb-note">Route outline only. Interactive maps and flyovers are currently unavailable.</p></>)}
      <p className="fb-note">Replay follows recorded GPS points. Playback speed is illustrative.</p>
    </Sheet>
  </div>;
}
