"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  formatSpecialEventVolume,
  specialEventSideCode,
  specialEventSideLabel,
  type SpecialEventCeremonyData,
  type SpecialEventSport,
  type UnitSystem,
} from "@fitness-battle/shared";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";

export function SpecialEventCeremony({
  ceremony,
  sport,
  units,
  onDone,
}: {
  ceremony: SpecialEventCeremonyData;
  sport: SpecialEventSport;
  units: UnitSystem;
  onDone(): void;
}) {
  const [phase, setPhase] = useState<"climbing" | "cutting" | "verdict">("climbing");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setPhase("climbing");
    setProgress(0);
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / 2500);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const t1 = window.setTimeout(() => setPhase("cutting"), 2700);
    const t2 = window.setTimeout(() => setPhase("verdict"), 4100);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [ceremony.roundNumber, ceremony.headline]);

  const maxScore = Math.max(1, ...ceremony.sides.map((s) => s.score));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ceremony.badge}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(18, 20, 26, 0.96)",
        color: "#fff",
        padding: 24,
        display: "grid",
        alignContent: "center",
        justifyItems: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, display: "grid", gap: 16 }}>
        {phase !== "verdict" ? (
          <>
            <div style={{ textAlign: "center", display: "grid", gap: 4 }}>
              <AppText role="caption">{ceremony.badge}</AppText>
              <AppHeading role="heading">
                {phase === "climbing" ? "Finalizing round distances…" : "Applying round cut…"}
              </AppHeading>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {ceremony.sides.map((side, idx) => {
                const liveScore = side.score * progress;
                const dropped = ceremony.isCutFormat && phase === "cutting" && idx + 1 > ceremony.advanceCount;
                const widthPct = Math.max(4, Math.round((liveScore / maxScore) * 100));
                return (
                  <div key={side.sideId} style={{ display: "grid", gap: 4 }}>
                    <motion.div
                      animate={dropped ? { opacity: 0.38, y: 6, scale: 0.98 } : { opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.35 }}
                      style={{
                        display: "grid",
                        gap: 4,
                        padding: "8px 10px",
                        borderRadius: 12,
                        background: side.isYou ? "rgba(183, 242, 85, 0.16)" : "rgba(255, 255, 255, 0.06)",
                        border: `1px solid ${side.isYou ? "rgba(183, 242, 85, 0.65)" : "rgba(255, 255, 255, 0.12)"}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <AppText role="caption">
                          {side.place}. {specialEventSideCode(side)} · {specialEventSideLabel(side)}{side.isYou ? " · You" : ""}
                        </AppText>
                        <AppText role="caption">
                          {dropped ? "OUT" : formatSpecialEventVolume(sport, liveScore, units)}
                        </AppText>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                        <div style={{ width: `${widthPct}%`, height: "100%", background: side.isYou ? "var(--lime, #b7f255)" : "#fff" }} />
                      </div>
                    </motion.div>
                    {ceremony.isCutFormat && phase === "cutting" && ceremony.sides.length > ceremony.advanceCount && idx + 1 === ceremony.advanceCount ? (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        style={{ borderBottom: "2px dashed #ef4444", padding: "4px 0", textAlign: "center", transformOrigin: "left center", color: "#fca5a5" }}
                      >
                        <AppText role="caption">ELIMINATION CUT · TOP {ceremony.advanceCount} ADVANCE</AppText>
                      </motion.div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <button type="button" className="fb-btn-line" onClick={() => setPhase("verdict")}>Skip</button>
          </>
        ) : (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{ display: "grid", gap: 14, textAlign: "center", justifyItems: "center" }}
          >
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: ceremony.tone === "lime" ? "var(--lime, #b7f255)" : ceremony.tone === "danger" ? "#b42318" : "#d4a017",
                color: ceremony.tone === "lime" ? "#12141a" : "#fff",
              }}
            >
              <AppText role="caption">{ceremony.badge}</AppText>
            </span>
            <AppHeading role="display">{ceremony.headline}</AppHeading>
            <AppParagraph typographyRole="support">{ceremony.detail}</AppParagraph>
            <button type="button" className="fb-btn" style={{ width: "100%" }} onClick={onDone}>
              {ceremony.ctaLabel}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
