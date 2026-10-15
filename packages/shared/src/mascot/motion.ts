import { EMBER_REST, blendEmberPoses, type EmberPose } from "./model";

interface Keyframe { at: number; pose: Partial<EmberPose> }
interface Clip { duration: number; description: string; keyframes: readonly Keyframe[] }

/** All clips begin/end at the same rest pose, and can be sampled or scrubbed without a clock. */
export const EMBER_CLIPS = {
  idle: { duration: 3200, description: "A gentle breath and a blink", keyframes: [
    { at: 0, pose: {} }, { at: 0.3, pose: { y: -5, scaleX: 1.018, scaleY: 1.012, crest: -0.06 } },
    { at: 0.6, pose: {} }, { at: 0.66, pose: { eyeLeft: 0, eyeRight: 0 } },
    { at: 0.71, pose: {} }, { at: 1, pose: {} },
  ] },
  wave: { duration: 1800, description: "A hello from the right star point", keyframes: [
    { at: 0, pose: {} }, { at: 0.18, pose: { armRight: 0.9, rotation: -5, mouthOpen: 0.8 } },
    { at: 0.32, pose: { armRight: 0.45, rotation: -3, mouthOpen: 0.8 } },
    { at: 0.47, pose: { armRight: 1, rotation: -5, mouthOpen: 0.8, eyeLeft: 0 } },
    { at: 0.62, pose: { armRight: 0.5, mouthOpen: 0.8 } },
    { at: 0.77, pose: { armRight: 1, mouthOpen: 0.8 } }, { at: 1, pose: {} },
  ] },
  hop: { duration: 1250, description: "Anticipation, takeoff, hang time and a soft landing", keyframes: [
    { at: 0, pose: {} }, { at: 0.17, pose: { y: 12, scaleX: 1.12, scaleY: 0.86, legLeft: 0.15, legRight: 0.15 } },
    { at: 0.32, pose: { y: -38, scaleX: 0.92, scaleY: 1.09, armLeft: 0.6, armRight: 0.6, crest: 0.2, mouthOpen: 1 } },
    { at: 0.49, pose: { y: -64, armLeft: 0.85, armRight: 0.85, mouthOpen: 1 } },
    { at: 0.68, pose: { y: -10, scaleX: 0.96, scaleY: 1.05, mouthOpen: 0.7 } },
    { at: 0.77, pose: { y: 10, scaleX: 1.11, scaleY: 0.88, crest: -0.15 } }, { at: 1, pose: {} },
  ] },
  run: { duration: 820, description: "An in-place stride with alternating feet and a trailing crest", keyframes: [
    { at: 0, pose: {} },
    { at: 0.2, pose: { legLeft: 1, legRight: -0.1, armLeft: 0.4, armRight: -0.3, y: -9, rotation: 9, crest: 0.65, yaw: 0.2, mouthOpen: 0.65, trail: 0.6 } },
    { at: 0.42, pose: { y: -2, rotation: 7, crest: 0.5, yaw: 0.2, mouthOpen: 0.65, trail: 0.5 } },
    { at: 0.65, pose: { legRight: 1, legLeft: -0.1, armRight: 0.4, armLeft: -0.3, y: -9, rotation: 9, crest: 0.65, yaw: 0.2, mouthOpen: 0.65, trail: 0.6 } },
    { at: 0.85, pose: { y: -2, rotation: 7, crest: 0.5, yaw: 0.2, mouthOpen: 0.65, trail: 0.5 } }, { at: 1, pose: {} },
  ] },
  celebrate: { duration: 2200, description: "A joyful stretch, hop and sparkle", keyframes: [
    { at: 0, pose: {} }, { at: 0.13, pose: { y: 8, scaleX: 1.1, scaleY: 0.9 } },
    { at: 0.32, pose: { y: -43, armLeft: 1, armRight: 1, eyeLeft: 0, eyeRight: 0, mouthOpen: 1, sparkle: 1, rotation: -8 } },
    { at: 0.54, pose: { y: -26, armLeft: 0.8, armRight: 1, mouthOpen: 1, sparkle: 1, rotation: 8 } },
    { at: 0.7, pose: { y: 6, scaleX: 1.07, scaleY: 0.94, mouthOpen: 0.8, sparkle: 0.5 } },
    { at: 0.86, pose: { armRight: 0.5, eyeLeft: 0, mouthOpen: 0.7, sparkle: 0.2 } }, { at: 1, pose: {} },
  ] },
  dash: { duration: 1600, description: "Wind up, accelerate and settle", keyframes: [
    { at: 0, pose: {} }, { at: 0.18, pose: { x: -18, rotation: -10, scaleX: 1.08, scaleY: 0.94 } },
    { at: 0.4, pose: { x: 9, y: -26, rotation: 24, scaleX: 0.94, scaleY: 1.08, crest: 1, legLeft: -0.15, legRight: 0.8, yaw: 0.5, trail: 1, mouthOpen: 0.8 } },
    { at: 0.6, pose: { x: 24, y: -36, rotation: 18, crest: 0.8, trail: 1, sparkle: 0.5, mouthOpen: 0.9 } },
    { at: 0.78, pose: { x: 7, rotation: -7, crest: -0.3, scaleX: 1.06, scaleY: 0.94 } }, { at: 1, pose: {} },
  ] },
} as const satisfies Record<string, Clip>;

export type EmberAction = keyof typeof EMBER_CLIPS;
export const EMBER_ACTIONS = Object.keys(EMBER_CLIPS) as EmberAction[];

export function sampleEmber(action: EmberAction, timeMs: number, options: { loop?: boolean; reducedMotion?: boolean } = {}): EmberPose {
  if (options.reducedMotion) return { ...EMBER_REST };
  const clip: Clip = EMBER_CLIPS[action];
  const time = Number.isFinite(timeMs) ? Math.max(0, timeMs) : 0;
  const progress = options.loop ? (time % clip.duration) / clip.duration : Math.min(1, time / clip.duration);
  const frames = clip.keyframes;
  let end = 1;
  while (end < frames.length - 1 && progress > frames[end].at) end++;
  const a = frames[end - 1], b = frames[end];
  const t = Math.max(0, Math.min(1, (progress - a.at) / (b.at - a.at)));
  return blendEmberPoses(a.pose, b.pose, t * t * (3 - 2 * t));
}
