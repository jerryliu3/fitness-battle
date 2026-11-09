import type { Metadata } from "next";
import { AthleteCardLab } from "../_studies/athlete-cards/athlete-card-lab";

export const metadata: Metadata = { title: "Athlete cards · Overtaek", robots: { index: false, follow: false } };

export default function AthleteCardsPage() {
  return <AthleteCardLab />;
}
