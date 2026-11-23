import type { RoadDistance } from "../fingerprint";

export type CatalogEvent = {
  slug: string;
  sourceSlug: string;
  sourceName: string;
  eventName: string;
  externalEventId: string;
  editionYear: number;
  startsOn: string;
  distance: RoadDistance;
  /** Public results list. Null when we looked and the page did not publish a list. */
  listUrl: string | null;
  /** MikaTiming event id passed to the list. Null when listUrl is not that format. */
  mikaEvent: string | null;
  /** ChronoTrack Live event and race ids when results come from AZP. */
  chronotrackEventId: number | null;
  chronotrackRaceId: number | null;
  /** Checkpoint alignment for detail splits. Null when splits are unavailable. */
  splitProfileId: "marathon_km10" | "marathon_boston" | "marathon_sf_miles" | null;
  /** Startline / Race Day Timing path after `/en/races/`. */
  racedayTimingPath: string | null;
  /** MapMyRun route id when the organizer publishes that course. */
  mapmyrunRouteId: number | null;
  /** Committed GPX fixture (package-relative) for replay course import. */
  replayCourseGpxFixture: string | null;
  replayCourseSourceUrl: string | null;
  replayCourseAttribution: string | null;
  replayCourseReviewNotes: string | null;
  /** Mika list sex filters. Default M/W/X; Chicago 2026 returns duplicate idps for X. */
  mikaSexFilters?: Array<"M" | "W" | "X">;
  attribution: string;
  note: string;
};

const PUBLIC_LIST =
  "Public official results list. Source-specific access and reuse review is required before display. Finishers known to be under 18 are not stored. Imports preserve existing source approval and suppression decisions.";

export const PUBLIC_LIST_REUSE = PUBLIC_LIST;

/**
 * Major events whose public results pages were readable without a login.
 * Tokyo's timing host returned not-found, Sydney's host did not resolve, and
 * New York's page is a script shell with no results list in the HTML.
 */
export const MAJOR_EVENTS: CatalogEvent[] = [
  {
    slug: "boston-marathon-2025",
    sourceSlug: "boston_marathon",
    sourceName: "Boston Marathon",
    eventName: "Boston Marathon 2025",
    externalEventId: "R",
    editionYear: 2025,
    startsOn: "2025-04-21",
    distance: "marathon",
    listUrl: "https://results.baa.org/2025/",
    mikaEvent: "R",
    chronotrackEventId: null,
    chronotrackRaceId: null,
    racedayTimingPath: null,
    mapmyrunRouteId: null,
    replayCourseGpxFixture: null,
    replayCourseSourceUrl: null,
    replayCourseAttribution: null,
    replayCourseReviewNotes: null,
    splitProfileId: "marathon_boston",
    attribution: "Official results, Boston Athletic Association",
    note: PUBLIC_LIST,
  },
  {
    slug: "london-marathon-2025",
    sourceSlug: "london_marathon",
    sourceName: "TCS London Marathon",
    eventName: "TCS London Marathon 2025",
    externalEventId: "MAS",
    editionYear: 2025,
    startsOn: "2025-04-27",
    distance: "marathon",
    listUrl: "https://results.tcslondonmarathon.com/2025/",
    mikaEvent: "MAS",
    chronotrackEventId: null,
    chronotrackRaceId: null,
    racedayTimingPath: null,
    mapmyrunRouteId: null,
    replayCourseGpxFixture: null,
    replayCourseSourceUrl: null,
    replayCourseAttribution: null,
    replayCourseReviewNotes: null,
    splitProfileId: "marathon_km10",
    attribution: "Official results, TCS London Marathon",
    note: PUBLIC_LIST,
  },
  {
    slug: "berlin-marathon-2025",
    sourceSlug: "berlin_marathon",
    sourceName: "BMW Berlin Marathon",
    eventName: "BMW Berlin Marathon 2025",
    externalEventId: "BML_HCH3C0OH2F2",
    editionYear: 2025,
    startsOn: "2025-09-21",
    distance: "marathon",
    listUrl: "https://berlin.r.mikatiming.com/2025/",
    mikaEvent: "BML_HCH3C0OH2F2",
    chronotrackEventId: null,
    chronotrackRaceId: null,
    racedayTimingPath: null,
    mapmyrunRouteId: null,
    replayCourseGpxFixture: null,
    replayCourseSourceUrl: null,
    replayCourseAttribution: null,
    replayCourseReviewNotes: null,
    splitProfileId: "marathon_km10",
    attribution: "Official results, BMW Berlin Marathon",
    note: PUBLIC_LIST,
  },
  {
    slug: "chicago-marathon-2025",
    sourceSlug: "chicago_marathon",
    sourceName: "Bank of America Chicago Marathon",
    eventName: "Bank of America Chicago Marathon 2025",
    externalEventId: "MAR_9TGG96381A5",
    editionYear: 2025,
    startsOn: "2025-10-12",
    distance: "marathon",
    listUrl: "https://chicago-history.r.mikatiming.com/2025/",
    mikaEvent: "MAR_9TGG96381A5",
    chronotrackEventId: null,
    chronotrackRaceId: null,
    racedayTimingPath: null,
    mapmyrunRouteId: null,
    replayCourseGpxFixture: null,
    replayCourseSourceUrl: null,
    replayCourseAttribution: null,
    replayCourseReviewNotes: null,
    splitProfileId: "marathon_km10",
    attribution: "Official results, Bank of America Chicago Marathon",
    note: PUBLIC_LIST,
  },
  {
    slug: "berlin-5k-2025",
    sourceSlug: "berlin_generali_5k",
    sourceName: "Generali Berlin 5K",
    eventName: "Generali 5K Berlin 2025",
    externalEventId: "5K_HCH3C0OH2EF",
    editionYear: 2025,
    startsOn: "2025-09-21",
    distance: "5k",
    listUrl: "https://berlin.r.mikatiming.com/2025/",
    mikaEvent: "5K_HCH3C0OH2EF",
    chronotrackEventId: null,
    chronotrackRaceId: null,
    racedayTimingPath: null,
    mapmyrunRouteId: null,
    replayCourseGpxFixture: null,
    replayCourseSourceUrl: null,
    replayCourseAttribution: null,
    replayCourseReviewNotes: null,
    splitProfileId: null,
    attribution: "Official results, Generali 5K Berlin",
    note: PUBLIC_LIST,
  },
  {
    slug: "boston-marathon-2026",
    sourceSlug: "boston_marathon",
    sourceName: "Boston Marathon",
    eventName: "Boston Marathon 2026",
    externalEventId: "R",
    editionYear: 2026,
    startsOn: "2026-04-20",
    distance: "marathon",
    listUrl: "https://results.baa.org/2026/",
    mikaEvent: "R",
    chronotrackEventId: null,
    chronotrackRaceId: null,
    racedayTimingPath: null,
    mapmyrunRouteId: null,
    replayCourseGpxFixture: null,
    replayCourseSourceUrl: null,
    replayCourseAttribution: null,
    replayCourseReviewNotes: null,
    splitProfileId: "marathon_boston",
    attribution: "Official results, Boston Athletic Association",
    note: PUBLIC_LIST,
  },
  {
    slug: "london-marathon-2026",
    sourceSlug: "london_marathon",
    sourceName: "TCS London Marathon",
    eventName: "TCS London Marathon 2026",
    externalEventId: "MAS",
    editionYear: 2026,
    startsOn: "2026-04-26",
    distance: "marathon",
    listUrl: "https://results.tcslondonmarathon.com/2026/",
    mikaEvent: "MAS",
    mikaSexFilters: ["M", "W"],
    chronotrackEventId: null,
    chronotrackRaceId: null,
    racedayTimingPath: null,
    mapmyrunRouteId: null,
    replayCourseGpxFixture: null,
    replayCourseSourceUrl: null,
    replayCourseAttribution: null,
    replayCourseReviewNotes: null,
    splitProfileId: "marathon_km10",
    attribution: "Official results, TCS London Marathon",
    note: PUBLIC_LIST,
  },
  {
    slug: "berlin-marathon-2026",
    sourceSlug: "berlin_marathon",
    sourceName: "BMW Berlin Marathon",
    eventName: "BMW Berlin Marathon 2026",
    externalEventId: "BML_HCH3C0OH2F2",
    editionYear: 2026,
    startsOn: "2026-09-27",
    distance: "marathon",
    listUrl: "https://berlin.r.mikatiming.com/2026/",
    mikaEvent: "BML_HCH3C0OH2F2",
    mikaSexFilters: ["M", "W"],
    chronotrackEventId: null,
    chronotrackRaceId: null,
    racedayTimingPath: null,
    mapmyrunRouteId: null,
    replayCourseGpxFixture: null,
    replayCourseSourceUrl: null,
    replayCourseAttribution: null,
    replayCourseReviewNotes: null,
    splitProfileId: "marathon_km10",
    attribution: "Official results, BMW Berlin Marathon",
    note: PUBLIC_LIST,
  },
  {
    slug: "chicago-marathon-2026",
    sourceSlug: "chicago_marathon",
    sourceName: "Bank of America Chicago Marathon",
    eventName: "Bank of America Chicago Marathon 2026",
    externalEventId: "MAR_9TGG96381A5",
    editionYear: 2026,
    startsOn: "2026-10-11",
    distance: "marathon",
    listUrl: "https://chicago-history.r.mikatiming.com/2026/",
    mikaEvent: "MAR_9TGG96381A5",
    mikaSexFilters: ["M", "W"],
    chronotrackEventId: null,
    chronotrackRaceId: null,
    racedayTimingPath: null,
    mapmyrunRouteId: null,
    replayCourseGpxFixture: null,
    replayCourseSourceUrl: null,
    replayCourseAttribution: null,
    replayCourseReviewNotes: null,
    splitProfileId: "marathon_km10",
    attribution: "Official results, Bank of America Chicago Marathon",
    note: PUBLIC_LIST,
  },
  {
    slug: "banff-half-2026",
    sourceSlug: "banff_half_marathon",
    sourceName: "Banff Half Marathon",
    eventName: "Banff Half Marathon 2026",
    externalEventId: "banffhalf-2026-half",
    editionYear: 2026,
    startsOn: "2026-06-20",
    distance: "half_marathon",
    listUrl: "https://www.racedaytiming.ca/en/races/2026/banffhalf/event/Half",
    mikaEvent: null,
    chronotrackEventId: null,
    chronotrackRaceId: null,
    racedayTimingPath: "2026/banffhalf/event/Half",
    mapmyrunRouteId: 5544185092,
    replayCourseGpxFixture: null,
    replayCourseSourceUrl: "https://www.mapmyrun.com/routes/view/5544185092",
    replayCourseAttribution:
      "Banff Half Marathon course (MapMyRun; linked from banffhalf.com)",
    replayCourseReviewNotes:
      "Organizer-linked MapMyRun route scaled to 21.0975 km for replay checkpoint alignment.",
    splitProfileId: null,
    attribution: "Official results, Race Day Timing / Startline",
    note: `${PUBLIC_LIST} Public list has chip times only (no course splits).`,
  },
  {
    slug: "sf-marathon-2026",
    sourceSlug: "sf_marathon",
    sourceName: "The San Francisco Marathon",
    eventName: "The San Francisco Marathon 2026 (Full)",
    externalEventId: "91608-242840",
    editionYear: 2026,
    startsOn: "2026-07-26",
    distance: "marathon",
    listUrl: "https://live.chronotrack.com/event/91608/results",
    mikaEvent: null,
    chronotrackEventId: 91608,
    chronotrackRaceId: 242840,
    racedayTimingPath: null,
    mapmyrunRouteId: null,
    replayCourseGpxFixture: "fixtures/courses/sf-marathon-2026-full.gpx",
    replayCourseSourceUrl: "https://www.thesfmarathon.com/full-marathon/",
    replayCourseAttribution:
      "The San Francisco Marathon 2026 full course (published course-map GPX trace)",
    replayCourseReviewNotes:
      "Garmin-format GPX trace aligned to the 2026 full marathon map; length scaled to 42.195 km.",
    splitProfileId: "marathon_sf_miles",
    attribution: "Official results, The San Francisco Marathon (ChronoTrack Live)",
    note: PUBLIC_LIST,
  },
];

export const UNRESOLVED_MAJOR_EVENTS = [
  {
    name: "TCS New York City Marathon (splits)",
    url: "https://results.nyrr.org/event/M2026/finishers",
    reason:
      "Resolved: POST rmsprodapi.nyrr.org/api/v2/runners/resultDetails returns splitResults (no HTML scrape). Use pnpm rankings:nyrr-splits after finishers are staged.",
  },
  {
    name: "Tokyo Marathon 2026 (MarathonGuide scrape)",
    url: "https://marathonguide.com/races/run/tokyo-marathon-copy/2026/results/",
    reason:
      "Use pnpm rankings:ingest-marathonguide (Runzy API back.runzy.com; ~37k finishers). MarathonGuide HTML is Cloudflare-protected; no splits on this source. Record reuse decision before display.",
  },
  {
    name: "TCS Sydney Marathon 2026",
    url: "https://sydney.r.mikatiming.com/2026/",
    reason: "The public timing page is not publishing a full finisher list yet.",
  },
] as const;

/** NYRR is ingested through acquisition mapping nyrr:M2026:finishers, not the MikaTiming catalog. */
export const NYRR_MARATHON_2026 = {
  slug: "nyc-marathon-2026",
  eventCode: "M2026",
  populationKey: "nyrr:M2026:finishers",
  sourceUrl: "https://results.nyrr.org/event/M2026/finishers",
} as const;
