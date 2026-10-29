"use client";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";
import { courseCalloutLayout, type ArenaSceneLane, type LngLat } from "@fitness-battle/shared";
import { AthletePennant } from "../field/components/athlete-pennant";

/** The SDK positions a screen-sized DOM marker; React never projects camera frames. */
export function CourseCallout({ map, lane, coordinate, detail, onSelect, layout }: {
  map: mapboxgl.Map; lane: ArenaSceneLane; coordinate: LngLat; detail: string; onSelect(id: string): void; layout?: ReturnType<typeof courseCalloutLayout>;
}) {
  const prefix = useId();
  const placement = layout ?? courseCalloutLayout(lane.you ? 0 : 1);
  const [element] = useState(() => {
    const node = document.createElement("div");
    node.className = "course-athlete-callout";
    node.setAttribute("role", "group");
    node.setAttribute("aria-label", "Racer card");
    node.style.cssText = "position:absolute;left:0;top:0;width:170px;height:120px;pointer-events:none;";
    return node;
  });
  const [marker, setMarker] = useState<mapboxgl.Marker | null>(null);
  useEffect(() => {
    element.style.height = `${placement.height}px`;
    const next = new mapboxgl.Marker({ element, anchor: placement.left ? "bottom-right" : "bottom-left", offset: [0, placement.height - placement.originY], pitchAlignment: "viewport", rotationAlignment: "viewport", occludedOpacity: 1 }).setLngLat(coordinate).addTo(map);
    setMarker(next);
    return () => { next.remove(); };
  }, [map, element, placement.left, placement.height, placement.originY]);
  useEffect(() => { marker?.setLngLat(coordinate); }, [marker, coordinate[0], coordinate[1]]);
  return createPortal(<>
    <svg width={170} height={placement.height} viewBox={`0 0 170 ${placement.height}`} aria-hidden="true" style={{ display: "block", pointerEvents: "none" }}>
      <g transform={`translate(${placement.originX} ${placement.originY})`}>
        {lane.mystery ? <g><circle r={18} fill="white" stroke="#616c63" strokeWidth={2} strokeDasharray="3 3"/><text y={5} textAnchor="middle" fill="#282f2c">?</text></g> : <AthletePennant lane={lane} x={placement.left ? -158 : 12} y={placement.y} detail={detail} prefix={prefix} />}
      </g>
    </svg>
    {!lane.mystery && <button type="button" className="course-callout-target" aria-label={`Focus ${lane.name}, ${detail}`} onClick={event => { event.stopPropagation(); onSelect(lane.id); }} style={{ position: "absolute", left: 12, top: placement.cardTop, width: 146, height: 46, padding: 0, border: 0, background: "transparent", cursor: "pointer", pointerEvents: "auto" }} />}
  </>, element);
}
