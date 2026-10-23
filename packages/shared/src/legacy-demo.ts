/** Only caches owned by the legacy local identity are eligible for archival. */
export function legacyDemoKeys(id: string, platform: "web" | "native"): string[] {
  return platform === "web"
    ? [`fb-compete-v1:${id}`, `fb-compete-v1:${id}:device-only`, `fb-compete-v1:${id}:revision`]
    : [`fb-compete-v2:${id}`, `fb-compete-dirty-v2:${id}`, `fb-counted-seen-v2:${id}`, `fb-compete-v2:${id}:revision`];
}
export function legacyDemoBackupKey(id: string): string { return `fb:legacy-demo-backup:${id}`; }
export function serializeLegacyDemoBackup(id: string, entries: readonly [string, string | null][]): string {
  return JSON.stringify({ version: 1, accountId: id, origin: "legacy-local-demo", entries: Object.fromEntries(entries.filter((entry): entry is [string,string] => entry[1] !== null)) }, null, 2);
}
