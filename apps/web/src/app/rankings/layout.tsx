import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./rankings.css";

export const metadata: Metadata = {
  title: "Race Rankings",
  description: "Public road-race leaderboards from audited results sources.",
};

export default function RankingsLayout({ children }: { children: ReactNode }) {
  return <div className="rankings-shell">{children}</div>;
}
