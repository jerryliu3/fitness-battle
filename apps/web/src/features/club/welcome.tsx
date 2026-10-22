"use client";
import { clubWeekSummary, type CompeteState } from "@fitness-battle/shared";
import { AnimatedEmber } from "@/components/mascot/animated-ember";
export function ClubWelcome({ state }: { state: CompeteState }) {
  const summary = clubWeekSummary(state);
  return <header className="club-welcome"><div><p className="fb-kicker">Your everyday club</p><h1>{summary.greeting}, {summary.firstName}.</h1><p className="fb-copy">{summary.sessions ? `${summary.activeDays} active day${summary.activeDays === 1 ? "" : "s"} this week. Every effort adds up.` : "A new week of possibilities. Make it yours."}</p></div><div className="club-welcome-ember" aria-hidden="true"><AnimatedEmber action="wave" expression="happy" loop={false} /></div></header>;
}
