import { weeklyPeriodBounds, APP_TIMEZONE } from "./period";
import { crewEntryTotals } from "./compete/crew-relay";
import { crewPassportError, type CrewPassport, type CrewPassportMutation } from "./crew-passport";
import type { CrewOverviewInput } from "./crew-overview";

/** Device-local programs stay isolated from authenticated RPCs and global awards. */
export interface LocalCrewProgram { passport: CrewPassport; memberIds: string[] }
export function emptyCrewProgram(): LocalCrewProgram {
  return { passport: { contract: null, seasons: [], stamps: [] }, memberIds: [] };
}
export function readLocalCrewProgram(saved: LocalCrewProgram, input: CrewOverviewInput): LocalCrewProgram {
  const passport = { ...saved.passport, contract: saved.passport.contract ? { ...saved.passport.contract } : null, seasons: [...saved.passport.seasons], stamps: [...saved.passport.stamps] };
  const contract = passport.contract;
  if (!contract) return { ...saved, passport };
  if (Date.parse(contract.ends_at) <= Date.parse(input.now)) {
    if (contract.season_id && contract.value >= contract.target) {
      const codes = ["contract_finish", ...(contract.contributors === contract.roster_size ? ["full_crew"] : [])];
      for (const code of codes) if (!passport.stamps.some(s => s.contract_id === contract.id && s.code === code))
        passport.stamps.push({ id: `${contract.id}:${code}`, crew_id: contract.crew_id, season_id: contract.season_id, contract_id: contract.id, code, earned_at: contract.ends_at, rule_version: 1 });
    }
    passport.contract = null;
  } else {
    const entries = input.entries.filter(e => saved.memberIds.includes(e.user_id) && Date.parse(e.started_at) >= Date.parse(contract.starts_at) && Date.parse(e.started_at) < Date.parse(contract.ends_at) && Date.parse(e.started_at) <= Date.parse(input.now));
    const totals = [...crewEntryTotals(entries).values()];
    contract.contributors = totals.filter(t => t.sessions > 0).length;
    contract.value = contract.metric === "contributors" ? contract.contributors : contract.metric === "sessions" ? totals.reduce((s, t) => s + t.sessions, 0) : entries.reduce((s, e) => s + Number(contract.metric === "distance_m" ? e.distance_m : e.moving_sec), 0);
  }
  return { ...saved, passport };
}
export function mutateLocalCrewProgram(saved: LocalCrewProgram, input: CrewOverviewInput, body: CrewPassportMutation, id: string): LocalCrewProgram {
  const next = readLocalCrewProgram(saved, input), passport = next.passport;
  if (!body.title.trim() || body.title.trim().length > 80) throw Error("Enter a name of up to 80 characters.");
  if (body.action === "contract") {
    if ((passport.contract?.id ?? null) !== body.expectedId) throw Error(crewPassportError("contract_changed"));
    if (!Number.isFinite(body.target) || body.target <= 0 || ((body.metric === "sessions" || body.metric === "contributors") && !Number.isInteger(body.target)) || (body.metric === "contributors" && body.target > input.members.length) || (input.sport === "strength" && body.metric === "distance_m")) throw Error(crewPassportError("invalid_contract"));
    const week = weeklyPeriodBounds(new Date(input.now));
    const season = passport.seasons.find(s => Date.parse(s.starts_at) <= week.startsAt.getTime() && Date.parse(s.ends_at) >= week.endsAt.getTime());
    next.memberIds = input.members.map(m => m.user_id);
    passport.contract = { id, crew_id: body.crewId, season_id: season?.id ?? null, title: body.title.trim(), sport: input.sport, metric: body.metric, target: body.target, value: 0, contributors: 0, roster_size: next.memberIds.length, period_kind: "weekly", time_zone: APP_TIMEZONE, starts_at: week.startsAt.toISOString(), ends_at: week.endsAt.toISOString(), rule_version: 1 };
  } else {
    const start = Date.parse(body.startsAt), end = Date.parse(body.endsAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= Date.parse(input.now)) throw Error(crewPassportError("invalid_season"));
    if (passport.seasons.some(s => Date.parse(s.starts_at) < end && Date.parse(s.ends_at) > start)) throw Error(crewPassportError("season_overlap"));
    passport.seasons.unshift({ id, crew_id: body.crewId, title: body.title.trim(), starts_at: body.startsAt, ends_at: body.endsAt, time_zone: APP_TIMEZONE });
    const contract = passport.contract;
    if (contract && !contract.season_id && Date.parse(contract.starts_at) >= start && Date.parse(contract.ends_at) <= end) contract.season_id = id;
  }
  return readLocalCrewProgram(next, input);
}
