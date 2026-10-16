import {
  EMBER_CLIPS,
  EMBER_REST,
  emberKCharacterPose,
  sampleEmber,
  type EmberKConcept,
  type EmberPose,
} from "../mascot";
import {
  bootFlyProgress,
  bootFrame,
  bootKMorph,
  clamp,
  READY_END,
  smooth,
  smoother,
  type BootFlightStyle,
} from "./motion";

/**
 * Arm recipe for a capital K silhouette:
 * - "tucked" (Concept 1): screen-left arm tucks down along side (-1), screen-right arm lifts up-right (+0.95).
 * - "skater" (Concept 2): screen-left arm reaches high up-left (+1), screen-right arm tucks down-right (-0.88) with the leg.
 */
function kArms(
  morph: number,
  concept: EmberKConcept = "tucked",
): Pick<EmberPose, "armLeft" | "armRight" | "legLeft" | "legRight" | "crest" | "wind" | "heading" | "rotation"> {
  const t = clamp(morph);
  if (concept === "skater") {
    const pose = emberKCharacterPose("skater", t);
    return {
      armLeft: pose.armLeft ?? t,
      armRight: pose.armRight ?? -0.88 * t,
      legLeft: pose.legLeft ?? 0.42 * t,
      legRight: pose.legRight ?? -0.62 * t,
      crest: pose.crest ?? 0.72 * t,
      wind: pose.wind ?? 0.78 * t,
      heading: -45 * t,
      rotation: pose.rotation ?? 16 * t,
    };
  }
  return {
    armLeft: -t,
    armRight: (0.75 + 0.25 * t) * t,
    legLeft: 0.26 * t,
    legRight: -0.56 * t,
    crest: -0.28 * t,
    wind: t,
    heading: -90 * t,
    rotation: -4 * t,
  };
}

function blend(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t);
}

/**
 * Boot Ember pose for a given splash progress.
 * Supports both K-morph anatomical concepts ("tucked" Concept 1 and "skater" Concept 2)
 * and smooth 3D velocity-driven banking around the O without any abrupt mirror snap.
 */
export function bootEmberPose(
  progress: number,
  options: {
    reducedMotion?: boolean;
    concept?: EmberKConcept;
    style?: BootFlightStyle;
  } = {},
): EmberPose {
  const p = clamp(progress);
  const concept = options.concept ?? "tucked";
  if (options.reducedMotion) {
    return {
      ...EMBER_REST,
      x: 0,
      y: 0,
      trail: 0,
      ...kArms(1, concept),
    };
  }

  const morph = bootKMorph(p);
  const frame = bootFrame(p, undefined, options.style);
  const fly = sampleEmber("flyForward", bootFlyProgress(p) * EMBER_CLIPS.flyForward.duration, options);

  if (p <= READY_END) {
    const arms = kArms(morph, concept);
    return {
      ...EMBER_REST,
      x: 0,
      y: 0,
      trail: 0,
      ...arms,
      crest: concept === "skater" ? arms.crest : 0.15 * morph,
    };
  }

  // Ease out of the K silhouette into flight drag, then ease into the landing K concept.
  const flightT = frame.travel;
  const exitK = smoother(clamp(flightT / 0.16));
  const landK = smoother(clamp((flightT - 0.8) / 0.2));
  const kMix = Math.max(1 - exitK, landK);
  const arms = kArms(blend(morph, 1, landK), concept);
  const flyMix = 1 - kMix;

  // Continuous 3D banking & yaw from trajectory velocity (no sudden horizontal mirror snap!).
  const vx = frame.velocityX;
  const vy = frame.velocityY;
  const bankRotation = clamp((vx * 32 + vy * -12 + 35) / 70) * 64 - 28;
  const bankYaw = Math.max(-0.42, Math.min(0.42, vx * 0.38));
  const bankLookX = Math.max(-0.75, Math.min(0.75, vx * 0.65));

  return {
    ...fly,
    x: 0,
    y: 0,
    yaw: blend(0, bankYaw, flyMix),
    lookX: blend(0.2, bankLookX, flyMix),
    lookY: blend(0, vy * 0.35, flyMix),
    heading: blend(arms.heading, vx < 0 ? -25 : fly.heading, flyMix),
    armLeft: blend(arms.armLeft, vx < 0 ? 0.45 : fly.armLeft, flyMix),
    armRight: blend(arms.armRight, vx < 0 ? 0.65 : fly.armRight, flyMix),
    legLeft: blend(arms.legLeft, fly.legLeft, flyMix),
    legRight: blend(arms.legRight, fly.legRight, flyMix),
    wind: blend(arms.wind, fly.wind, flyMix),
    trail: fly.trail * flyMix,
    sparkle: Math.max(fly.sparkle * flyMix, landK > 0.1 && landK < 0.85 ? 0.65 * Math.sin(landK * Math.PI) : 0),
    rotation: blend(arms.rotation, bankRotation, flyMix),
    crest: blend(arms.crest, vx < 0 ? -0.55 : fly.crest, flyMix),
    depth: fly.depth * flyMix,
    scaleX: blend(1, fly.scaleX, flyMix),
    scaleY: blend(1, fly.scaleY, flyMix),
  };
}

