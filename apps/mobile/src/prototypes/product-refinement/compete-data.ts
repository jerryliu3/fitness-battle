/** Separate, fictional review fixtures. No production state or scoring writes. */
export const meets = [
  {
    id: "running",
    name: "Running",
    subtitle: "Meadow Trail",
    unit: "mi",
    total: 18.4,
    score: 1168,
    gps: 16.2,
    color: "#176c75",
  },
  {
    id: "cycling",
    name: "Cycling",
    subtitle: "Road Ribbons",
    unit: "mi",
    total: 64.8,
    score: 1086,
    gps: 61.4,
    color: "#34637c",
  },
  {
    id: "strength",
    name: "Strength",
    subtitle: "Club Grounds",
    unit: "min",
    total: 145,
    score: 1032,
    gps: null,
    color: "#896a36",
  },
] as const;
export type Meet = (typeof meets)[number];
export const people = [
  {
    name: "Maya Chen",
    city: "Brooklyn, NY",
    open: 24.8,
    gps: 23.1,
    effort: 1264,
    change: 0,
    color: "#dfbe96",
  },
  {
    name: "Jordan Lee",
    city: "Queens, NY",
    open: 21.1,
    gps: 19.4,
    effort: 1218,
    change: 1,
    color: "#a5c6bd",
  },
  {
    name: "Alex Morgan",
    city: "Brooklyn, NY",
    open: 18.4,
    gps: 16.2,
    effort: 1168,
    change: 1,
    color: "#f7c948",
  },
  {
    name: "Sam Rivera",
    city: "Jersey City, NJ",
    open: 17.2,
    gps: 15.7,
    effort: 1152,
    change: -2,
    color: "#b2c6d4",
  },
  {
    name: "Noor Patel",
    city: "Manhattan, NY",
    open: 15.6,
    gps: 14.3,
    effort: 1106,
    change: 0,
    color: "#d2bfcc",
  },
  {
    name: "Chris Park",
    city: "Brooklyn, NY",
    open: 12.9,
    gps: 12.9,
    effort: 1088,
    change: 0,
    color: "#bfd0a8",
  },
];
export function board(meet: Meet, gps: boolean) {
  const base = gps ? 16.2 : 18.4;
  return people.map((person, i) => ({
    ...person,
    effort: person.effort + meet.score - 1168 - (gps ? 12 : 0),
    value: Number(
      (
        ((gps ? person.gps : person.open) / base) *
        (gps ? (meet.gps ?? meet.total) : meet.total)
      ).toFixed(1),
    ),
    place: i + 1,
  }));
}
