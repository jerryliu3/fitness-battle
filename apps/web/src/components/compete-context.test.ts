vi.mock("@/features/club/sync-review", async () => {
  const { createElement } = await import("react");
  return { SyncReview: (props: object) => createElement("SyncReview", props) };
});
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshState } from "@fitness-battle/shared";
const auth = vi.hoisted(() => ({ user: { id: "athlete", mode: "supabase", dataOrigin: "recorded", displayName: "Athlete", email: "test@example.com" } }));
vi.mock("@/components/auth-context", () => ({ useAuth: () => ({ user: auth.user, loading: false, offlineMode: false }) }));
vi.mock("@/lib/compete-demo-seed", () => ({ getDemoCompeteState: () => null }));
import { CompeteProvider, useCompete } from "./compete-context";
let renderer: ReactTestRenderer;
let api: ReturnType<typeof useCompete>;
const values = new Map<string,string>();
function Probe() { api = useCompete(); return null; }
async function flush() { for (let i=0;i<30;i++) await Promise.resolve(); }
beforeEach(() => {
 vi.useFakeTimers(); values.clear(); auth.user.mode = "supabase"; auth.user.dataOrigin = "recorded";
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
 vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string,value: string) => values.set(key,value), removeItem: (key: string) => values.delete(key) });
 vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
 vi.stubGlobal("document", { visibilityState: "visible", addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("web account revision handling", () => {
 it("loads and saves authenticated synthetic accounts regardless of the legacy mode label", async () => {
  auth.user.mode = "demo"; auth.user.dataOrigin = "synthetic";
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => init?.method === "PUT" ? Response.json({ updatedAt: "revision-2" }) : Response.json({ state: freshState(), updatedAt: "revision-1" }));
  vi.stubGlobal("fetch", fetcher);
  await act(async () => { renderer = create(createElement(CompeteProvider, null, createElement(Probe))); await flush(); });
  expect(api.loadStatus).toBe("ready");
  await act(async () => api.dispatch({ type: "set-city", city: "Boston" }));
  await act(async () => { vi.advanceTimersByTime(500); await flush(); });
  expect(fetcher.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true);
 });
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

it("runs web debug sync through the real receipt and combo coordinator without uploading fixtures", async () => {
  const fetcher = vi.fn(async () => Response.json({ state: freshState(), updatedAt: "initial" }));
  vi.stubGlobal("fetch", fetcher);
  await act(async () => { renderer = create(createElement(CompeteProvider, null, createElement(Probe))); await flush(); });
  const original = api.state;
  await act(async () => { api.triggerDebugEvent?.("sync-combo"); await flush(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(500); await flush(); });
  let screen = renderer.root.findByType("SyncReview" as never);
  expect(screen.props.receipt.activities).toHaveLength(2);
  expect(screen.props.moment).toBeNull();
  const ids = screen.props.receipt.activities.map((a: { id: string }) => a.id);
  await act(async () => { screen.props.onComplete(ids); await flush(); });
  screen = renderer.root.findByType("SyncReview" as never);
  expect(screen.props.receipt).toBeNull();
  expect(screen.props.moment.plan.overtakenIds.length).toBeGreaterThanOrEqual(2);
  await act(async () => { screen.props.onAcknowledge(); });
  expect(renderer.root.findAllByType("SyncReview" as never)).toHaveLength(0);
  await act(async () => { vi.advanceTimersByTime(1000); await flush(); });
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => { api.resetDebugState?.(); });
  expect(api.state).toBe(original);
});
