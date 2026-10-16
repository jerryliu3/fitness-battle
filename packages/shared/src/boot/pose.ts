import { EMBER_REST, normalizeEmberPose, type EmberPose } from "../mascot";
import { bootFrame, clamp, READY_END, FLIGHT_END, smooth, type BootFrame } from "./motion";

/** Host owns translation; joints respond to the measured flight bank and phase. */
export function bootEmberPose(
  progress: number,
  options: { reducedMotion?: boolean; frame?: BootFrame } = {},
): EmberPose {
  const p = clamp(progress);
  if (options.reducedMotion || p <= READY_END || p >= FLIGHT_END) return { ...EMBER_REST };
  const frame = options.frame ?? bootFrame(p);
  const t = frame.travel;
  const flight = smooth(t / 0.14) * smooth((1 - t) / 0.16);
  const lag = smooth((t - 0.025) / 0.17) * smooth((1 - t) / 0.11);
  return normalizeEmberPose({
    rotation: (26 + frame.angle * 0.25) * flight,
    heading: frame.angle * flight,
    wind: flight,
    crest: lag,
    depth: 0.85 * flight,
    yaw: 0.2 * flight,
    legLeft: -0.25 * flight,
    legRight: -0.35 * flight,
    mouthOpen: 0.8 * flight,
    trail: 0.55 * flight,
    eyeLeft: 1,
    eyeRight: 1,
  });
}
