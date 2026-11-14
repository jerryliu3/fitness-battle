import {
  activityRoute,
  sessionEffortSummary,
  type Activity,
  type SportId,
} from "@fitness-battle/shared";
import { EffortBarsIcon } from "./effort-bars-icon";
import { RouteStaticPreview } from "./route-static-preview";

export type ActivityGraphicSubject = {
  id?: string;
  sport: SportId;
  distanceM: number;
  movingSec: number;
  startedAt: string;
  avgHr?: number | null;
};

/** Renders an activity's GPS route preview when present, or its 5-bar effort meter. */
export function ActivityLeadingGraphic({
  activity,
  routeActivity,
  history,
  size = 44,
}: {
  activity: ActivityGraphicSubject;
  routeActivity?: Activity | null;
  history: readonly Activity[];
  size?: number;
}) {
  const route = activityRoute(routeActivity ?? undefined);
  if (route) {
    return (
      <RouteStaticPreview
        coordinates={route}
        width={128}
        height={128}
        padding={16}
        strokeWidth={3}
        showMarkers={false}
        showPlayBadge={false}
        style={{ width: size, height: size, borderRadius: 12 }}
      />
    );
  }
  const effort = sessionEffortSummary(activity, history);
  return <EffortBarsIcon bars={effort.bars} size={size} />;
}
