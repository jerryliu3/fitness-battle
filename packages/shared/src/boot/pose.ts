import { EMBER_CLIPS, EMBER_REST, sampleEmber, type EmberPose } from "../mascot";
import { bootFlyProgress, bootFrame, bootKMorph, clamp, READY_END, smooth } from "./motion";

/**
 * Arm recipe for a vague capital K: anatomical right tip (screen-left) hangs
 * down; anatomical left tip (screen-right) lifts. Wind + heading only feed the
 * shared deform formula — body rotate still uses `rotation`.
 */
function kArms(morph: number): Pick<EmberPose, "armLeft" | "armRight" | "wind" | "heading"> {
  const t = clamp(morph);
  return {
    armLeft: -t,
    armRight: (0.75 + 0.25 * t) * t,
    wind: t,
    heading: -90 * t,
  };
}

function blend(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t);
}

/**
 * Boot Ember pose for a given splash progress.
 * Ready: standing → K silhouette. Flight: studio `flyForward` body language for
 * object-consistent travel (host carries the path). Settle: hold K arms while
 * the letter crossfade takes over.
 */
export function bootEmberPose(
  progress: number,
  options: { reducedMotion?: boolean } = {},
): EmberPose {
  const p = clamp(progress);
  if (options.reducedMotion) {
    return {
      ...EMBER_REST,
      x: 0,
      y: 0,
      trail: 0,
      ...kArms(1),
    };
  }

  const morph = bootKMorph(p);
  const frame = bootFrame(p);
  const fly = sampleEmber("flyForward", bootFlyProgress(p) * EMBER_CLIPS.flyForward.duration, options);

  if (p <= READY_END) {
    return {
      ...EMBER_REST,
      x: 0,
      y: 0,
      trail: 0,
      crest: 0.15 * morph,
      ...kArms(morph),
    };
  }

  // Ease out of the K silhouette into flight drag, then ease back for the land.
  const flightT = frame.travel;
  const exitK = smooth(clamp(flightT / 0.14));
  const landK = smooth(clamp((flightT - 0.82) / 0.18));
  const kMix = Math.max(1 - exitK, landK);
  const arms = kArms(blend(morph, 1, landK));
  const flyMix = 1 - kMix;

  return {
    ...fly,
    x: 0,
    y: 0,
    // Host facing handles left/right; keep heading in the flyForward band.
    heading: blend(arms.heading, fly.heading, flyMix),
    armLeft: blend(arms.armLeft, fly.armLeft, flyMix),
    armRight: blend(arms.armRight, fly.armRight, flyMix),
    wind: blend(arms.wind, fly.wind, flyMix),
    trail: fly.trail * flyMix,
    sparkle: fly.sparkle * flyMix,
    rotation: fly.rotation * flyMix * (frame.facing === -1 ? -1 : 1),
    crest: blend(0.2, fly.crest, flyMix),
    depth: fly.depth * flyMix,
    scaleX: blend(1, fly.scaleX, flyMix),
    scaleY: blend(1, fly.scaleY, flyMix),
  };
}
