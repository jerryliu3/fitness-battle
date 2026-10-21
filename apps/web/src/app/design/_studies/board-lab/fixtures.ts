import type { BoardData, BoardSession, BoardUnit } from "./model";
import type { ArenaSceneLane } from "@fitness-battle/shared";

/** Fictional presentation fixtures. Never imported by production or sent to the backend. */
export function boardFixture(effort: boolean, distanceUnit: "km" | "mi"): BoardData {
  const unit: BoardUnit = effort ? "pts" : distanceUnit;
  const factor = unit === "mi" ? 1 / 1.609344 : 1;
  const athletes = [
    { id: "ava", name: "Ava Lee", initials: "AL", values: effort ? [22, 26, 26] : [8.2, 7.4, 9.6] },
    { id: "maya", name: "Maya Chen", initials: "MC", values: effort ? [20, 26, 22] : [6, 8.1, 6] },
    { id: "you", name: "You", initials: "JL", values: effort ? [18, 24, 22] : [5.9, 7.1, 6.2] },
    { id: "leo", name: "Leo Santos", initials: "LS", values: effort ? [16, 18, 22] : [4.2, 7, 5.2] },
    { id: "niko", name: "Niko Reed", initials: "NR", values: effort ? [12, 19, 14] : [4.4, 5.1, 3.9] },
  ];
  const titles = effort ? ["Full-body strength", "Lunch lift", "Evening strength"] : ["Monday miles", "An easy loop", "Evening run"];
  const dates = ["2026-10-19T07:20:00Z", "2026-10-20T12:30:00Z", "2026-10-20T18:15:00Z"];
  const sessions: BoardSession[] = [];
  const lanes: ArenaSceneLane[] = athletes.map(a => {
    let value = 0;
    a.values.forEach((amount, i) => {
      const start = value;
      value += amount * factor;
      sessions.push({ id: `${a.id}-${i}`, athleteId: a.id, title: titles[i]!, recordedAt: dates[i]!, start, end: value });
    });
    return { id: a.id, name: a.name, initials: a.initials, value, you: a.id === "you" };
  });
  lanes.push({ id: "past", name: "Past you", initials: "JL", value: (effort ? 59 : 18) * factor, ghost: true });
  return { lanes, sessions, unit, gps: !effort, sport: effort ? "Strength" : "Running", gain: (effort ? 8 : 2.2) * factor };
}
