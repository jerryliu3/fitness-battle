import {
  calibrateFromAcceptedHistory, competeNow, dayKey, freshState, nextDailyWaveWindowAt, reduceCompete, rollClock,
  SPORT_IDS, withAccountEloBaseline, withDerivedPendingReveals,
  type Activity, type CompeteState, type CrewBoardPin,
} from "@fitness-battle/shared";

/** Apply review choices before any reducer can award newly ingested volume.
 * Tracker facts remain server-owned; only disposition and valid manual rows enter. */
export function applyCompetitionActivityIntents(next: CompeteState, incoming: CompeteState, now: Date): CompeteState {
  const known = new Map(next.activities.map(a => [a.id, a]));
  const activities = [...next.activities];
  for (const candidate of incoming.activities) {
    const old = known.get(candidate.id);
    if (old) {
      // A full account document may change disposition, never tracker facts.
      const index = activities.findIndex(a => a.id === old.id);
      activities[index] = { ...old, disposition: candidate.disposition ?? old.disposition,
        dispositionReason: candidate.dispositionReason?.slice(0, 240) ?? old.dispositionReason };
      continue;
    }
    if (candidate.source !== "manual" || candidate.provenance !== "manual" || !candidate.id.startsWith("manual-")) continue;
    const at = Date.parse(candidate.startedAt);
    if (!Number.isFinite(at) || at > now.getTime() || dayKey(new Date(at)) !== dayKey(now) ||
      !SPORT_IDS.includes(candidate.sport) || !Number.isFinite(candidate.movingSec) || candidate.movingSec <= 0 || candidate.movingSec > 86400 ||
      !Number.isFinite(candidate.distanceM) || candidate.distanceM < 0 || candidate.distanceM > 2_000_000 || candidate.id.length > 240) throw new Error("invalid_activity");
    const manual: Activity = { ...candidate, verified: false, avgHr: null, source: "manual", provenance: "manual",
      distanceM: candidate.sport === "strength" ? 0 : candidate.distanceM };
    activities.push(manual); known.set(manual.id, manual);
  }
  return { ...next, activities };
}

/** The document transports user intentions. Ratings, locks, receipts and results
 * always start from the server copy; supplied score values are never imported. */
export function deriveCompetitionIntents(stored: CompeteState | null, incoming: CompeteState, userId: string, now: Date): CompeteState {
  let next = applyCompetitionActivityIntents(stored ?? withAccountEloBaseline(freshState(now)), incoming, now);
  next = { ...next, requiresCanonicalFields: true, demoNow: null,
    name: incoming.name.trim().slice(0, 80) || next.name, city: incoming.city.trim().slice(0, 80),
    avatarUrl: incoming.avatarUrl, units: incoming.units, primary: incoming.primary, focus: incoming.focus,
    trainingGoal: incoming.trainingGoal, onboardingCompleted: next.onboardingCompleted || incoming.onboardingCompleted,
    lessonDoneOn: incoming.lessonDoneOn === dayKey(now) ? incoming.lessonDoneOn : next.lessonDoneOn,
  };
  // Sleep readings are input data; the server validates them and derives the rating.
  const nights = new Map(next.sleepNights.map(n => [n.id, n]));
  for (const night of incoming.sleepNights) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(night.day) || night.day > dayKey(now) || !Number.isFinite(night.score) || night.score < 0 || night.score > 100 ||
      !Number.isFinite(night.durationMin) || night.durationMin < 0 || night.durationMin > 1440) throw new Error("invalid_sleep");
    nights.set(night.id, night);
  }
  next = { ...next, sleepNights: [...nights.values()] };
  for (const sport of SPORT_IDS) {
    const requested = incoming.enrollments.find(e => e.sport === sport);
    let current = next.enrollments.find(e => e.sport === sport);
    if (!requested && current) {
      if (Date.parse(current.waveStart) <= now.getTime()) throw new Error("week_still_open");
      next = reduceCompete(next, { type: "opt-out", sport, now: now.toISOString() });
    } else if (requested) {
      const desiredCrew = requested.crewId && /^[0-9a-f-]{36}$/i.test(requested.crewId) ? requested.crewId : null;
      if (!current || (current.crewId ?? null) !== desiredCrew && Date.parse(current.waveStart) > now.getTime()) {
        const window = nextDailyWaveWindowAt(now);
        const pin: CrewBoardPin | null = desiredCrew ? { crewId: desiredCrew, crewName: "Crew field", sport,
          waveStart: window.waveStart.toISOString(), weekEnd: window.weekEnd.toISOString(), capacity: 8,
          memberIds: [userId], members: [], syntheticIds: [] } : null;
        next = reduceCompete(next, { type: "opt-in", sport, crewBoard: pin, accountId: userId, now: now.toISOString() });
        current = next.enrollments.find(e => e.sport === sport);
      }
      if (current && current.autoEnrollNext !== requested.autoEnrollNext) next = reduceCompete(next, {
        type: requested.autoEnrollNext ? "resume-renewal" : "schedule-leave", sport, now: now.toISOString(),
      });
    }
  }
  const desiredSleep = incoming.healthRatings.find(r => r.metric === "sleep");
  const sleep = next.healthRatings.find(r => r.metric === "sleep");
  if (desiredSleep?.optedIn !== sleep?.optedIn) {
    if (sleep?.optedIn && Date.parse(sleep.lockPeriod) <= now.getTime()) throw new Error("week_still_open");
    next = reduceCompete(next, { type: desiredSleep?.optedIn ? "opt-in-health" : "opt-out-health", metric: "sleep", now: now.toISOString() });
  }
  if (desiredSleep?.optedIn) next = reduceCompete(next, { type: desiredSleep.autoEnrollNext ? "resume-renewal" : "schedule-leave", metric: "sleep", now: now.toISOString() });
  const period = next.enrollments.find(e => e.sport === next.primary)?.waveStart ?? next.clock.periodStart;
  if (incoming.frozenPeriods.includes(period) !== next.frozenPeriods.includes(period)) next = reduceCompete(next, {
    type: incoming.frozenPeriods.includes(period) ? "freeze" : "unfreeze", now: now.toISOString(),
  });
  const acknowledgements = new Set(incoming.periodResults.filter(r => r.acknowledgedAt && Date.parse(r.acknowledgedAt) <= now.getTime()).map(r => r.id));
  next = { ...next, periodResults: next.periodResults.map(r => acknowledgements.has(r.id) && !r.acknowledgedAt ? { ...r, acknowledgedAt: now.toISOString() } : r) };
  // One-time calibration uses accepted history, never the supplied rating.
  if (!next.calibrated && incoming.calibrated && next.enrollments.every(e => Date.parse(e.waveStart) > now.getTime())) next = calibrateFromAcceptedHistory(next, now);
  return withDerivedPendingReveals(rollClock(next, competeNow(next, now)));
}
