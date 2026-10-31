import mapboxgl from "mapbox-gl";

export const mapboxAttributionOptions = {
  attributionControl: false as const,
  logoPosition: "top-left" as const,
};
export function addMapboxAttribution(map: mapboxgl.Map) {
  map.addControl(new mapboxgl.AttributionControl({ compact: true }), "top-left");
}
