import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { createRaceCourse } from "@fitness-battle/shared";
const mock = vi.hoisted(() => ({ instances: [] as any[] }));
vi.mock("@/lib/env", () => ({ webEnv: { mapboxAccessToken: "public-test-token" } }));
vi.mock("mapbox-gl", () => ({ default: { Map: class {
  events = new Map<string, Function[]>(); sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>();
  fitBounds = vi.fn(); easeTo = vi.fn(); stop = vi.fn(); remove = vi.fn(); resize = vi.fn(); setPaintProperty = vi.fn();
  constructor() { mock.instances.push(this); }
  getCenter() { return { toArray: () => [.005, 0] }; } getZoom() { return 15; } getPitch() { return 30; } getBearing() { return 20; }
  on(name: string, layer: Function | string, callback?: Function) { const handlers = this.events.get(name) ?? []; handlers.push(callback ?? layer as Function); this.events.set(name, handlers); }
  emit(name: string, event = {}) { this.events.get(name)?.forEach(callback => callback(event)); }
  addSource(id: string) { this.sources.set(id, { setData: vi.fn() }); } getSource(id: string) { return this.sources.get(id); } addLayer() {}
} } }));
import CourseMap from "./course-map";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); mock.instances.length = 0; vi.unstubAllGlobals(); });
it("keeps one map instance, suspends following for user input and resumes on selection", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  const props = { course: createRaceCourse("City", [[0, 0], [.02, 0]]), lanes: [{ id: "you", name: "You", initials: "Y", you: true, value: .5 }, { id: "peer", name: "Peer", initials: "P", value: 1 }], unit: "km", selectedId: "you", focusRequest: 0, onSelect: vi.fn() };
  await act(async () => { renderer = create(createElement(CourseMap, props), { createNodeMock: element => element.type === "div" ? {} : null }); });
  const instance = mock.instances[0];
  await act(async () => instance.emit("load")); instance.easeTo.mockClear();
  await act(async () => instance.emit("movestart", { originalEvent: {} }));
  await act(async () => renderer.update(createElement(CourseMap, { ...props, lanes: props.lanes.map(lane => ({ ...lane, value: lane.value + .1 })) })));
  expect(instance.easeTo).not.toHaveBeenCalled();
  await act(async () => renderer.update(createElement(CourseMap, { ...props, selectedId: "peer", focusRequest: 1 })));
  expect(instance.easeTo).toHaveBeenCalledTimes(1);
  expect(instance.easeTo.mock.lastCall[0].duration).toBeGreaterThan(500);
  expect(instance.easeTo.mock.lastCall[0].zoom).toBe(15);
  const markers = instance.getSource("athletes").setData.mock.lastCall[0];
  expect(instance.easeTo.mock.lastCall[0].center).toEqual(markers.features.find((f: any) => f.id === "peer").geometry.coordinates);
  expect(mock.instances).toHaveLength(1);
  expect(instance.getSource("course").setData).not.toHaveBeenCalled();
  await act(async () => instance.emit("click", { features: [{ properties: { id: "you" } }] }));
  expect(props.onSelect).toHaveBeenCalledWith("you");
});
