"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { APP_ICON_PATHS } from "@fitness-battle/shared";
import { AppHeading, AppText } from "@/ui/section";

export function CompetitionPanel({ active, standings, activity }: { active: boolean; standings: ReactNode; activity(visible: boolean): ReactNode }) {
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const [feed, setFeed] = useState(false);
  const [busy, setBusy] = useState(false);
  const turning = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    controls.stop();
    controls.set({ rotateY: 0 });
    turning.current = false;
    setBusy(false);
    if (!active) setFeed(false);
    return () => { generation.current++; controls.stop(); };
  }, [active, reduced, controls]);
  async function flip() {
    if (!active || turning.current) return;
    if (reduced !== false) { setFeed(value => !value); return; }
    turning.current = true;
    setBusy(true);
    const request = ++generation.current;
    await controls.start({ rotateY: 90, transition: { duration: 0.2, ease: "easeInOut" } });
    if (request !== generation.current) return;
    setFeed(value => !value);
    controls.set({ rotateY: -90 });
    await controls.start({ rotateY: 0, transition: { duration: 0.2, ease: "easeInOut" } });
    if (request !== generation.current) return;
    turning.current = false;
    setBusy(false);
  }
  return <section className="competition-panel">
    <div className="compete-section-heading"><AppHeading>{feed ? "Activity" : "Standings"}</AppHeading><button type="button" className="fb-btn-line" aria-label={feed ? "Show standings" : "Show activity feed"} disabled={busy} onClick={() => void flip()}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={APP_ICON_PATHS.sync} /></svg><AppText role="label">{feed ? "Standings" : "Activity"}</AppText></button></div>
    <div style={{ perspective: 1000 }}><motion.div animate={controls} style={{ backfaceVisibility: "hidden" }}>
      <div hidden={feed}>{standings}</div>
      <div hidden={!feed}>{activity(active && feed)}</div>
    </motion.div></div>
  </section>;
}
