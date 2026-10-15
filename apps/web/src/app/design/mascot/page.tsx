import type { Metadata } from "next";
import { MascotStudio } from "@/app/design/_studies/mascot-studio/studio";

export const metadata: Metadata = {
  title: "Star Ember · Mascot studio",
  description: "One shared vector character. Explore Ember’s expressions, poses and movement.",
  robots: { index: false, follow: false },
};

export default function MascotPage() { return <MascotStudio />; }
