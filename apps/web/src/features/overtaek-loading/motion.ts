export const DURATION_MS = 3800;
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };

/** Integrated velocity curve: launch, fast pass, brake, then rest. */
export function motionAt(progress: number) {
  const p = clamp(progress);
  let speed = 0, acceleration = 0, distance = 0;
  if (p >= .31 && p < .43) {
    const t = (p - .31) / .12;
    speed = (1 - Math.cos(Math.PI * t)) / 2;
    acceleration = Math.PI * Math.sin(Math.PI * t) / .24;
    distance = .12 * (t / 2 - Math.sin(Math.PI * t) / (2 * Math.PI));
  } else if (p >= .43 && p < .54) {
    speed = 1; distance = .06 + p - .43;
  } else if (p >= .54 && p < .70) {
    const t = (p - .54) / .16;
    speed = (1 + Math.cos(Math.PI * t)) / 2;
    acceleration = -Math.PI * Math.sin(Math.PI * t) / .32;
    distance = .17 + .16 * (t / 2 + Math.sin(Math.PI * t) / (2 * Math.PI));
  } else if (p >= .70) distance = .25;
  return { distance: distance / .25, speed, acceleration: acceleration / 13.1 };
}

const STEPS = 456;
const springs = new Float32Array((STEPS + 1) * 2);
const dt = DURATION_MS / 1000 / STEPS;
let tip = 0, tipVelocity = 0, limb = 0, limbVelocity = 0;
for (let i = 0; i <= STEPS; i++) {
  const m = motionAt(i / STEPS);
  const tipTarget = Math.max(-.18, Math.min(.66, .5 * m.speed ** 2 + .18 * m.acceleration));
  const limbTarget = .13 * m.speed ** 2 + .045 * m.acceleration;
  tipVelocity += (169 * (tipTarget - tip) - 2 * .55 * 13 * tipVelocity) * dt;
  tip += tipVelocity * dt;
  limbVelocity += (324 * (limbTarget - limb) - 2 * .68 * 18 * limbVelocity) * dt;
  limb += limbVelocity * dt;
  springs[i * 2] = tip; springs[i * 2 + 1] = limb;
}

export function frameAt(progress: number) {
  const p = clamp(progress), m = motionAt(p);
  const sample = p * STEPS, i = Math.min(STEPS - 1, Math.floor(sample)), blend = sample - i;
  const spring = (offset: number) => p === 1 ? 0 : springs[i * 2 + offset] * (1 - blend) + springs[(i + 1) * 2 + offset] * blend;
  return {
    ...m,
    tip: spring(0), limb: spring(1),
    yaw: (56 * smooth((p - .12) / .18) - 8 * smooth((p - .70) / .20)) * Math.PI / 180,
    roll: -.14 * m.speed - .14 * m.acceleration,
    // E moves left underneath Ember; Ember ends to E's right.
    eShift: smooth((p - .41) / .22),
    lift: Math.sin(m.distance * Math.PI),
    settle: p > .70 && p < 1 ? .04 * Math.sin((p - .70) * Math.PI * 12) * Math.exp(-(p - .70) * 14) : 0,
    phase: p === 1 ? "OVERTAEK" : p < .31 ? "Ready" : p < .43 ? "Accelerate" : p < .54 ? "Overtake" : "Brake",
  };
}
