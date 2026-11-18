import { APP_TIMEZONE, accountTimeZone, weeklyCompetitionLastDay } from "./period";
import { nextDailyWaveWindowAt, weeklyWaveWindowAt } from "./matching/waves";
import { competitionQueue, waveTimeLabelForState } from "./compete/participation";
import { rankForElo } from "./compete/ranks";
import { ELO_UNRANKED, competitionTrack, competitionTrackLabel, sportById, type CompeteState } from "./compete/sports";
import type { CompeteEvent } from "./compete-home";

export function waveCountdown(start: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(start) - now) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, "0")).join(":");
}

export function eventRegistration(state: CompeteState, event: CompeteEvent, now: Date) {
  const queue = competitionQueue(state, event, now);
  const next = nextDailyWaveWindowAt(now);
  const window = queue ? { waveStart: new Date(queue.start), weekEnd: new Date(queue.end) } : next;
  const sleep = event === "sleep";
  const name = sleep ? "Sleep" : sportById(event).name;
  const verified = !sleep && competitionTrack(event) === "verified";
  const sportRating = state.ratings.find(r => r.sport === event);
  const rating = sleep ? state.healthRatings.find(r => r.metric === "sleep")?.elo : verified ? sportRating?.verifiedElo : sportRating?.openElo;
  const displayTz = accountTimeZone(state);
  const dates: Intl.DateTimeFormatOptions = { timeZone: displayTz, month: "short", day: "numeric" };
  const firstDay = window.waveStart.toLocaleDateString("en-US", dates);
  const lastDay = weeklyCompetitionLastDay(window.weekEnd, APP_TIMEZONE).toLocaleDateString("en-US", dates);
  const dateRange = firstDay === lastDay ? firstDay : `${firstDay} – ${lastDay}`;
  return {
    name, title: `Weekly ${name}`, dateRange,
    start: window.waveStart.toISOString(),
    stampYear: window.waveStart.toLocaleDateString("en-US", { timeZone: APP_TIMEZONE, year: "numeric" }),
    headline: sleep ? "Rest up. Rise up." : event === "strength" ? "Make every rep matter." : "Your next start line.",
    starts: waveTimeLabelForState(state, window.waveStart),
    ends: waveTimeLabelForState(state, new Date(window.weekEnd.getTime() - 60_000)),
    description: sleep ? "Count nightly sleep throughout the week." : event === "strength" ? "Earn training effort throughout the week." : event === "walking" ? "Stack daily steps throughout the week." : `Build ${name.toLowerCase()} distance throughout the week.`,
    details: [
      { title: "How scoring works", summary: sleep ? "Sleep quality & consistency" : event === "strength" ? "Training effort points" : event === "walking" ? "Total steps" : "Total distance", detail: sleep ? "The field ranks your average nightly sleep score, adjusted for how many eligible nights you log. Missing nights reduce the contest score; more hours alone do not guarantee a higher score." : event === "strength" ? "Time in training earns effort points. Recorded heart rate can add a small bonus. Lift weights and rep totals are not scored." : event === "walking" ? "Your counted daily steps are summed across the week. Distance from GPS walks is not used here." : "Your counted distance determines your place." },
      { title: "Matched field", summary: "A field of up to 8", detail: "The field is assigned when the wave starts. Solo fields prefer a similar entry Effort Score. Names and standings stay hidden until the start." },
      { title: "Your entry tier", summary: rankForElo(rating ?? ELO_UNRANKED).name, detail: "Matches you with competitors at a similar effort level based on your current Effort Score." },
      { title: "What counts", summary: sleep ? "Sleep & recovery" : event === "walking" ? "Daily step totals" : competitionTrackLabel(event), detail: sleep ? "Eligible sleep records from connected health trackers or manual sleep entries. Only eligible records contribute competition credit." : event === "walking" ? "Steps synced from Apple Health, Health Connect, Garmin, WHOOP, or Oura. Walk workouts stay in your training log but do not add steps here unless your tracker reports them as daily step counts." : verified ? "Only eligible recorded, GPS-verified activity counts on this track. Pending, excluded and future activities do not count." : "Eligible recorded or manual activities count on the Open track. Pending, excluded and future activities do not count." },
    ],
    renewal: `Starts on the next morning wave (${waveTimeLabelForState(state, nextDailyWaveWindowAt(now).waveStart)}) and renews weekly (${waveTimeLabelForState(state, weeklyWaveWindowAt(now).waveStart)}). Cancel before your wave starts, or turn off renewal during the week.`,
  };
}

export type RegistrationRuleCard = {
  id: "scoring" | "schedule" | "tier";
  icon: "layers" | "calendar" | "trophy";
  title: string;
  summary: string;
  detail: string;
  footnote?: string;
};

export function registrationDetailCards(detail: ReturnType<typeof eventRegistration>): RegistrationRuleCard[] {
  const [scoring, , tier, eligibility] = detail.details;
  return [
    { id: "scoring", icon: "layers", title: "Scoring", summary: scoring!.summary, detail: scoring!.detail, footnote: eligibility!.summary },
    { id: "schedule", icon: "calendar", title: "Schedule", summary: "Weekly rounds", detail: detail.renewal },
    { id: "tier", icon: "trophy", title: "Entry tier", summary: tier!.summary, detail: tier!.detail },
  ];
}

export function registrationTicketRows(detail: ReturnType<typeof eventRegistration>) {
  const [scoring, , tier] = detail.details;
  return [
    { label: "Entry tier", value: tier!.summary },
    { label: "Starts", value: detail.starts },
    { label: "Ends", value: detail.ends },
    { label: "Scoring", value: scoring!.summary },
    { label: "Field", value: "Up to 8 athletes" },
  ] as const;
}

/** Decorative ticket bars; never an entitlement or scannable credential. */
export function entryBarcode(seed: string) {
  let value = 2166136261;
  for (const char of seed) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return Array.from({ length: 60 }, () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return 1 + ((value >>> 0) % 4); });
}
