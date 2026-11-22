import type { ReactNode } from "react";
import type { Metadata } from "next";
import { PaceShell } from "./pace-shell";
import "./pace.css";

export const metadata: Metadata = {
  title: "Overtaek — Observatory & Replay Studio",
  description: "Explore published race distributions, cumulative fields, and interactive course replays.",
};

export default function RankingsLayout({ children }: { children: ReactNode }) {
  return <PaceShell>{children}</PaceShell>;
}
