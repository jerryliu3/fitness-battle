import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, expect, it, vi } from "vitest";
import type mapboxgl from "mapbox-gl";
const mock = vi.hoisted(() => ({ instances: [] as any[] }));
vi.mock("react-dom", () => ({ createPortal: (children: React.ReactNode) => children }));
vi.mock("../field/components/athlete-pennant", () => ({ AthletePennant: "AthletePennant" }));
vi.mock("mapbox-gl", () => ({ default: { Marker: class {
  setLngLat = vi.fn().mockReturnThis(); addTo = vi.fn().mockReturnThis(); remove = vi.fn();
  constructor(public options: unknown) { mock.instances.push(this); }
} } }));
import { CourseCallout } from "./course-callout";
let renderer: ReactTestRenderer;
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); mock.instances.length = 0; vi.unstubAllGlobals(); });
it("retains a viewport-aligned marker through position updates and cleans it up", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("document", { createElement: () => ({ style: {}, setAttribute: vi.fn() }) });
  const props = { map: {} as mapboxgl.Map, lane: { id: "you", name: "Runner", initials: "R", you: true, value: 1 }, coordinate: [0, 0] as [number, number], detail: "1st · 1.0 km", onSelect: vi.fn() };
  await act(async () => { renderer = create(createElement(CourseCallout, props)); });
  const marker = mock.instances[0];
  expect(marker.options).toMatchObject({ pitchAlignment: "viewport", rotationAlignment: "viewport", occludedOpacity: 1, anchor: "bottom-right" });
  expect(marker.options.element.style.cssText).toContain("position:absolute;left:0;top:0;");
  expect(marker.options.element.style.cssText).toContain("width:170px;height:118px");
  await act(async () => renderer.update(createElement(CourseCallout, { ...props, coordinate: [.01, .02], detail: "1st · 2.0 km" })));
  expect(mock.instances).toHaveLength(1);
  expect(marker.setLngLat).toHaveBeenLastCalledWith([.01, .02]);
  expect(renderer.root.findByType("AthletePennant" as never).props.detail).toBe("1st · 2.0 km");
  await act(async () => renderer.root.findByType("button").props.onClick({ stopPropagation() {} }));
  expect(props.onSelect).toHaveBeenCalledWith("you");
  await act(async () => renderer.unmount());
  expect(marker.remove).toHaveBeenCalledTimes(1);
});
