import { activities } from "../design-lab/data";
import { distanceFor, laneRunners, you } from "../evolution-lab/model";
import { ghost, type Runner } from "../spatial-lab/model";

export const conceptIds = ["flip", "rally", "roam", "loop", "tempo"] as const;
export type ConceptId = (typeof conceptIds)[number];
export const checkpoints = ["Start", "Monday", "Tuesday", "Thursday"] as const;
export const imports = [...activities].reverse();
export const references = [ghost, laneRunners[2]!, laneRunners[3]!] as const;
export const concepts: Record<
  ConceptId,
  {
    name: string;
    metaphor: string;
    character: string;
    interaction: string;
    question: string;
    palette: string;
    type: string;
  }
> = {
  flip: {
    name: "FLIP",
    metaphor: "Your week, a comic",
    character: "Zip · the swift",
    interaction: "Turn the panels; read two weeks side by side.",
    question: "Does turning a week into a story make you want to revisit it?",
    palette: "Tomato / ink / chalk",
    type: "Bangers + DM Sans",
  },
  rally: {
    name: "RALLY",
    metaphor: "Your personal broadcast",
    character: "Ace · the sporting star",
    interaction: "Choose a matchup; replay the turning points.",
    question:
      "Can a close comparison feel exciting without making movement feel exclusive?",
    palette: "Tennis yellow / plum",
    type: "Archivo Black + DM Sans",
  },
  roam: {
    name: "ROAM",
    metaphor: "A week to explore",
    character: "Rove · the explorer",
    interaction: "Travel from the start; look ahead or revisit an import.",
    question: "Does exploration make accumulated distance feel meaningful?",
    palette: "Cobalt / sunshine / sky",
    type: "Outfit + DM Sans",
  },
  loop: {
    name: "LOOP",
    metaphor: "Movement taking shape",
    character: "Luma · a comet runner",
    interaction: "Turn the dial; inspect the segments of your week.",
    question: "Can a tactile sporting object feel playful and grown-up?",
    palette: "Coral / mint / aubergine",
    type: "Outfit",
  },
  tempo: {
    name: "TEMPO",
    metaphor: "Your movement mixtape",
    character: "Bop · the radio runner",
    interaction: "Select a track; flip between your week and its reference.",
    question:
      "Does an activity collection feel more personal when it behaves like a mixtape?",
    palette: "Midnight / mint / orange",
    type: "Space Grotesk",
  },
};

export function snapshot(cutoff: number, reference: Runner = ghost) {
  const index = Math.max(0, Math.min(3, Math.round(cutoff)));
  const total = distanceFor(you, index);
  const against = distanceFor(reference, index);
  return {
    cutoff: index,
    total,
    against,
    gap: Math.round((total - against) * 1000) / 1000,
    count: index,
    label: checkpoints[index]!,
  };
}
export function gapText(gap: number) {
  return Math.abs(gap) < 0.001
    ? "Level at this cutoff"
    : `${Math.abs(gap).toFixed(1)} km ${gap > 0 ? "ahead" : "behind"}`;
}
export function referenceSegment(reference: Runner, index: number) {
  return (
    Math.round(
      (distanceFor(reference, index + 1) - distanceFor(reference, index)) *
        1000,
    ) / 1000
  );
}
export function comparisonScale(reference: Runner) {
  return Math.max(
    5,
    Math.ceil(Math.max(distanceFor(you, 3), distanceFor(reference, 3)) / 5) * 5,
  );
}
export function orbitPoint(
  km: number,
  scale: number,
  radius: number,
  center = 200,
) {
  const angle = (km / scale) * Math.PI * 2 - Math.PI / 2;
  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
  };
}
export function orbitArc(
  start: number,
  end: number,
  scale: number,
  radius: number,
) {
  const a = orbitPoint(start, scale, radius),
    b = orbitPoint(end, scale, radius);
  const span = Math.max(0, end - start) / scale;
  if (span >= 1)
    return `M ${a.x} ${a.y} A ${radius} ${radius} 0 1 1 ${200} ${200 + radius} A ${radius} ${radius} 0 1 1 ${a.x} ${a.y}`;
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${span > 0.5 ? 1 : 0} 1 ${b.x} ${b.y}`;
}
