import {
  activityRoute,
  workoutSizeSummary,
  type Activity,
  type SportId,
} from "@fitness-battle/shared";
import { WorkoutSizeIcon } from "./workout-size-icon";
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
  const effort = workoutSizeSummary(activity, history);
  return <WorkoutSizeIcon bars={effort.bars} size={size} />;
}
