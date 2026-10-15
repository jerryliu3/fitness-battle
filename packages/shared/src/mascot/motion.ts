import { EMBER_REST, normalizeEmberPose, type EmberPose } from "./model";

interface Keyframe { at: number; pose: Partial<EmberPose> }
interface Clip { duration: number; description: string; label: string; caption: string; poster: number; keyframes: readonly Keyframe[] }

/** All clips begin/end at rest. Monotone joint curves retain velocity through a cruise. */
export const EMBER_CLIPS = {
  idle: { duration: 3200, label: "Breathe", caption: "Easy does it", poster: 0.3, description: "A gentle breath and a blink", keyframes: [
    { at: 0, pose: {} }, { at: 0.3, pose: { y: -5, scaleX: 1.018, scaleY: 1.012, crest: -0.06 } },
    { at: 0.6, pose: {} }, { at: 0.66, pose: { eyeLeft: 0, eyeRight: 0 } },
    { at: 0.71, pose: {} }, { at: 1, pose: {} },
  ] },
  wave: { duration: 1800, label: "Say hello", caption: "A little welcome", poster: 0.47, description: "A hello from the right star point", keyframes: [
    { at: 0, pose: {} }, { at: 0.18, pose: { armRight: 0.9, rotation: -5, mouthOpen: 0.8 } },
    { at: 0.32, pose: { armRight: 0.45, rotation: -3, mouthOpen: 0.8 } },
    { at: 0.47, pose: { armRight: 1, rotation: -5, mouthOpen: 0.8, eyeLeft: 0 } },
    { at: 0.62, pose: { armRight: 0.5, mouthOpen: 0.8 } },
    { at: 0.77, pose: { armRight: 1, mouthOpen: 0.8 } }, { at: 1, pose: {} },
  ] },
  hop: { duration: 1250, label: "Hop", caption: "Find your lift", poster: 0.49, description: "Anticipation, takeoff, hang time and a soft landing", keyframes: [
    { at: 0, pose: {} }, { at: 0.17, pose: { y: 12, scaleX: 1.12, scaleY: 0.86, legLeft: 0.15, legRight: 0.15 } },
    { at: 0.32, pose: { y: -38, scaleX: 0.92, scaleY: 1.09, armLeft: 0.6, armRight: 0.6, crest: 0.2, mouthOpen: 1 } },
    { at: 0.49, pose: { y: -64, armLeft: 0.85, armRight: 0.85, mouthOpen: 1 } },
    { at: 0.68, pose: { y: -10, scaleX: 0.96, scaleY: 1.05, mouthOpen: 0.7 } },
    { at: 0.77, pose: { y: 10, scaleX: 1.11, scaleY: 0.88, crest: -0.15 } }, { at: 1, pose: {} },
  ] },
  run: { duration: 820, label: "Run", caption: "Keep it moving", poster: 0.2, description: "An in-place stride with alternating feet and a trailing crest", keyframes: [
    { at: 0, pose: {} },
    { at: 0.2, pose: { legLeft: 1, legRight: -0.1, armLeft: 0.4, armRight: -0.3, y: -9, rotation: 9, crest: 0.65, yaw: 0.2, mouthOpen: 0.65, trail: 0.6 } },
    { at: 0.42, pose: { y: -2, rotation: 7, crest: 0.5, yaw: 0.2, mouthOpen: 0.65, trail: 0.5 } },
    { at: 0.65, pose: { legRight: 1, legLeft: -0.1, armRight: 0.4, armLeft: -0.3, y: -9, rotation: 9, crest: 0.65, yaw: 0.2, mouthOpen: 0.65, trail: 0.6 } },
    { at: 0.85, pose: { y: -2, rotation: 7, crest: 0.5, yaw: 0.2, mouthOpen: 0.65, trail: 0.5 } }, { at: 1, pose: {} },
  ] },
  celebrate: { duration: 2200, label: "Celebrate", caption: "You earned this", poster: 0.32, description: "A joyful stretch, hop and sparkle", keyframes: [
    { at: 0, pose: {} }, { at: 0.13, pose: { y: 8, scaleX: 1.1, scaleY: 0.9 } },
    { at: 0.32, pose: { y: -43, armLeft: 1, armRight: 1, eyeLeft: 0, eyeRight: 0, mouthOpen: 1, sparkle: 1, rotation: -8 } },
    { at: 0.54, pose: { y: -26, armLeft: 0.8, armRight: 1, mouthOpen: 1, sparkle: 1, rotation: 8 } },
    { at: 0.7, pose: { y: 6, scaleX: 1.07, scaleY: 0.94, mouthOpen: 0.8, sparkle: 0.5 } },
    { at: 0.86, pose: { armRight: 0.5, eyeLeft: 0, mouthOpen: 0.7, sparkle: 0.2 } }, { at: 1, pose: {} },
  ] },
  dash: { duration: 2400, label: "Dash", caption: "Make your move", poster: 0.48, description: "A deeper windup, a longer burst and a springy brake", keyframes: [
    { at: 0, pose: {} }, { at: 0.16, pose: { x: -10, y: 8, rotation: -10, scaleX: 1.1, scaleY: 0.9, crest: -0.25 } },
    { at: 0.28, pose: { x: -8, y: -15, rotation: 30, scaleX: 1.02, scaleY: 0.98, crest: 0.25, wind: 0.35, depth: 0.9, legLeft: -0.25, legRight: -0.2, yaw: 0.2, trail: 0.8, mouthOpen: 0.9 } },
    { at: 0.48, pose: { x: 19, y: -29, rotation: 35, crest: 1, wind: 1, depth: 1, legLeft: -0.3, legRight: -0.4, armLeft: -0.15, yaw: 0.25, trail: 1, mouthOpen: 0.9 } },
    { at: 0.65, pose: { x: 28, y: -26, rotation: 33, crest: 0.9, wind: 0.9, depth: 0.7, legLeft: -0.2, legRight: -0.3, yaw: 0.2, trail: 1, sparkle: 0.45, mouthOpen: 0.9 } },
    { at: 0.76, pose: { x: 16, y: 1, rotation: -4, crest: 0.6, wind: 0.5, depth: 0.3, scaleX: 1.04, scaleY: 0.96, trail: 0.15 } },
    { at: 0.88, pose: { x: -3, y: -3, rotation: 3, crest: -0.25, armLeft: 0.15, armRight: 0.2 } }, { at: 1, pose: {} },
  ] },
  flyForward: { duration: 3000, label: "Fly forward", caption: "Catch the current", poster: 0.48, description: "Lean into flight; crest and arms trail, then swing back to rest", keyframes: [
    { at: 0, pose: {} }, { at: 0.12, pose: { x: -15, y: 8, scaleX: 1.1, scaleY: 0.9, rotation: -5 } },
    { at: 0.27, pose: { x: -20, y: -28, rotation: 29, crest: 0.2, wind: 0.35, depth: 0.8, legLeft: -0.2, legRight: -0.2, yaw: 0.15, trail: 0.65, mouthOpen: 1 } },
    { at: 0.48, pose: { x: 3, y: -37, rotation: 35, crest: 1, wind: 1, depth: 0.9, legLeft: -0.3, legRight: -0.4, armLeft: -0.15, yaw: 0.3, trail: 1, mouthOpen: 1 } },
    { at: 0.67, pose: { x: 28, y: -34, rotation: 34, crest: 0.85, wind: 0.95, depth: 0.65, legLeft: -0.2, legRight: -0.25, yaw: 0.25, trail: 0.9, mouthOpen: 0.9 } },
    { at: 0.82, pose: { x: 14, y: -14, rotation: 7, crest: 0.65, wind: 0.5, depth: 0.25, trail: 0.2, mouthOpen: 0.5 } },
    { at: 0.92, pose: { y: -2, crest: -0.18, armLeft: 0.15, armRight: 0.2 } }, { at: 1, pose: {} },
  ] },
  flyDiagonal: { duration: 2800, label: "Fly diagonally", caption: "Up and onward", poster: 0.5, description: "Climb up-right with folded arms, a trailing crest and stardust", keyframes: [
    { at: 0, pose: {} }, { at: 0.13, pose: { x: -12, y: 9, rotation: -7, scaleX: 1.1, scaleY: 0.89, heading: -45 } },
    { at: 0.29, pose: { x: -13, y: -22, rotation: 23, crest: 0.2, wind: 0.35, depth: 0.8, legLeft: -0.3, legRight: 0.4, yaw: 0.15, heading: -45, trail: 0.75, sparkle: 0.5, mouthOpen: 0.9 } },
    { at: 0.5, pose: { x: 8, y: -61, rotation: 30, crest: 1, wind: 1, depth: 1, legLeft: -0.35, legRight: 0.6, yaw: 0.25, heading: -45, trail: 1, sparkle: 1, eyeLeft: 0, eyeRight: 0, mouthOpen: 1 } },
    { at: 0.67, pose: { x: 28, y: -82, rotation: 27, crest: 0.85, wind: 0.9, depth: 0.7, legLeft: -0.2, legRight: 0.4, yaw: 0.2, heading: -45, trail: 0.9, sparkle: 0.8, mouthOpen: 1 } },
    { at: 0.82, pose: { x: 18, y: -38, rotation: 9, crest: 0.5, wind: 0.4, depth: 0.2, heading: -45, trail: 0.2, sparkle: 0.4, mouthOpen: 0.7 } },
    { at: 0.94, pose: { y: 4, crest: -0.18, scaleX: 1.04, scaleY: 0.96, heading: -45 } }, { at: 1, pose: {} },
  ] },
  jumpUp: { duration: 2100, label: "Jump up", caption: "A bigger leap", poster: 0.46, description: "Squash, launch straight up with raised points, hang and land", keyframes: [
    { at: 0, pose: {} }, { at: 0.16, pose: { y: 13, scaleX: 1.14, scaleY: 0.84, crest: -0.1, heading: -90 } },
    { at: 0.3, pose: { y: -34, scaleX: 0.96, scaleY: 1.05, armLeft: 0.5, armRight: 0.55, wind: 0.35, depth: 0.9, crest: 0.2, heading: -90, trail: 1, mouthOpen: 1 } },
    { at: 0.46, pose: { y: -88, scaleX: 0.99, scaleY: 1.02, armLeft: 1, armRight: 1, depth: 0.5, crest: 0.35, heading: -90, trail: 0.85, mouthOpen: 1 } },
    { at: 0.59, pose: { y: -84, armLeft: 0.9, armRight: 1, depth: 0.1, crest: -0.1, heading: -90, trail: 0.2, mouthOpen: 1 } },
    { at: 0.76, pose: { y: -14, scaleX: 0.98, scaleY: 1.02, armLeft: 0.35, armRight: 0.4, crest: -0.2, mouthOpen: 0.7 } },
    { at: 0.84, pose: { y: 11, scaleX: 1.12, scaleY: 0.87, crest: -0.2 } }, { at: 1, pose: {} },
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
  const result = { ...EMBER_REST };
  for (const key of Object.keys(result) as (keyof EmberPose)[]) {
    const value = (index: number) => frames[index].pose[key] ?? EMBER_REST[key];
    const tangent = (index: number) => {
      if (index === 0 || index === frames.length - 1) return 0;
      const before = frames[index].at - frames[index - 1].at, after = frames[index + 1].at - frames[index].at;
      const left = (value(index) - value(index - 1)) / before, right = (value(index + 1) - value(index)) / after;
      if (left * right <= 0) return 0;
      const w1 = 2 * after + before, w2 = after + 2 * before;
      return (w1 + w2) / (w1 / left + w2 / right);
    };
    // Shape-preserving cubic Hermite interpolation: continuous velocity, no overshoot.
    const t2 = t * t, t3 = t2 * t, span = b.at - a.at;
    result[key] = (2 * t3 - 3 * t2 + 1) * value(end - 1) + (t3 - 2 * t2 + t) * span * tangent(end - 1)
      + (-2 * t3 + 3 * t2) * value(end) + (t3 - t2) * span * tangent(end);
  }
  return normalizeEmberPose(result);
}
