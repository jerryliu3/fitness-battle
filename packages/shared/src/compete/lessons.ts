import { dayKey, hashString, type SportId } from "./sports";

export interface Lesson {
  title: string;
  detail: string;
  minutes: number;
}

const LESSONS: Record<SportId, Lesson[]> = {
  running: [
    {
      title: "Easy 25",
      detail: "Conversational pace. The point is to show up, not to race.",
      minutes: 25,
    },
    {
      title: "Strides",
      detail: "Ten short pickups with full rest. Smooth, not strained.",
      minutes: 20,
    },
    {
      title: "Long and quiet",
      detail: "Add ten minutes to your usual easy run. Keep the heart rate low.",
      minutes: 45,
    },
    {
      title: "Hills, easy down",
      detail: "Six relaxed climbs. Walk or jog the recovery.",
      minutes: 30,
    },
  ],
  cycling: [
    {
      title: "Spin 40",
      detail: "Steady cadence. Stay where you could still talk.",
      minutes: 40,
    },
    {
      title: "Cadence lifts",
      detail: "Eight one-minute faster spins, then easy.",
      minutes: 35,
    },
    {
      title: "Endurance ride",
      detail: "One longer ride this week. Fuel before you are hungry.",
      minutes: 70,
    },
  ],
  walking: [
    {
      title: "Brisk 30",
      detail: "A purposeful walk. Arms swing, posture tall.",
      minutes: 30,
    },
    {
      title: "Hills or stairs",
      detail: "Find a slope and repeat it four times, easy back down.",
      minutes: 25,
    },
    {
      title: "Long walk",
      detail: "Go a little farther than yesterday. No hero pace.",
      minutes: 50,
    },
  ],
  strength: [
    {
      title: "Full body",
      detail: "Squat, hinge, push, pull. Two working sets you could repeat.",
      minutes: 35,
    },
    {
      title: "Easy circuit",
      detail: "Five moves, forty seconds on. Leave two reps in the tank.",
      minutes: 25,
    },
    {
      title: "Posterior chain",
      detail: "Hinge and carry. Quality over load.",
      minutes: 30,
    },
  ],
};

export function lessonFor(sport: SportId, now: Date = new Date()): Lesson {
  const list = LESSONS[sport];
  const index = hashString(`${sport}:${dayKey(now)}`) % list.length;
  return list[index]!;
}
