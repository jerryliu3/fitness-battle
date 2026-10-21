"use client";
import { createElement, useEffect, useState } from "react";
import { defaultFieldAppearance, fieldAppearanceKey, fieldGrounds, readFieldAppearance, fieldOverview, overviewTarget, type FieldAppearance, type FieldNode, type ArenaSceneLane, type ArenaViewWindow } from "@fitness-battle/shared";
import { Sheet } from "@/ui/sheet";

export function drawFieldNode(node: FieldNode, key: number): React.ReactNode {
  return createElement(node.tag, { ...node.attrs, key }, node.text ?? node.children?.map(drawFieldNode));
}
export function useFieldAppearance(account: string, sport: string) {
  const key = fieldAppearanceKey(account, sport);
  const [saved, setSaved] = useState<{ key: string; value: FieldAppearance } | null>(null);
  useEffect(() => {
    let raw: string | null = null;
    try { raw = localStorage.getItem(key); } catch { /* Device storage optional. */ }
    setSaved({ key, value: readFieldAppearance(raw) });
  }, [key]);
  const value = saved?.key === key ? saved.value : defaultFieldAppearance;
  const update = (next: FieldAppearance) => {
    setSaved({ key, value: next });
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep in-memory choice. */ }
  };
  return [value, update] as const;
}
export function FieldGroundPicker({ appearance, onChange }: { appearance: FieldAppearance; onChange: (value: FieldAppearance) => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="focus-ground-button" onClick={() => setOpen(true)} aria-label="Choose field ground">{fieldGrounds[appearance.ground].name} · Customize</button>
    <Sheet open={open} title="Your field" body="Choose your ground and surroundings. Saved on this device for this event." onClose={() => setOpen(false)}>
      <div className="focus-ground-grid" role="group" aria-label="Field ground">
        {Object.entries(fieldGrounds).map(([id, item]) => <button type="button" key={id} aria-pressed={appearance.ground === id} onClick={() => onChange({ ...appearance, ground: id as FieldAppearance["ground"] })}><span style={{ background: item.lane }}/>{item.name}</button>)}
      </div>
      <div className="focus-segments" role="group" aria-label="Field surroundings">{(["open", "club"] as const).map(edges => <button type="button" key={edges} aria-pressed={appearance.edges === edges} onClick={() => onChange({ ...appearance, edges })}>{edges === "club" ? "Club grounds" : "Open edges"}</button>)}</div>
      <button type="button" className="focus-ground-button" onClick={() => setOpen(false)}>Done</button>
    </Sheet>
  </>;
}
export function FieldOverview({ lanes, view, unit, onNavigate }: { lanes: ArenaSceneLane[]; view: ArenaViewWindow; unit: string; onNavigate: (value: number) => void }) {
  const overview = fieldOverview(lanes, view);
  const [scrubbing, setScrubbing] = useState(false);
  return <div className="focus-field-overview">
    <span>0</span>
    <div role="slider" tabIndex={0} aria-label="Field distance overview" aria-valuemin={0} aria-valuemax={overview.high} aria-valuenow={Math.min(overview.high, Math.max(0, view.center))} aria-valuetext={`${view.center.toFixed(1)} ${unit}`} className="focus-overview-map"
      onKeyDown={e => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) { e.preventDefault(); onNavigate(e.key === "Home" ? 0 : e.key === "End" ? overview.high : Math.max(0, Math.min(overview.high, view.center + (e.key === "ArrowRight" ? 1 : -1) * view.span / 4))); } }}
      onPointerDown={e => { if (!e.isPrimary || e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); setScrubbing(true); const r = e.currentTarget.getBoundingClientRect(); onNavigate(overviewTarget((e.clientX - r.left) / r.width, overview.high)); }}
      onPointerMove={e => { if (scrubbing) { const r = e.currentTarget.getBoundingClientRect(); onNavigate(overviewTarget((e.clientX - r.left) / r.width, overview.high)); } }}
      onPointerUp={() => setScrubbing(false)} onPointerCancel={() => setScrubbing(false)} onLostPointerCapture={() => setScrubbing(false)}>
      <i className="focus-overview-window" style={{ left: `${overview.from * 100}%`, width: `${overview.width * 100}%` }}/>
      {lanes.filter(l => !l.ghost).map(l => <i key={l.id} className={l.you ? "is-you" : ""} style={{ left: `${Math.max(0, Math.min(100, l.value / overview.high * 100))}%` }}/>) }
    </div><span>{overview.high.toFixed(1)} {unit}</span>
  </div>;
}
