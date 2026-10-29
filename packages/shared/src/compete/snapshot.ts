import { competeNow, migrateCompeteState, rollClock } from "./engine";
import type { CompeteState } from "./sports";
import { weekEndAfter } from "../matching/waves";
import { pendingRevealIdsFromResults } from "./history";

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
  const now = competeNow(local);
  const authoritativeSports = new Set(local.enrollments.filter(e =>
    remote.requiresCanonicalFields && Date.parse(e.weekEnd) <= now.getTime() &&
    remote.enrollments.find(r => r.sport === e.sport)?.waveStart !== e.waveStart,
  ).map(e => e.sport));
  const enrollments = local.enrollments.map((localEnr) => {
    const remoteEnr =
      remote.enrollments.find(
        (r) =>
          r.sport === localEnr.sport && r.waveStart === localEnr.waveStart,
      ) ??
      remote.enrollments.find((r) => r.sport === localEnr.sport);
    if (authoritativeSports.has(localEnr.sport)) return remoteEnr
      ? { ...remoteEnr, autoEnrollNext: localEnr.autoEnrollNext } : null;
    if (!remoteEnr) return localEnr;
    return {
      ...localEnr,
      fieldBoard: remoteEnr.fieldBoard,
      fieldId: remoteEnr.fieldId,
      awaitingField: remoteEnr.awaitingField,
      peerIds: remoteEnr.peerIds,
      syntheticIds: remoteEnr.syntheticIds,
      crewId: remoteEnr.crewId !== undefined ? remoteEnr.crewId : localEnr.crewId,
    };
  }).filter((e): e is NonNullable<typeof e> => e !== null);
  // A cancel can reach the database just after the benchmark. Restore only
  // server-confirmed started registrations; queued cancellations remain local.
  const protectedRows = remote.requiresCanonicalFields ? remote.enrollments.filter(e => Date.parse(e.waveStart) <= now.getTime() && Date.parse(e.weekEnd) > now.getTime()) : [];
  for (const enrollment of protectedRows) {
    const index = enrollments.findIndex(e => e.sport === enrollment.sport);
    if (index < 0) {
      enrollments.push(enrollment);
      authoritativeSports.add(enrollment.sport);
    } else if (enrollments[index]!.waveStart !== enrollment.waveStart) {
      enrollments[index] = { ...enrollment, autoEnrollNext: enrollments[index]!.autoEnrollNext };
      authoritativeSports.add(enrollment.sport);
    }
  }
  const protectedHealth = remote.requiresCanonicalFields ? remote.healthRatings.filter(r => r.optedIn && Date.parse(r.lockPeriod) <= now.getTime() && weekEndAfter(new Date(r.lockPeriod)) > now) : [];
  const authoritativeHealth = new Set(local.healthRatings.filter(r => remote.requiresCanonicalFields && r.optedIn &&
    weekEndAfter(new Date(r.lockPeriod)) <= now && remote.healthRatings.find(row => row.metric === r.metric)?.lockPeriod !== r.lockPeriod,
  ).map(r => r.metric));
  for (const server of protectedHealth) {
    const draft = local.healthRatings.find(r => r.metric === server.metric);
    if (!draft?.optedIn || draft.lockPeriod !== server.lockPeriod) authoritativeHealth.add(server.metric);
  }
  const merged = rollClock(
    {
      ...local,
      requiresCanonicalFields: remote.requiresCanonicalFields ?? local.requiresCanonicalFields,
      units:
        holdLocalUnits && local.units !== remote.units
          ? local.units
          : remote.units,
      activities,
      sleepNights,
      readiness,
      enrollments,
      ratings: local.ratings.map(r => authoritativeSports.has(r.sport) ? remote.ratings.find(row => row.sport === r.sport) ?? r : r),
      periodResults: [
        ...local.periodResults.filter(r => !authoritativeSports.has(r.sport)),
        ...remote.periodResults.filter(r => authoritativeSports.has(r.sport)).map(r => ({ ...r,
          acknowledgedAt: r.acknowledgedAt ?? local.periodResults.find(row => row.id === r.id)?.acknowledgedAt ?? null,
        })),
      ],
      effortMilestones: [
        ...(local.effortMilestones ?? []).filter(r => !authoritativeSports.has(r.sport)),
        ...(remote.effortMilestones ?? []).filter(r => authoritativeSports.has(r.sport)),
      ],
      healthRatings: local.healthRatings.map(r => {
        const server = authoritativeHealth.has(r.metric) ? remote.healthRatings.find(row => row.metric === r.metric) : undefined;
        return server ? { ...server, autoEnrollNext: r.autoEnrollNext } : r;
      }),
      healthResults: [...local.healthResults.filter(r => !authoritativeHealth.has(r.metric)),
        ...remote.healthResults.filter(r => authoritativeHealth.has(r.metric))],
      crewBoard: remote.crewBoard,
    },
    competeNow(local),
  );
  const revealed = { ...merged, pendingRevealIds: pendingRevealIdsFromResults(merged.periodResults) };
  return sameDocument(local, revealed) ? local : revealed;
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
