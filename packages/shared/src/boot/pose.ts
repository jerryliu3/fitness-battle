import { EMBER_CLIPS, EMBER_REST, sampleEmber, type EmberPose } from "../mascot";
import { bootDashProgress, bootKMorph, clamp, READY_END } from "./motion";

/**
 * Arm recipe for a vague capital K: anatomical right tip (screen-left) hangs
 * down; anatomical left tip (screen-right) lifts. Wind + heading only feed the
 * shared deform formula — body rotate still uses `rotation`.
 */
function kArms(morph: number): Pick<EmberPose, "armLeft" | "armRight" | "wind" | "heading"> {
  const t = clamp(morph);
  return {
    armLeft: -t,
    // A bit more lift at the end so the upper K arm sticks up after the jump.
    armRight: (0.75 + 0.25 * t) * t,
    wind: t,
    heading: -90 * t,
  };
}

/**
 * Boot Ember pose for a given splash progress.
 * Starts at standing rest, eases into a K silhouette during ready, keeps that
 * through the fast jump (dash clip supplies a little body language only).
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
  const clip = sampleEmber("dash", bootDashProgress(p) * EMBER_CLIPS.dash.duration, options);
  // Dash rotation only during the jump so the ready beat reads as a standing K.
  const jump = p >= READY_END ? clamp((p - READY_END) / 0.2) : 0;

  return {
    ...clip,
    x: 0,
    y: 0,
    trail: 0,
    rotation: clip.rotation * jump * 0.4,
    scaleX: 1 + (clip.scaleX - 1) * jump,
    scaleY: 1 + (clip.scaleY - 1) * jump,
    crest: clip.crest * (0.25 + 0.75 * morph),
    ...kArms(morph),
  };
}
