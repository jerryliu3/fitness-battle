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
    { id: "photo-combo", name: "Photo combo", label: "YOUR SELECTED DIRECTION", description: "Every pass gets its moment. Every moment builds the combo.", detail: "The camera follows each crossing, slows shoulder-to-shoulder, then releases into the next dash. A +1 overtake and a collectible ring land on every pass; the combo stays with you.", duration: 7600, beats: ["Run arrives", "Build momentum", "Pass by pass", "Bank the combo"] },
  ],
  logo: [
    { id: "chase-stagger", name: "Staggered chase", label: "BALANCED · 40% HEIGHT OVERLAP", description: "The chase, on two rows. Two letters of shared ground.", detail: "“over” arrives in the center. “taek” chases on a lower row, leaves a short afterimage, and settles about two letter positions into “over”. A 40% overlap of letter height keeps both words readable.", duration: 5000, beats: ["Over arrives", "Taek chases", "Take the lead", "Hold the stagger"] },
    { id: "chase-close", name: "Close pursuit", label: "COMPACT · 50% HEIGHT OVERLAP", description: "A tighter overlap. A little more tension.", detail: "A closer lower lane, deeper horizontal overlap, and a stronger forward lean create a compact racing badge. A thin background-colored separation keeps the overlapping letter edges crisp.", duration: 5000, beats: ["Over arrives", "Close the gap", "Pass with an echo", "Lock together"] },
    { id: "chase-open", name: "Open draft", label: "AIRY · 30% HEIGHT OVERLAP", description: "Give the words room. Keep the passing line.", detail: "More vertical separation and a longer rightward stagger make the two-row read explicit. The passing taek leaves a softer, longer exposure. Compare a staggered finish with a single-line resolution.", duration: 5200, beats: ["Over arrives", "Find the lower lane", "Overtake", "Settle in"] },
  ],
  type: [
    { id: "echo-stagger", name: "Double exposure", label: "STAGGERED · DISTINCT ECHOES", description: "Two rows. Two faint memories of the pass.", detail: "The selected afterimage treatment, split into over / taek. Short offset echoes follow both rows; the lower word sits roughly two letters to the right and overlaps 40% of the upper word’s height.", duration: 3400, beats: ["Two rows", "Build the echo", "Full speed", "Hold the trace"] },
    { id: "echo-liquid", name: "Liquid exposure", label: "STAGGERED · ONE CONTINUOUS TRAIL", description: "The letter shape stretches into a single fading wake.", detail: "One silhouette of each word stretches left and blurs horizontally. It is strongest where it meets the sharp letters, then fades into air without repeating the word in separate copies.", duration: 3600, beats: ["Two rows", "Stretch the shape", "Let it dissolve", "Hold the wake"] },
    { id: "echo-jet", name: "Jetstream", label: "STAGGERED · GLYPH TO AIRFLOW", description: "Letter-shaped at the front. Pure airflow behind.", detail: "A continuous, softly blurred letter wake melts into a tapered aerodynamic stream. The two staggered words keep sharp leading edges while their trails become increasingly abstract and transparent.", duration: 3800, beats: ["Two rows", "Catch the air", "Form the stream", "Hold the flow"] },
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
