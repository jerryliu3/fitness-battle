import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import { createRaceCourse, raceCoursePosition, raceEffortMetres } from "@fitness-battle/shared";
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
vi.mock("./course-callout", () => ({ CourseCallout: "CourseCallout" }));
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
  const updated = { ...props, lanes: props.lanes.map(lane => ({ ...lane, value: lane.value + .1 })) };
  await act(async () => renderer.update(createElement(CourseMap, updated)));
  expect(instance.easeTo).not.toHaveBeenCalled();
  instance.getSource("completed").setData.mockClear();
  await act(async () => renderer.update(createElement(CourseMap, { ...updated, selectedId: "peer", focusRequest: 1 })));
  expect(instance.easeTo).toHaveBeenCalledTimes(1);
  expect(instance.easeTo.mock.lastCall[0].duration).toBeGreaterThan(500);
  expect(instance.easeTo.mock.lastCall[0].zoom).toBe(15);
  const markers = instance.getSource("athletes").setData.mock.lastCall[0];
  expect(instance.easeTo.mock.lastCall[0].center).toEqual(markers.features.find((f: any) => f.id === "peer").geometry.coordinates);
  expect(mock.instances).toHaveLength(1);
  expect(instance.getSource("course")).toBeUndefined();
  expect(instance.getSource("completed").setData).not.toHaveBeenCalled();
  await act(async () => renderer.root.findAllByType("button").find(node => node.props.children === "2D map")!.props.onClick());
  expect(instance.easeTo.mock.lastCall[0]).toMatchObject({ center: markers.features.find((f: any) => f.id === "peer").geometry.coordinates, pitch: 0 });
  await act(async () => renderer.root.findAllByType("button").find(node => node.props.children === "Race overview")!.props.onClick());
  expect(instance.fitBounds.mock.lastCall[0][1][0]).toBeLessThan(.02);
  expect(instance.fitBounds.mock.lastCall[1].maxZoom).toBe(20);
  await act(async () => instance.emit("click", { features: [{ properties: { id: "you" } }] }));
  expect(props.onSelect).toHaveBeenCalledWith("you");
  const labels = renderer.root.findAllByType("CourseCallout" as never);
  expect(labels).toHaveLength(2);
  expect(labels.find(label => label.props.lane.id === "peer")!.props.coordinate).toEqual(markers.features.find((f: any) => f.id === "peer").geometry.coordinates);

});

it.each(["km", "mi"])("seeks %s overview targets after loading and allows repeated targets and recentering", async unit => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  const course = createRaceCourse("Corner", [[0, 0], [.01, 0], [.01, .01]]);
  const value = course.length * 1.25 / (unit === "mi" ? 1609.344 : 1000);
  const props = { course, lanes: [{ id: "you", name: "You", initials: "Y", you: true, value: 2 }], unit, selectedId: "you", focusRequest: 0, onSelect: vi.fn(), onResumeFollow: vi.fn(), distanceTarget: { value, request: 1 } };
  await act(async () => { renderer = create(createElement(CourseMap, props), { createNodeMock: element => element.type === "div" ? {} : null }); });
  const instance = mock.instances[0];
  await act(async () => instance.emit("load"));
  const target = raceCoursePosition(course, raceEffortMetres(value, unit)!).coordinate;
  expect(instance.easeTo.mock.lastCall[0]).toMatchObject({ center: target, zoom: 15, pitch: 30, bearing: 20, duration: 0 });
  const trails = instance.getSource("completed").setData;
  trails.mockClear(); instance.easeTo.mockClear();
  await act(async () => instance.emit("movestart", { originalEvent: {} }));
  const repeated = { ...props, distanceTarget: { value, request: 2 } };
  await act(async () => renderer.update(createElement(CourseMap, repeated)));
  expect(instance.easeTo).toHaveBeenCalledOnce();
  expect(instance.easeTo.mock.lastCall[0].center).toEqual(target);
  expect(trails).not.toHaveBeenCalled();
  instance.easeTo.mockClear();
  await act(async () => renderer.update(createElement(CourseMap, { ...repeated, lanes: [{ ...props.lanes[0], value: 3 }] })));
  expect(instance.easeTo).not.toHaveBeenCalled();
  await act(async () => renderer.root.findAllByType("button").find(node => node.props.children === "Recenter")!.props.onClick());
  expect(props.onResumeFollow).toHaveBeenCalledOnce();
  expect(instance.easeTo.mock.lastCall[0].center).toEqual(raceCoursePosition(course, raceEffortMetres(3, unit)!).coordinate);
  expect(props.onSelect).not.toHaveBeenCalled();
  expect(mock.instances).toHaveLength(1);
});
