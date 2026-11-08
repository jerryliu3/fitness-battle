import { APP_TIMEZONE, weeklyCompetitionLastDay } from "./period";
import { nextDailyWaveWindowAt } from "./matching/waves";
import { waveTimeLabel } from "./compete/participation";
import { rankForElo } from "./compete/ranks";
import { ELO_UNRANKED, competitionTrack, competitionTrackLabel, sportById, type CompeteState } from "./compete/sports";
import type { CompeteEvent } from "./compete-home";

export function eventRegistration(state: CompeteState, event: CompeteEvent, now: Date) {
  const window = nextDailyWaveWindowAt(now);
  const sleep = event === "sleep";
  const name = sleep ? "Sleep" : sportById(event).name;
  const verified = !sleep && competitionTrack(event) === "verified";
  const sportRating = state.ratings.find(r => r.sport === event);
  const rating = sleep ? state.healthRatings.find(r => r.metric === "sleep")?.elo : verified ? sportRating?.verifiedElo : sportRating?.openElo;
  const dates: Intl.DateTimeFormatOptions = { timeZone: APP_TIMEZONE, month: "short", day: "numeric" };
  const firstDay = window.waveStart.toLocaleDateString("en-US", dates);
  const lastDay = weeklyCompetitionLastDay(window.weekEnd).toLocaleDateString("en-US", dates);
  const dateRange = firstDay === lastDay ? firstDay : `${firstDay} – ${lastDay}`;
  return {
    name, title: `Weekly ${name} Meet`, dateRange,
    starts: waveTimeLabel(window.waveStart), ends: waveTimeLabel(window.weekEnd),
    description: sleep ? "Make rest part of your competition. Your counted sleep nights build a score from sleep quality and consistency." : event === "strength" ? "Build your week through strength training. Counted session time and recorded heart rate contribute effort points." : `Build your total ${name.toLowerCase()} distance throughout the wave and climb your matched field.`,
    details: [
      { title: "How scoring works", summary: sleep ? "Sleep quality & consistency" : event === "strength" ? "Training effort points" : "Total distance", detail: sleep ? "The field ranks your average nightly sleep score, adjusted for how many eligible nights you log. Missing nights reduce the contest score; more hours alone do not guarantee a higher score." : event === "strength" ? "Time in training earns effort points. Recorded heart rate can add a small bonus. Lift weights and rep totals are not scored." : "Your exact counted distance determines place. Equal totals share a place; rounded display values do not create ties." },
      { title: "Matched field", summary: "A field of up to 8", detail: "The field is assigned when the wave starts. Solo fields prefer a similar entry Effort Score and may include labeled simulated athletes. Names and standings stay hidden until the start." },
      { title: "Your entry tier", summary: rankForElo(rating ?? ELO_UNRANKED).name, detail: "Based on your current Effort Score. The actual roster is assigned at the wave start; this is not a predicted finishing place." },
      { title: "What counts", summary: sleep ? "Sleep & recovery" : competitionTrackLabel(event), detail: sleep ? "Eligible sleep records from connected health trackers or manual sleep entries. Sample records are previews, not competition credit." : verified ? "Only eligible recorded, GPS-verified activity counts on this track. Pending, excluded, sample and future activities do not count." : "Eligible recorded or manual activities count on the Open track. Pending, excluded, sample and future activities do not count." },
    ],
    renewal: "Starts at zero. Renews into the Monday 6 AM ET wave. Cancel before your wave starts, or turn off renewal during the week.",
  };
}
