/** Independent surface, progress and camera decisions for the vertical-kilometer review. */
export const backgrounds = {
  athletics: { name: "Personal track", short: "Your own running lane", description: "Individual mineral-blue running lanes and painted sidelines, with one shared distance scale beside the field.", surface: "#899b9d", lane: "#819496", ink: "#f6f8f3", muted: "#e1e8df", rule: "#eaf0e6" },
  road: { name: "Road ribbons", short: "A road for each athlete", description: "Separate charcoal road lanes with soft green shoulders and longitudinal road markings. Human-powered, with no vehicles.", surface: "#78817b", lane: "#596660", ink: "#fbfcf7", muted: "#e2e8dd", rule: "#e6e9d6" },
  parkland: { name: "Parkland Passage", short: "One shared promenade", description: "A broad shared path with trees, benches and distance-fixed garden landmarks. No rigid lane boxes.", surface: "#eff0e5", lane: "#f3f2e9", ink: "#3d4b36", muted: "#6e7c61", rule: "#c5ccb7" },
  pool: { name: "Pool Deck", short: "Water, ropes, light", description: "Soft aquatic light, colored lane ropes and a quiet pool-floor spine. An unfolded surface study, not a claim about actual swimming lengths.", surface: "#deeff0", lane: "#c4e2e5", ink: "#2c5359", muted: "#4d777b", rule: "#ffffff" },
  boardwalk: { name: "Boardwalk", short: "Long grain underfoot", description: "Pale longitudinal planks, satin grain and a sheltered timber edge. The grain moves with the ground, without transverse grid stripes.", surface: "#e7e4d7", lane: "#e0ddce", ink: "#514d3b", muted: "#7b7661", rule: "#bcb9a5" },
  trail: { name: "Meadow Trail", short: "A gently winding field", description: "A soft shared trail bends through meadow planting. Racers and progress traces follow the same curve while the vertical distance scale stays exact.", surface: "#e4ead9", lane: "#f0eddd", ink: "#435139", muted: "#6a7c59", rule: "#c8ceb5" },
  straight: { name: "Club Straightaway", short: "Red track, open distance", description: "A continuous red rubber running track with white lane lines, a numbered start and whole-kilometer splits. Choose open edges or a green field with benches.", surface: "#ad5149", lane: "#a44942", ink: "#fff8ed", muted: "#f2d9c9", rule: "#fff7e9" },
  oval: { name: "Club Oval", short: "One loop, one kilometer", description: "A closed red athletics oval with numbered lanes. Every normalized circuit represents 1 km or 1 mile; lap counts and true totals distinguish athletes on different laps. Distance-only zoom unfolds it into a straight track.", surface: "#ad5149", lane: "#a44942", ink: "#fff8ed", muted: "#f2d9c9", rule: "#fff7e9" },
  night: { name: "Night Meet", short: "A floodlit athletics field", description: "Charcoal running lanes, perimeter light pools and restrained illuminated sidelines. Bright capsules have room to breathe.", surface: "#26352f", lane: "#2e4037", ink: "#f7f7ec", muted: "#c8d4c4", rule: "#8eaa8c" },
} as const;
export type BackgroundId = keyof typeof backgrounds;

export const progressTreatments = {
  dots: { name: "Dotted route", short: "Breadcrumbs directly behind you", description: "Distance-anchored dots follow the racer’s centerline, underneath its afterimages. A faint connecting trace lets the dotted path flow into the wake without moving to the side." },
  tiles: { name: "Session tiles", short: "Your efforts make the trail", description: "Sourced counted activities become narrow rounded pieces directly behind the racer. Real session seams stay visible farther back; the latest piece quietly joins the afterimages." },
  deposit: { name: "Banked trail", short: "A taper into the afterimages", description: "A slender centered trail narrows into the wake, extending to the racer rather than stopping at a clearance gap. Compare a uniformly faint underlay with a soft blend near the echoes." },
} as const;
export type ProgressId = keyof typeof progressTreatments;

export const wakeTreatments = {
  underlay: { name: "Faint underlay", description: "The whole trail stays quiet beneath the afterimages." },
  blend: { name: "Soft blend", description: "The trail is clearer farther back and softens as it joins the afterimages." },
} as const;
export type WakeId = keyof typeof wakeTreatments;
export function isWakeId(value: string | null): value is WakeId { return value !== null && Object.hasOwn(wakeTreatments, value); }

export const zoomTreatments = {
  map: { name: "Map lens", description: "The ground, lane spacing and capsules shrink together in both dimensions. Zooming out reveals the whole field and side margins." },
  atlas: { name: "Atlas lens", description: "The world shrinks in both dimensions while capsules retain a small readable minimum size, like map pins. A calmer overview for a small screen." },
  distance: { name: "Distance only", description: "The original comparison: more kilometers vertically, with lane widths and capsule sizes held steady." },
} as const;
export type ZoomId = keyof typeof zoomTreatments;

export function isBackgroundId(value: string | null): value is BackgroundId { return value !== null && Object.hasOwn(backgrounds, value); }
export function isProgressId(value: string | null): value is ProgressId { return value !== null && Object.hasOwn(progressTreatments, value); }
export function isZoomId(value: string | null): value is ZoomId { return value !== null && Object.hasOwn(zoomTreatments, value); }

export const trackEdges = {
  open: { name: "Open edges", description: "A clean track with quiet paper around it." },
  club: { name: "Club grounds", description: "Green turf, a field and trackside benches." },
} as const;
export type TrackEdgeId = keyof typeof trackEdges;
export function isTrackEdgeId(value: string | null): value is TrackEdgeId { return value !== null && Object.hasOwn(trackEdges, value); }
