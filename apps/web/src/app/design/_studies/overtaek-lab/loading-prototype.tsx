"use client";

import { useEffect, useRef, useState } from "react";
import {
  emberKCharacterPose,
  type EmberKConcept,
  type EmberPose,
} from "@fitness-battle/shared/mascot";
import {
  BOOT_DURATION_MS,
  READY_END,
  bootEmberPose,
  bootFrame,
  clamp,
  type BootFlightStyle,
  type BootLayout,
} from "@fitness-battle/shared/boot";
import { Ember } from "@/components/mascot/ember";
import styles from "./loading-prototype.module.css";

type MorphMode = EmberKConcept | "crossfade";

const CONCEPT_META: Record<
  EmberKConcept,
  {
    title: string;
    subtitle: string;
    limbs: {
      topLeft: string;
      topRight: string;
      bottomLeft: string;
      bottomRight: string;
    };
  }
> = {
  tucked: {
    title: "Upright Side-Tuck K",
    subtitle:
      "Ember stands tall as the left vertical stem of K: its crest forms the top-left stem, its left arm reaches up-right, its right leg + right arm tuck neatly along its side for the bottom-left stem, and its left leg plants bottom-right.",
    limbs: {
      topLeft: "Ember’s hair / top crest",
      topRight: "Anatomical left arm (screen-right)",
      bottomLeft: "Right leg + right arm tucked on side",
      bottomRight: "Anatomical left leg (screen-right)",
    },
  },
  skater: {
    title: "Speed-Skater Race-Start K",
    subtitle:
      "Ember coils like a speed skater at the starting line: its right arm reaches high to form the top-left stem, its hair/crest leans into the top-right diagonal, its right leg plants bottom-left, and its left arm + left leg tuck together at bottom-right.",
    limbs: {
      topLeft: "Anatomical right arm raised high",
      topRight: "Ember’s hair / crest leaning right",
      bottomLeft: "Anatomical right leg planted back",
      bottomRight: "Left arm + left leg tucked together",
    },
  },
};

const FLIGHT_STYLES: { id: BootFlightStyle; label: string; summary: string }[] = [
  {
    id: "orbit",
    label: "3D Banked Orbit",
    summary: "Uniform-knot Catmull-Rom arc behind OVERTA, continuous 3D banked turn around O, foreground slingshot past E.",
  },
  {
    id: "figure8",
    label: "Corkscrew Figure-8",
    summary: "Weaves in and out of the letterforms before banking around O and diving past E.",
  },
  {
    id: "sprint",
    label: "Sprinter Draft",
    summary: "Compact draft behind T/A, then an explosive high-arcing pounce over E into the final K slot.",
  },
];

const TIMELINE_BOOKMARKS: { label: string; p: number }[] = [
  { label: "0% · Initial K", p: 0 },
  { label: "11% · Un-morphing", p: 0.11 },
  { label: "22% · Launch Pose", p: READY_END },
  { label: "42% · Behind OVERTA", p: 0.42 },
  { label: "52% · Banking O", p: 0.52 },
  { label: "74% · Overtaking E", p: 0.74 },
  { label: "90% · K Settle Morph", p: 0.9 },
  { label: "100% · OVERTAEK", p: 1 },
];

export function LoadingPrototype() {
  const stageRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<HTMLSpanElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const eRef = useRef<HTMLSpanElement>(null);
  const emberHostRef = useRef<HTMLSpanElement>(null);
  const kHostRef = useRef<HTMLSpanElement>(null);

  const [morphMode, setMorphMode] = useState<MorphMode>("tucked");
  const [flightStyle, setFlightStyle] = useState<BootFlightStyle>("orbit");
  const [playing, setPlaying] = useState(true);
  const [slow, setSlow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"Ready" | "Flight" | "OVERTAEK">("Ready");
  const [pose, setPose] = useState<EmberPose>(() => bootEmberPose(0, { concept: "tucked", style: "orbit" }));
  const [kMorph, setKMorph] = useState<number>(() => bootFrame(0).kMorph);

  // Dedicated anatomical K ↔ Ember scrubber state for the side-by-side comparison cards
  const [anatomyMorph, setAnatomyMorph] = useState<number>(0.46);
  const [anatomyAuto, setAnatomyAuto] = useState<boolean>(true);
  const [showOverlayK, setShowOverlayK] = useState<boolean>(false);

  const activeConcept: EmberKConcept = morphMode === "skater" ? "skater" : "tucked";
  const progressRef = useRef(0);
  const layoutRef = useRef<BootLayout & { homeX: number; homeY: number }>({
    overtaWidth: 1,
    slotWidth: 1,
    eWidth: 1,
    font: 1,
    homeX: 0,
    homeY: 0,
  });

  function selectMorphMode(next: MorphMode) {
    setMorphMode(next);
    if (next === "tucked" || next === "skater") {
      try {
        window.localStorage.setItem("overtaek-k-concept", next);
      } catch {
        // ignore
      }
    }
  }

  function selectFlightStyle(next: BootFlightStyle) {
    setFlightStyle(next);
    try {
      window.localStorage.setItem("overtaek-flight-style", next);
    } catch {
      // ignore
    }
  }

  // Synchronize main wordmark stage DOM & pose
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    function applyFrame(p: number) {
      const letter = eRef.current;
      const emberHost = emberHostRef.current;
      const kHost = kHostRef.current;
      if (!letter || !emberHost || !kHost) return;
      const clamped = clamp(p);
      progressRef.current = clamped;
      const l = layoutRef.current;
      const frame = bootFrame(clamped, l, flightStyle);
      const isLegacyCrossfade = morphMode === "crossfade";

      letter.style.transform = `translate(${-l.slotWidth * frame.eShift}px, ${-frame.eLift}px)`;
      const size = l.font * 1.16 * frame.scale;
      emberHost.style.left = `${l.homeX + frame.x}px`;
      emberHost.style.bottom = `${l.homeY - frame.y}px`;
      emberHost.style.width = `${size}px`;
      emberHost.style.height = `${size}px`;
      emberHost.style.opacity = isLegacyCrossfade ? String(frame.emberOpacity) : "1";
      emberHost.style.zIndex = frame.depth < 0 ? "1" : "3";
      emberHost.style.transform = isLegacyCrossfade
        ? `translate(-50%, 5%) scale(${frame.facing}, 1)`
        : "translate(-50%, 5%)";

      kHost.style.left = `${l.homeX + bootFrame(1, l, flightStyle).x}px`;
      kHost.style.bottom = `${l.homeY}px`;
      kHost.style.fontSize = `${l.font}px`;
      kHost.style.opacity = isLegacyCrossfade ? String(frame.kOpacity) : showOverlayK ? "0.28" : "0";
      kHost.style.zIndex = "3";

      setPhase(frame.phase);
      setKMorph(isLegacyCrossfade ? 0 : frame.kMorph);
      setPose(
        bootEmberPose(clamped, {
          concept: activeConcept,
          style: flightStyle,
        }),
      );
    }

    function measure() {
      if (!wordRef.current || !stageRef.current || !lettersRef.current || !slotRef.current || !eRef.current) return;
      const font = Number.parseFloat(getComputedStyle(wordRef.current).fontSize);
      if (!Number.isFinite(font) || font <= 0) return;
      const stageBox = stageRef.current.getBoundingClientRect();
      const slotBox = slotRef.current.getBoundingClientRect();
      layoutRef.current = {
        overtaWidth: lettersRef.current.getBoundingClientRect().width,
        slotWidth: slotBox.width,
        eWidth: eRef.current.getBoundingClientRect().width,
        font,
        homeX: slotBox.left - stageBox.left + slotBox.width / 2,
        homeY: stageBox.bottom - slotBox.bottom,
      };
      applyFrame(progressRef.current);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    measure();
    void document.fonts?.ready.then(measure);

    return () => observer.disconnect();
  }, [activeConcept, flightStyle, morphMode, showOverlayK]);

  // Update stage when progress changes via scrubber/bookmarks
  useEffect(() => {
    const word = wordRef.current;
    const letter = eRef.current;
    const emberHost = emberHostRef.current;
    const kHost = kHostRef.current;
    if (!word || !letter || !emberHost || !kHost) return;

    const clamped = clamp(progress);
    progressRef.current = clamped;
    const l = layoutRef.current;
    const frame = bootFrame(clamped, l, flightStyle);
    const isLegacyCrossfade = morphMode === "crossfade";

    letter.style.transform = `translate(${-l.slotWidth * frame.eShift}px, ${-frame.eLift}px)`;
    const size = l.font * 1.16 * frame.scale;
    emberHost.style.left = `${l.homeX + frame.x}px`;
    emberHost.style.bottom = `${l.homeY - frame.y}px`;
    emberHost.style.width = `${size}px`;
    emberHost.style.height = `${size}px`;
    emberHost.style.opacity = isLegacyCrossfade ? String(frame.emberOpacity) : "1";
    emberHost.style.zIndex = frame.depth < 0 ? "1" : "3";
    emberHost.style.transform = isLegacyCrossfade
      ? `translate(-50%, 5%) scale(${frame.facing}, 1)`
      : "translate(-50%, 5%)";

    kHost.style.left = `${l.homeX + bootFrame(1, l, flightStyle).x}px`;
    kHost.style.bottom = `${l.homeY}px`;
    kHost.style.fontSize = `${l.font}px`;
    kHost.style.opacity = isLegacyCrossfade ? String(frame.kOpacity) : showOverlayK ? "0.28" : "0";
    kHost.style.zIndex = "3";

    setPhase(frame.phase);
    setKMorph(isLegacyCrossfade ? 0 : frame.kMorph);
    setPose(
      bootEmberPose(clamped, {
        concept: activeConcept,
        style: flightStyle,
      }),
    );
  }, [progress, activeConcept, flightStyle, morphMode, showOverlayK]);

  // Main animation loop
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let pauseTimer: ReturnType<typeof setTimeout> | null = null;

    function tick(now: number) {
      const dt = now - last;
      last = now;
      const duration = BOOT_DURATION_MS * (slow ? 2.6 : 1);
      const next = progressRef.current + dt / duration;
      if (next >= 1) {
        setProgress(1);
        pauseTimer = setTimeout(() => {
          setProgress(0);
          last = performance.now();
          raf = requestAnimationFrame(tick);
        }, 900);
        return;
      }
      setProgress(next);
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (pauseTimer) clearTimeout(pauseTimer);
    };
  }, [playing, slow]);

  // Auto-oscillate the side-by-side anatomy morph inspector when enabled
  useEffect(() => {
    if (!anatomyAuto) return;
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const cycle = ((now - start) / 3600) % 1;
      // Smooth back-and-forth sine wave with brief holds at 0, 0.46, and 1
      const raw = 0.5 - 0.5 * Math.cos(cycle * Math.PI * 2);
      setAnatomyMorph(raw);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anatomyAuto]);

  return (
    <section className={styles.prototype} aria-label="Overtaek K-morph and flight prototype studio">
      {/* Concept & Flight Selector Bar */}
      <div className={styles.selectorGrid}>
        <div className={styles.selectorGroup}>
          <span className={styles.groupLabel}>1. Anatomical K ↔ Ember Morph Concept</span>
          <div className={styles.pillRow}>
            <button
              type="button"
              className={`${styles.choicePill} ${morphMode === "tucked" ? styles.choicePillActive : ""}`}
              onClick={() => selectMorphMode("tucked")}
            >
              <strong>Concept 1 · Upright Side-Tuck K</strong>
              <span>Top-L: Hair · Top-R: L-Arm · Bot-L: R-Leg + R-Arm tucked · Bot-R: L-Leg</span>
            </button>
            <button
              type="button"
              className={`${styles.choicePill} ${morphMode === "skater" ? styles.choicePillActive : ""}`}
              onClick={() => selectMorphMode("skater")}
            >
              <strong>Concept 2 · Speed-Skater Start K</strong>
              <span>Top-L: R-Arm high · Top-R: Hair · Bot-L: R-Leg back · Bot-R: L-Arm + L-Leg coiled</span>
            </button>
            <button
              type="button"
              className={`${styles.choicePill} ${morphMode === "crossfade" ? styles.choicePillActive : ""}`}
              onClick={() => selectMorphMode("crossfade")}
            >
              <strong>Legacy · Opacity Crossfade</strong>
              <span>Previous non-morphing baseline (with 1-frame mirror flip) for comparison</span>
            </button>
          </div>
        </div>

        <div className={styles.selectorGroup}>
          <span className={styles.groupLabel}>2. 3D Flight Trajectory</span>
          <div className={styles.pillRow}>
            {FLIGHT_STYLES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.choicePill} ${flightStyle === item.id ? styles.choicePillActive : ""}`}
                onClick={() => selectFlightStyle(item.id)}
              >
                <strong>{item.label}</strong>
                <span>{item.summary}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Wordmark Stage */}
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.stageBadges}>
          <span className={styles.stageBadge}>
            {morphMode === "tucked"
              ? "Concept 1: Upright Side-Tuck K"
              : morphMode === "skater"
                ? "Concept 2: Speed-Skater Start K"
                : "Legacy Opacity Crossfade"}
          </span>
          <span className={styles.stageBadge}>
            kMorph: <strong>{Math.round(kMorph * 100)}%</strong>
          </span>
          <span className={styles.stageBadge}>
            Phase: <strong>{phase}</strong>
          </span>
        </div>

        <div ref={wordRef} className={styles.word} role="img" aria-label="OVERTAKE">
          <span ref={lettersRef} className={styles.letters} aria-hidden="true">
            OVERTA
          </span>
          <span ref={slotRef} className={styles.slot} aria-hidden="true">
            <span className={styles.strut}>A</span>
          </span>
          <span ref={eRef} className={styles.e} aria-hidden="true">
            E
          </span>
        </div>

        <span ref={emberHostRef} className={styles.emberFly} aria-hidden="true">
          <Ember pose={pose} kMorph={kMorph} kConcept={activeConcept} shadow={false} />
        </span>

        <span ref={kHostRef} className={styles.kGlyph} aria-hidden="true">
          K
        </span>
      </div>

      {/* Playback & Timeline Scrubber Controls */}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => {
            if (!playing && progress >= 0.99) setProgress(0);
            setPlaying((v) => !v);
          }}
        >
          {playing ? "⏸ Pause" : progress >= 0.99 ? "↻ Replay" : "▶ Play"}
        </button>

        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={slow}
            onChange={(e) => setSlow(e.target.checked)}
          />
          Slow motion (0.38×)
        </label>

        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showOverlayK}
            onChange={(e) => setShowOverlayK(e.target.checked)}
          />
          Ghost font “K” reference
        </label>

        <label className={styles.scrub}>
          <span>Timeline ({Math.round(progress * 100)}%)</span>
          <input
            type="range"
            min="0"
            max="1000"
            value={Math.round(progress * 1000)}
            onChange={(e) => {
              setPlaying(false);
              setProgress(Number(e.currentTarget.value) / 1000);
            }}
          />
        </label>
      </div>

      {/* Quick Phase Bookmarks */}
      <div className={styles.bookmarks}>
        {TIMELINE_BOOKMARKS.map((bm) => (
          <button
            key={bm.label}
            type="button"
            className={`${styles.bookmarkBtn} ${Math.abs(progress - bm.p) < 0.04 ? styles.bookmarkBtnActive : ""}`}
            onClick={() => {
              setPlaying(false);
              setProgress(bm.p);
            }}
          >
            {bm.label}
          </button>
        ))}
      </div>

      {/* Side-by-Side Anatomical K ↔ Ember Morph Comparison Studio */}
      <div className={styles.anatomySection}>
        <div className={styles.anatomyHeader}>
          <div>
            <h2 className={styles.anatomyTitle}>Side-by-Side Topological K ↔ Ember Morph Inspector</h2>
            <p className={styles.anatomySubtitle}>
              Inspired by <code>goalmaxxing/plan-view-morph.ts</code>: all 11 cubic Bézier segments of Ember’s star
              contour interpolate with two-stage <code>smootherstep</code> continuity through an organic Character-K
              keyframe (<code>46%</code>) into the sharp capital <code>K</code> (<code>100%</code>) with zero self-intersection.
            </p>
          </div>
          <div className={styles.anatomyControls}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setAnatomyAuto((v) => !v)}
            >
              {anatomyAuto ? "⏸ Pause Morph Loop" : "▶ Auto-Morph Loop"}
            </button>
            <div className={styles.anatomyQuickBtns}>
              <button
                type="button"
                className={styles.bookmarkBtn}
                onClick={() => {
                  setAnatomyAuto(false);
                  setAnatomyMorph(0);
                }}
              >
                0% · Star Ember
              </button>
              <button
                type="button"
                className={styles.bookmarkBtn}
                onClick={() => {
                  setAnatomyAuto(false);
                  setAnatomyMorph(0.46);
                }}
              >
                46% · Living Character K
              </button>
              <button
                type="button"
                className={styles.bookmarkBtn}
                onClick={() => {
                  setAnatomyAuto(false);
                  setAnatomyMorph(1);
                }}
              >
                100% · Architectural K
              </button>
            </div>
          </div>
        </div>

        <label className={styles.anatomySliderRow}>
          <span>Direct Contour Morph Scrubber: <strong>{Math.round(anatomyMorph * 100)}%</strong></span>
          <input
            type="range"
            min="0"
            max="1000"
            value={Math.round(anatomyMorph * 1000)}
            onChange={(e) => {
              setAnatomyAuto(false);
              setAnatomyMorph(Number(e.currentTarget.value) / 1000);
            }}
          />
        </label>

        <div className={styles.conceptCards}>
          {(["tucked", "skater"] as const).map((conceptId) => {
            const meta = CONCEPT_META[conceptId];
            const charPose = emberKCharacterPose(conceptId, Math.min(1, anatomyMorph * 1.35));
            const isSelected = morphMode === conceptId;
            return (
              <article
                key={conceptId}
                className={`${styles.conceptCard} ${isSelected ? styles.conceptCardSelected : ""}`}
              >
                <div className={styles.conceptCardTop}>
                  <div>
                    <span className={styles.conceptTag}>
                      {conceptId === "tucked" ? "CONCEPT 1" : "CONCEPT 2"}
                    </span>
                    <h3 className={styles.conceptName}>{meta.title}</h3>
                  </div>
                  <button
                    type="button"
                    className={styles.useConceptBtn}
                    onClick={() => selectMorphMode(conceptId)}
                  >
                    {isSelected ? "✓ Active on Stage" : "Use on Stage"}
                  </button>
                </div>

                <div className={styles.conceptViewport}>
                  {/* Corner limb callout badges matching the 4 limbs of K */}
                  <span className={`${styles.limbBadge} ${styles.limbTopLeft}`}>
                    <strong>Top-Left</strong>
                    {meta.limbs.topLeft}
                  </span>
                  <span className={`${styles.limbBadge} ${styles.limbTopRight}`}>
                    <strong>Top-Right</strong>
                    {meta.limbs.topRight}
                  </span>
                  <span className={`${styles.limbBadge} ${styles.limbBottomLeft}`}>
                    <strong>Bottom-Left</strong>
                    {meta.limbs.bottomLeft}
                  </span>
                  <span className={`${styles.limbBadge} ${styles.limbBottomRight}`}>
                    <strong>Bottom-Right</strong>
                    {meta.limbs.bottomRight}
                  </span>

                  <div className={styles.conceptEmberWrap}>
                    <Ember
                      pose={charPose}
                      kMorph={anatomyMorph}
                      kConcept={conceptId}
                      size={210}
                      shadow={false}
                    />
                  </div>
                </div>

                <p className={styles.conceptDesc}>{meta.subtitle}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
