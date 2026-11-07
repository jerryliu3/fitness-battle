import mapboxgl from "mapbox-gl";

export const mapboxAttributionOptions = {
  attributionControl: false as const,
  logoPosition: "bottom-right" as const,
};
export function addMapboxAttribution(map: mapboxgl.Map) {
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
}
