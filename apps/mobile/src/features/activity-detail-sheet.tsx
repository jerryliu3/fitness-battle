import { useCompeteStore } from "../lib/compete-store";
import { FocusSheet } from "../ui/focus";
import { ActivityDetailView } from "./session-stage";
import type { Activity, CompeteState, UnitSystem } from "@fitness-battle/shared";

export function ActivityDetailSheet({
  activity,
  units,
  state: stateProp,
  onRemove,
  onClose,
}: {
  activity: Activity | null;
  units?: UnitSystem;
  state?: CompeteState;
  onRemove?: (id: string) => void;
  onClose: () => void;
}) {
  const store = useCompeteStore();
  const state = stateProp ?? store.state;
  const effectiveState = units && state && state.units !== units ? { ...state, units } : state;
  const canDeleteOwned = Boolean(
    activity &&
      store.canWrite &&
      store.state?.activities.some((item) => item.id === activity.id),
  );
  const handleRemove =
    onRemove ??
    (canDeleteOwned
      ? (id: string) => {
          store.dispatch({ type: "set-disposition", activityId: id, disposition: "excluded" });
          onClose();
        }
      : undefined);

  return (
    <FocusSheet fastOpen open={Boolean(activity)} title="Your activity" onClose={onClose}>
      {activity && effectiveState ? (
        <ActivityDetailView
          key={activity.id}
          activity={activity}
          state={effectiveState}
          onRemove={handleRemove}
        />
      ) : null}
    </FocusSheet>
  );
}
