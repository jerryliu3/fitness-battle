import type { Metadata } from "next";
import { AthleteCardScene } from "./scene";
export const metadata: Metadata = { title: "Athlete card", robots: { index: false, follow: false } };
export default function Page() { return <AthleteCardScene />; }
