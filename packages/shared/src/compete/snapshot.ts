import { migrateCompeteState, type CompeteState } from "./engine";

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
