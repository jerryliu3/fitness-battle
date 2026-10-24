import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { AdminScenarioControls } from "./admin-scenario-controls";
let renderer: ReactTestRenderer;
let fetcher: ReturnType<typeof vi.fn>;
const owner = "owner", target = "athlete";
const preview = { name: "Test athlete", updatedAt: "v1", generatedCount: 0, enrollments: [], results: [], fields: [] };
beforeEach(async () => {
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
 fetcher = vi.fn().mockResolvedValueOnce(Response.json(preview)).mockResolvedValueOnce(Response.json({ affectedAthlete: target, actionId: "audit" }));
 vi.stubGlobal("fetch", fetcher);
 await act(async () => { renderer = create(createElement(AdminScenarioControls, { owner, target, onTargetChange: vi.fn() })); });
});
afterEach(async () => { await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
describe("scenario lab UI", () => {
 it("requires a loaded preview and explicit confirmation before submitting", async () => {
  const button = (label: string) => renderer.root.findAllByType("button").find((row) => row.children.join("") === label)!;
  await act(async () => button("Load scenario preview").props.onClick());
  expect(button("Apply scenario to account").props.disabled).toBe(true);
  const inputs = renderer.root.findAllByType("input");
  await act(async () => {
   inputs[inputs.length-2]!.props.onChange({ target: { value: "Return animation test" } });
   inputs[inputs.length-1]!.props.onChange({ target: { value: `SCENARIO ${target}` } });
  });
  expect(button("Apply scenario to account").props.disabled).toBe(false);
  await act(async () => button("Apply scenario to account").props.onClick());
  expect(JSON.parse(fetcher.mock.calls[1]![1].body)).toMatchObject({ target, updatedAt: "v1", action: "add-activity", verified: false });
  expect(renderer.root.findAllByType("p").find(node => node.props.role === "status")!.children.join("")).toContain("Audit ID: audit");
 });
 it("does not apply a delayed preview after switching targets", async () => {
  let resolve!: (value: Response) => void;
  fetcher.mockReset().mockReturnValue(new Promise<Response>((done) => { resolve = done; }));
  await act(async () => renderer.root.findAllByType("button").find((row) => row.children.join("") === "Load scenario preview")!.props.onClick());
  await act(async () => renderer.update(createElement(AdminScenarioControls, { owner, target: "other", onTargetChange: vi.fn() })));
  await act(async () => { resolve(Response.json(preview)); });
  expect(renderer.root.findAllByType("strong")).toHaveLength(0);
 });
});
