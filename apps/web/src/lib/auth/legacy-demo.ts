import { legacyDemoBackupKey, legacyDemoKeys, serializeLegacyDemoBackup } from "@fitness-battle/shared";
const AUTH_KEY = "fb-demo-auth-v1";
export const LEGACY_BACKUP_POINTER = "fb:legacy-demo-backup:latest";
export function archiveLegacyDemo(): string | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return readLegacyDemoBackup();
  const user = JSON.parse(raw) as { id?: string };
  if (!user.id) return null;
  const keys = [...legacyDemoKeys(user.id, "web"), AUTH_KEY];
  const backupKey = legacyDemoBackupKey(user.id);
  const backup = serializeLegacyDemoBackup(user.id, keys.map(key => [key, localStorage.getItem(key)]));
  localStorage.setItem(backupKey, backup);
  if (localStorage.getItem(backupKey) !== backup) throw new Error("Local demo backup could not be saved.");
  localStorage.setItem(LEGACY_BACKUP_POINTER, backupKey);
  for (const key of keys) localStorage.removeItem(key);
  return backup;
}
export function readLegacyDemoBackup(): string | null {
  const key = localStorage.getItem(LEGACY_BACKUP_POINTER);
  return key ? localStorage.getItem(key) : null;
}
