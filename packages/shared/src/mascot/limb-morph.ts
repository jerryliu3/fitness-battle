import { EMBER_MODEL, deformEmberPoint, type EmberPose } from "./model";
import { EMBER_K_OUTLINE } from "./k-outline";

export type EmberLimbConcept = "crest-first" | "race-start";
type Point = readonly [number, number];
type Cubic = readonly [number, number, number, number, number, number];
export type EmberLimb = "crest" | "leftArm" | "leftLeg" | "rightLeg" | "rightArm";

export const EMBER_LIMB_PREVIEW_DURATION = 4200;
/** Authoring preview: K → Ember, hold, Ember → K. Does not loop by itself. */
export function sampleLimbMorphPreview(elapsedMs: number): number {
  const ms = Number.isFinite(elapsedMs) ? Math.max(0,elapsedMs) : 0;
  const ease = (t: number) => t*t*t*(t*(6*t-15)+10);
  return ms<250 ? 0 : ms<1750 ? ease((ms-250)/1500) : ms<2450 ? 1 : ms<3950 ? 1-ease((ms-2450)/1500) : 0;
}

// Clockwise anatomical landmarks, in Ember's perspective:
// crest → left shoulder → left arm → armpit → left leg → leg valley →
// right leg → armpit → right arm → neck → inside crest → crest.
// K indices are unwrapped so every interval runs in the same direction.
// The paired arm/leg occupies two places on ONE lower K branch, not two
// crossing trajectories to a single point.
const correspondence: Record<EmberLimbConcept, readonly number[]> = {
  "crest-first": [26, 39, 56, 74, 94, 112, 125, 128, 132, 140, 149, 154],
  "race-start": [56, 74, 88, 94, 98, 112, 125, 128, 154, 167, 174, 184],
};

// Shape keys for an arm resting alongside its leg. Wrist/foot endpoints travel
// around their joints; the edges form an elbow/cuff rather than scaling a limb.
const tucked: Record<EmberLimbConcept, Partial<Record<number, Cubic>>> = {
  "crest-first": {
    7: [93, 260, 85, 309, 73, 309],
    8: [52, 316, 68, 201, 126, 149],
  },
  "race-start": {
    1: [271, 175, 298, 253, 284, 266],
    2: [278, 279, 263, 249, 261, 238],
    3: [255, 250, 311, 299, 289, 311],
    4: [275, 326, 196, 290, 182, 289],
  },
};
const smooth = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t*t*(3-2*t); };
const at = (index: number): Point => {
  const n = EMBER_K_OUTLINE.length, whole = Math.floor(index), t = index - whole;
  const a = EMBER_K_OUTLINE[whole % n], b = EMBER_K_OUTLINE[(whole + 1) % n];
  return [a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t];
};

function controls(pose: EmberPose, amount: number, concept: EmberLimbConcept) {
  const fold = smooth(amount / .42);
  const body = EMBER_MODEL.body.map((segment, index) => {
    const key = tucked[concept][index];
    return segment.map((v, k) => key ? v + (key[k]-v)*fold : v);
  });
  const joints = EMBER_MODEL.joints;
  const tips = concept === "crest-first"
    ? [[7, joints.armLeft] as const]
    : [[1, joints.armRight] as const, [3, joints.legRight] as const];
  for (const [index, joint] of tips) {
    const original = EMBER_MODEL.body[index], target = tucked[concept][index]!;
    const ax = original[4]-joint[0], ay = original[5]-joint[1];
    const bx = target[4]-joint[0], by = target[5]-joint[1];
    const angle = Math.atan2(ay,ax);
    const delta = Math.atan2(Math.sin(Math.atan2(by,bx)-angle),Math.cos(Math.atan2(by,bx)-angle));
    const radius = Math.hypot(ax,ay)+(Math.hypot(bx,by)-Math.hypot(ax,ay))*fold;
    const dx = joint[0]+Math.cos(angle+delta*fold)*radius-body[index][4];
    const dy = joint[1]+Math.sin(angle+delta*fold)*radius-body[index][5];
    // Move both sides of the tip with its arc, keeping the rounded cuff tangent.
    body[index][2]+=dx; body[index][3]+=dy;
    body[index][4]+=dx; body[index][5]+=dy;
    body[index+1][0]+=dx; body[index+1][1]+=dy;
  }
  const starts = [EMBER_MODEL.start, ...body.slice(0,-1).map(s => [s[4],s[5]])];
  return body.map((s, i) => [starts[i], [s[0],s[1]], [s[2],s[3]], [s[4],s[5]]]
    .map(([x,y]) => deformEmberPoint(x,y,pose)));
}

const cubicAt = (points: number[][], t: number): Point => {
  const u = 1-t, weights = [u**3, 3*u*u*t, 3*u*t*t, t**3];
  return [0,1].map(k => points.reduce((sum,p,i)=>sum+p[k]*weights[i],0)) as [number,number];
};

/** Anatomical correspondence, including every K vertex and at least 16 samples per curve. */
export function sampleLimbMorph(pose: EmberPose, amount: number, concept: EmberLimbConcept): Point[] {
  const knots = correspondence[concept], curves = controls(pose, amount, concept);
  return curves.flatMap((curve, i) => {
    const a = knots[i], b = knots[i+1];
    const samples = new Set<number>();
    for(let k=a;k<b;k++) samples.add(k);
    for(let k=0;k<16;k++) samples.add(a+(b-a)*k/16);
    return [...samples].sort((a,b)=>a-b).map(index => {
      const source = cubicAt(curve, (index-a)/(b-a)), target = at(index);
      return [source[0]+(target[0]-source[0])*amount, source[1]+(target[1]-source[1])*amount] as Point;
    });
  });
}

/** Review guides use exactly the same landmarks as the rendered silhouette. */
export function emberLimbMarkers(pose: EmberPose, amount: number, concept: EmberLimbConcept): { limb: EmberLimb; point: Point }[] {
  const curves = controls(pose, amount, concept), knots = correspondence[concept];
  return (["crest","leftArm","leftLeg","rightLeg","rightArm"] as const).map((limb,i) => {
    const index=i*2, source=curves[index][0], target=at(knots[index]);
    return { limb, point: [source[0]+(target[0]-source[0])*amount, source[1]+(target[1]-source[1])*amount] };
  });
}

/** Carry the crescent with the moving crest instead of leaving it at the old hair location. */
export function limbMorphCrescent(pose: EmberPose, amount: number, concept: EmberLimbConcept): string {
  const knots = correspondence[concept], tip = at(knots[0]), neck = at(knots[9]);
  const point = (x: number, y: number) => {
    const weight = Math.max(0, Math.min(1, (y-57)/92));
    const p = deformEmberPoint(x,y,pose);
    const dx = (tip[0]-140)*(1-weight)+(neck[0]-126)*weight;
    const dy = (tip[1]-57)*(1-weight)+(neck[1]-149)*weight;
    return `${(p[0]+dx*amount).toFixed(3)} ${(p[1]+dy*amount).toFixed(3)}`;
  };
  return `M ${point(...EMBER_MODEL.crescentStart)} ${EMBER_MODEL.crescent.map(s => `C ${point(s[0],s[1])} ${point(s[2],s[3])} ${point(s[4],s[5])}`).join(" ")} Z`;
}
