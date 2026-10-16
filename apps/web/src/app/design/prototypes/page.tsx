import type { Metadata } from "next";
import { RedesignShell } from "@/features/redesign/redesign-shell";

export const metadata: Metadata = {
  title: "UI Redesign Prototypes · Fitness Battle",
  description:
    "Interactive code prototypes with 5 distinct designs for Home, Arena, Crew, and Athlete screens.",
  robots: { index: false, follow: false },
};

export default function PrototypesPage() {
  return <RedesignShell />;
}
