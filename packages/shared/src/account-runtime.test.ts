import { expect, it } from "vitest";
import { accountDataOrigin, isSupabaseConfigured } from "./account-runtime";
import { legacyDemoKeys, serializeLegacyDemoBackup } from "./legacy-demo";
it("synthetic provenance is independent of a real backend session", () => {
  expect(accountDataOrigin("11111111-1111-4111-8111-111111111111")).toBe("synthetic");
  expect(accountDataOrigin("ordinary-user")).toBe("recorded");
  expect(isSupabaseConfigured("https://test.supabase.co", "a".repeat(30))).toBe(true);
  expect(isSupabaseConfigured("http://localhost:54621", "public-anon-key")).toBe(false);
});
it("archives only the legacy account's known cache keys", () => {
  const keys = legacyDemoKeys("athlete", "web");
  expect(keys).not.toContain("fb-compete-v1:someone-else");
  expect(JSON.parse(serializeLegacyDemoBackup("athlete", [[keys[0]!, "saved"], [keys[1]!, null]]))).toEqual({ version: 1, accountId: "athlete", origin: "legacy-local-demo", entries: { [keys[0]!]: "saved" } });
});
