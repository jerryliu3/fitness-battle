import { textStyle } from "./section";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { activityRoute, type Activity } from "@fitness-battle/shared";
import { FocusButton, FocusSheet, f } from "./focus";
import { RouteStaticPreview } from "./route-static-preview";
import { RouteTimelapse } from "./route-timelapse";

export function ActivityRoute({ activity, milestone = false, units = "metric" }: { activity?: Activity; milestone?: boolean; units?: "us" | "metric" }) {
  const coordinates = useMemo(() => activityRoute(activity), [activity?.summaryPolyline, activity?.detailedPolyline]);
  const [open, setOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  if (!coordinates || !activity) return null;
  const show = () => { setUnavailable(false); setOpen(true); };
  return <View style={{ gap: 8 }}>
    {activity.id.startsWith("local-route-") && <Text style={textStyle("caption")}>Local file preview · original activity date · Open only</Text>}
    <RouteStaticPreview coordinates={coordinates} height={260} strokeColor="176c75" showPlayBadge={false} onPress={show} />
    <FocusButton label="Explore route · 2D / 3D" secondary onPress={show} />
    <FocusSheet open={open} title="Your route" onClose={() => setOpen(false)} fullScreen>
      {activity.elevationGainM != null && <Text style={textStyle("caption")}>{activity.elevationGainM.toLocaleString()} m elevation gain</Text>}
      {milestone && <Text style={textStyle("caption")}>Full activity route · the record segment is not identified.</Text>}
      {open && (unavailable ? <><RouteStaticPreview coordinates={coordinates} showPlayBadge={false} /><Text style={textStyle("caption")}>Route outline only. Interactive maps and flyovers are currently unavailable.</Text></>
        : <RouteTimelapse key={activity.id} coordinates={coordinates} units={units} mode="2d-overview" onUnavailable={() => setUnavailable(true)} />)}
      <Text style={textStyle("caption")}>Replay follows recorded GPS points. Playback speed is illustrative.</Text>
    </FocusSheet>
  </View>;
}
