export const crewPeople = [
  {
    id: "maya",
    name: "Maya Chen",
    miles: 24.8,
    city: "Brooklyn, NY",
    effort: 1264,
    last: "Long run · Today",
    best: "22:18",
    since: "March 2026",
  },
  {
    id: "jordan",
    name: "Jordan Lee",
    miles: 21.1,
    city: "Queens, NY",
    effort: 1218,
    last: "Morning miles · Yesterday",
    best: "24:06",
    since: "April 2026",
  },
  {
    id: "alex",
    name: "Alex Morgan",
    miles: 18.4,
    city: "Brooklyn, NY",
    effort: 1168,
    last: "Easy miles · Today",
    best: "23:42",
    since: "January 2026",
  },
  {
    id: "sam",
    name: "Sam Rivera",
    miles: 12.5,
    city: "Jersey City, NJ",
    effort: 1152,
    last: "River loop · Thu",
    best: "25:14",
    since: "May 2026",
  },
];
export const crewMiles = Number(
  crewPeople.reduce((n, p) => n + p.miles, 0).toFixed(1),
);
export const crewEntries = crewPeople.flatMap((p) =>
  [0.4, 0.35, 0.25].map((share, i) => ({
    user_id: p.id,
    distance_m:
      (i === 2
        ? p.miles -
          Number((p.miles * 0.4).toFixed(2)) -
          Number((p.miles * 0.35).toFixed(2))
        : Number((p.miles * share).toFixed(2))) * 1609.344,
    moving_sec: Math.round(p.miles * share * 540),
    session_count: 1,
    date: (p.id === "jordan"
      ? ["Oct 24", "Oct 22", "Oct 20"]
      : p.id === "sam"
        ? ["Oct 22", "Oct 21", "Oct 19"]
        : ["Oct 25", "Oct 22", "Oct 20"])[i]!,
  })),
);
export const crewMembers = crewPeople.map((p) => ({
  user_id: p.id,
  display_name: p.name,
}));
export const crewSessions = [
  {
    id: "sunrise",
    title: "Sunrise miles",
    date: "Mon, Oct 26",
    time: "6:30 AM",
    place: "Prospect Park · Grand Army Plaza",
    note: "Easy pace, good company. One park loop, then coffee.",
    miles: "3.4 mi",
    people: ["maya", "jordan"],
  },
  {
    id: "saturday",
    title: "Saturday long run",
    date: "Sat, Oct 31",
    time: "8:00 AM",
    place: "Brooklyn Bridge Park · Pier 1",
    note: "A relaxed out-and-back along the waterfront. Everyone is welcome.",
    miles: "6–8 mi",
    people: ["maya", "sam", "jordan"],
  },
];
