import AsyncStorage from "@react-native-async-storage/async-storage";
import { legacyDemoBackupKey, legacyDemoKeys, serializeLegacyDemoBackup } from "@fitness-battle/shared";
const AUTH_KEY = "fb-demo-auth-v1";
const POINTER = "fb:legacy-demo-backup:latest";
export async function archiveLegacyDemo(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  if (!raw) return readLegacyDemoBackup();
  const user = JSON.parse(raw) as { id?: string };
  if (!user.id) return null;
  const keys = [...legacyDemoKeys(user.id, "native"), AUTH_KEY];
  const backupKey = legacyDemoBackupKey(user.id);
  const backup = serializeLegacyDemoBackup(user.id, await AsyncStorage.multiGet(keys));
  await AsyncStorage.setItem(backupKey, backup);
  if (await AsyncStorage.getItem(backupKey) !== backup) throw new Error("Local demo backup could not be saved.");
  await AsyncStorage.setItem(POINTER, backupKey);
  await AsyncStorage.multiRemove(keys);
  return backup;
}
export async function readLegacyDemoBackup(): Promise<string | null> {
  const key = await AsyncStorage.getItem(POINTER);
  return key ? AsyncStorage.getItem(key) : null;
}
