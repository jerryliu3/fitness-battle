import type { StudyConcept } from "./kit";
export const competeConcepts = [
  {
    id: "standings",
    name: "The Standings",
    thesis:
      "A big personal place anchors a clean, full leaderboard. Every athlete is a door.",
    tradeoff: "Fastest to scan; less atmosphere.",
  },
  {
    id: "chase",
    name: "The Chase",
    thesis:
      "The nearest rival leads. A proportional gap ladder gives the leaderboard meaning.",
    tradeoff: "Motivating proximity can overshadow the whole field.",
  },
  {
    id: "podium",
    name: "The Podium",
    thesis:
      "Three spatial places above a calm results table. Ceremony without hiding everyone else.",
    tradeoff: "The top three consume more vertical space.",
  },
  {
    id: "tickets",
    name: "Meet Cards",
    thesis:
      "Each registration is a ticket with a miniature board; open one into its full meet.",
    tradeoff: "One extra tap to the complete standings.",
  },
  {
    id: "switchboard",
    name: "Sport Switchboard",
    thesis:
      "A narrow sport rail sits beside the field: switch context without losing the board.",
    tradeoff: "Less width for long athlete names.",
  },
  {
    id: "season",
    name: "Season Ribbon",
    thesis:
      "A horizontal ribbon of settled weeks leads into the selected week’s leaderboard.",
    tradeoff: "History competes with the current week for attention.",
  },
  {
    id: "terminal",
    name: "Race Room",
    thesis:
      "A dark, compact instrument table puts rank, volume and effort in aligned columns.",
    tradeoff: "Denser and more analytical than the club identity.",
    dark: true,
  },
  {
    id: "terrain",
    name: "Field + List",
    thesis:
      "An illustrative field shares the screen with the same athletes in a readable list.",
    tradeoff:
      "The field duplicates information but improves spatial recognition.",
  },
  {
    id: "results",
    name: "The Trophy Room",
    thesis:
      "A closed-week receipt is the front door, with a clear route back to the current board.",
    tradeoff: "A return-visit design; weaker during a live chase.",
  },
] as const satisfies readonly StudyConcept[];
export const sports = ["Running", "Cycling", "Strength"] as const;
export type Sport = (typeof sports)[number];
export type Track = "Open" | "GPS";
export type Athlete = {
  name: string;
  volume: number;
  effort: number;
  place: number;
  you: boolean;
};
const names = [
  "Mara Chen",
  "Jules Rivera",
  "Alex Lee",
  "Sam Okafor",
  "Noor Patel",
  "Eli Park",
];
const volumes: Record<Sport, readonly number[]> = {
  Running: [21.4, 18.6, 17.8, 16.3, 12.6, 10.2],
  Cycling: [102, 94, 88, 74, 61, 52],
  Strength: [210, 195, 180, 150, 120, 90],
};
export function boardFor(
  sport: Sport,
  track: Track,
  previous = false,
): Athlete[] {
  // Entirely fictional presentation fixtures. Never pass into a scoring reducer.
  const rows = names.map((name, i) => ({
    name,
    you: i === 2,
    volume:
      volumes[sport][i] *
      (track === "GPS" ? 0.9 : 1) *
      (previous ? [1.02, 0.8, 1.1, 0.9, 0.85, 1.05][i] : 1),
    effort: 1230 - i * 22 + (track === "GPS" ? -100 : 0),
  }));
  return rows
    .sort((a, b) => b.volume - a.volume)
    .map((r, i) => ({ ...r, place: i + 1 }));
}
export function volumeLabel(value: number, sport: Sport) {
  return `${value.toFixed(sport === "Strength" ? 0 : 1)} ${sport === "Strength" ? "min" : "mi"}`;
}
export const currentWeek = "Oct 19–25";
export const previousWeek = "Oct 12–18";
