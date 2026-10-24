import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type mapboxgl from "mapbox-gl";
import type { LngLat } from "@fitness-battle/shared";
import { useRouteAnimation } from "./use-route-animation";

describe("GPS replay seeking", () => {
  it("reveals the traveled portion, moves the marker and frames the full route at completion", async () => {
    const source = { setData: vi.fn() };
    const map = { getLayer: () => true, getSource: () => source, setPaintProperty: vi.fn(), jumpTo: vi.fn(), fitBounds: vi.fn() };
    const coordinates: LngLat[] = [[-122.4, 37.8], [-122.41, 37.81], [-122.42, 37.82]];
    let controls: ReturnType<typeof useRouteAnimation>;
    function Harness() {
      controls = useRouteAnimation({ map: map as unknown as mapboxgl.Map, coordinates, autoPlay: false, mode: "2d-overview" });
      return createElement("div");
    }
    let view: ReturnType<typeof create>;
    await act(async () => { view = create(createElement(Harness)); });
    await act(async () => controls!.seek(0.4));
    // Mapbox makes the specified trim interval transparent: hide only what remains.
    expect(map.setPaintProperty).toHaveBeenLastCalledWith("route-active", "line-trim-offset", [0.4, 1]);
    expect(source.setData).toHaveBeenCalled();
    expect(map.jumpTo).toHaveBeenLastCalledWith(expect.objectContaining({ pitch: 0, bearing: 0 }));
    await act(async () => controls!.seek(1));
    expect(map.fitBounds).toHaveBeenCalled();
    expect(controls!.isFinished).toBe(true);
    await act(async () => view!.unmount());
  });
});
