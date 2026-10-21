import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminFieldControls } from "./admin-field-controls";
let renderer: ReactTestRenderer;
const field = { id: "field-id", name: "Crew field", sport: "running", member_ids: ["a", "b"], wave_start: "2026-10-19T04:00:00Z", week_end: "2026-10-26T04:00:00Z", updated_at: "version" };
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(async () => {
 vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
 fetcher = vi.fn().mockResolvedValueOnce(Response.json({ fields: [field] })).mockResolvedValueOnce(Response.json({ affectedAthletes: 2, nextStartsAt: "2026-10-20T15:00:00Z", nextEndsAt: field.week_end, actionId: "audit" }));
 vi.stubGlobal("fetch", fetcher);
 await act(async () => { renderer = create(createElement(AdminFieldControls, { target: "a", owner: "owner" })); });
});
afterEach(async () => { await act(async () => renderer.unmount()); vi.unstubAllGlobals(); });
describe("admin field control UI", () => {
 it("requires confirmation and sends the selected field/version for an immediate restart", async () => {
  await act(async () => renderer.root.findByType("button").props.onClick());
  const restart = () => renderer.root.findAllByType("button").find((button) => button.children.join("") === "End field + start next wave now")!;
  expect(restart().props.disabled).toBe(true);
  const inputs = renderer.root.findAllByType("input");
  await act(async () => { inputs[0]!.props.onChange({ target: { value: "Test field restart" } }); inputs[1]!.props.onChange({ target: { value: "WAVE field-id" } }); });
  expect(restart().props.disabled).toBe(false);
  await act(async () => restart().props.onClick());
  expect(JSON.parse(fetcher.mock.calls[1]![1].body)).toMatchObject({ target: "a", fieldId: "field-id", updatedAt: "version", action: "restart-field", confirmation: "WAVE field-id" });
  expect(renderer.root.findByProps({ role: "status" }).children.join("")).toContain("2 athletes");
 });
 it("clears the selected field when the athlete changes", async () => {
  await act(async () => renderer.root.findByType("button").props.onClick());
  expect(renderer.root.findAllByType("select")).toHaveLength(1);
  await act(async () => renderer.update(createElement(AdminFieldControls, { target: "different", owner: "owner" })));
  expect(renderer.root.findAllByType("select")).toHaveLength(0);
 });
});
