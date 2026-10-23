import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
vi.mock("@/components/auth-context", () => {
 const user = { id: "athlete", mode: "supabase", displayName: "Athlete", email: "test@example.com" };
 return { useAuth: () => ({ user, loading: false, offlineMode: false }) };
});
vi.mock("@/lib/compete-demo-seed", () => ({ getDemoCompeteState: () => null }));
import { CompeteProvider, useCompete } from "./compete-context";
let renderer: ReactTestRenderer;
let api: ReturnType<typeof useCompete>;
const values = new Map<string,string>();
function Probe() { api = useCompete(); return null; }
async function flush() { for (let i=0;i<30;i++) await Promise.resolve(); }
beforeEach(() => {
 vi.useFakeTimers(); values.clear();
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
 vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string,value: string) => values.set(key,value), removeItem: (key: string) => values.delete(key) });
 vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
 vi.stubGlobal("document", { visibilityState: "visible", addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("web account revision handling", () => {
 it("does not rebase dirty competition state onto a newer server revision, and offers explicit recovery", async () => {
  let reads=0;
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
   if (init?.method === "PUT") return Response.json({ error: "account_changed_reload" }, { status: 409 });
   reads++;
   return Response.json({ state: { ...freshState(), city: reads===1 ? "Original" : "Server city" }, updatedAt: reads===1 ? "revision-1" : "revision-2" });
  });
  vi.stubGlobal("fetch",fetcher);
  await act(async () => { renderer=create(createElement(CompeteProvider,null,createElement(Probe))); await flush(); });
  await act(async () => api.dispatch({ type: "set-city", city: "Local draft" }));
  await act(async () => { await api.refresh(); });
  await act(async () => { vi.advanceTimersByTime(500); await flush(); });
  const writes=()=>fetcher.mock.calls.filter(([,init])=>init?.method==="PUT");
  expect(JSON.parse(writes()[0]![1]!.body as string).updatedAt).toBe("revision-1");
  expect(renderer.root.findByProps({ role: "alert" })).toBeTruthy();
  await act(async () => api.dispatch({ type: "set-city", city: "Another draft" }));
  await act(async () => { vi.advanceTimersByTime(500); await flush(); });
  expect(writes()).toHaveLength(1);
  await act(async () => { api.retryLoad(); await flush(); });
  expect(values.has("fb-compete-v1:athlete:recovery")).toBe(true);
  expect(api.state?.city).toBe("Server city");
 });
});
