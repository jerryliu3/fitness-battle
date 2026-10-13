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
  attribution: string;
  note: string;
};

const PUBLIC_LIST =
  "Public official results list. A person can send the results URL and the full list is copied from that page. Finishers under 18 are not stored. If the organizer says not to display the results, set this source's display_allowed to false.";

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
    attribution: "Official results, Generali 5K Berlin",
    note: PUBLIC_LIST,
  },
];

export const UNRESOLVED_MAJOR_EVENTS = [
  {
    name: "TCS New York City Marathon",
    url: "https://results.nyrr.org/event/M2025/finishers",
    reason: "The public page is a script shell and does not include a results list.",
  },
  {
    name: "Tokyo Marathon",
    url: "https://tokyo.r.mikatiming.com/2025/",
    reason: "The public timing host returned not found.",
  },
  {
    name: "Sydney Marathon",
    url: "https://results.sydney.com.au/2025/",
    reason: "The results host name did not resolve.",
  },
] as const;
