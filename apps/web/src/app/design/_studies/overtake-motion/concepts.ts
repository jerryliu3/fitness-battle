export type Family = "overtake" | "logo" | "type";
export type Outcome = 0 | 1 | 2;
export type Avatar = "circle" | "ember";

export interface Concept {
  id: string;
  name: string;
  label: string;
  description: string;
  detail: string;
  duration: number;
  beats: [string, string, string, string];
}

export const families: { id: Family; title: string; short: string; description: string }[] = [
  { id: "overtake", title: "The overtake", short: "The moment", description: "Your run is in. Make the progress feel real." },
  { id: "logo", title: "The logo race", short: "The identity", description: "Two words. A little rivalry. One signature." },
  { id: "type", title: "Type in motion", short: "The attitude", description: "How fast can a word feel standing still?" },
];

export const originalConcepts: Record<Family, Concept[]> = {
  overtake: [
    { id: "dash", name: "Afterburn", label: "THE SONIC ONE", description: "Coil. Launch. Leave a little electricity behind.", detail: "Your circle compresses before accelerating. Each pass sends a small shockwave through the other lane; a crisp rank chip lands at the end.", duration: 4600, beats: ["Run arrives", "Charge up", "Make the pass", "New position"] },
    { id: "draft", name: "Slipstream", label: "THE FLUID ONE", description: "Catch their wake. Break through. Keep flowing.", detail: "A ribbon pulls you forward. The passed athlete’s wake ripples as you cross, then dissolves into a quiet, clean result.", duration: 5200, beats: ["Run arrives", "Find the flow", "Break the wake", "Settle in"] },
    { id: "photo", name: "Photo finish", label: "THE CINEMATIC ONE", description: "The whole field slows down for your moment.", detail: "The camera pushes toward the first crossing. Motion slows at shoulder-to-shoulder, a thin flash captures the pass, then the field returns to scale.", duration: 6000, beats: ["Run arrives", "Push in", "Freeze the pass", "Pull back"] },
    { id: "combo", name: "Combo breaker", label: "THE PLAYFUL ONE", description: "One pass feels good. Two feels like a streak.", detail: "Each crossing drops a collectible ring and increments the combo. A proposed weekly overtake count celebrates the moment without changing scoring.", duration: 5000, beats: ["Run arrives", "Power up", "Collect passes", "Bank the combo"] },
  ],
  logo: [
    { id: "chase", name: "The chase", label: "CLEAN & CONFIDENT", description: "A straight-line sprint into the final lockup.", detail: "“over” enters first. “taek” catches it from behind, crosses through the lead and brakes into the right-hand half. Particles carry the speed while the mark stays centered.", duration: 4200, beats: ["Over enters", "Taek chases", "Taek overtakes", "Lockup"] },
    { id: "switch", name: "Lane switch", label: "A LITTLE RIVALRY", description: "Two racing lines become one word.", detail: "The words begin on parallel lanes. “taek” accelerates past on the lower line before both lanes converge into a compact, forward-leaning mark.", duration: 4600, beats: ["Two lanes", "Close the gap", "Take the lead", "Merge"] },
    { id: "sling", name: "Slingshot", label: "ELASTIC ENERGY", description: "Pull back a beat. Let the whole word fly.", detail: "“taek” stretches the gap like a loaded spring, then releases around “over” on a shallow arc. The tension resolves into a single sharp wordmark.", duration: 4800, beats: ["Set the pace", "Load the spring", "Release", "Land"] },
    { id: "relay", name: "Split second", label: "PRECISION SPORT", description: "A timing line makes the change of lead unmistakable.", detail: "A photo-finish line divides the stage. “over” leads until “taek” streaks through, leaving a brief timing echo before the final baseline snaps into place.", duration: 4400, beats: ["Over leads", "Taek closes", "Cross the line", "Signature"] },
  ],
  type: [
    { id: "lean", name: "Forward only", label: "BUILT INTO THE LETTERS", description: "An athletic lean. A sharp little kick.", detail: "A progressive forward slant and a rising underline put the momentum in the silhouette itself. The simplest option for small sizes and everyday product use.", duration: 2800, beats: ["Upright", "Lean in", "Accelerate", "Hold the angle"] },
    { id: "speed", name: "Velocity cuts", label: "A GRAPHIC SIGNATURE", description: "Speed lines with somewhere to go.", detail: "Three tapered lines join the opening O. A horizontal cut through the trail suggests air moving past; the final frame keeps the lines as part of the mark.", duration: 3000, beats: ["Still", "Air moves", "Cut through", "Hold the lines"] },
    { id: "echo", name: "Afterimage", label: "SPEED YOU CAN FEEL", description: "A ghost of where you were a second ago.", detail: "Offset copies of the word dissolve behind it, like a long exposure. A restrained pair of echoes stays in the final mark; compare it on light and dark.", duration: 3200, beats: ["Still", "Build the echo", "Full speed", "Hold the trace"] },
    { id: "ribbon", name: "Aero ribbon", label: "THE EXPRESSIVE ONE", description: "A passing line wraps the word in momentum.", detail: "An aerodynamic ribbon sweeps behind the word, curves around the end and emerges as an upward arrow. A complete static badge with a racing-line flourish.", duration: 3400, beats: ["Still", "Draw the wake", "Wrap around", "Hold the ribbon"] },
  ],
};

export const concepts: Record<Family, Concept[]> = {
  overtake: [
    { id: "photo-combo", name: "Photo combo", label: "YOUR SELECTED DIRECTION", description: "Every pass gets its moment. Pure afterburn behind you.", detail: "The camera follows each crossing, slows shoulder-to-shoulder, then releases into the next dash. Only the afterburn speed trail follows your character while each pass banks a +1 overtake and builds your combo.", duration: 7600, beats: ["Run arrives", "Build momentum", "Pass by pass", "Bank the combo"] },
  ],
  logo: [
    { id: "chase-stagger", name: "Staggered chase · 40%", label: "40% HEIGHT · 3-LETTER OVERLAP", description: "Over enters first. Three-stage duel into a 40% vertical overlap.", detail: "“over” enters the stage by itself first. Then “taek” charges in from behind: 1) “taek” edges past “over”, 2) “over” surges back in front, and 3) “taek” pulls away into a 40% height, three-letter double-exposure lockup with matching letter styling.", duration: 5400, beats: ["Over enters", "Taek edges past", "Over counters", "Taek pulls away"] },
    { id: "chase-open", name: "Staggered chase · 35%", label: "35% HEIGHT · 3-LETTER OVERLAP", description: "A lighter 35% vertical overlap with more breathing room.", detail: "Same “over”-first entry, three-stage lead swap, and three-letter horizontal overlap (v-e-r over t-a-e), but with a more open 35% vertical overlap so the bowls of “a” and “e” kiss the baseline of “over” while “t” and “k” interlock.", duration: 5400, beats: ["Over enters", "Taek edges past", "Over counters", "Taek pulls away"] },
    { id: "chase-mid", name: "Staggered chase · 45%", label: "45% HEIGHT · 3-LETTER OVERLAP", description: "Medium-tight 45% vertical overlap between 40% and 50%.", detail: "Splits the difference between the 40% and 50% vertical overlaps while keeping the three-letter horizontal offset, consistent outline-free glyph styling, and stepped double-exposure finish.", duration: 5400, beats: ["Over enters", "Taek edges past", "Over counters", "Taek pulls away"] },
    { id: "chase-close", name: "Staggered chase · 50%", label: "50% HEIGHT · 3-LETTER OVERLAP", description: "Compact 50% vertical overlap for comparison.", detail: "The tighter 50% vertical overlap paired with the same “over”-first intro, three-stage lead swap, consistent glyph styling, and three-letter horizontal lockup.", duration: 5400, beats: ["Over enters", "Taek edges past", "Over counters", "Taek pulls away"] },
  ],
  type: [
    { id: "echo-stagger", name: "Double exposure", label: "40% HEIGHT · 3-LETTER OVERLAP", description: "Two interlocked rows. Three stepped memories of the pass.", detail: "Folded into the logo race as the final lockup: “taek” sits one letter to the right of “over” so three letters overlap horizontally (v-e-r over t-a-e) with a 40% vertical overlap and three offset exposures.", duration: 3400, beats: ["Two rows", "Build the echo", "Full speed", "Hold the trace"] },
    { id: "echo-liquid", name: "Liquid exposure", label: "40% HEIGHT · ONE CONTINUOUS TRAIL", description: "The letter shape stretches into a single fading wake.", detail: "Uses the same 40% height and three-letter horizontal overlap while stretching each word’s silhouette left into a horizontally blurred, progressively dissolved wake.", duration: 3600, beats: ["Two rows", "Stretch the shape", "Let it dissolve", "Hold the wake"] },
    { id: "echo-jet", name: "Jetstream", label: "40% HEIGHT · GLYPH TO AIRFLOW", description: "Letter-shaped at the front. Pure airflow behind.", detail: "Pairs the 40% height, three-letter overlap lockup with a continuous letter wake that melts into a tapered aerodynamic stream behind both rows.", duration: 3800, beats: ["Two rows", "Catch the air", "Form the stream", "Hold the flow"] },
  ],
};

export const allConcepts: Record<Family, Concept[]> = {
  overtake: [...concepts.overtake, ...originalConcepts.overtake],
  logo: [...concepts.logo, ...originalConcepts.logo],
  type: [...concepts.type, ...originalConcepts.type],
};

export interface PassBeat { at: number; travel: number; slow: boolean }

/** Integrate a slower speed around every actual crossing, then normalize to the run timeline. */
export function passTimeline(outcome: Outcome): PassBeat[] {
  const crossings = rivals.map(r => (r.miles - startMiles) / runMiles[outcome]).filter(t => t > 0 && t < 1).sort((a, b) => a - b);
  const edges = [0, ...crossings.flatMap(t => [Math.max(0, t - .065), t, Math.min(1, t + .065)]), 1];
  const segments = edges.slice(1).map((end, i) => {
    const start = edges[i];
    const slow = crossings.some(c => Math.abs((start + end) / 2 - c) < .066);
    return { end, slow, time: (end - start) * (slow ? 5 : 1) };
  });
  const total = segments.reduce((sum, s) => sum + s.time, 0);
  let elapsed = 0;
  return [{ at: .22, travel: 0, slow: false }, ...segments.map(s => {
    elapsed += s.time;
    return { at: .22 + .62 * elapsed / total, travel: s.end, slow: s.slow };
  })];
}

export const clamp = (n: number) => Math.min(1, Math.max(0, n));
export const between = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
export const ease = (p: number) => p * p * (3 - 2 * p);
export const out = (p: number) => 1 - (1 - p) ** 3;
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const pulse = (p: number, center: number, width: number) => Math.max(0, 1 - Math.abs(p - center) / width);

function hermiteTangents(points: [number, number][]) {
  const slopes = points.slice(1).map(([t1, y1], i) => (y1 - points[i][1]) / (t1 - points[i][0]));
  return points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === points.length - 1) return 0;
    const prev = slopes[i - 1], next = slopes[i];
    if (prev * next <= 0) return 0;
    return Math.sign(prev) * Math.min(Math.abs((prev + next) / 2), 3 * Math.abs(prev), 3 * Math.abs(next));
  });
}

/** Monotone C1 cubic Hermite interpolation so multi-stage races never pause at intermediate waypoints. */
export function smoothTrack(p: number, points: [number, number][]) {
  if (p <= points[0][0]) return points[0][1];
  const tangents = hermiteTangents(points);
  for (let i = 1; i < points.length; i++) {
    const [t0, y0] = points[i - 1], [t1, y1] = points[i];
    if (p <= t1) {
      const h = t1 - t0, s = clamp((p - t0) / h), s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * h * tangents[i - 1] + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * h * tangents[i];
    }
  }
  return points[points.length - 1][1];
}

export function smoothVelocity(p: number, points: [number, number][]) {
  if (p <= points[0][0] || p >= points[points.length - 1][0]) return 0;
  const tangents = hermiteTangents(points);
  for (let i = 1; i < points.length; i++) {
    const [t0, y0] = points[i - 1], [t1, y1] = points[i];
    if (p <= t1) {
      const h = t1 - t0, s = clamp((p - t0) / h), s2 = s * s;
      return ((6 * s2 - 6 * s) * (y0 - y1) + (3 * s2 - 4 * s + 1) * h * tangents[i - 1] + (3 * s2 - 2 * s) * h * tangents[i]) / h;
    }
  }
  return 0;
}

export function stackedLayout(concept: string) {
  if (concept === "chase-open") return { ox: 232, tx: 296, oy: 211, gap: 48, lean: 9, heightOverlap: .35, letterOverlap: 3 };
  if (concept === "chase-mid") return { ox: 232, tx: 296, oy: 214, gap: 41, lean: 9, heightOverlap: .45, letterOverlap: 3 };
  if (concept === "chase-close") return { ox: 232, tx: 296, oy: 216, gap: 38, lean: 9, heightOverlap: .5, letterOverlap: 3 };
  return { ox: 232, tx: 296, oy: 213, gap: 44, lean: 9, heightOverlap: .4, letterOverlap: 3 };
}

export function staggeredLogoFrame(p: number, concept = "chase-stagger") {
  const layout = stackedLayout(concept);
  // "over" enters first by itself (0..0.18), then "taek" charges in (0.16..0.44) and edges ahead,
  // "over" counters to retake the lead (0.44..0.68), and "taek" pulls away into the final lockup (0.68..0.94).
  const overPoints: [number, number][] = [[0, -260], [.18, 78], [.44, 136], [.68, 210], [.9, layout.ox]];
  const taekPoints: [number, number][] = [[.16, -340], [.44, 150], [.68, 172], [.94, layout.tx]];
  const ox = smoothTrack(p, overPoints);
  const tx = smoothTrack(p, taekPoints);
  const overSpeed = clamp(smoothVelocity(p, overPoints) / 850);
  const taekSpeed = clamp(smoothVelocity(p, taekPoints) / 950);
  return { layout, ox, tx, overSpeed, taekSpeed, overRight: ox + 248, taekRight: tx + 272 };
}

// Study fixtures only: miles are presentation data, never inputs to competition scoring.
export const runMiles: Record<Outcome, number> = { 0: .8, 1: 2, 2: 4.2 };
export const startMiles = 12.4;
export const rivals = [
  { name: "Jules", initials: "JL", miles: 15.6, y: 156, color: "#b8cbd7", rank: 2 },
  { name: "Mara", initials: "MA", miles: 13.8, y: 332, color: "#dec4ae", rank: 3 },
];

export function travelAt(p: number, concept: string, outcome: Outcome = 2) {
  const t = between(p, .22, .84);
  if (concept === "photo-combo") {
    const beats = passTimeline(outcome);
    for (let i = 1; i < beats.length; i++) {
      if (p <= beats[i].at) return mix(beats[i - 1].travel, beats[i].travel, between(p, beats[i - 1].at, beats[i].at));
    }
    return 1;
  }
  if (concept === "photo") {
    // Slow the camera's first crossing without changing totals or crossing order.
    if (t < .26) return mix(0, .29, out(t / .26));
    if (t < .58) return mix(.29, .39, (t - .26) / .32);
    return mix(.39, 1, ease((t - .58) / .42));
  }
  return concept === "draft" ? ease(t) : t * t * (2 - t);
}

export function runFrame(p: number, concept: string, outcome: Outcome) {
  const travel = travelAt(p, concept, outcome);
  const miles = startMiles + runMiles[outcome] * travel;
  const passed = rivals.filter(rival => miles > rival.miles);
  return { travel, miles, passed, rank: 4 - passed.length, done: p >= .9 };
}
