import { competitionTrack, competitionTrackLabel, SPORT_IDS, sportById, type CompeteState, type SportId, type UnitSystem } from "./compete/sports";
import { initialsFromName } from "./compete/track";
import type { ArenaSceneLane } from "./arena-view";
import { cityBySlug, cityLabel } from "./cities";
import { countryFlagEmoji, countryName } from "./countries";
import { formatArenaVolume } from "./compete-field-view";
import { waveTimeLabelForState } from "./compete/participation";
import { APP_TIMEZONE, accountTimeZone, dayKey, shiftAppDay, startOfZonedDay, weeklyCompetitionLastDay, weeklyPeriodBounds } from "./period";
import type { RegistrationRuleCard } from "./event-registration";

export type SpecialEventSport = SportId;
export type SpecialEventProfileAttr = "country_code" | "city_slug" | "gender" | "rank_tier" | "random";
export type SpecialEventLeftoverPolicy = "spectate" | "wildcard" | "step_down";

export type SpecialEventGrouping =
  | { kind: "solo" }
  | { kind: "crew"; minRoster: number; maxRoster: number }
  | { kind: "profile_attr"; attr: SpecialEventProfileAttr; targetSquadSize: number; minSquadSize: number; leftoverPolicy: SpecialEventLeftoverPolicy };

export type SpecialEventMatchFormat =
  | { kind: "single_round"; targetHeatSize: number; minHeatSize: number }
  | { kind: "survivor_heat"; targetHeatSize: number; minHeatSize: number; eliminatePerRound: number }
  | { kind: "knockout_1v1"; maxBracketSize: number; minBracketSize: number };

export interface SpecialEventCadence {
  unit: "single_week" | "daily" | "weekly";
  roundCount: number;
  scoreMode: "round_window" | "cumulative";
}

export type SpecialEventScoring =
  | { mode: "total_volume" }
  | { mode: "relay_handoff"; legsPerDay: 1 | 2; assignmentMode: "manual" | "random"; lockPolicy: "full_week" | "pre_day"; maxLegsPerMember: number | null };

export interface SpecialEventConfig {
  version: 1;
  grouping: SpecialEventGrouping;
  match: SpecialEventMatchFormat;
  cadence: SpecialEventCadence;
  scoring: SpecialEventScoring;
  divisionMode: "none" | "rating_tiers";
}

export type SpecialEventEntryStatus = "registered" | "active" | "eliminated" | "spectating" | "completed" | "cancelled";
export type SpecialEventLifecyclePhase = "upcoming" | "registering" | "locked" | "active" | "settled";

export interface SpecialEventEntrySummary {
  id: string;
  status: SpecialEventEntryStatus;
  sideId: string | null;
  sideName: string | null;
  spectateHeatId: string | null;
  requestedCrewId: string | null;
  groupSnapshot: Record<string, string>;
  entryRating: number;
  registeredAt: string;
  eliminatedRound: number | null;
  finalPlace: number | null;
  finalScore: number | null;
  acknowledgedAt: string | null;
  acknowledgedRound?: number;
}

export interface SpecialEventReceipt {
  code: string;
  metadata: Record<string, unknown>;
  earnedAt: string;
}

export interface SpecialEventEdition {
  id: string;
  slug: string;
  seriesKey: string;
  sport: SpecialEventSport;
  title: string;
  subtitle: string;
  rulesVersion: number;
  config: SpecialEventConfig;
  registrationOpensAt: string;
  registrationClosesAt: string;
  startsAt: string;
  endsAt: string;
  published?: boolean;
  finalizedAt: string | null;
  settledAt: string | null;
  entrantCount: number;
  entry: SpecialEventEntrySummary | null;
  receipts: SpecialEventReceipt[];
}

export interface SaveSpecialEventEditionInput {
  id: string | null;
  slug: string;
  seriesKey: string;
  sport: SpecialEventSport;
  title: string;
  subtitle: string;
  config: SpecialEventConfig;
  registrationOpensAt: string;
  registrationClosesAt: string;
  startsAt: string;
  endsAt: string;
  published: boolean;
}

export interface SpecialEventTemplate {
  id: string;
  seriesKey: string;
  sport: SpecialEventSport;
  title: string;
  subtitle: string;
  config: SpecialEventConfig;
  cadenceWeeks: number;
  active: boolean;
  nextStartAt: string;
}

export interface SaveSpecialEventTemplateInput {
  id: string | null;
  seriesKey: string;
  sport: SpecialEventSport;
  title: string;
  subtitle: string;
  config: SpecialEventConfig;
  cadenceWeeks: number;
  active: boolean;
  nextStartAt: string;
}

export type SpecialEventPresetId =
  | "daily_survivor"
  | "weekly_knockout_1v1"
  | "crew_relay_locked"
  | "crew_relay_random"
  | "country_squads_3v3"
  | "city_squads_3v3"
  | "random_squads_2v2";

export interface SpecialEventPresetMeta {
  id: SpecialEventPresetId;
  label: string;
  weeks: number;
  seriesKey: string;
  defaultTitle: string;
  defaultSubtitle: string;
  config: SpecialEventConfig;
}

const baseConfig = (overrides: Partial<SpecialEventConfig>): SpecialEventConfig => ({
  version: 1,
  grouping: { kind: "solo" },
  match: { kind: "single_round", targetHeatSize: 8, minHeatSize: 2 },
  cadence: { unit: "single_week", roundCount: 1, scoreMode: "round_window" },
  scoring: { mode: "total_volume" },
  divisionMode: "rating_tiers",
  ...overrides,
});

export const SPECIAL_EVENT_PRESETS: readonly SpecialEventPresetMeta[] = [
  {
    id: "daily_survivor", label: "Daily Survivor", weeks: 1, seriesKey: "daily-survivor",
    defaultTitle: "Daily Survivor", defaultSubtitle: "1 eliminated every night · Scores reset daily",
    config: baseConfig({
      match: { kind: "survivor_heat", targetHeatSize: 8, minHeatSize: 3, eliminatePerRound: 1 },
      cadence: { unit: "daily", roundCount: 7, scoreMode: "round_window" },
    }),
  },
  {
    id: "weekly_knockout_1v1", label: "Weekly 1v1 Bracket", weeks: 3, seriesKey: "weekly-knockout",
    defaultTitle: "Knockout Cup", defaultSubtitle: "3-week 1v1 elimination bracket",
    config: baseConfig({
      match: { kind: "knockout_1v1", maxBracketSize: 16, minBracketSize: 2 },
      cadence: { unit: "weekly", roundCount: 3, scoreMode: "round_window" },
    }),
  },
  {
    id: "crew_relay_locked", label: "Crew Relay (Locked)", weeks: 1, seriesKey: "crew-relay",
    defaultTitle: "Crew Relay", defaultSubtitle: "1 teammate counts per day · Full-week baton lock",
    config: baseConfig({
      grouping: { kind: "crew", minRoster: 2, maxRoster: 8 },
      scoring: { mode: "relay_handoff", legsPerDay: 1, assignmentMode: "manual", lockPolicy: "full_week", maxLegsPerMember: 4 },
      divisionMode: "none",
    }),
  },
  {
    id: "crew_relay_random", label: "Crew Relay (Random)", weeks: 1, seriesKey: "crew-relay-random",
    defaultTitle: "Mystery Baton Relay", defaultSubtitle: "Random daily baton draw · Revealed at start",
    config: baseConfig({
      grouping: { kind: "crew", minRoster: 2, maxRoster: 8 },
      scoring: { mode: "relay_handoff", legsPerDay: 1, assignmentMode: "random", lockPolicy: "full_week", maxLegsPerMember: 4 },
      divisionMode: "none",
    }),
  },
  {
    id: "country_squads_3v3", label: "Country 3v3 Squads", weeks: 1, seriesKey: "country-squads",
    defaultTitle: "Nations 3v3", defaultSubtitle: "Pool scores with 2 teammates from your country",
    config: baseConfig({
      grouping: { kind: "profile_attr", attr: "country_code", targetSquadSize: 3, minSquadSize: 2, leftoverPolicy: "spectate" },
      match: { kind: "single_round", targetHeatSize: 4, minHeatSize: 2 },
    }),
  },
  {
    id: "city_squads_3v3", label: "City 3v3 Squads", weeks: 1, seriesKey: "city-squads",
    defaultTitle: "Metro 3v3", defaultSubtitle: "Pool scores with 2 teammates from your city",
    config: baseConfig({
      grouping: { kind: "profile_attr", attr: "city_slug", targetSquadSize: 3, minSquadSize: 2, leftoverPolicy: "spectate" },
      match: { kind: "single_round", targetHeatSize: 4, minHeatSize: 2 },
    }),
  },
  {
    id: "random_squads_2v2", label: "Draft 2v2v2v2", weeks: 1, seriesKey: "draft-pairs",
    defaultTitle: "Pairs Showdown", defaultSubtitle: "2v2v2v2 matched pairs · Pooled weekly volume",
    config: baseConfig({
      grouping: { kind: "profile_attr", attr: "random", targetSquadSize: 2, minSquadSize: 2, leftoverPolicy: "spectate" },
      match: { kind: "single_round", targetHeatSize: 4, minHeatSize: 2 },
    }),
  },
];

function sixAmEastern(day: Date, timeZone = APP_TIMEZONE): Date {
  const noon = new Date(startOfZonedDay(day, timeZone).getTime() + 12 * 3_600_000);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(noon));
  return new Date(noon.getTime() + (6 - hour) * 3_600_000);
}

/** Pre-registration opens Mon 00:00 ET of current week; locks & starts next Mon 06:00 ET. */
export function nextSpecialEventWindow(now = new Date(), weeks = 1, timeZone = APP_TIMEZONE) {
  const safeWeeks = Math.max(1, Math.min(8, Math.floor(weeks)));
  const current = weeklyPeriodBounds(now, timeZone);
  const startsAt = sixAmEastern(current.endsAt, timeZone);
  return {
    registrationOpensAt: current.startsAt,
    registrationClosesAt: startsAt,
    startsAt,
    endsAt: shiftAppDay(current.endsAt, safeWeeks * 7),
  };
}

export function buildSpecialEventPreset(presetId: SpecialEventPresetId, sport: SpecialEventSport, now = new Date()) {
  const preset = SPECIAL_EVENT_PRESETS.find((p) => p.id === presetId) ?? SPECIAL_EVENT_PRESETS[0]!;
  const win = nextSpecialEventWindow(now, preset.weeks);
  return {
    slug: `${dayKey(win.startsAt, APP_TIMEZONE)}-${sport}-${preset.seriesKey}`.slice(0, 80),
    seriesKey: `${sport}-${preset.seriesKey}`.slice(0, 64),
    sport,
    title: preset.defaultTitle,
    subtitle: preset.defaultSubtitle,
    config: structuredClone(preset.config),
    registrationOpensAt: win.registrationOpensAt.toISOString(),
    registrationClosesAt: win.registrationClosesAt.toISOString(),
    startsAt: win.startsAt.toISOString(),
    endsAt: win.endsAt.toISOString(),
    published: false,
  };
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,79}$/;
const SERIES_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROFILE_ATTRS = new Set<SpecialEventProfileAttr>(["country_code", "city_slug", "gender", "rank_tier", "random"]);
const LEFTOVER_POLICIES = new Set<SpecialEventLeftoverPolicy>(["spectate", "wildcard", "step_down"]);

function intIn(value: unknown, min: number, max: number, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return n;
}

export function validateSpecialEventConfig(input: unknown): SpecialEventConfig {
  if (!input || typeof input !== "object") throw new Error("Invalid event config.");
  const r = input as Record<string, unknown>;
  if (r.version !== 1) throw new Error("Unsupported config version.");
  if (r.divisionMode !== "none" && r.divisionMode !== "rating_tiers") throw new Error("Invalid division mode.");

  const g = r.grouping as Record<string, unknown> | undefined;
  let grouping: SpecialEventGrouping;
  if (g?.kind === "solo") {
    grouping = { kind: "solo" };
  } else if (g?.kind === "crew") {
    const minRoster = intIn(g.minRoster, 2, 32, "Min roster");
    grouping = { kind: "crew", minRoster, maxRoster: intIn(g.maxRoster, minRoster, 32, "Max roster") };
  } else if (g?.kind === "profile_attr") {
    if (!PROFILE_ATTRS.has(g.attr as SpecialEventProfileAttr)) throw new Error("Invalid profile grouping attribute.");
    if (!LEFTOVER_POLICIES.has(g.leftoverPolicy as SpecialEventLeftoverPolicy)) throw new Error("Invalid leftover policy.");
    const minSquadSize = intIn(g.minSquadSize, 2, 16, "Min squad size");
    grouping = {
      kind: "profile_attr",
      attr: g.attr as SpecialEventProfileAttr,
      minSquadSize,
      targetSquadSize: intIn(g.targetSquadSize, minSquadSize, 16, "Target squad size"),
      leftoverPolicy: g.leftoverPolicy as SpecialEventLeftoverPolicy,
    };
  } else throw new Error("Invalid grouping kind.");

  const m = r.match as Record<string, unknown> | undefined;
  let match: SpecialEventMatchFormat;
  if (m?.kind === "single_round") {
    const minHeatSize = intIn(m.minHeatSize, 2, 16, "Min heat size");
    match = { kind: "single_round", minHeatSize, targetHeatSize: intIn(m.targetHeatSize, minHeatSize, 16, "Target heat size") };
  } else if (m?.kind === "survivor_heat") {
    const minHeatSize = intIn(m.minHeatSize, 2, 16, "Min heat size");
    const targetHeatSize = intIn(m.targetHeatSize, minHeatSize, 16, "Target heat size");
    match = { kind: "survivor_heat", minHeatSize, targetHeatSize, eliminatePerRound: intIn(m.eliminatePerRound, 1, targetHeatSize - 1, "Eliminations per round") };
  } else if (m?.kind === "knockout_1v1") {
    const minBracketSize = intIn(m.minBracketSize, 2, 64, "Min bracket size");
    match = { kind: "knockout_1v1", minBracketSize, maxBracketSize: intIn(m.maxBracketSize, minBracketSize, 64, "Max bracket size") };
  } else throw new Error("Invalid match format.");

  const c = r.cadence as Record<string, unknown> | undefined;
  if (c?.unit !== "single_week" && c?.unit !== "daily" && c?.unit !== "weekly") throw new Error("Invalid cadence unit.");
  if (c.scoreMode !== "round_window" && c.scoreMode !== "cumulative") throw new Error("Invalid score mode.");
  const roundCount = intIn(c.roundCount, 1, 14, "Round count");
  if (c.unit === "single_week" && roundCount !== 1) throw new Error("Single-week cadence must have 1 round.");

  const s = r.scoring as Record<string, unknown> | undefined;
  let scoring: SpecialEventScoring;
  if (s?.mode === "total_volume") {
    scoring = { mode: "total_volume" };
  } else if (s?.mode === "relay_handoff") {
    if (grouping.kind === "solo") throw new Error("Relay scoring requires team or crew grouping.");
    const legsPerDay = intIn(s.legsPerDay, 1, 2, "Legs per day") as 1 | 2;
    if (s.assignmentMode !== "manual" && s.assignmentMode !== "random") throw new Error("Invalid relay assignment mode.");
    if (s.lockPolicy !== "full_week" && s.lockPolicy !== "pre_day") throw new Error("Invalid relay lock policy.");
    const maxLegsPerMember = s.maxLegsPerMember == null ? null : intIn(s.maxLegsPerMember, 1, 14, "Max legs per member");
    scoring = { mode: "relay_handoff", legsPerDay, assignmentMode: s.assignmentMode, lockPolicy: s.lockPolicy, maxLegsPerMember };
  } else throw new Error("Invalid scoring mode.");

  return { version: 1, grouping, match, cadence: { unit: c.unit, roundCount, scoreMode: c.scoreMode }, scoring, divisionMode: r.divisionMode };
}

function parseEventMeta(raw: Record<string, unknown>, idLabel: string) {
  const id = raw.id == null || raw.id === "" ? null : String(raw.id);
  if (id !== null && !UUID_RE.test(id)) throw new Error(`Invalid ${idLabel} ID.`);
  const seriesKey = String(raw.seriesKey ?? "").trim().toLowerCase();
  if (!SERIES_RE.test(seriesKey)) throw new Error("Series key must be 2–64 lowercase letters, numbers, or hyphens.");
  const sport = raw.sport as SpecialEventSport;
  if (!SPORT_IDS.includes(sport)) throw new Error("Invalid sport.");
  const title = String(raw.title ?? "").trim();
  if (title.length < 2 || title.length > 80) throw new Error("Title must be 2–80 characters.");
  const subtitle = String(raw.subtitle ?? "").trim();
  if (subtitle.length > 160) throw new Error("Subtitle must be 160 characters or fewer.");
  return { id, seriesKey, sport, title, subtitle, config: validateSpecialEventConfig(raw.config) };
}

export function validateSpecialEventEditionInput(input: unknown): SaveSpecialEventEditionInput {
  if (!input || typeof input !== "object") throw new Error("Invalid edition payload.");
  const raw = input as Record<string, unknown>;
  const slug = String(raw.slug ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(slug)) throw new Error("Slug must be 3–80 lowercase letters, numbers, or hyphens.");
  const meta = parseEventMeta(raw, "edition");

  const [regOpen, regClose, starts, ends] = [raw.registrationOpensAt, raw.registrationClosesAt, raw.startsAt, raw.endsAt].map((v) => Date.parse(String(v ?? "")));
  if (![regOpen, regClose, starts, ends].every(Number.isFinite)) throw new Error("Provide valid ISO timestamps.");
  if (!(regOpen! < regClose! && regClose! <= starts! && starts! < ends!)) throw new Error("Timestamps must satisfy registration open < close <= start < end.");

  return {
    ...meta,
    slug,
    registrationOpensAt: new Date(regOpen!).toISOString(),
    registrationClosesAt: new Date(regClose!).toISOString(),
    startsAt: new Date(starts!).toISOString(),
    endsAt: new Date(ends!).toISOString(),
    published: Boolean(raw.published),
  };
}

export function validateSpecialEventTemplateInput(input: unknown): SaveSpecialEventTemplateInput {
  if (!input || typeof input !== "object") throw new Error("Invalid template payload.");
  const raw = input as Record<string, unknown>;
  const meta = parseEventMeta(raw, "template");
  const cadenceWeeks = intIn(raw.cadenceWeeks ?? 1, 1, 8, "Cadence weeks");
  const nextStart = Date.parse(String(raw.nextStartAt ?? ""));
  if (!Number.isFinite(nextStart)) throw new Error("Provide a valid next start ISO timestamp.");
  return {
    ...meta,
    cadenceWeeks,
    active: raw.active !== false,
    nextStartAt: new Date(nextStart).toISOString(),
  };
}

export function specialEventPhase(
  edition: Pick<SpecialEventEdition, "registrationOpensAt" | "registrationClosesAt" | "startsAt" | "endsAt" | "settledAt">,
  now: Date,
): SpecialEventLifecyclePhase {
  const t = now.getTime();
  if (edition.settledAt || t >= Date.parse(edition.endsAt)) return "settled";
  if (t >= Date.parse(edition.startsAt)) return "active";
  if (t >= Date.parse(edition.registrationClosesAt)) return "locked";
  if (t >= Date.parse(edition.registrationOpensAt)) return "registering";
  return "upcoming";
}

export function specialEventFormatLabel(config: SpecialEventConfig): string {
  if (config.scoring.mode === "relay_handoff") return config.scoring.assignmentMode === "random" ? "Mystery Relay" : "Crew Relay";
  if (config.match.kind === "survivor_heat") return config.cadence.unit === "daily" ? "Daily Survivor" : "Survivor Heat";
  if (config.match.kind === "knockout_1v1") return config.cadence.unit === "weekly" ? `${config.cadence.roundCount}-Week Bracket` : "1v1 Bracket";
  if (config.grouping.kind === "profile_attr") {
    const n = config.grouping.targetSquadSize;
    const prefix = config.grouping.attr === "country_code" ? "Country" : config.grouping.attr === "city_slug" ? "City" : config.grouping.attr === "random" ? "Draft" : "Team";
    return `${prefix} ${n}v${n}`;
  }
  return config.grouping.kind === "crew" ? "Crew Event" : "Special Event";
}

export function specialEventStatusBadge(edition: SpecialEventEdition, now: Date): string {
  const phase = specialEventPhase(edition, now);
  const entry = edition.entry;
  if (entry?.status === "spectating") return phase === "active" ? "Watching live" : "Spectator";
  if (entry?.status === "eliminated") return entry.eliminatedRound ? `Out · Round ${entry.eliminatedRound}` : "Eliminated";
  if (phase === "settled") return entry?.finalPlace ? `Finished #${entry.finalPlace}` : "Completed";
  if (phase === "active") return entry ? "Live" : "In progress";
  if (phase === "locked") return entry ? "Starting soon" : "Closed";
  if (phase === "registering") return entry?.status === "registered" ? "Registered" : "Open now";
  return "Opens soon";
}

export function specialEventDateRange(state: CompeteState, edition: Pick<SpecialEventEdition, "startsAt" | "endsAt">): string {
  const opts: Intl.DateTimeFormatOptions = { timeZone: accountTimeZone(state), month: "short", day: "numeric" };
  const first = new Date(edition.startsAt).toLocaleDateString("en-US", opts);
  const last = weeklyCompetitionLastDay(new Date(edition.endsAt), APP_TIMEZONE).toLocaleDateString("en-US", opts);
  return first === last ? first : `${first} – ${last}`;
}

export function extractCrewOptions(rows: unknown): { id: string; name: string }[] {
  if (!Array.isArray(rows)) return [];
  const out: { id: string; name: string }[] = [];
  for (const row of rows) {
    const raw = (row as { crews?: unknown })?.crews;
    const crew = (Array.isArray(raw) ? raw[0] : raw) as { id?: unknown; name?: unknown } | null | undefined;
    if (typeof crew?.id === "string" && typeof crew?.name === "string") out.push({ id: crew.id, name: crew.name });
  }
  return out;
}

export function specialEventRegistrationDetail(state: CompeteState, edition: SpecialEventEdition, now: Date) {
  const { config, sport } = edition;
  const phase = specialEventPhase(edition, now);
  const sportMeta = sportById(sport);
  const verified = competitionTrack(sport) === "verified";
  const startsLabel = waveTimeLabelForState(state, new Date(edition.startsAt));
  const endsLabel = waveTimeLabelForState(state, new Date(Date.parse(edition.endsAt) - 60_000));
  const cutoffLabel = waveTimeLabelForState(state, new Date(edition.registrationClosesAt));

  const scoringSummary =
    config.scoring.mode === "relay_handoff"
      ? `${config.scoring.legsPerDay === 1 ? "1 baton/day" : "2 batons/day"} · ${config.scoring.assignmentMode === "random" ? "Random draw" : "Locked lineup"}`
      : sport === "strength" ? "Training time" : sport === "walking" ? "Daily steps" : "GPS distance";

  const scoringDetail =
    config.scoring.mode === "relay_handoff"
      ? `Only your team’s active baton-holder${config.scoring.legsPerDay > 1 ? "s count" : " counts"} each Eastern day. Off-day workouts still count toward your regular weekly sport.`
      : `${verified ? "Verified GPS workouts" : sport === "walking" ? "Synced daily steps" : "Eligible sessions"} count toward both this event and your weekly ${sportMeta.name.toLowerCase()} field without altering Effort Score EWMA.`;

  const scheduleSummary =
    config.cadence.unit === "daily" ? "Daily cuts · Resets midnight ET"
      : config.cadence.unit === "weekly" ? `${config.cadence.roundCount} weekly rounds`
        : "Full week · No late joins";

  const scheduleDetail =
    config.cadence.unit === "daily"
      ? `Registration locks ${cutoffLabel}. No partial-week entries. Scores reset to 0 each midnight ET (Day 1 starts 6:00 AM ET).`
      : `Registration locks ${cutoffLabel}. No partial-week entries. Rounds close Sunday 11:59 PM ET and next rounds open Monday 6:00 AM ET.`;

  const formatSummary =
    config.match.kind === "survivor_heat" ? `Up to ${config.match.targetHeatSize} · ${config.match.eliminatePerRound} out/round`
      : config.match.kind === "knockout_1v1" ? "1v1 elimination bracket"
        : config.grouping.kind === "profile_attr" ? `${config.grouping.targetSquadSize}-athlete squads`
          : config.grouping.kind === "crew" ? `${config.grouping.minRoster}–${config.grouping.maxRoster} crew roster`
            : `Up to ${config.match.targetHeatSize} athletes`;

  const formatDetail =
    config.grouping.kind === "profile_attr"
      ? `Real athletes only. Full ${config.grouping.targetSquadSize}-person squads are matched by Effort Score; extra registrants can watch the live race.`
      : config.grouping.kind === "crew"
        ? `Real crews only (${config.grouping.minRoster}+ opted-in teammates). Matched against other crews when registration closes.`
        : "Real athletes only — heat sizes adapt cleanly to registered competitors.";

  const ruleCards: RegistrationRuleCard[] = [
    { id: "scoring", icon: "layers", title: "Scoring", summary: scoringSummary, detail: scoringDetail, footnote: competitionTrackLabel(sport) },
    { id: "schedule", icon: "calendar", title: "Schedule", summary: scheduleSummary, detail: scheduleDetail },
    { id: "tier", icon: "trophy", title: "Format", summary: formatSummary, detail: formatDetail },
  ];

  const ticketRows = [
    { label: "Format", value: specialEventFormatLabel(config) },
    { label: "Sport", value: sportMeta.name },
    { label: "Starts", value: startsLabel },
    { label: "Ends", value: endsLabel },
    { label: "Scoring", value: scoringSummary },
  ];

  const isRegistered = edition.entry?.status === "registered";
  return {
    title: edition.title,
    subtitle: edition.subtitle || specialEventFormatLabel(config),
    tag: specialEventFormatLabel(config),
    sportName: sportMeta.name,
    dateRange: specialEventDateRange(state, edition),
    startsLabel,
    endsLabel,
    cutoffLabel,
    phase,
    canRegister: phase === "registering" && !isRegistered,
    canCancel: phase === "registering" && isRegistered,
    requiresCrew: config.grouping.kind === "crew",
    requiresCountry: config.grouping.kind === "profile_attr" && config.grouping.attr === "country_code",
    requiresCity: config.grouping.kind === "profile_attr" && config.grouping.attr === "city_slug",
    ruleCards,
    ticketRows,
  };
}

export function specialEventError(message: string): string {
  if (message.includes("registration_not_open")) return "Registration has not opened yet.";
  if (message.includes("registration_closed")) return "Registration is closed — special events require a full-week entry.";
  if (message.includes("crew_required")) return "Choose a crew to enter this event.";
  if (message.includes("not_a_crew_member")) return "You must be an active member of that crew.";
  if (message.includes("country_required")) return "Select your country before registering.";
  if (message.includes("city_required")) return "Select your city before registering.";
  if (message.includes("profile_attribute_required")) return "Complete your profile info before registering.";
  if (message.includes("edition_not_found")) return "This event is no longer available.";
  if (message.includes("not_registered")) return "No active registration was found to cancel.";
  if (message.includes("edition_already_started")) return "Started events keep their locked schedule and scoring rules.";
  if (message.includes("edition_not_started")) return "Standings open when the event starts.";
  if (message.includes("relay_random_locked")) return "This relay draws daily baton-holders randomly at start.";
  if (message.includes("relay_lineup_locked")) return "The relay lineup locked when the event started.";
  if (message.includes("relay_day_locked")) return "Today and past relay days are locked.";
  if (message.includes("relay_max_legs_exceeded")) return "Too many days assigned to one teammate.";
  if (message.includes("member_not_on_roster")) return "Only active crew teammates can be assigned a baton day.";
  if (message.includes("authentication_required")) return "Sign in to register for special events.";
  return "Could not update special event registration. Try again.";
}

export interface SpecialEventSideStanding {
  sideId: string;
  displayName: string;
  groupAttr?: string | null;
  groupValue?: string | null;
  userId: string | null;
  isYou: boolean;
  score: number;
  place: number;
  advancing: boolean;
}

export interface SpecialEventSquadMember {
  userId: string;
  displayName: string;
  isYou: boolean;
  score: number;
}

export interface SpecialEventHeatView {
  id: string;
  divisionKey: string;
  heatIndex: number;
  isMine: boolean;
  advanceCount: number;
  sides: SpecialEventSideStanding[];
}

export interface SpecialEventRoundView {
  roundNumber: number;
  startsAt: string;
  endsAt: string;
  advanceCount: number;
  scoreMode: "round_window" | "cumulative";
  finalizedAt: string | null;
  settledAt: string | null;
  heats: SpecialEventHeatView[];
}

export interface SpecialEventStandings {
  editionId: string;
  sport: SpecialEventSport;
  finalizedAt: string | null;
  settledAt: string | null;
  currentRound: number;
  mySideId: string | null;
  myStatus: SpecialEventEntryStatus | null;
  mySquad?: SpecialEventSquadMember[];
  rounds: SpecialEventRoundView[];
}

export function specialEventSideLabel(side: Pick<SpecialEventSideStanding, "displayName" | "groupAttr" | "groupValue">): string {
  const suffix = side.displayName.match(/#\d+$/)?.[0];
  if (side.groupAttr === "country_code" && side.groupValue && side.groupValue.length === 2) {
    const flag = countryFlagEmoji(side.groupValue);
    const name = countryName(side.groupValue) ?? side.groupValue;
    return `${flag ? `${flag} ` : ""}${name}${suffix ? ` ${suffix}` : ""}`;
  }
  if (side.groupAttr === "city_slug" && side.groupValue) {
    return `${cityLabel(side.groupValue) ?? side.groupValue}${suffix ? ` ${suffix}` : ""}`;
  }
  return side.displayName;
}

export function specialEventRoundLabel(
  config: SpecialEventConfig,
  roundNumber: number,
  totalRounds: number,
): string {
  if (config.cadence.unit === "daily") return roundNumber === totalRounds && totalRounds > 1 ? `Day ${roundNumber} · Final` : `Day ${roundNumber}`;
  if (config.match.kind === "knockout_1v1") {
    const remaining = totalRounds - roundNumber;
    if (remaining === 0) return "Final";
    if (remaining === 1) return "Semifinals";
    if (remaining === 2) return "Quarterfinals";
  }
  return totalRounds === 1 ? "Standings" : `Round ${roundNumber}`;
}

export function formatSpecialEventVolume(sport: SpecialEventSport, value: number, units: UnitSystem = "us"): string {
  return formatArenaVolume(sport, { distanceM: value, movingSec: value, effort: value }, units);
}

export interface SpecialEventRelayRosterMember {
  userId: string;
  displayName: string;
  optedIn: boolean;
}

export interface SpecialEventRelayLeg {
  legDay: string;
  slotIndex: number;
  userId: string;
  displayName: string;
  isYou: boolean;
  isToday: boolean;
  locked: boolean;
  score: number;
}

export interface SpecialEventRelayLineup {
  editionId: string;
  crewId: string;
  sideId: string | null;
  startDay: string;
  endDay: string;
  todayDay: string;
  legsPerDay: 1 | 2;
  assignmentMode: "manual" | "random";
  lockPolicy: "full_week" | "pre_day";
  maxLegsPerMember: number | null;
  finalized: boolean;
  roster: SpecialEventRelayRosterMember[];
  legs: SpecialEventRelayLeg[];
}

export function relayDayLabel(dayIso: string): string {
  const date = new Date(`${dayIso}T12:00:00.000Z`);
  const weekday = date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" });
  return `${weekday} ${date.getUTCDate()}`;
}

export function relayDaysBetween(startDay: string, endDay: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${startDay}T12:00:00.000Z`);
  const last = Date.parse(`${endDay}T12:00:00.000Z`);
  while (cursor.getTime() <= last && days.length < 14) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function relayDraftToLegs(draft: Record<string, string>, afterDay?: string) {
  return Object.entries(draft)
    .filter(([, userId]) => Boolean(userId))
    .map(([key, userId]) => {
      const [legDay, slot] = key.split(":");
      return { legDay: legDay!, slotIndex: Number(slot), userId };
    })
    .filter((leg) => !afterDay || leg.legDay > afterDay);
}

export function relayTodayHeadline(lineup: SpecialEventRelayLineup): string | null {
  const today = lineup.legs.filter((l) => l.isToday);
  if (!today.length) return null;
  if (today.some((l) => l.isYou)) return "You have the baton today — your workouts count for the crew.";
  return `${today.map((l) => l.displayName).join(" & ")} on the baton today. Off-day workouts still count toward your weekly sport.`;
}

export function sortSpecialEvents(editions: readonly SpecialEventEdition[]): SpecialEventEdition[] {
  return [...editions].sort((a, b) => Number(Boolean(b.entry)) - Number(Boolean(a.entry)));
}

/** Crisp 2–3 letter crew/city/country code for tags and 3D course pins. */
export function specialEventSideCode(side: Pick<SpecialEventSideStanding, "displayName" | "groupAttr" | "groupValue">): string {
  if (side.groupAttr === "country_code" && side.groupValue) return side.groupValue.slice(0, 2).toUpperCase();
  if (side.groupAttr === "city_slug" && side.groupValue) {
    const city = cityBySlug(side.groupValue);
    const words = (city?.name ?? side.groupValue.split(":")[1] ?? "").replace(/[^a-zA-Z ]/g, " ").trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return words.map((w) => w[0]!.toUpperCase()).join("").slice(0, 3);
    return (words[0] ?? "CTY").slice(0, 3).toUpperCase();
  }
  const words = side.displayName.replace(/#\d+$/, "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map((w) => w[0]!.toUpperCase()).join("").slice(0, 3);
  return (words[0] ?? "TM").slice(0, 3).toUpperCase();
}

export function specialEventCourseUnit(sport: SpecialEventSport, units: UnitSystem = "us"): string {
  if (sport === "running" || sport === "cycling") return units === "metric" ? "km" : "mi";
  return sport === "strength" ? "hrs" : "steps";
}

function toCourseValue(sport: SpecialEventSport, rawScore: number, units: UnitSystem): number {
  if (sport === "running" || sport === "cycling") return rawScore / (units === "metric" ? 1000 : 1609.344);
  if (sport === "strength") return rawScore / 3600;
  return rawScore;
}

/** Convert live Special Event standings sides directly into ArenaSceneLane markers for GeographicCourse. */
export function specialEventSceneLanes(
  standings: SpecialEventStandings | null,
  units: UnitSystem = "us",
  roundNumber?: number | null,
): ArenaSceneLane[] {
  if (!standings?.rounds.length) return [];
  const round = standings.rounds.find((r) => r.roundNumber === (roundNumber ?? standings.currentRound)) ?? standings.rounds[standings.rounds.length - 1];
  const heat = round?.heats.find((h) => h.isMine) ?? round?.heats[0];
  if (!heat) return [];
  return heat.sides.map((side) => ({
    id: side.sideId,
    name: specialEventSideLabel(side),
    initials: side.groupAttr || side.userId === null ? specialEventSideCode(side) : initialsFromName(side.displayName),
    value: toCourseValue(standings.sport, side.score, units),
    you: side.isYou,
  }));
}

export function specialEventStatusHero(
  standings: SpecialEventStandings,
  edition: SpecialEventEdition,
  units: UnitSystem = "us",
  roundNumber?: number | null,
): { badge: string; tone: "lime" | "danger" | "gold"; headline: string; detail: string } | null {
  const round = standings.rounds.find((r) => r.roundNumber === (roundNumber ?? standings.currentRound)) ?? standings.rounds[standings.rounds.length - 1];
  const heat = round?.heats.find((h) => h.isMine) ?? round?.heats[0];
  if (!round || !heat || heat.sides.length === 0) return null;

  const mine = heat.sides.find((s) => s.isYou);
  const leader = heat.sides[0]!;
  if (!mine || standings.myStatus === "spectating" || standings.myStatus === "eliminated") {
    const badge = standings.myStatus === "eliminated" && edition.entry?.eliminatedRound
      ? `OUT · ROUND ${edition.entry.eliminatedRound}`
      : "WATCHING LIVE";
    return {
      badge,
      tone: "gold",
      headline: `${specialEventSideLabel(leader)} leads (${formatSpecialEventVolume(edition.sport, leader.score, units)})`,
      detail: round.settledAt ? `Round ${round.roundNumber} finalized` : `Round ${round.roundNumber} live · ${heat.sides.length} in heat`,
    };
  }

  if (edition.config.match.kind === "survivor_heat" && heat.sides.length > heat.advanceCount) {
    const cutoffSide = heat.sides[heat.advanceCount - 1]!;
    const dropSide = heat.sides[heat.advanceCount]!;
    const safe = mine.place <= heat.advanceCount;
    const delta = safe ? mine.score - dropSide.score : cutoffSide.score - mine.score;
    const gap = formatSpecialEventVolume(edition.sport, Math.max(0, delta), units);
    return {
      badge: safe ? "ABOVE CUT LINE" : "BELOW CUT LINE",
      tone: safe ? "lime" : "danger",
      headline: safe ? `+${gap} above elimination` : `${gap} behind safety`,
      detail: `Top ${heat.advanceCount} of ${heat.sides.length} advance${edition.config.cadence.unit === "daily" ? " · Resets midnight ET" : ""}`,
    };
  }

  if (edition.config.match.kind === "knockout_1v1" && heat.sides.length >= 2) {
    const rival = heat.sides.find((s) => !s.isYou) ?? heat.sides[1]!;
    const ahead = mine.score >= rival.score;
    const gap = formatSpecialEventVolume(edition.sport, Math.abs(mine.score - rival.score), units);
    return {
      badge: specialEventRoundLabel(edition.config, round.roundNumber, Math.max(standings.rounds.length, edition.config.cadence.roundCount)).toUpperCase(),
      tone: ahead ? "lime" : "danger",
      headline: ahead ? `+${gap} ahead of ${specialEventSideLabel(rival)}` : `${gap} behind ${specialEventSideLabel(rival)}`,
      detail: `Winner advances · ${formatSpecialEventVolume(edition.sport, mine.score, units)} vs ${formatSpecialEventVolume(edition.sport, rival.score, units)}`,
    };
  }

  const ahead = mine.place === 1;
  const second = heat.sides[1];
  const gap = second ? formatSpecialEventVolume(edition.sport, Math.abs(ahead ? mine.score - second.score : leader.score - mine.score), units) : "0";
  return {
    badge: `#${mine.place} IN HEAT`,
    tone: ahead ? "lime" : "gold",
    headline: ahead && second ? `Leading by ${gap}` : ahead ? "1st place" : `${gap} off ${specialEventSideLabel(leader)}`,
    detail: `${specialEventSideLabel(mine)} · ${formatSpecialEventVolume(edition.sport, mine.score, units)}`,
  };
}

export interface SpecialEventCeremonyData {
  roundNumber: number;
  advanceCount: number;
  isCutFormat: boolean;
  badge: string;
  headline: string;
  detail: string;
  ctaLabel: string;
  tone: "lime" | "danger" | "gold";
  sides: SpecialEventSideStanding[];
}

export function specialEventPendingCeremony(
  standings: SpecialEventStandings | null,
  edition: SpecialEventEdition,
  units: UnitSystem = "us",
  forceLatest = false,
): SpecialEventCeremonyData | null {
  if (!standings?.rounds.length) return null;
  const settled = standings.rounds.filter((r) => Boolean(r.settledAt));
  if (!settled.length) return null;
  const latest = settled[settled.length - 1]!;
  if (!forceLatest && (edition.entry?.acknowledgedRound ?? 0) >= latest.roundNumber) return null;
  const heat = latest.heats.find((h) => h.isMine) ?? latest.heats[0];
  if (!heat?.sides.length) return null;

  const isCutFormat = edition.config.match.kind !== "single_round";
  const mine = heat.sides.find((s) => s.isYou);
  const label = specialEventRoundLabel(edition.config, latest.roundNumber, standings.rounds.length);
  const isFinal = latest.roundNumber === standings.rounds.length && Boolean(standings.settledAt);

  if (!mine) {
    const winner = heat.sides[0]!;
    return {
      roundNumber: latest.roundNumber,
      advanceCount: heat.advanceCount,
      isCutFormat,
      badge: `${label.toUpperCase()} VERDICT`,
      headline: `${specialEventSideLabel(winner)} took #1`,
      detail: `Closed at ${formatSpecialEventVolume(edition.sport, winner.score, units)}. Keep watching the heat unfold.`,
      ctaLabel: isFinal ? "View final standings →" : "Keep watching →",
      tone: "gold",
      sides: heat.sides,
    };
  }

  const outHere = edition.entry?.status === "eliminated" && edition.entry?.eliminatedRound === latest.roundNumber;
  const won = isFinal && mine.place === 1;
  const advanced = mine.advancing && !isFinal;

  return {
    roundNumber: latest.roundNumber,
    advanceCount: heat.advanceCount,
    isCutFormat,
    badge: `${label.toUpperCase()} VERDICT`,
    headline: won
      ? "CHAMPION"
      : outHere
        ? `ELIMINATED · #${mine.place}`
        : advanced
          ? edition.config.match.kind === "survivor_heat"
            ? "YOU SURVIVED"
            : "ADVANCING"
          : `FINISHED #${mine.place}`,
    detail: outHere
      ? `Finished #${mine.place} with ${formatSpecialEventVolume(edition.sport, mine.score, units)}. Stay in the stadium as your heat finishes.`
      : advanced
        ? `Finished #${mine.place} (${formatSpecialEventVolume(edition.sport, mine.score, units)}) to clear the cut.`
        : `Closed ${label} with ${formatSpecialEventVolume(edition.sport, mine.score, units)}.`,
    ctaLabel: outHere ? "Watch the rest of the heat →" : isFinal ? "Done →" : "Enter next round →",
    tone: outHere ? "danger" : won || advanced ? "lime" : "gold",
    sides: heat.sides,
  };
}

export type DebugSpecialEventPreviewId = "survivor-survived" | "survivor-eliminated" | "knockout-advance";

export const DEBUG_SPECIAL_EVENT_PREVIEWS: readonly { id: DebugSpecialEventPreviewId; label: string; detail: string }[] = [
  { id: "survivor-survived", label: "Special · Survivor Cut (Survived)", detail: "2.5s distance climb, cut-line draw-in, survived verdict" },
  { id: "survivor-eliminated", label: "Special · Survivor Cut (Eliminated)", detail: "Drop below the cut line & enter spectator mode" },
  { id: "knockout-advance", label: "Special · 1v1 Bracket Advance", detail: "Semifinal win ceremony advancing to the Final" },
];

export function buildDebugSpecialEventCeremony(
  previewId: DebugSpecialEventPreviewId,
  sport: SpecialEventSport = "running",
): SpecialEventCeremonyData {
  if (previewId === "knockout-advance") {
    return {
      roundNumber: 2,
      advanceCount: 1,
      isCutFormat: true,
      badge: "SEMIFINALS VERDICT",
      headline: "ADVANCING",
      detail: `Finished #1 (${formatSpecialEventVolume(sport, 38946, "us")}) to clear the cut.`,
      ctaLabel: "Enter next round →",
      tone: "lime",
      sides: [
        { sideId: "dbg-you", displayName: "You", userId: "you", isYou: true, score: 38946, place: 1, advancing: true },
        { sideId: "dbg-rival", displayName: "Marcus Vance", userId: "marcus", isYou: false, score: 35084, place: 2, advancing: false },
      ],
    };
  }
  const eliminated = previewId === "survivor-eliminated";
  return {
    roundNumber: 3,
    advanceCount: 5,
    isCutFormat: true,
    badge: "DAY 3 VERDICT",
    headline: eliminated ? "ELIMINATED · #6" : "YOU SURVIVED",
    detail: eliminated
      ? `Finished #6 with ${formatSpecialEventVolume(sport, 4667, "us")}. Stay in the stadium as your heat finishes.`
      : `Finished #2 (${formatSpecialEventVolume(sport, 9334, "us")}) to clear the cut.`,
    ctaLabel: eliminated ? "Watch the rest of the heat →" : "Enter next round →",
    tone: eliminated ? "danger" : "lime",
    sides: [
      { sideId: "s1", displayName: "Carla Diaz", userId: "u1", isYou: false, score: 10300, place: 1, advancing: true },
      ...(eliminated ? [] : [{ sideId: "s2", displayName: "You", userId: "you", isYou: true, score: 9334, place: 2, advancing: true }]),
      { sideId: "s3", displayName: "Marcus Vance", userId: "u3", isYou: false, score: 8208, place: eliminated ? 2 : 3, advancing: true },
      { sideId: "s4", displayName: "Elena Rostova", userId: "u4", isYou: false, score: 7886, place: eliminated ? 3 : 4, advancing: true },
      { sideId: "s5", displayName: "Bob Chen", userId: "u5", isYou: false, score: 7403, place: eliminated ? 4 : 5, advancing: true },
      ...(eliminated
        ? [
            { sideId: "s6", displayName: "Priya Patel", userId: "u6", isYou: false, score: 6920, place: 5, advancing: true },
            { sideId: "s2", displayName: "You", userId: "you", isYou: true, score: 4667, place: 6, advancing: false },
          ]
        : [{ sideId: "s6", displayName: "Dana Singh", userId: "u6", isYou: false, score: 5472, place: 6, advancing: false }]),
    ],
  };
}

/** Pick the active or registering crew relay edition relevant to a specific crew card. */
export function findCrewRelayEdition(
  editions: readonly SpecialEventEdition[],
  crewId: string,
  sport?: string,
  now = new Date(),
): SpecialEventEdition | null {
  const open = editions.filter(
    (e) =>
      e.config.grouping.kind === "crew" &&
      e.config.scoring.mode === "relay_handoff" &&
      specialEventPhase(e, now) !== "settled",
  );
  return (
    open.find((e) => e.entry?.requestedCrewId === crewId) ??
    open.find((e) => !e.entry && (!sport || e.sport === sport)) ??
    null
  );
}
