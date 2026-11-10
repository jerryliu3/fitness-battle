import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./pace.css";

export const metadata: Metadata = {
  title: "Times",
  description: "Public road-race leaderboards from audited results sources.",
};

export default function RankingsLayout({ children }: { children: ReactNode }) {
  return <div className="rankings-shell">{children}</div>;
}
