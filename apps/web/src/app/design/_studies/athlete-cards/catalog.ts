export const ORIGINAL_CONCEPTS = [
  { id: "contender", name: "Contender", material: "Brushed gold · player shield", description: "The full player-card treatment. A sculpted shield, oversized percentile and a portrait that owns the face.", front: "Running percentile, portrait, three PBs and three Overtaek stats.", fit: "The strongest collectible identity. A profile centerpiece with room to grow into different finishes." },
  { id: "photo", name: "Photo finish", material: "Satin print · trading card", description: "A classic sports photograph, track markings and a crisp stats strip. Personal records take the lead.", front: "Portrait, running percentile, 5K and 10K bests, lifetime overtakes.", fit: "The most familiar sports card. Easy to read, easy to share, with a quieter presence on Athlete." },
  { id: "club", name: "Club issue", material: "Navy laminate · club credential", description: "A pocket membership card with an inset portrait and a gold edge. The everyday athlete, made official.", front: "Identity, Effort Score, active weeks, overtakes and running percentile.", fit: "The closest fit to the current Athlete page. Compact enough to keep settings within reach." },
  { id: "telemetry", name: "Telemetry", material: "Graphite foil · performance card", description: "A technical instrument for your training identity. Effort Score leads; percentile and records give it context.", front: "Effort Score, running percentile, 5K best, active-week streak and overtakes.", fit: "For athletes who want the numbers first. A restrained alternative to a portrait-led collectible." },
] as const;

export const PHOTO_CONCEPTS = [
  { id: "shield-window", family: "contender", name: "Contender · Window", material: "Gold shield · framed photo", description: "A dedicated photo window keeps the background intact. The gold shield and player stats carry the sports-card identity.", front: "Framed photo, running percentile, three PBs and three Overtaek stats.", fit: "The closest continuation of Contender without needing a cutout. Every word sits on the gold card, clear of the photograph." },
  { id: "shield-crest", family: "contender", name: "Contender · Crest", material: "Gold shield · portrait medallion", description: "A large portrait medallion set into the shield. A simple circular crop gives everyday profile photos a deliberate place.", front: "Portrait medallion, running percentile, three PBs and three Overtaek stats.", fit: "A quieter player card. The portrait frame works with a selfie, a race photo or an existing transparent portrait." },
  { id: "club-portrait", family: "club", name: "Club · Portrait", material: "Navy credential · inset photo", description: "The compact credential with a larger, softly squared portrait. Identity and stats have their own navy reading area.", front: "Inset portrait, running percentile, Effort Score, active weeks and overtakes.", fit: "The safest everyday default. It accepts a normal profile photo and keeps the existing Athlete page compact." },
  { id: "club-panel", family: "club", name: "Club · Split", material: "Navy credential · full-height photo", description: "A full-height photograph on one side and the club credential on the other. A little more personality without putting text on the image.", front: "Full-height photo panel, identity, running percentile and three Overtaek stats.", fit: "For athletes who want their photo to have more presence. Crop position can be adjusted without changing the card layout." },
] as const;

export const CONCEPTS = [...PHOTO_CONCEPTS, ...ORIGINAL_CONCEPTS] as const;
export type Concept = typeof CONCEPTS[number];
export type ConceptId = Concept["id"];

export const PHOTOS = [
  { id: "park", label: "Park portrait", src: "/design/athlete-cards/park-photo.webp", kind: "photo" },
  { id: "race", label: "Race day", src: "/design/athlete-cards/race-photo.webp", kind: "photo" },
  { id: "cutout", label: "Prepared cutout", src: "/design/athlete-cards/runner.png", kind: "cutout" },
  { id: "none", label: "No photo", src: "", kind: "none" },
] as const;
export type CardPhoto = { src: string; kind: "photo" | "cutout" | "none"; x: number; y: number };
export const DEFAULT_PHOTO: CardPhoto = { ...PHOTOS[0], x: 50, y: 40 };

// Study fixtures only. No account reads, rating formulas, entitlements or writes.
export const ATHLETE = {
  name: "Maya Chen", city: "Brooklyn, NY", sport: "Running", since: "2026",
  effort: "1,482", percentile: "92", overtakes: "124", weeks: "32", streak: "8",
  records: [
    { label: "5K", value: "21:08", date: "Oct 18, 2026" },
    { label: "10K", value: "44:32", date: "Sep 12, 2026" },
    { label: "Half marathon", value: "1:39:12", date: "Oct 4, 2026" },
  ],
} as const;

type Point = readonly [number, number];

/** One perimeter drives both printed faces and connected side planes. */
export function cardOutline(id: ConceptId) {
  const concept = CONCEPTS.find(c => c.id === id)!;
  const family = "family" in concept ? concept.family : concept.id;
  const width = 320, height = family === "club" ? 202 : 448;
  let points: Point[];
  if (family === "contender") {
    points = [[24, 0], [296, 0], [320, 28], [320, 346], [300, 390], [160, 448], [20, 390], [0, 346], [0, 28]];
  } else {
    const radius = id === "telemetry" ? 12 : 18;
    points = [[width - radius, height - radius], [radius, height - radius], [radius, radius], [width - radius, radius]].flatMap(([cx, cy], corner) =>
      Array.from({ length: 9 }, (_, step): Point => {
        const angle = (corner * 90 + step * 90 / 8) * Math.PI / 180;
        return [Number((cx + Math.cos(angle) * radius).toFixed(4)), Number((cy + Math.sin(angle) * radius).toFixed(4))];
      }));
  }
  return { width, height, points, clip: `polygon(${points.map(([x, y]) => `${x / width * 100}% ${y / height * 100}%`).join(",")})` };
}
