"use client";
import { useCompeteFlipLayer } from "./compete-sheet";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { APP_ICON_PATHS } from "@fitness-battle/shared";
import { AppHeading, AppText } from "@/ui/section";

export function CompetitionPanel({ active, standings, activity }: { active: boolean; standings: ReactNode; activity(visible: boolean): ReactNode }) {
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const [feed, setFeed] = useState(false);
  const [busy, setBusy] = useState(false);
  const setFlipping = useCompeteFlipLayer();
  useLayoutEffect(() => {
    setFlipping(busy);
    return () => setFlipping(false);
  }, [busy, setFlipping]);
  const turning = useRef(false);
  const generation = useRef(0);
  const incoming = useRef(false);
  const frame = useRef<number | null>(null);
  useEffect(() => {
    generation.current++;
    incoming.current = false;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    controls.stop();
    controls.set({ rotateY: 0 });
    turning.current = false;
    setBusy(false);
    if (!active) setFeed(false);
    return () => { generation.current++; controls.stop(); if (frame.current !== null) cancelAnimationFrame(frame.current); };
  }, [active, reduced, controls]);
  useLayoutEffect(() => {
    if (!incoming.current) return;
    incoming.current = false;
    const request = generation.current;
    controls.set({ rotateY: -90 });
    frame.current = requestAnimationFrame(() => {
      void controls.start({ rotateY: 0, transition: { duration: 0.22, ease: "easeOut" } }).then(() => {
        if (request === generation.current) { turning.current = false; setBusy(false); }
      });
    });
  }, [feed, controls]);
  async function flip() {
    if (!active || turning.current) return;
    if (reduced !== false) { setFeed(value => !value); return; }
    turning.current = true;
    setBusy(true);
    const request = ++generation.current;
    await controls.start({ rotateY: 90, transition: { duration: 0.2, ease: "easeInOut" } });
    if (request !== generation.current) return;
    incoming.current = true;
    setFeed(value => !value);
  }
  return <section className="competition-panel">
    <div className="compete-section-heading"><AppHeading>{feed ? "Feed" : "Standings"}</AppHeading><button type="button" className="fb-btn-line" aria-label={feed ? "Show standings" : "Show feed"} disabled={busy} onClick={() => void flip()}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={APP_ICON_PATHS.sync} /></svg><AppText role="label">{feed ? "Standings" : "Feed"}</AppText></button></div>
    <div style={{ perspective: 1000 }}><motion.div animate={controls} style={{ backfaceVisibility: "hidden" }}>
      <div hidden={feed}>{standings}</div>
      <div hidden={!feed}>{activity(active)}</div>
    </motion.div></div>
  </section>;
}
