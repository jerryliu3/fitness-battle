"use client";
import { colors as appearanceColors } from "@/theme/app-colors";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";
import { courseCalloutLayout, type ArenaSceneLane, type LngLat } from "@fitness-battle/shared";
import { AthleteNode } from "../field/components/athlete-node";

/** The SDK positions a screen-sized DOM marker; React never projects camera frames. */
export function CourseCallout({ passStrength = 0, map, lane, coordinate, detail, subdetail, selected, gold = false, onSelect, onDismiss, layout }: {
  passStrength?: number; map: mapboxgl.Map; lane: ArenaSceneLane; coordinate: LngLat; detail: string; subdetail?: string; selected?: boolean; gold?: boolean; onSelect(id: string): void; onDismiss?: () => void; layout?: ReturnType<typeof courseCalloutLayout>;
}) {
  const prefix = useId();
  const isExpanded = selected ?? true;
  const placement = layout ?? courseCalloutLayout(lane.you ? 0 : 1);
  const cardX = placement.originX + (placement.left ? -140 : 12);
  const [element] = useState(() => {
    const node = document.createElement("div");
    node.className = "course-athlete-callout";
    node.setAttribute("role", "group");
    node.setAttribute("aria-label", "Athlete card");
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
    {passStrength > 0 && <div aria-hidden style={{position:"absolute",left:placement.originX,top:placement.originY,width:32+64*(1-passStrength),height:32+64*(1-passStrength),transform:"translate(-50%, -50%)",borderRadius:"50%",border:"4px solid #f7c948",background:"#f7c94833",opacity:passStrength,pointerEvents:"none"}}/>}
    <svg width={170} height={placement.height} viewBox={`0 0 170 ${placement.height}`} aria-hidden="true" style={{ display: "block", pointerEvents: "none", overflow: "visible" }}>
      <g transform={`translate(${placement.originX} ${placement.originY})`}>
        <AthleteNode lane={lane} x={placement.left ? -140 : 12} y={placement.y} detail={detail} subdetail={subdetail} expanded={isExpanded} selected={Boolean(selected)} gold={gold} prefix={prefix} />
      </g>
    </svg>
    {!lane.mystery && isExpanded && <button type="button" className="course-callout-target" aria-label={`Focus ${lane.name}, ${detail}`} onClick={event => { event.stopPropagation(); onSelect(lane.id); }} style={{ position: "absolute", left: cardX, top: placement.cardTop, width: 128, height: subdetail ? 44 : 30, padding: 0, border: 0, background: "transparent", cursor: "pointer", pointerEvents: "auto" }} />}
    {!lane.mystery && <button type="button" className="course-callout-target" aria-label={`Focus ${lane.name}, ${detail}`} onClick={event => { event.stopPropagation(); onSelect(lane.id); }} style={{ position: "absolute", left: placement.originX - 26, top: placement.originY - 26, width: 52, height: 52, borderRadius: "50%", padding: 0, border: 0, background: "transparent", cursor: "pointer", pointerEvents: "auto" }} />}
    {onDismiss && !lane.mystery && <button type="button" aria-label={`Close ${lane.name} card`} onClick={event => { event.stopPropagation(); onDismiss(); }} style={{ position: "absolute", left: cardX + 128 - 24, top: placement.cardTop + 2, width: 22, height: 22, display: "grid", placeItems: "center", padding: 0, border: 0, background: "transparent", color: appearanceColors.textSecondary, fontSize: 14, lineHeight: 1, cursor: "pointer", pointerEvents: "auto" }}>×</button>}
  </>, element);
}
