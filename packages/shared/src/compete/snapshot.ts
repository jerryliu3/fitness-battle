import { competeNow, migrateCompeteState, rollClock } from "./engine";
import type { CompeteState } from "./sports";

export interface CompeteEnvelope {
  savedAt: string;
  state: CompeteState;
}

export function isCompeteState(value: unknown): value is CompeteState {
  if (!value || typeof value !== "object") return false;
  const record = value as CompeteState;
  return record.version === 1 && Array.isArray(record.ratings);
}

/** Server snapshot wins when it is strictly newer than this device. */
export function chooseCompeteState(
  local: CompeteEnvelope,
  remote: { updatedAt: string; state: unknown } | null,
): CompeteState {
  if (!remote || !isCompeteState(remote.state)) return local.state;
  const remoteAt = Date.parse(remote.updatedAt);
  const localAt = Date.parse(local.savedAt);
  if (Number.isNaN(remoteAt)) return local.state;
  if (!Number.isNaN(localAt) && localAt >= remoteAt) return local.state;
  return migrateCompeteState(remote.state);
}

function sameDocument(left: CompeteState, right: CompeteState): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Fold server activities and the hydrated crew board into an unsaved device copy. */
function mergeFreshRemote(
  local: CompeteState,
  remote: CompeteState,
  holdLocalUnits: boolean,
): CompeteState {
  const activityIds = new Set(local.activities.map((activity) => activity.id));
  const activities = [...local.activities];
  for (const activity of remote.activities) {
    if (!activityIds.has(activity.id)) activities.push(activity);
  }
  const nightIds = new Set(local.sleepNights.map((night) => night.id));
  const sleepNights = [...local.sleepNights];
  for (const night of remote.sleepNights) {
    if (!nightIds.has(night.id)) sleepNights.push(night);
  }
  const readinessIds = new Set(local.readiness.map((mark) => mark.id));
  const readiness = [...local.readiness];
  for (const mark of remote.readiness) {
    if (!readinessIds.has(mark.id)) readiness.push(mark);
  }
  const enrollments = local.enrollments.map((localEnr) => {
    const remoteEnr =
      remote.enrollments.find(
        (r) =>
          r.sport === localEnr.sport && r.waveStart === localEnr.waveStart,
      ) ??
      remote.enrollments.find((r) => r.sport === localEnr.sport);
    if (!remoteEnr) return localEnr;
    return {
      ...localEnr,
      peerIds: remoteEnr.peerIds,
      syntheticIds: remoteEnr.syntheticIds,
      crewId: remoteEnr.crewId !== undefined ? remoteEnr.crewId : localEnr.crewId,
    };
  });
  const merged = rollClock(
    {
      ...local,
      units:
        holdLocalUnits && local.units !== remote.units
          ? local.units
          : remote.units,
      activities,
      sleepNights,
      readiness,
      enrollments,
      crewBoard: remote.crewBoard,
    },
    competeNow(local),
  );
  return sameDocument(local, merged) ? local : merged;
}

/**
 * Idle devices take the server copy, including crew scores that do not bump
 * `updated_at`. A device with unsaved edits keeps those edits and still
 * receives new server activities and the current crew board.
 */
export function applyRemoteSnapshot(
  local: CompeteState,
  remote: CompeteState,
  dirty: boolean,
  holdLocalUnits = false,
): CompeteState {
  const next = dirty
    ? mergeFreshRemote(local, remote, holdLocalUnits)
    : remote;
  return sameDocument(local, next) ? local : next;
}
