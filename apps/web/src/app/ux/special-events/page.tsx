import type { Metadata } from "next";
import { SpecialEventsLab } from "./special-events-lab";

export const metadata: Metadata = {
  title: "Special Events Prototypes · Overtaek",
  description: "Interactive UX & motion prototypes for Daily Survivor, Crew Relay, 1v1 Bracket, Squads, and Event Map Lanes.",
};

export default function SpecialEventsUxPage() {
  return <SpecialEventsLab />;
}
