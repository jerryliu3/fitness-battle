import { NavigationAction, textStyle } from "./section";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { activityRoute, normalizeRouteReplay, type RouteReplaySample, type Activity } from "@fitness-battle/shared";
import { FocusSheet } from "./focus";
import { RouteStaticPreview } from "./route-static-preview";
import { RouteTimelapse } from "./route-timelapse";

import { useAuth } from "../lib/auth";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";

export function ActivityRoute({ activity, milestone = false, units = "metric" }: { activity?: Activity; milestone?: boolean; units?: "us" | "metric" }) {
  const auth = useAuth();
  const [fetched, setFetched] = useState<{ id: string; owner?: string; samples: RouteReplaySample[] } | null>(null);
  const coordinates = useMemo(() => activityRoute(activity), [activity?.summaryPolyline, activity?.detailedPolyline]);
  const [open, setOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (!open || !activity || activity.routeReplay || !auth.user || auth.offlineMode) return;
    const id = activity.id, owner = auth.user.id, controller = new AbortController();
    let alive = true;
    void requestApi<{ routeReplay: unknown }>(mobileEnv.apiUrl, auth.accessToken, `/api/fitness/replay?activityId=${encodeURIComponent(id)}`).then(body => { if (alive) setFetched({ id, owner, samples: normalizeRouteReplay(body.routeReplay) }); }).catch(() => { /* Optional telemetry never prevents route playback. */ });
    return () => { alive = false; controller.abort(); };
  }, [open, activity?.id, activity?.routeReplay, auth.user?.id, auth.offlineMode, auth.accessToken]);
  const routeReplay = activity?.routeReplay ?? (fetched?.id === activity?.id && fetched?.owner === auth.user?.id ? fetched?.samples : undefined);
  if (!coordinates || !activity) return null;
  const show = () => { setUnavailable(false); setOpen(true); };
  return <View style={{ gap: 8 }}>
    {activity.id.startsWith("local-route-") && <Text style={textStyle("caption")}>Local file preview · original activity date · Open only</Text>}
    <RouteStaticPreview coordinates={coordinates} height={260} strokeColor="176c75" showPlayBadge={false} onPress={show} />
    <NavigationAction label="Explore route · 2D / 3D" onPress={show} />
    <FocusSheet open={open} title="Your route" onClose={() => setOpen(false)} fullScreen>
      {activity.elevationGainM != null && <Text style={textStyle("caption")}>{activity.elevationGainM.toLocaleString()} m elevation gain</Text>}
      {milestone && <Text style={textStyle("caption")}>Full activity route · the record segment is not identified.</Text>}
      {open && (unavailable ? <><RouteStaticPreview coordinates={coordinates} showPlayBadge={false} /><Text style={textStyle("caption")}>Route outline only. Interactive maps and flyovers are currently unavailable.</Text></>
        : <RouteTimelapse key={activity.id} coordinates={coordinates} routeReplay={routeReplay ?? undefined} units={units} mode="2d-overview" onUnavailable={() => setUnavailable(true)} />)}
      <Text style={textStyle("caption")}>Replay follows recorded GPS points. Playback speed is illustrative. Sensor readings appear only when recorded samples are available. Speed may be calculated from the recorded GPS interval.</Text>
    </FocusSheet>
  </View>;
}
