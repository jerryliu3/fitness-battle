"use client";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";
import { type ArenaSceneLane, type LngLat } from "@fitness-battle/shared";
import { AthletePennant } from "../field/components/athlete-pennant";

/** The SDK positions a screen-sized DOM marker; React never projects camera frames. */
export function CourseCallout({ map, lane, coordinate, detail, onSelect }: {
  map: mapboxgl.Map; lane: ArenaSceneLane; coordinate: LngLat; detail: string; onSelect(id: string): void;
}) {
  const prefix = useId();
  const [element] = useState(() => {
    const node = document.createElement("div");
    node.className = "course-athlete-callout";
    node.setAttribute("role", "group");
    node.setAttribute("aria-label", "Racer card");
    node.style.cssText = "position:absolute;left:0;top:0;width:170px;height:118px;pointer-events:none;";
    return node;
  });
  const [marker, setMarker] = useState<mapboxgl.Marker | null>(null);
  useEffect(() => {
    const next = new mapboxgl.Marker({ element, anchor: lane.you ? "bottom-right" : "bottom-left", pitchAlignment: "viewport", rotationAlignment: "viewport", occludedOpacity: 1 }).setLngLat(coordinate).addTo(map);
    setMarker(next);
    return () => { next.remove(); };
  }, [map, element, lane.you]);
  useEffect(() => { marker?.setLngLat(coordinate); }, [marker, coordinate[0], coordinate[1]]);
  return createPortal(<>
    <svg width={170} height={118} viewBox="0 0 170 118" aria-hidden="true" style={{ display: "block", pointerEvents: "none" }}>
      <g transform={`translate(${lane.you ? 170 : 0} 118)`}>
        <AthletePennant lane={lane} x={lane.you ? -158 : 12} y={-100} detail={detail} prefix={prefix} />
      </g>
    </svg>
    <button type="button" className="course-callout-target" aria-label={`Focus ${lane.name}, ${detail}`} onClick={event => { event.stopPropagation(); onSelect(lane.id); }} style={{ position: "absolute", left: 12, top: 18, width: 146, height: 46, padding: 0, border: 0, background: "transparent", cursor: "pointer", pointerEvents: "auto" }} />
  </>, element);
}
