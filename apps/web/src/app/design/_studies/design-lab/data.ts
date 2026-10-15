/** Presentation fixtures only: no production score or tracker state is read. */
export const conceptIds = [
  "split",
  "bounce",
  "folio",
  "vector",
  "after",
] as const;
export type ConceptId = (typeof conceptIds)[number];
export const viewIds = [
  "home",
  "compare",
  "activity",
  "profile",
  "groups",
] as const;
export type ViewId = (typeof viewIds)[number];
export type Checkpoint = 0 | 1 | 2;
export type Comparison = "self" | "field";
export interface Athlete {
  id: string;
  name: string;
  initials: string;
  points: number;
  activities: number;
  checkpoints: [number, number, number];
  you?: boolean;
}
export const athletes: Athlete[] = [
  {
    id: "mina",
    name: "Mina Park",
    initials: "MP",
    points: 126,
    activities: 4,
    checkpoints: [37, 84, 126],
  },
  {
    id: "theo",
    name: "Theo James",
    initials: "TJ",
    points: 112,
    activities: 4,
    checkpoints: [31, 68, 112],
  },
  {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    points: 101,
    activities: 3,
    checkpoints: [32, 62, 101],
  },
  {
    id: "you",
    name: "You",
    initials: "JL",
    points: 96,
    activities: 3,
    checkpoints: [30, 65, 96],
    you: true,
  },
  {
    id: "leo",
    name: "Leo Santos",
    initials: "LS",
    points: 82,
    activities: 3,
    checkpoints: [25, 55, 82],
  },
  {
    id: "priya",
    name: "Priya Shah",
    initials: "PS",
    points: 73,
    activities: 3,
    checkpoints: [0, 28, 73],
  },
  {
    id: "niko",
    name: "Niko Reed",
    initials: "NR",
    points: 67,
    activities: 2,
    checkpoints: [31, 31, 67],
  },
  {
    id: "ava",
    name: "Ava Lewis",
    initials: "AL",
    points: 61,
    activities: 2,
    checkpoints: [0, 29, 61],
  },
  {
    id: "morgan",
    name: "Morgan Bell",
    initials: "MB",
    points: 55,
    activities: 2,
    checkpoints: [24, 24, 55],
  },
  {
    id: "sam",
    name: "Sam Rivera",
    initials: "SR",
    points: 49,
    activities: 2,
    checkpoints: [20, 20, 49],
  },
  {
    id: "ada",
    name: "Ada Wilson",
    initials: "AW",
    points: 41,
    activities: 1,
    checkpoints: [0, 0, 41],
  },
  {
    id: "noah",
    name: "Noah Ellis",
    initials: "NE",
    points: 35,
    activities: 1,
    checkpoints: [0, 35, 35],
  },
];
export const checkpointLabels = ["Monday", "Tuesday", "Thursday"] as const;
export const previousWeek = [26, 53, 80] as const;
export const activities = [
  {
    id: "morning",
    title: "Morning run",
    day: "Thursday",
    date: "Oct 15",
    km: 6.2,
    minutes: 34,
    points: 31,
    cumulative: 96,
    note: "A little fresh air before the rest of the day.",
  },
  {
    id: "park",
    title: "Park loop",
    day: "Tuesday",
    date: "Oct 13",
    km: 7.1,
    minutes: 40,
    points: 35,
    cumulative: 65,
    note: "One more lap. One less thing on your mind.",
  },
  {
    id: "easy",
    title: "Easy miles",
    day: "Monday",
    date: "Oct 12",
    km: 5.9,
    minutes: 35,
    points: 30,
    cumulative: 30,
    note: "A good beginning doesn't have to be a big one.",
  },
] as const;
export type Activity = (typeof activities)[number];
export interface Direction {
  name: string;
  descriptor: string;
  promise: string;
  question: string;
  mechanism: string;
  difference: string;
  strength: string;
  risk: string;
  test: string;
  nav: Record<ViewId, string>;
}
export const directions: Record<ConceptId, Direction> = {
  split: {
    name: "Split",
    descriptor: "The living track",
    promise: "Your next line is yours.",
    question: "Am I ahead of my own week, and who's within reach?",
    mechanism:
      "Scrub through three activity checkpoints; switch from a personal ghost to nearby competitors on parallel tracks.",
    difference:
      "Position and change are spatial. The main object is a track, not a rank card or group roster.",
    strength:
      "Most direct competition story. The previous-week ghost makes self-comparison the default.",
    risk: "A track can imply a live race or a fitness target. Its score scale and cutoff must be explicit.",
    test: "Can someone explain 96 versus 80 at the same cutoff, switch to rivals, and identify a five-point gap?",
    nav: {
      home: "My track",
      compare: "The field",
      activity: "Splits",
      profile: "Athlete",
      groups: "Crews",
    },
  },
  bounce: {
    name: "Bounce",
    descriptor: "A week with personality",
    promise: "One good move leads to another.",
    question: "What has my movement added to this week?",
    mechanism:
      "A winding trail made from imported activities. Open a completed move, reveal the league, or inspect a saved week.",
    difference:
      "Activity becomes an explorable trail. Bo is an original brand character, with no care tasks or daily obligations.",
    strength:
      "Most approachable and recognizable. Useful emotional feedback even below the podium.",
    risk: "Can feel childish or be mistaken for prescribed workout quests. Nodes must represent completed imports.",
    test: "Do people understand the trail records existing activity rather than asking them to complete more tasks?",
    nav: {
      home: "My week",
      compare: "League",
      activity: "Moves",
      profile: "Keeps",
      groups: "Friends",
    },
  },
  folio: {
    name: "Folio",
    descriptor: "Your sporting record",
    promise: "An ordinary week. Worth keeping.",
    question: "How does this week fit into the athlete I'm becoming?",
    mechanism:
      "Read a weekly edition, select a comparison column, inspect dated entries, and browse a chronological archive.",
    difference:
      "Typography, margins, and a readable record replace the dashboard. Evidence and period history carry the experience.",
    strength:
      "Best for calm personal context and a grown-up identity. The archive remains meaningful without winning.",
    risk: "May feel too quiet for a competition product. A beautiful report can bury the current place.",
    test: "Can a user find their current rank and counted activity, then distinguish this week from the previous one?",
    nav: {
      home: "Latest edition",
      compare: "Compare",
      activity: "Entries",
      profile: "Archive",
      groups: "Circles",
    },
  },
  vector: {
    name: "Vector",
    descriptor: "Find your position",
    promise: "Know where you stand.",
    question: "Where am I among people moving this week?",
    mechanism:
      "Explore a cohort plot: effort points on x, counted activities on y. Select a person, isolate nearby peers, or open an ordered list.",
    difference:
      "A navigable data field replaces leaderboard-first UI. A selected point connects comparison to evidence.",
    strength:
      "Most informative comparison. Exposes context without hiding the units behind a generic percentile.",
    risk: "Highest learning burden. Neither axis measures ability, fitness, or quality; that distinction must be understood.",
    test: "Can someone read both axes, select a rival, and explain why vertical position is not rank?",
    nav: {
      home: "My position",
      compare: "Explore field",
      activity: "Activity",
      profile: "History",
      groups: "Groups",
    },
  },
  after: {
    name: "After",
    descriptor: "The feeling afterwards",
    promise: "You did something for yourself.",
    question: "What changed after I got out and moved?",
    mechanism:
      "A finite, manually controlled highlight reel. Move between a workout, personal comparison, and placing; open any moment's receipt.",
    difference:
      "Full-bleed campaign imagery, giant type, and spatial slide navigation make the athlete's result the hero.",
    strength:
      "Strongest expressive/lifestyle brand. Makes ordinary effort feel worth remembering.",
    risk: "Lowest default data density. Essential status cannot depend on autoplay or an undiscoverable story.",
    test: "Can a user reach rank and source evidence without waiting, and understand the three slides are a finite summary?",
    nav: {
      home: "My moment",
      compare: "Versus",
      activity: "Moments",
      profile: "History",
      groups: "Together",
    },
  },
};
export function isConcept(value: string | null): value is ConceptId {
  return conceptIds.includes(value as ConceptId);
}
export function isView(value: string | null): value is ViewId {
  return viewIds.includes(value as ViewId);
}
