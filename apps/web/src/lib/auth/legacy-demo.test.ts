import { afterEach, expect, it, vi } from "vitest";
import { archiveLegacyDemo } from "./legacy-demo";
const setup = () => {
  const values = new Map([["fb-demo-auth-v1", JSON.stringify({ id: "alice" })], ["fb-compete-v1:alice", "local activity"], ["fb-compete-v1:bob", "other account"]]);
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key,value), removeItem: (key: string) => values.delete(key) });
  return values;
};
afterEach(() => vi.unstubAllGlobals());
it("archives the local account before clearing a cache that would collide with real auth", () => {
  const values = setup();
  const backup = JSON.parse(archiveLegacyDemo()!);
  expect(backup.entries["fb-compete-v1:alice"]).toBe("local activity");
  expect(values.has("fb-compete-v1:alice")).toBe(false);
  expect(values.get("fb-compete-v1:bob")).toBe("other account");
  expect(archiveLegacyDemo()).toContain("local activity");
});
it("keeps all local data when backup storage is full", () => {
  const values = setup();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: () => { throw Error("quota"); }, removeItem: (key: string) => values.delete(key) });
  expect(() => archiveLegacyDemo()).toThrow("quota");
  expect(values.get("fb-compete-v1:alice")).toBe("local activity");
  expect(values.has("fb-demo-auth-v1")).toBe(true);
});
