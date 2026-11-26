import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: {
  start: { type: "string" },
  apply: { type: "boolean" },
} });
const start = new Date(values.start ?? "");
if (!Number.isFinite(+start)) {
  throw new Error("Pass --start with the ISO timestamp of the Eastern Monday cutover. Omit --apply for a dry run.");
}

const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const {
  SPORT_IDS, activityBaseTrainingXp, dayKey, eligibleTrainingXp, mergeActivities,
  provenanceOf, resetAccountEffort, shiftAppDay, trainingVolumeForXp, weeklyPeriodBounds,
} = await jiti.import("@fitness-battle/shared");
if (+weeklyPeriodBounds(start).startsAt !== +start) throw new Error("--start must be Eastern Monday at midnight.");
if (values.apply && +weeklyPeriodBounds(new Date()).startsAt !== +start) throw new Error("Apply requires the current Eastern Monday.");

const { webEnv } = await jiti.import("../src/lib/env.ts");
const { serviceDb } = await jiti.import("../src/lib/fitness-store.ts");
const { loadCompeteAccount } = await jiti.import("../src/lib/compete-persist.ts");
const db = serviceDb();
if (!db) throw new Error("Configure the target Supabase URL and service role key first.");

const lookback = shiftAppDay(start, -90);
const currentDay = dayKey(start);
function plan(state) {
  const activities = mergeActivities([], state.activities).filter(activity =>
    provenanceOf(activity) === "recorded" && !activity.journalOnly &&
    (activity.disposition ?? "counted") === "counted" &&
    Date.parse(activity.startedAt) >= +lookback && Date.parse(activity.startedAt) < +start &&
    activityBaseTrainingXp(activity) > 0,
  );
  const dailyHealth = (state.dailyHealth ?? []).filter(row =>
    row.provider !== "mock" && row.steps > 0 && row.day >= dayKey(lookback) && row.day < currentDay,
  );
  const primaryDays = [...new Set(state.primary === "walking"
    ? dailyHealth.map(row => row.day)
    : activities.filter(activity => activity.sport === state.primary).map(activity => dayKey(new Date(activity.startedAt))))].sort();
  const observedDays = primaryDays.length < 2 ? 0 : (Date.parse(currentDay) - Date.parse(primaryDays[0])) / 86_400_000;
  const covered = observedDays >= 83 ? 90 : observedDays;
  const since = shiftAppDay(start, -covered);
  const weeklyVolumes = Object.fromEntries(SPORT_IDS.map(sport => {
    const xp = sport === "walking"
      ? eligibleTrainingXp({ activities, dailyHealth }, sport, since, start, false)
      : activities.filter(activity => activity.sport === sport && Date.parse(activity.startedAt) >= +since)
        .reduce((total, activity) => total + activityBaseTrainingXp(activity), 0);
    return [sport, covered > 0 ? trainingVolumeForXp(sport, xp) * 7 / covered : 0];
  }));
  return resetAccountEffort(state, start, covered, weeklyVolumes);
}

console.log(JSON.stringify({ mode: values.apply ? "apply" : "dry-run", project: new URL(webEnv.supabaseUrl).host, startsAt: start }));
let after = null;
const totals = {};
do {
  const { data, error } = await db.rpc("list_effort_backfill_accounts", { p_start: start.toISOString(), p_after: after });
  if (error) throw new Error(error.message);
  if (data.length === 0) break;
  for (const { user_id: userId } of data) {
    try {
      const loaded = await loadCompeteAccount(db, userId);
      if (!loaded) throw new Error("account_not_found");
      const next = plan(loaded.state);
      const before = Object.fromEntries(loaded.state.ratings.map(row => [row.sport, row.openElo]));
      const scores = Object.fromEntries(next.ratings.map(row => [row.sport, row.openElo]));
      let status = "planned";
      if (values.apply) {
        const result = await db.rpc("commit_effort_backfill", {
          p_user: userId,
          p_start: start.toISOString(),
          p_expected_updated_at: loaded.updatedAt,
          p_effort_accounts: next.effortAccounts,
          p_scores: scores,
        });
        if (result.error) throw new Error(result.error.message);
        status = result.data;
      }
      totals[status] = (totals[status] ?? 0) + 1;
      console.log(JSON.stringify({ userId, status, before, scores, multiplier: next.effortAccounts[next.primary].starter.multiplier }));
    } catch (error) {
      totals.failed = (totals.failed ?? 0) + 1;
      console.error(JSON.stringify({ userId, error: error.message }));
    }
  }
  after = data.at(-1).user_id;
} while (after);

console.log(JSON.stringify({ totals }));
if (totals.failed || totals.conflict) process.exitCode = 1;
