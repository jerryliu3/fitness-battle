"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { activityRoute, normalizeRouteReplay, type RouteReplaySample, type Activity } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { Sheet } from "@/ui/sheet";
import { webEnv } from "@/lib/env";
import { RouteStaticPreview } from "./route-static-preview";

const Replay = dynamic(() => import("./route-timelapse-map").then(m => m.RouteTimelapseMap), {
  ssr: false,
  loading: () => <p role="status">Loading route…</p>,
});

const ACTIVITY_REPLAY_INSETS = { top: 16, bottom: 16 };

export function ActivityRoute({ activity, milestone = false, units = "metric" }: { activity?: Activity; milestone?: boolean; units?: "us" | "metric" }) {
  const auth = useAuth();
  const [fetched, setFetched] = useState<{ id: string; owner?: string; detailedPolyline?: string; samples: RouteReplaySample[] } | null>(null);
  const fetchedLine = fetched?.id === activity?.id && fetched?.owner === auth.user?.id ? fetched?.detailedPolyline : undefined;
  const coordinates = useMemo(() => activityRoute(activity ? {...activity,detailedPolyline:fetchedLine ?? activity.detailedPolyline} : undefined), [activity?.summaryPolyline, activity?.detailedPolyline,fetchedLine]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || !activity || activity.routeReplay?.length || !auth.user || auth.offlineMode) return;
    const id = activity.id, owner = auth.user.id, controller = new AbortController();
    let alive = true;
    void fetch(`/api/fitness/replay?activityId=${encodeURIComponent(id)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) }).then(async response => {
      if (!response.ok) return { routeReplay: [] };
      return response.json();
    }).then(body => { if (alive) setFetched({ id, owner, detailedPolyline: typeof body.detailedPolyline === "string" ? body.detailedPolyline : undefined, samples: normalizeRouteReplay(body.routeReplay) }); }).catch(() => { /* Optional telemetry never prevents route playback. */ });
    return () => { alive = false; controller.abort(); };
  }, [open, activity?.id, activity?.routeReplay, auth.user?.id, auth.offlineMode]);
  const routeReplay = activity?.routeReplay?.length ? activity.routeReplay : (fetched?.id === activity?.id && fetched?.owner === auth.user?.id ? fetched?.samples : undefined);
  if (!coordinates || !activity) return null;
  return <div className="club-activity-route">
    {activity.id.startsWith("local-route-") && <p className="fb-note">Local file preview · original activity date · Open only</p>}
    <RouteStaticPreview coordinates={coordinates} width={600} height={260} strokeColor="176c75"
      playLabel="Explore" alt="Explore route" onClick={() => setOpen(true)} />
    <Sheet open={open} onClose={() => setOpen(false)} title="Your route" body="" fullScreen>
      <div className="club-activity-replay">
        {open && (webEnv.mapboxAccessToken
          ? <Replay key={activity.id} coordinates={coordinates} routeReplay={routeReplay ?? undefined} units={units} running={activity.sport === "running"} mode="2d-overview" autoPlay={false} showModeControl hudInsets={ACTIVITY_REPLAY_INSETS} className="club-route-player" />
          : <div className="club-route-outline"><RouteStaticPreview coordinates={coordinates} showPlayBadge={false} strokeColor="f7c948" />
              <p className="fb-note">Route outline only. Interactive maps and flyovers are currently unavailable.</p>
            </div>)}
        <details className="club-route-notes">
          <summary>About this route</summary>
          {activity.elevationGainM != null && <p>{activity.elevationGainM.toLocaleString()} m elevation gain</p>}
          {milestone && <p>Full activity route · the record segment is not identified.</p>}
          <p>Replay follows recorded GPS points. Playback speed is illustrative. Speed may be calculated from the recorded GPS interval.</p>
        </details>
      </div>
    </Sheet>
  </div>;
}
