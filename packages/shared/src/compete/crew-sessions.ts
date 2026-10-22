import { APP_TIMEZONE } from "../period";
export interface CrewSession {
  id: string;
  crew_id: string;
  created_by: string;
  title: string;
  sport: string;
  starts_at: string;
  duration_min: number;
  time_zone: string;
  cancelled_at: string | null;
  participants: { user_id: string; display_name: string }[];
}
/** Resolve an explicit wall time; reject DST gaps rather than silently shifting a session. */
export function crewSessionInstant(
  day: string,
  time: string,
  zone = APP_TIMEZONE,
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time))
    throw new Error("Enter a date and time.");
  const target = `${day} ${time}`,
    anchor = Date.parse(`${day}T${time}:00Z`);
  if (!Number.isFinite(anchor)) throw new Error("Enter a valid date and time.");
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  for (let minutes = -14 * 60; minutes <= 14 * 60; minutes += 15) {
    const instant = new Date(anchor + minutes * 60000),
      p = Object.fromEntries(
        format.formatToParts(instant).map((p) => [p.type, p.value]),
      );
    if (`${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}` === target)
      return instant.toISOString();
  }
  throw new Error(
    "That time does not exist in this timezone. Choose another time.",
  );
}
export function crewSessionError(code: string): string {
  if (code.includes("not_a_member"))
    return "Your crew membership has changed. Refresh your crews.";
  if (code.includes("session_closed"))
    return "This session has started or was cancelled.";
  if (code.includes("session_owner_required"))
    return "Only the organizer can cancel this session.";
  if (code.includes("invalid_session"))
    return "Choose a title, a future time within six months, and 15–240 minutes.";
  if (code.includes("too_many_sessions"))
    return "This crew already has 20 upcoming sessions.";
  return "Could not save the session. Please try again.";
}
/** Idempotency identifier only; authorization always comes from the authenticated membership. */
export function crewSessionDraftId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const n = Math.floor(Math.random() * 16);
    return (c === "x" ? n : (n & 3) | 8).toString(16);
  });
}

export type CrewSessionMutation =
  | {
      action: "create";
      id: string;
      crewId: string;
      title: string;
      startsAt: string;
      durationMin: number;
      timeZone: string;
    }
  | { action: "rsvp"; id: string; join: boolean }
  | { action: "cancel"; id: string };

export function validateCrewSessionDraft(
  title: string,
  day: string,
  time: string,
  duration: number,
  now = new Date(),
): string {
  if (!title.trim()) throw new Error("Give the session a name.");
  if (!Number.isInteger(duration) || duration < 15 || duration > 240)
    throw new Error("Choose 15–240 minutes.");
  const instant = crewSessionInstant(day, time);
  if (
    Date.parse(instant) <= now.getTime() ||
    Date.parse(instant) > now.getTime() + 180 * 86400000
  )
    throw new Error("Choose a future start within 180 days.");
  return instant;
}
/** Local demo adapter. Never sends an RSVP or creates a workout. */
export function demoCrewSessionMutation(
  rows: CrewSession[],
  mutation: CrewSessionMutation,
  userId: string,
  sport: string,
): CrewSession[] {
  if (mutation.action === "create") {
    if (rows.some((row) => row.id === mutation.id)) return rows;
    return [
      ...rows,
      {
        id: mutation.id,
        crew_id: mutation.crewId,
        created_by: userId,
        title: mutation.title.trim(),
        sport,
        starts_at: mutation.startsAt,
        duration_min: mutation.durationMin,
        time_zone: mutation.timeZone,
        cancelled_at: null,
        participants: [{ user_id: userId, display_name: "You" }],
      },
    ].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  }
  return rows.map((row) => {
    if (row.id !== mutation.id) return row;
    if (mutation.action === "cancel")
      return row.created_by === userId
        ? { ...row, cancelled_at: new Date().toISOString() }
        : row;
    if (row.cancelled_at || Date.parse(row.starts_at) <= Date.now()) return row;
    const others = row.participants.filter((p) => p.user_id !== userId);
    return {
      ...row,
      participants: mutation.join
        ? [...others, { user_id: userId, display_name: "You" }]
        : others,
    };
  });
}
